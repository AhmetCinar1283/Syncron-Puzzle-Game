# 04 — Yayın Kimlikleri ve Build Sertleştirme — Rapor

Tarih: 2026-09-17 · Dal: `refactor/architecture`

> **Özet:** Yayın kimliği doğrulama kapısı yazıldı (`scripts/release/`, 5 modül + 3 test
> dosyası, **41 yeni test**). `release:gd`, `release:crazygames`, `release:android`
> script'leri kapıdan geçmeden build almıyor. `ignoreBuildErrors: false` yapıldı ve üç
> build'in de artık gerçekten tip denetimi koştuğu çıktıyla doğrulandı.
> `docs/release/yayin-kontrol-listesi.md` yazıldı.
> Yedi doğrulama komutunun **hepsi yeşil**; app testi 86 → **127**, worker 198/198 sabit.
> **`minifyEnabled` kararı ajanın yetkisinde değil** — §5'te "LİDERE SORU".
> Değişiklikler **commit edilmedi**.

---

## 1. Ne yapıldı

### 1.1 Yayın kimliği doğrulama kapısı (§3.1) — yeni modül

`scripts/release/` (kendi `README.md`'si var). Mimarî ayrım, `services/rateLimit`'teki
(03) desenin aynısı: **veri ayrı, karar ayrı, IO ayrı**.

| Dosya | Satır | Ne |
|---|---|---|
| `verify-release-config.mjs` | 106 | **Tek IO katmanı.** `.env`/`.env.production`/`.env.local`/`.env.production.local`'i Next'in öncelik sırasıyla okur, `android/local.properties`'i okur, `process.env` ile birleştirir, sonucu basar, `exit 1` üretir. |
| `lib/releaseConfigRules.mjs` | 158 | **VERİ.** Platform → zorunlu kimlik tablosu. Tek `if` yok. |
| `lib/evaluateReleaseConfig.mjs` | 167 | **KARAR, saf.** İçinde hiçbir platform adı ve hiçbir değişken adı geçmez. |
| `lib/placeholderIdentities.mjs` | 85 | **Saf.** "Bu değer test/örnek kimliği mi?" — tek doğruluk kaynağı. |
| `lib/parseConfigFiles.mjs` | 109 | **Saf.** `.env*` ve Java `.properties` ayrıştırıcıları. |

**Yeni platform/kimlik eklemek artık konfigürasyon işi:** `releaseConfigRules.mjs`'e bir
satır + `package.json`'a bir `release:*` satırı. Karar mantığına ve giriş noktasına
dokunulmaz.

Yakalanan kimlik kaynakları:

| Platform | Zorunlu | Kaynak |
|---|---|---|
| hepsi | `NEXT_PUBLIC_WORKER_URL` + 6 `NEXT_PUBLIC_FIREBASE_*` | `.env*` |
| `crazygames` | (ek yok — SDK oyun başına kimlik istemiyor) | — |
| `gamedistribution` | `NEXT_PUBLIC_GD_GAME_ID` | `.env*` |
| `android` | 3 AdMob birim kimliği, `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID` | `.env*` |
| `android` | `admobAppId` (alternatif: `ADMOB_APP_ID` env) | `android/local.properties` |
| `android` | `NEXT_PUBLIC_ADMOB_USE_TEST_ADS` **ayarlı olmamalı** | `.env*` |

Reddedilen "sahte kimlik" desenleri: AdMob test yayıncı öneki
(`ca-app-pub-3940256099942544`, hem `~` App ID hem `/` birim biçimini kapsar), GD test GUID'i,
`src/services/firebase/config.ts` içindeki `mock-*` fallback değerleri, doldurulmamış
şablonlar (`XXXX`, `<...>`, `your-`, `changeme`, `todo`) ve `localhost` worker adresi.

**Gerçek kimlik repoya girmedi.** Bu dosyalardaki tüm değerler Google'ın ve GD'nin herkese
açık test kimlikleri ile kodun kendi mock fallback'leri — yani *reddedilenler* listesi.

### 1.2 Ölçülen gerçek: kodun çözüm sırası ile kapının sırası aynı

`android/app/build.gradle` App ID'yi **üç kaynaktan** çözüyor (`ADMOB_APP_ID` env →
`local.properties` → gradle özelliği). Kapı yalnızca `local.properties`'e baksaydı,
CI'da `ADMOB_APP_ID` veren meşru bir build **yanlış yerden** durdurulurdu. Bu yüzden kural
modeline `alternatives` alanı eklendi ve öncelik sırası birebir aynı kuruldu; 4 testle
korunuyor. Gradle özelliği yolu (`~/.gradle/gradle.properties`) ev dizininde olduğu için
okunmuyor — bu sınır `scripts/release/README.md`'de açıkça yazılı.

### 1.3 `ignoreBuildErrors: false` (§3.2)

`next.config.ts` güncellendi. **Kritik doğrulama:** ayar `true` iken build çıktısında
`Running TypeScript` satırı **hiç yoktu**; şimdi üç build'in üçünde de var:

```
✓ Compiled successfully in 11.4s
  Running TypeScript ...
  Finished TypeScript in 30.1s ...
```

Yani ayar gerçekten etkili, sadece kozmetik bir değişiklik değil. Hiçbir yeni tip hatası
çıkmadı (01/02/03 raporlarının `tsc --noEmit` temizliğiyle tutarlı). Bedeli: her build'e
~20-35 sn tip denetimi eklendi.

### 1.4 `release:*` script'leri (§3.1)

```json
"verify:release":     "node scripts/release/verify-release-config.mjs",
"release:crazygames": "node scripts/release/verify-release-config.mjs crazygames && npm run build:crazygames",
"release:gd":         "node scripts/release/verify-release-config.mjs gamedistribution && npm run build:gd",
"release:android":    "node scripts/release/verify-release-config.mjs android && npm run build:mobile"
```

Mevcut `build:crazygames` / `build:gd` / `build:mobile` **hiç değişmedi** — geliştirme
akışı test kimlikleriyle çalışmaya devam ediyor (§2 hedef 2).

### 1.5 Yayın kontrol listesi (§3.4)

`docs/release/yayin-kontrol-listesi.md` (133 satır): ortak adımlar, CrazyGames (paket
sınırları `scripts/portal/portalLimits.mjs`'ten kaynak alındı: 1500 dosya / 250 MB / 50 MB
uyarı eşiği), GameDistribution, Android (kimlikler → sürüm → imzalama → **gerçek cihaz** →
Play Console) ve yayın sonrası ilk 48 saat.

Release SHA-1 satırı 01'den devralındı ve **bir uyarıyla genişletildi**: Play App Signing
açıksa Play kendi imzalama anahtarını kullanır, o yüzden Play Console'daki *uygulama
imzalama sertifikası* SHA-1'inin de Firebase'e eklenmesi gerekir. Yalnızca yükleme
anahtarının SHA-1'i yetmez — bu, listedeki adımın tek başına yanıltıcı olabileceği yer.

§3.3'teki sürüm artırma yöntemi listenin 3.2 bölümünde tablo hâlinde yazıldı
(`versionCode` her yüklemede +1, asla tekrar etmez; `versionName` oyuncunun gördüğü sürüm).

`docs/platforms.md`'deki mevcut AdMob kontrol listesine, artık `release:android`'in bunu
otomatik zorladığını söyleyen 4 satırlık bir not eklendi.

### 1.6 Testler (§2.2)

`scripts/release/lib/` altında 3 test dosyası, **+41 test**:

- `evaluateReleaseConfig.test.ts` (30) — gerçek kimlik geçer / eksik durur / test kimliği
  durur üçlüsü her platform için; boş-whitespace "tanımlı" sayılmaz; `USE_TEST_ADS`
  `true`/`TRUE` durdurur ama `false` durdurmaz; alternatif kaynak çözümü ve öncelik sırası.
- `releaseConfigRules.test.ts` (5) — **kural tablosu bütünlüğü**: platform listesi
  `services/monetization/platform.ts` ile birebir aynı mı (biri değişirse test düşer), her
  platform ortak kuralları devralıyor mu, her kuralın çözüm ipucu var mı.
- `parseConfigFiles.test.ts` (6+) — CRLF/BOM, yorum satırı (`.env.local`'daki AdMob
  kimlikleri bugün yorumda — "tanımlı" sayılmamalı), Windows `.properties` ters bölü
  kaçışları (`C\:\\Users\\...`), bozuk girdide çökmeme.

---

## 2. Ne yapılmadı ve neden

- **`minifyEnabled` açılmadı** (§3.3 açıkça "proje sahibine sor" diyor). `false` kaldı.
  Gerekçe: ProGuard + Capacitor bridge + AdMob + Google Auth birlikte reflection'a dayanır;
  kural yazmadan açmak, **yalnızca release build'de** ve çoğu zaman **yalnızca gerçek
  cihazda** ortaya çıkan çökmeler üretir. §3.3 zaten "denenmeden açık bırakılmaz" diyor ve
  ajan gerçek cihazda imzalı build deneyemez. Bkz. §5.
- **`versionCode` artırılmadı.** Henüz Play'e hiç yükleme yapılmadı (01 raporu §1), ilk
  sürüm için `1` doğru değer. Artırma **yöntemi** yazıldı, değerin kendisine dokunulmadı —
  yanlış bir `versionCode`, o numarayı sonsuza dek yakar.
- **Çalışma zamanı davranışı değiştirilmedi.** `admobConfig.ts`, `loadGdSdk.ts` ve
  `build.gradle` hâlâ eksik kimlikte test kimliğine düşüp uyarıyor. Bu **bilinçli**:
  geliştirme akışı bozulmamalı (§2 hedef 2) ve oyuncunun gördüğü davranış görev dosyası
  söylemedikçe değişmez (00-ilkeler §1). Sertleştirme build kapısında, çalışma zamanında değil.
- **Gerçek kimlikler girilmedi** — ajan AdMob/GD panellerine erişemez. Bkz. §5.
- **Katman C**'ye dokunulmadı (`notlar.md` §1 — ertelendi).
- **CI/CD, store görselleri, reklam yerleşimi** — görev §4 gereği kapsam dışı.

### 2.1 Görev dosyasından sapma

**`NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID` zorunlu kimlikler arasına eklendi.** Görev §3.1'in
tablosunda yoktu. Gerekçe: §3.4 "release SHA-1 Firebase'e kayıtlı değilse Google girişi
release build'de sessizce başarısız olur" diyor ve **aynı sessiz başarısızlık** bu env
eksikken de yaşanır. Eksikse `AuthContext.tsx` koda gömülü bir istemci kimliğine düşüyor
(bkz. §4 bulgu) — kapının yakalaması gereken tam olarak bu desen.

---

## 3. Doğrulama (§2.1 tablosunun çalıştırılmış hâli)

| Kontrol | Komut | Sonuç |
|---|---|---|
| App tip denetimi | `npx tsc --noEmit` | ✅ **exit 0**, çıktı yok |
| App testleri | `npm test` | ✅ `Test Files 19 passed (19)` · `Tests 127 passed (127)` — taban 86, **+41** |
| Worker tip denetimi | `cd syncron-worker && npx tsc --noEmit` | ✅ **exit 0**, çıktı yok |
| Worker testleri | `cd syncron-worker && ./node_modules/.bin/vitest run --root .` | ✅ `Test Files 16 passed (16)` · `Tests 198 passed (198)` — değişmedi |
| CrazyGames build | `npm run build:crazygames` | ✅ exit 0 · `Finished TypeScript in 28.6s` · `95 dosya, 3.38MB → dist-portals\crazygames.zip` |
| GameDistribution build | `npm run build:gd` | ✅ exit 0 · `Finished TypeScript in 18.9s` · `95 dosya, 3.38MB → dist-portals\gamedistribution.zip` |
| Android build | `npm run build:mobile` | ✅ exit 0 · `Finished TypeScript in 34.3s` · `[info] Sync finished in 0.518s` |

Ek: `npx eslint scripts/release` → exit 0, uyarı yok. Worker'a hiç dokunulmadı.

### 3.1 Kabul kriterleri — hepsi ELLE denendi

| Kriter | Durum | Gerçek çıktı |
|---|---|---|
| Doğrulayıcı yazıldı, karar mantığı saf fonksiyonda ve testli | ✅ | 41 test, 3 dosya |
| `release:gd` / `release:crazygames` / `release:android` var ve kapıyı çağırıyor | ✅ | `package.json` |
| Eksik `NEXT_PUBLIC_GD_GAME_ID` ile `release:gd` **durur** | ✅ | `✗ DURDURULDU — 1 sorun: NEXT_PUBLIC_GD_GAME_ID tanımlı değil`, `EXIT=1`, `next build` **hiç başlamadı** |
| Test AdMob birim kimliğiyle `release:android` **durur** | ✅ | 4 sorun, hepsi `hâlâ bir TEST/ÖRNEK kimliği`, `EXIT=1` |
| `NEXT_PUBLIC_ADMOB_USE_TEST_ADS=true` yayın build'ini durdurur | ✅ | Gerçek kimlikler tanımlıyken bile: `... yayın build'inde ayarlı olmamalı (şu an "true")`, `EXIT=1` |
| Gerçek kimliklerle kapı **geçer** | ✅ | `✓ Tüm yayın kimlikleri tanımlı ve hiçbiri test kimliği değil` (android, 13 anahtar) |
| Mevcut `build:*` değişmedi, geliştirme akışı bozulmadı | ✅ | `git diff package.json` → yalnızca 4 satır EKLENDİ |
| `ignoreBuildErrors: false` ve üç build hâlâ başarılı | ✅ | §3 tablosu; `Running TypeScript` üçünde de görünüyor |
| `docs/release/yayin-kontrol-listesi.md` yazıldı | ✅ | 133 satır |
| §2.1'deki yedi kontrol yeşil | ✅ | §3 tablosu |
| Bu rapor | ✅ | |

**Deponun bugünkü hâliyle kapı çıktısı** (gerçek durum tespiti):

- `crazygames` → **geçiyor** (ortak kimlikler `.env.local`'da tam).
- `gamedistribution` → **duruyor**: `NEXT_PUBLIC_GD_GAME_ID` yok.
- `android` → **duruyor**: 3 AdMob birim kimliği + `admobAppId` yok (4 sorun).

Bu, görev dosyası §1.1'deki denetim tespitini birebir doğruluyor.

### Dokunulan dosyalar

Yeni: `scripts/release/verify-release-config.mjs`, `scripts/release/README.md`,
`scripts/release/lib/{releaseConfigRules,evaluateReleaseConfig,placeholderIdentities,parseConfigFiles}.mjs`,
`scripts/release/lib/{evaluateReleaseConfig,releaseConfigRules,parseConfigFiles}.test.ts`,
`docs/release/yayin-kontrol-listesi.md`.
Değişen: `next.config.ts` (1 ayar), `package.json` (4 script satırı), `docs/platforms.md` (4 satır not).

`android/`, `syncron-worker/`, `src/` ve 02/03'ün dosyalarına **hiç dokunulmadı**.

---

## 4. Elle kontrol listesi (proje sahibinin yapması gerekenler)

Sıra önemli — 1 ve 2 yapılmadan 3 çalışmaz.

1. **GameDistribution paneli** → oyunun gerçek game ID'sini (GUID) al, `.env.local`'a yaz:
   `NEXT_PUBLIC_GD_GAME_ID=<GUID>`
2. **AdMob Console** → dört kimliği al:
   - `.env.local` → `NEXT_PUBLIC_ADMOB_BANNER_ID`, `NEXT_PUBLIC_ADMOB_INTERSTITIAL_ID`,
     `NEXT_PUBLIC_ADMOB_REWARDED_ID` (reklam birimleri, `ca-app-pub-...../..........`)
   - `android/local.properties` → `admobAppId=ca-app-pub-.....~..........` (uygulama App ID'si)

   İkisi de gitignore'lu; bu değerler depoya **girmez**.
3. `npm run release:gd` ve `npm run release:android` çalıştır — **geçmeli**.
4. Bir kimliği kasten sil, tekrar çalıştır — **durmalı**. (Kapının çalıştığını kendi gözünle gör.)
5. **Firebase Console → Android uygulaması → SHA sertifika parmak izleri:**
   `2F:07:DB:3D:D6:CA:45:B3:A8:9A:EE:FD:1A:CC:5C:78:DC:5B:CA:74` kayıtlı mı?
   Play App Signing'i açtıysan Play Console → Uygulama bütünlüğü sayfasındaki **uygulama
   imzalama sertifikası** SHA-1'ini **de** ekle. Bu ikisinden biri eksikse Google ile giriş
   release build'de sessizce başarısız olur.
6. **Gerçek cihazda imzalı build**: gerçek reklam geliyor mu (test reklamı değil), UMP rıza
   akışı açılıyor mu, Google girişi çalışıyor mu. `docs/release/yayin-kontrol-listesi.md` §3.4.
7. **Play Console** → veri güvenliği formu, gizlilik politikası URL'i, Play App Signing açık.
8. **Değişiklikler commit edilmedi.** 01/02/03'ün dosyaları hâlâ commit bekliyor; bu görevin
   dosyaları onların üstüne geldi. `git status` ile gözden geçir.

---

## 5. LİDERE SORU

### 5.1 `minifyEnabled` açılsın mı? (§3.3, zorunlu soru)

**Durum.** `android/app/build.gradle` → `release { minifyEnabled false }`. Bugün paket
büyük ve kod açıkta.

**Neden ben karar vermedim.** Görev §3.3 açıkça "proje sahibine sor" diyor ve "imzalı
release APK/AAB **gerçek cihazda** denenmeden açık bırakılmaz" şartını koyuyor. Ajan
gerçek cihaza kurulum yapamaz → `00-ilkeler.md` §5.

**Seçenekler (önerim işaretli):**

- **(A) ✅ ÖNERİM — İlk yayında `false` kalsın.** Görev §3.3 zaten "bu görevin kapsamında
  zorunlu değil" diyor. ProGuard'ın kırdığı şeyler (Capacitor plugin bridge'i, AdMob
  reflection'ı, Google Auth) **yalnızca release build'de ve çoğu zaman yalnızca gerçek
  cihazda** patlar; ilk yayında taşınacak en kötü risk budur. Boyut kazancı, ilk sürümde
  ölçülen 14.7MB için hayati değil.
- **(B) Açılsın.** O zaman aynı commit'te: Capacitor/AdMob/Google Auth için `-keep`
  kuralları + imzalı AAB'nin gerçek cihazda **uçtan uca** denenmesi (giriş, reklam, günlük
  bulmaca, senkron). Deneme sende; ben kuralları yazabilirim ama sonucu doğrulayamam.

**Bu soru beklerken yayın engellenmiş değil** — `false` çalışan ve güvenli durumdur.

### 5.2 Gerçek kimlikleri ajan bilemez

`NEXT_PUBLIC_GD_GAME_ID` ve dört AdMob kimliği AdMob/GD panellerinden alınır. **Uydurmadım
ve placeholder yazmadım**; kapı bunların yokluğunu doğru şekilde raporluyor (§3.1). §4
adım 1-2 yapıldığında `release:*` yeşile döner.

---

## 6. Kapsam dışı bulgular (düzeltilmedi, not edildi)

1. **`src/contexts/AuthContext.tsx:209` içinde koda gömülü Google OAuth istemci kimliği**
   var (`|| '1041986277726-....apps.googleusercontent.com'`). Google istemci kimlikleri sır
   değil, public tanımlayıcıdır — **şiddet düşük**. Ama desen tehlikeli: env eksikken
   uygulama sessizce *başka bir projenin* istemcisine düşer ve bunu kimse fark etmez.
   Kapı artık `NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID`'yi zorunlu tutarak yayın tarafını kapattı;
   fallback'in kendisini silmek oyuncunun gördüğü davranışı değiştirebileceği için
   dokunulmadı (00-ilkeler §5).
2. **`src/services/firebase/config.ts` mock fallback'leri** aynı desen. Kapı bu değerleri
   reddediyor; kodun kendisine dokunulmadı.
3. **01 raporundaki bulgu hâlâ açık:** `syncron-worker/worker-configuration.d.ts` Firebase
   web API anahtarını literal tip olarak taşıyor. `wrangler types` ile yeniden üretilmeli.
   Bu görevin kapsamı değil.
4. **`.gitignore`'daki `.env*` kuralı**, bir `.env.example` şablonunu da dışlar. Bu yüzden
   env şablonu `docs/release/yayin-kontrol-listesi.md` ve `docs/platforms.md` içinde
   yaşıyor. Kuralı gevşetmek 01'in güvenlik kararını zayıflatacağı için **yapılmadı**.
5. 03 raporundaki `level_telemetry` boşluğu ve `routes/friends.ts` 890 satır bulguları
   hâlâ geçerli; dokunulmadı.

---

## 7. Sonraki göreve (05) not

- **Build'ler artık ~20-35 sn daha yavaş** (tip denetimi açıldı). Loglama görevinde build
  süresi ölçeceksen taban çizgisi bu.
- **`scripts/release/lib/placeholderIdentities.mjs` yeniden kullanılabilir.** 05'te "log
  çıktısında gerçek kimlik sızıyor mu?" gibi bir kontrol yazacaksan bu tespit fonksiyonunu
  kopyalama, çağır.
- **Yeni bir yayın kimliği ekleyen herkese:** kural tablosu
  `scripts/release/lib/releaseConfigRules.mjs`'tedir. Tabloda olmayan kimlik **sessizce
  doğrulanmaz**. Kod bir kimliği birden fazla kaynaktan çözüyorsa kurala `alternatives`
  eklemek zorunludur.
- **`docs/release/yayin-kontrol-listesi.md` yayın öncesi tek kapıdır.** 05 kişisel veri /
  adli iz kararlarını verdiğinde, listedeki "Play Console veri güvenliği formu" ve
  "/privacy, /kvkk, /terms veri gerçeğiyle tutarlı" satırlarını kendi çıktısına göre
  güncellemelidir.
- `next.config.ts` → `ignoreBuildErrors` **geri açılmamalıdır**. Açmak, tip denetimini
  kapatmak demektir; dosyada bu uyarı yorum olarak duruyor.
