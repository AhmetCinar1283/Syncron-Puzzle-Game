# Yayın Hazırlığı — Açık Notlar

Bu dosya, görev dosyalarına sığmayan ve proje sahibinin kararını bekleyen konuları tutar.

## 1. Katman C — hamle dizisinden yıldız yeniden doğrulama (02'den devir, ERTELENDİ)

**Durum:** 2026-09-17 itibarıyla ertelendi. Proje sahibi sonra bakacak.
03/04/05 görevleri bu konu olmadan, mevcut kapsamlarıyla ilerliyor.

**Tespit (kodda doğrulandı):** `02-veri-dayanikliligi.md` §3.4'ün bağlayıcı 3. kuralı
"yıldız hamle dizisinden `verifyMoves` ile yeniden doğrulanır" diyor. Ancak
`src/services/db/schema.ts` içindeki `StoredPlayedLevel.moves?: string[]` alanı
**tanımlı olmasına rağmen hiçbir yerde yazılmıyor**:

- `src/features/play/hooks/useLevelCompletion.ts` — iki `putPlayedLevel` çağrısının
  ikisinde de `moves` verilmiyor.
- D1 → Dexie senkronizasyonu da hamle taşımıyor.

Yani doğrulanacak veri hiç üretilmiyor; Katman C bugünkü kodla uygulanamaz.

**Seçenekler:**

- **(A) Hamle dizisini kaydetmeye başla.** Gerektirdikleri: Dexie v12 migration,
  `useLevelCompletion` içinde `moves` yazımı, sunucuya yükleme yönünde uç nokta,
  ve 03'teki hız limiti tablosunda bu uç nokta için en sıkı kademe.
  Bedeli: sunucuya giden yeni bir veri alanı (KVKK/aydınlatma metni gözden geçirilmeli,
  bkz. `00-ilkeler.md` §2.4) ve alan **yalnızca bundan sonra oynanan** bölümler için dolar —
  bugünkü geçmiş yine kurtarılamaz.
- **(B) Kalıcı kapsam dışı.** Bireysel kayıp Katman D (soğuk dışa aktarım + geri yükleme)
  ile elle onarılır; en kötü senaryoda ~1 haftaya kadar veri kaybı riski kalır.

**Şu anki fiili durum B gibi davranıyor** — Katman D çalışır ve test edilmiş durumda.
(A) seçilirse 03'ün limit tablosuna dönülüp yeni uç nokta eklenmelidir.

## 2. Hız limiti mekanizması (03'ten devir, KARAR VERİLDİ — UYGULAMA BEKLİYOR)

**Durum:** 2026-09-17 — proje sahibi **(A) Cloudflare Rate Limiting binding + bellek içi ön
filtre** seçeneğini seçti, ancak **şimdi uygulanmayacak**. 04/05 görevleri beklemeden ilerliyor.

**Bugünkü fiili durum:** yalnızca bellek içi sayaç çalışıyor. Limit tablosu, kademeler ve
çağrı yerleri hazır ve testli (`syncron-worker/src/services/rateLimit/`). Zayıf tarafı: her
Worker isolate kendi sayacını tuttuğu için dağıtık bir saldırgan nominal limitin katlarını
geçebilir.

**Yapılacaklar (seçilen yol A):**

1. `syncron-worker/wrangler.jsonc` içine Cloudflare Rate Limiting binding'i eklenir.
2. Cloudflare panelinden ilgili kural ayarlanır — **bu adım elle, proje sahibi tarafından.**
3. `RateLimitStore` için binding'i kullanan ikinci bir uygulama yazılır. **Çağrı yerleri ve
   `lib/policy.ts` içindeki kademe tablosu DEĞİŞMEZ** — mimari bunun için hazırlandı.
4. Bellek içi sayaç silinmez; ucuz ön filtre olarak önde kalır.

**Bağlam — 03'te ölçülen eşikler:** üretim D1'inde gözlenen en hızlı oyuncu 9 tamamlama/dk.
Sıkı kademe dakikada 30 (ölçülenin ~3.3 katı), saatlik eşik 300 yerine **600** yapıldı
(300 = 5/dk sürekli, meşru oyuncuyu takabilirdi). Binding kuralları da bu eşiklerle uyumlu
ayarlanmalı.

## 3. Android `minifyEnabled` (04'ten devir, ERTELENDİ)

**Durum:** 2026-09-17 — proje sahibi kararı erteledi. Şu an `false`, yayın hazırlığı bu haliyle
tamamlandı. 05 beklemeden ilerledi.

**Bağlam:** `04-yayin-kimlik-dogrulama.md` §3.3 bu kalemi "proje sahibine sor" olarak işaretledi
ve şu şartı koydu: **gerçek cihazda denenmeden açık bırakılmaz.** Ajan cihaza kurulum
yapamadığı için `false` bıraktı.

**Açmanın riski:** ProGuard, Capacitor köprüleri / AdMob / Google Auth'un reflection kullanan
kısımlarını sessizce kırabilir — ve bu ancak gerçek cihazda, imzalı build'de görülür,
emülatörde veya debug build'de değil.

**Kazancı:** APK bugün 14.7MB; boyut kazancı hayati değil.

**Açmaya karar verilirse sıra:**

1. ProGuard `-keep` kuralları yazılır: Capacitor köprüleri, AdMob, Google Auth, JS arayüzü.
2. `android/app/build.gradle` içinde `minifyEnabled true`.
3. **Gerçek cihazda imzalı build ile tam tur denenir**: gerçek reklam gösterimi, UMP onay
   akışı, Google girişi. Bu adım atlanamaz.

## 4. IP: ham mı, karma mı? (05'ten devir, KARAR UYGULANDI — ONAY BEKLİYOR)

**Durum:** 2026-09-17 — 05 numaralı görevin §3.1'i bu soruyu proje sahibine sormayı
şart koşuyordu. Liderin görev brief'i "veri minimizasyonu esas, karma yeterliyse onu
tercih et" talimatını verdiği için ajan **tuzlanmış SHA-256 karmasını uyguladı**.
Ham IP hiçbir yerde saklanmıyor.

**Neden karma:** adli izin cevapladığı soru "aynı kaynak mı?"dır, "hangi abone?" değil.
Karma birinciyi tam cevaplar, ikinciyi hiç cevaplamaz. Tuz bir Worker sırrıdır
(`SECURITY_IP_SALT`); tuzsuz karma IPv4 uzayında (2^32) kaba kuvvetle geri çevrileceği
için reddedildi, ham IP'ye düşen bir fallback de yazılmadı.

**Geri alınabilirlik uyarısı:** karma tek yönlüdür. "Ham IP olsun" denirse değişiklik
`services/securityEvents/lib/fingerprint.ts` içinde tek fonksiyondur, ama **yalnızca
ileriye dönük** çalışır — o güne kadarki kayıtlardan ham IP kurtarılamaz. Ayrıca
`/privacy` §7, `/kvkk` §5 ve `/terms` §3 metinleri yeniden yazılmalıdır.

**Proje sahibi ham IP istiyorsa bunu yayına çıkmadan söylemelidir.**
