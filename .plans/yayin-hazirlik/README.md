# Yayın Hazırlığı

Oyunun **CrazyGames**, **GameDistribution** ve **Google Play** yayınına çıkmadan önce
kapatılması gereken dayanıklılık, güvenlik ve operasyon açıkları.

Bu iz özellik eklemez, **sertleştirir**. Bu sürümde "reklamları kaldır" satın alması yoktur
(bkz. `.plans/monetization/07-reklamlari-kaldir.md`).

---

## Durum tespiti (2026-09-16)

Kod tarafı sağlıklı. Denetim anındaki taban çizgisi:

| Kontrol | Sonuç |
|---|---|
| App tip denetimi | temiz |
| App testleri | 86/86 |
| Worker tip denetimi | temiz |
| Worker testleri | 135/135 |
| CrazyGames build | 95 dosya, 3.37MB |
| GameDistribution build | 95 dosya, 3.37MB |
| Android build + `cap sync` | başarılı |
| Android `assembleRelease` | başarılı — 14.7MB imzalı APK |
| APK imza doğrulaması | gerçek release sertifikası (`CN=Ahmet Cinar, O=Polimelo`) |

Mimaride doğru kurulmuş olanlar — bu görevler bunları **bozmamalı**:

- Hamleler sunucuda gerçekten replay edilip doğrulanıyor (`services/gameVerify.ts`).
- Skor/yıldız istemciye güvenilerek hesaplanmıyor; D1 yetkili kaynak.
- Firestore kuralları sıkı: `totalScore`, `role`, `xp` istemciye kapalı.
- Tüm D1 sorguları parametreli; string interpolasyonu yok.
- Portal paketleyici admin/editör ekranlarını dışarıda bırakıyor.
- Audit log + ban altyapısı + log arşivleme zaten çalışıyor.

---

## Görev sırası

Sıra "kaybı geri alınamaz olan önce" mantığıyla kuruldu. **Sırayı bozma.**

| # | Dosya | Konu |
|---|---|---|
| 00 | `00-ilkeler.md` | Tüm görevler için bağlayıcı ilkeler — **her ajan önce bunu okur** |
| 01 | `01-kimlik-ve-konfigurasyon-hijyeni.md` | İmzalama anahtarı, `/android` ve `firestore.rules` versiyon kontrolü |
| 02 | `02-veri-dayanikliligi.md` | Koruma ve onarım katmanları |
| 03 | `03-rate-limit-ve-kotuye-kullanim.md` | Paylaşılan hız limiti, kötüye kullanım sinyalleri |
| 04 | `04-yayin-kimlik-dogrulama.md` | Gerçek reklam kimlikleri, build sertleştirme |
| 05 | `05-loglama-ve-adli-iz.md` | IP/UA sınırlı iz, güvenlik olayları, yasal metinler |

Her görev bitince `raporlar/<numara>-rapor.md` yazılır. Sonraki görev o raporu okuyarak başlar.

---

## ÖNEMLİ — 01'e başlamadan önce oku

**Release imzalama anahtarı bulundu ve tek bir harici diskte duruyor.**

`android/keystore.properties` şu dosyayı işaret ediyor:

```
D:\PROJECTS\keys\syncron-cap-keystore.jks    (2746 byte, 2026-09-12)
```

Dosya doğrulandı, yerinde. **Kayıp yok** — ama `D:` harici/ikincil bir disk ve denetimin bir
bölümünde sisteme bağlı bile değildi. `C:` üzerinde hiçbir kopyası yok.

Yani tek bir diskin ömrü ile Play Store'daki uygulamanın güncellenebilirliği birbirine bağlı.
O disk bozulursa ve Play App Signing kapalıysa, uygulama **bir daha güncellenemez**.

Ayrıca: `D:` takılı değilken `assembleRelease` / `bundleRelease` imzalama adımında patlar.

**İlk yapılacak — 01 görevini beklemeden:** anahtarı git dışında, şifreli, en az iki ayrı yere
yedekle. `01-kimlik-ve-konfigurasyon-hijyeni.md` §3.4 bunun kuralını, §3.1 kalan iki soruyu
(Play Console'a yükleme yapıldı mı, Play App Signing açık mı) ele alıyor.

---

## Bir ajana görev verirken

Her göreve temiz bir ajanla başla ve şu kalıbı kullan:

```
@.plans/yayin-hazirlik/<görev-dosyası>.md dosyası senin görevin.

Önce @.plans/yayin-hazirlik/00-ilkeler.md ve
@.plans/monetization/00-mimari-ilkeler.md dosyalarını oku — ikisi de bağlayıcı.

Görevi bu ilkelere uygun şekilde tamamla. Belirsizlik anında bana sor,
varsayımla ilerleme. Bitince 00-ilkeler.md §4'e göre
.plans/yayin-hazirlik/raporlar/<numara>-rapor.md dosyasını yaz.
```

İkinci ve sonraki görevlerde bir satır ekle:

```
Başlamadan önce .plans/yayin-hazirlik/raporlar/ altındaki önceki raporları oku.
```

---

## Ajanın yapamayacağı işler

Bu izde panelden elle yapılması gereken adımlar var. Ajanlar bunları raporlarına
"senin yapman gereken" başlığıyla yazacak:

- Google Play Console: imzalama durumu, Veri Güvenliği formu, sürüm yükleme
- Cloudflare paneli: Time Travel doğrulaması, Rate Limiting binding'i, WAF kuralları
- AdMob / GameDistribution panelleri: gerçek kimliklerin alınması
- Keystore'un git dışında, şifreli, en az iki yere yedeklenmesi
- Yasal metinlerin son onayı
