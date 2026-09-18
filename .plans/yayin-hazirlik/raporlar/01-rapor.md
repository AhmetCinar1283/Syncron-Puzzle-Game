# 01 — Kimlik, İmzalama Anahtarı ve Konfigürasyon Hijyeni — Rapor

Tarih: 2026-09-17 · Dal: `refactor/architecture`

> **Özet:** Keystore sağlam ve doğrulandı. Güvenlik/platform konfigürasyonu (Android projesi,
> `firestore.rules`, Firebase yapılandırması, `docs/`, `electron/`) versiyon kontrolüne alındı —
> **hiçbir sır girmeden**. Anahtar yönetimi runbook'a bağlandı. Değişiklikler **stage edildi,
> commit edilmedi** — §5'teki gözden geçirme senin.

---

## 1. Proje sahibinin cevapları (§3.1)

| Soru | Cevap |
|---|---|
| `com.polimelo.syncroncap` ile Play Console'a sürüm yüklendi mi? | **Hayır, hiç yükleme yapılmadı** |
| Play App Signing etkin mi? | Yükleme olmadığı için henüz gündeme gelmedi |
| `/electron` — kullanımda mı? | **Kullanımda, git'e alındı** (`package.json` → `main: electron/main.js`) |
| `/.archive` | Dışlanmaya devam ediyor |

**İzlenecek yol:** Görev dosyasındaki tabloya göre "Henüz yükleme yapılmadı" satırı →
kayıp bugün **ucuz**, ama §3.4 yedeklemesi yine de yapılır. Bu pencere ilk yüklemeyle kapanır;
runbook §3 bunu açıkça yazıyor ve ilk yüklemede Play App Signing'in açık tutulmasını söylüyor.

## 2. Ne yapıldı

### 2.1 İmzalama anahtarı doğrulandı (§3.1b)

`D:\PROJECTS\keys\syncron-cap-keystore.jks` **yerinde ve okunabilir** (2746 bayt).
`keytool -list -v` ve `gradlew :app:signingReport` ile iki bağımsız yoldan doğrulandı;
görev dosyasındaki parmak izleriyle **birebir aynı**:

```
Alias: syncron · SHA384withRSA · 2026-09-12 → 2054-01-28
SHA-1:   2F:07:DB:3D:D6:CA:45:B3:A8:9A:EE:FD:1A:CC:5C:78:DC:5B:CA:74
SHA-256: 8D:98:C8:24:2B:5E:A5:88:8C:CF:8A:61:F4:38:92:C3:21:38:05:94:65:2B:20:37:15:CB:3E:FE:A9:BF:C9:F3
```

Geçerlilik 2054'e kadar — Play'in "en az 2033" şartını fazlasıyla karşılıyor.

### 2.2 `.gitignore` revizyonu (§3.2)

Kaldırılan kurallar: `/android`, `/firestore.rules`, `/firestore.indexes.json`,
`/firebase.json`, `/.firebaserc`, `/docs/`, `/electron`, `electron/`.

Yerine gelen, yalnızca türetilmiş ve gizli dosyaları dışlayan blok:

```gitignore
android/.gradle/   android/.idea/   android/.kotlin/
android/app/build/ android/build/   android/capacitor-cordova-android-plugins/
android/local.properties           android/keystore.properties
*.jks   *.keystore
dist-electron/
```

`.env*` kuralına **dokunulmadı** (§1.3 / ilkeler §2.3). `/.archive`, `/.claude`, `/.agent`,
`/.continue` korundu.

`*.jks` ve `*.keystore` artık repo genelinde ağ görevi görüyor — `android/foo.jks`,
`keys/upload.jks`, `some/deep/x.keystore` üçü de IGNORED olarak doğrulandı.

### 2.3 Versiyon kontrolüne alınanlar

97 dosya stage edildi:

- `firestore.rules`, `firestore.indexes.json`, `firebase.json`, `.firebaserc`
- `android/` — `build.gradle` ×2, `AndroidManifest.xml`, `settings.gradle`, `variables.gradle`,
  `gradle.properties`, gradle wrapper, `keystore.properties.example`, res/ ikon ve splash'leri,
  `MainActivity.java`, `proguard-rules.pro`
- `docs/` (33 dosya, 3.2 MB — portal görselleri dahil), yeni `docs/release/anahtar-yonetimi.md`
- `electron/` — `main.js`, `preload.js`, `dev-runner.js`

Android tarafında **girmeyenler** (doğru şekilde dışarıda): `keystore.properties`,
`local.properties`, `app/release/app-release.aab`, `app/src/main/assets/public/` (kopyalanan web
çıktısı), `capacitor.config.json` / `capacitor.plugins.json`, `capacitor-cordova-android-plugins/`,
`.idea/`, `.gradle/`, `build/`.

### 2.4 Sır sızıntısı taraması (§3.3)

**Stage öncesi kuru çalışma (`git add -A -n`)** satır satır gözden geçirildi. Eklenecekler
arasında `.jks`, `.keystore`, `keystore.properties`, `local.properties`, `.env*`,
`google-services.json`, servis hesabı JSON'u veya `.aab`/`.apk` **yok**.

**Git geçmişi taraması** (`git log -p --all`, 53 commit, 13 MB yama):

| Anahtar kelime | Sonuç |
|---|---|
| `storePassword`, `keyPassword` | 0 — keystore parolası geçmişe hiç girmemiş |
| `BEGIN RSA` / gerçek `PRIVATE KEY` bloğu | 0 — 9 eşleşmenin hepsi kodun kendi `.replace(/-----BEGIN PRIVATE KEY-----/…)` satırı |
| `service_account` | 3 — hepsi dokümantasyon örneği veya Google'ın public JWK URL'i |
| `AIza…` | **7 — gerçek bir Firebase Web API anahtarı** (bkz. §3 bulgu) |

### 2.5 `keystore.properties` davranışı (§3.5)

`android/app/build.gradle` artık üç ayrı başarısızlık durumunu ayırt ediyor ve hepsinde
**nedeni söyleyen** bir uyarı basıp release imzalamayı atlıyor (build patlamıyor):

1. `keystore.properties` yok,
2. `storeFile` boş **ya da işaret ettiği `.jks` diskte yok**,
3. `storePassword` / `keyAlias` / `keyPassword` alanlarından biri boş.

Üçü de gerçek Gradle çalıştırmasıyla test edildi. Eksik dosya senaryosunun gerçek çıktısı:

```
[signing] DIKKAT: release build IMZASIZ kalacak. Neden: anahtar dosyasi BULUNAMADI.
keystore.properties -> storeFile=D:\PROJECTS\keys\OLMAYAN-DISK.jks ;
aranan tam yol: D:\PROJECTS\keys\OLMAYAN-DISK.jks -- Harici disk takili mi?
(Windows yollarinda ters bolu CIFT yazilir: D:\\PROJECTS\\keys\\x.jks)
Bkz. docs/release/anahtar-yonetimi.md
```

Anahtar yerindeyken `:app:signingReport` release varyantını doğru `Config: release`,
`Store: D:\PROJECTS\keys\syncron-cap-keystore.jks`, `Alias: syncron` ile raporluyor.

Test sırasında `keystore.properties` geçici olarak değiştirildi ve **birebir geri yüklendi**
(`diff` ile doğrulandı).

**Yan bulgu:** `.properties` dosyasında tek ters bölü Java kaçış kuralıyla sessizce yutulur
(`D:\PROJECTS\…` → `D:PROJECTSkeys…`) ve yol göreli hâle gelip anlamsız bir konumda aranır.
Uyarı bu yüzden hem ham `storeFile` değerini hem çözülmüş tam yolu basıyor.
`keystore.properties.example` de bu kuralı yazacak şekilde güncellendi.

### 2.6 Runbook (§3.4)

`docs/release/anahtar-yonetimi.md` (158 satır) yazıldı:

- §1 — hangi sır nerede duruyor (keystore, `.env.local`, `android/local.properties`,
  `wrangler secret`), tablo hâlinde; worker sırlarının tam listesi ve `wrangler secret put` komutları
- §2.1 — sertifika parmak izleri + SHA-1'in Google Sign-In için neden gerektiği
- §2.2 — bağlayıcı yedekleme kuralı: iki ayrı yer, en az biri çevrimdışı, biri şifreli;
  dosya **ve** parolalar ayrı ayrı; yedek doğrulama komutu
- §2.3 — anahtar bulunamazsa ne olduğu (§2.5'teki davranış)
- §3 — kayıp senaryosu: bugünkü durum + Play App Signing açık/kapalı tabloları
- §4 — yeni sır eklerken kontrol listesi

Parola, API anahtarı veya reklam kimliği içermediği programatik olarak doğrulandı.

---

## 3. Ne yapılmadı ve neden

- **Git geçmişinden sır temizleme** — §4 gereği kapsam dışı. Aşağıdaki bulgu ayrı iş.
- **Yeni keystore üretimi** — §4 gereği; mevcut anahtar sağlam, gereksiz.
- **`minifyEnabled`, `versionCode`, gerçek reklam kimliği** — 04 numaralı görevin işi.
  (`versionCode 1`, `minifyEnabled false`, `local.properties`'te `admobAppId` **yok** → build
  şu an Google test App ID'sine düşüyor.)
- **Keystore'un fiilen yedeklenmesi** — ajan harici diske/kasaya kopya koyamaz. §5'te sende.
- **`.refactor/` klasörü** — ne takip ediliyor ne de ignore'lu. Kapsam dışı, not edildi.

### Bulgu: Firebase Web API anahtarı depoda ve geçmişte

- **Geçmişte:** `syncron-worker/wrangler.jsonc` `vars` bloğunda 5 commit boyunca düz metin
  olarak durmuş. HEAD'de **temizlenmiş** — bugünkü `wrangler.jsonc` doğru şekilde
  "`FIREBASE_API_KEY` is provisioned as a secret" diyor.
- **Şu anda:** `syncron-worker/worker-configuration.d.ts:12` hâlâ anahtarı **literal tip olarak**
  taşıyor (`FIREBASE_API_KEY: "AIzaSy…"`). Bu dosya `wrangler types` tarafından üretilir ve
  anahtar `vars`'tayken üretilmiş — yani **bayat**. Dosya git'te takipli.
- **Şiddet: düşük.** Aynı anahtar zaten `.env.local` → `NEXT_PUBLIC_FIREBASE_API_KEY` üzerinden
  istemci bundle'ına giriyor; Firebase web API anahtarları tasarımı gereği **public
  tanımlayıcıdır**, kimlik doğrulama sırrı değildir. Erişim kontrolünü `firestore.rules` yapar.
- **Yine de tutarsız:** `wrangler.jsonc` bu değeri sır sayıyor, `worker-configuration.d.ts`
  deşifre ediyor. §3.3 "temizleme ayrı iş" dediği için **düzeltilmedi**.
- **Önerilen ayrı iş:** `cd syncron-worker && wrangler types` ile dosyayı yeniden üret (tip
  `string`'e döner), sonra geçmiş temizliği gerekip gerekmediğine karar ver. Anahtarı Google
  Cloud Console'da **HTTP referrer / paket adı kısıtına** bağlamak, geçmiş temizlemekten daha
  değerlidir.

---

## 4. Doğrulama (§2.1 tablosu — gerçek çıktılar)

| Kontrol | Komut | Sonuç |
|---|---|---|
| App tip denetimi | `npx tsc --noEmit` | ✅ exit 0, hatasız |
| App testleri | `npm test` | ✅ **86/86** (16 dosya) |
| Worker tip denetimi | `cd syncron-worker && npx tsc --noEmit` | ✅ exit 0, hatasız |
| Worker testleri | `cd syncron-worker && vitest run --root .` | ✅ **135/135** (12 dosya) |
| CrazyGames build | `npm run build:crazygames` | ✅ 95 dosya, 3.37 MB → `dist-portals\crazygames.zip` |
| GameDistribution build | `npm run build:gd` | ✅ 95 dosya, 3.37 MB → `dist-portals\gamedistribution.zip` |
| Android build | `npm run build:mobile` | ✅ `cap sync` 4.585 s, 4 plugin |

> Not: Worker testleri kök dizinden `npx vitest run` ile çalıştırıldığında npx kök projenin
> vitest'ine düşüp app testlerini (86) çalıştırıyor. Doğru komut worker dizininde
> `./node_modules/.bin/vitest run --root .` — 135 testi bu şekilde alınır.

### Kabul kriterleri

| Kriter | Durum |
|---|---|
| §3.1 soruları soruldu, cevaplar rapora yazıldı | ✅ §1 |
| `git ls-files`'ta 8 pozitif dosya görünüyor | ✅ hepsi VAR (+ `electron/main.js`, `docs/release/anahtar-yonetimi.md`) |
| `git ls-files`'ta hiç `.jks` / `.keystore` / `keystore.properties` / `local.properties` / `.env*` / servis hesabı JSON'u yok | ✅ tarama boş döndü |
| `git check-ignore .env.local` → IGNORED | ✅ `.gitignore:38:.env*` |
| `docs/release/anahtar-yonetimi.md` yazıldı, parola yok | ✅ programatik doğrulandı |
| Keystore yoksa `assembleRelease` anlaşılır uyarı veriyor | ✅ 3 senaryo Gradle ile test edildi |
| §2.1 tablosundaki yedi kontrol yeşil | ✅ yukarıdaki tablo |
| Bu rapor yazıldı | ✅ |

`cap sync` çalıştıktan **sonra** da `android/` altında ne takipsiz yeni dosya ne de stage dışı
değişiklik kaldı — yani günlük `build:mobile` akışı artık gürültü üretmiyor.

---

## 5. Elle kontrol listesi (senin yapman gerekenler)

1. **`git status` ile 97 stage'li dosyayı gözden geçir**, sonra commit et. Beklenmedik bir şey
   görürsen commit'ten önce söyle. (Bilinçli olarak commit atılmadı.)
2. **Keystore'u fiilen iki yere yedekle** — `docs/release/anahtar-yonetimi.md` §2.2:
   - kopya 1: çevrimdışı (USB/harici disk/kasa),
   - kopya 2: şifreli (parola korumalı arşiv veya parola yöneticisi eki),
   - `storePassword` / `keyPassword` / `keyAlias` üçlüsünü **ayrı** yerde sakla,
   - yedeği `keytool -list -v -keystore <yedek>` ile doğrula, SHA-256 §2.1'dekiyle aynı olmalı.

   *Play'e ilk yüklemeden önce bitmiş olsun.*
3. **Play Console → Uygulama bütünlüğü** → ilk yüklemede **Play App Signing'i açık tut.**
   Bu, "anahtar kaybı = uygulama sonsuza dek güncellenemez" senaryosunu kalıcı olarak kapatır.
4. **Firebase Console → Android uygulaması → SHA sertifika parmak izleri**: SHA-1
   `2F:07:DB:3D:D6:CA:45:B3:A8:9A:EE:FD:1A:CC:5C:78:DC:5B:CA:74` kayıtlı mı? Değilse Google
   Sign-In release build'de çalışmaz. (04 numaralı görevin kontrol listesinde de var.)
5. **Google Cloud Console → API anahtarları**: Firebase web anahtarını HTTP referrer + Android
   paket adı kısıtına bağla (§3'teki bulgu).

---

## 6. Sonraki göreve not

**02 (veri dayanıklılığı) için:** `firestore.rules` artık versiyon kontrolünde — güvenlik
kuralı değişikliği yapacaksan diff'i görünür olacak. Kuralları gevşeten her değişiklik ayrı ve
gerekçeli bir commit olsun.

**04 (yayın kimlik doğrulama) için devredilen bilgiler:**

- SHA-1 `2F:07:DB:3D:D6:CA:45:B3:A8:9A:EE:FD:1A:CC:5C:78:DC:5B:CA:74` → Firebase Console'a
  eklenmesi gereken parmak izi (§3.4 kontrol listesi).
- `android/local.properties` içinde `admobAppId` **tanımlı değil** → build şu an Google test App
  ID'sine düşüyor ve `[admob] DIKKAT … GELIR URETMEZ` uyarısı basıyor.
- `versionCode 1`, `versionName "1.0"`, `minifyEnabled false` — üçü de dokunulmadan duruyor.
- `android/app/build.gradle` artık `keystoreFile` / `keystoreSkipReason` değişkenlerini
  kullanıyor; imzalama bloğuna dokunacaksan §2.5'teki üç senaryoyu bozmamaya dikkat et.
- `docs/platforms.md` ve `docs/release/anahtar-yonetimi.md` artık git'te — kimlik kurulumunu
  oraya yaz.
