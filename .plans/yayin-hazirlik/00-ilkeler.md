# 00 — Yayın Hazırlığı İlkeleri (Tüm Görevler İçin Bağlayıcı)

Bu klasör, oyunun CrazyGames / GameDistribution / Google Play yayınına çıkmadan önce
kapatılması gereken **dayanıklılık, güvenlik ve operasyon** açıklarını görev dosyalarına böler.

Bu iz **özellik eklemez, sertleştirir**. Oyuncunun gördüğü davranış, görev dosyası açıkça
söylemedikçe değişmez.

## 1. Devralınan İlkeler

`.plans/monetization/00-mimari-ilkeler.md` bu iz için de **aynen geçerlidir**. Özellikle:

- Bağımlılık yalnızca aşağı akar: `app/ → features/ → services/ → game-engine/ → level-format/`.
- Her dosya tek iş yapar, başında `DOSYA AMACI` açıklaması bulunur, ~250 satırı geçmez.
- Platform farkları tek kompozisyon kökünde çözülür; koda `if (platform === ...)` dağıtılmaz.
- Worker'da route dosyaları ince, iş mantığı `services/` altında, şema değişikliği numaralı `migrations/` dosyasında.
- Skor/yıldız/liderlik bütünlüğü sunucuda korunur. İstemcinin beyanı hiçbir şeyi artıramaz.
- Tüm kullanıcı metinleri i18n'den (`tr` + `en`) gelir.
- Gerekçesiz `any` yok.
- Kapsam dışı bir sorun görülürse düzeltilmez, rapora not edilir.

## 2. Bu İze Özel İlkeler

### 2.1 Mevcut yeşil durum bozulmaz

Göreve başlamadan önceki taban çizgisi:

| Kontrol | Komut | Beklenen |
|---|---|---|
| App tip denetimi | `npx tsc --noEmit` | hatasız |
| App testleri | `npm test` | 86/86 |
| Worker tip denetimi | `cd syncron-worker && npx tsc --noEmit` | hatasız |
| Worker testleri | `cd syncron-worker && npx vitest run` | 135/135 |
| CrazyGames build | `npm run build:crazygames` | zip üretir |
| GameDistribution build | `npm run build:gd` | zip üretir |
| Android build | `npm run build:mobile` | `cap sync` biter |

Görev bitiminde **hepsi** yeniden yeşil olmalı. Test sayısı artabilir, azalamaz.

### 2.2 Yeni kod test edilir

Sunucu tarafındaki her yeni karar noktası (limit aşıldı mı, kayıt onarılabilir mi, kimlik
gerçek mi) `syncron-worker/test/` altında test alır. Saf yardımcılar `src/**/lib/*.test.ts`
düzeninde test alır.

### 2.3 Sır yönetimi

- Hiçbir sır, anahtar, keystore veya `.env*` dosyası git'e girmez. `.gitignore`'daki `.env*`
  kuralı **kaldırılmaz**.
- Worker sırları yalnızca `wrangler secret put` ile verilir, `wrangler.jsonc` içine yazılmaz.
- Gerçek reklam/ödeme kimlikleri repoya gömülmez; ortam değişkeni veya gitignore'lu yerel
  dosyadan okunur.

### 2.4 Kişisel veri

- Veri minimizasyonu esastır. Yeni bir kişisel veri alanı ekleniyorsa görev dosyası
  **saklama süresini**, **silme mekanizmasını** ve **aydınlatma metni güncellemesini**
  birlikte kapsar. Üçünden biri eksikse iş bitmemiş sayılır.
- `/privacy`, `/kvkk` ve `/terms` sayfaları veri gerçeğiyle tutarlı tutulur.

### 2.5 Geri alınabilirlik

- Şema değişiklikleri **eklemeli** olur: yeni kolon/tablo eklenir, mevcut kolon silinmez
  veya yeniden adlandırılmaz. Kullanımdan kalkan alan önce boşa çıkarılır, silme ayrı ve
  sonraki bir görevin işidir.
- Yıkıcı bir migration gerekiyorsa görev dosyası bunu açıkça söyler ve tek başına çalışır.

## 3. Görev Sırası

Sıralama "kaybı geri alınamaz olan önce" mantığıyla kurulmuştur. Sırayı bozma.

| # | Dosya | Konu | Neden bu sırada |
|---|---|---|---|
| 01 | `01-kimlik-ve-konfigurasyon-hijyeni.md` | Keystore yedeği, `/android` ve `firestore.rules` versiyon kontrolü | Tek geri dönüşü olmayan risk: keystore kaybı = Play Store'da uygulamayı sonsuza dek güncelleyememek |
| 02 | `02-veri-dayanikliligi.md` | Koruma + onarım katmanları (yedek/geri yükleme **değil**) | Veri kaybı ikinci en pahalı hata; 03'ün limitleri buna dayanır |
| 03 | `03-rate-limit-ve-kotuye-kullanim.md` | Paylaşılan hız limiti, kota koruması | Saldırı yüzeyi; 02'deki onarım araçları hazır olunca güvenle sıkılaştırılır |
| 04 | `04-yayin-kimlik-dogrulama.md` | Gerçek reklam/ödeme kimlikleri, build sertleştirme | Yayın anında fark edilir; gelir doğrudan buna bağlı |
| 05 | `05-loglama-ve-adli-iz.md` | IP/UA sınırlı iz, güvenlik olayları, gürültü temizliği | 03'ün ürettiği olayları loglayacağı için en sonda |

## 4. Her Görevin Bitiş Şartı

Görev tamamlandığında ajan `.plans/yayin-hazirlik/raporlar/<numara>-rapor.md` dosyasını yazar:

1. **Ne yapıldı** — dosya dosya, kısa.
2. **Ne yapılmadı ve neden** — kapsam dışı bırakılanlar.
3. **Doğrulama** — §2.1 tablosunun çalıştırılmış hâli, gerçek çıktılarla.
4. **Elle kontrol listesi** — proje sahibinin kendi gözüyle doğrulaması gerekenler.
5. **Sonraki göreve not** — varsa devredilen bilgi.

## 5. Belirsizlik Anında

Aşağıdaki durumlarda **kendi başına karar verme, proje sahibine sor**:

- Bir şey silmek, yeniden adlandırmak veya yıkıcı bir migration yazmak gerekiyorsa.
- Oyuncunun gördüğü bir davranış değişecekse.
- Kişisel veri toplama kapsamı görev dosyasında yazandan genişleyecekse.
- Cloudflare/Firebase/Play Console tarafında panelden elle yapılması gereken bir adım çıkarsa
  (ajan bunları yapamaz; rapora "senin yapman gereken" başlığı altında yazar).
- Görev dosyasındaki bir tespit kodda doğrulanamıyorsa (kod değişmiş olabilir) — varsayımla
  ilerleme, durumu bildir.
