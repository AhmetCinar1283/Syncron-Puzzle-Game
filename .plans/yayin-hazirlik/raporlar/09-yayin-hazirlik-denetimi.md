# 09 — Yayın Hazırlık Denetimi (kod + depo)

Tarih: 2026-09-23 · Branch: `refactor/architecture` · **Hiçbir dosya değiştirilmedi.**
Her sayı, yanındaki komutla ölçüldü. Emin olunamayan yerlerde "doğrulanamadı" yazıyor.

**Biliniyor, tekrar araştırılmadı:** Play Console / AdMob / Firebase panel işleri (release SHA-1,
gerçek reklam kimlikleri, veri güvenliği formu, App Signing); `.plans/yayin-hazirlik/notlar.md`
§1–§4 ertelenmiş kararlar; `routes/friends.ts` (890+ satır), `AuthContext.tsx:209` OAuth fallback,
`worker-configuration.d.ts` gömülü anahtar, `internalLog.ts` `any[]`.

---

## ÖZET — en kritik 5 bulgu

| # | Bulgu | Şiddet |
|---|---|---|
| A | `public/sw.js` üçüncü parti reklam ağı service worker'ı (`3nbf4.com`) — web export'a **ve APK assets'ine** giriyor | YAYIN ENGELİ |
| B | Kök `npm test` **tamamen çökük**: 51 test dosyası, 0 test koşuyor | YAYIN ENGELİ |
| C | Play mağaza görselleri (feature graphic, ekran görüntüleri) ve Play formatlı açıklama metni depoda **yok** | YAYIN ENGELİ (Play) |
| D | `public/sounds/box_push.mp3` git'te **takipsiz**, `box_push.flac` silinmiş → HEAD'den klonlayan build'de ses 404 | YÜKSEK |
| E | `@codetrix-studio/capacitor-google-auth@3.4.0-rc.4` peer `@capacitor/core@^6`, projede **8.3.0** + RC sürüm | YÜKSEK |

---

## 1. Mağaza varlıkları

**Durum: Android ikon/splash TAM; Play mağaza kaydı varlıkları HİÇ YOK.**

### Var olanlar (kanıt: `find android/app/src/main/res -type f`)

| Varlık | Durum |
|---|---|
| `mipmap-{m,h,xh,xxh,xxxh}dpi/ic_launcher{,_round,_foreground}.png` | 5 yoğunluk × 3 dosya = 15 dosya, **hepsi var** |
| `mipmap-anydpi-v26/ic_launcher.xml` (adaptive icon) | var — `<background>`+`<foreground>` |
| `drawable-{port,land}-{m..xxxh}dpi/splash.png` + `drawable/splash.png` | 11 dosya, **hepsi var** |
| Portal görselleri `docs/portals/assets/` | CrazyGames `cover-1200x675` + `icon-512`; GD `cover-1280x720`, `cover-720x480`, `icon-512`; master kaynaklar (1920x1080 cover, 1024x1024 icon, 1080x1920 splash) + HTML şablonları |
| Web/OG | `public/og-image.png` (1200x630, `src/app/layout.tsx:59-66`), `icon-192/512.png`, `apple-touch-icon.png`, `favicon.ico` |
| Açıklama metni | `docs/game-description.md` (**yalnızca TR**), `docs/portals/portal-kit.md` §2 (**TR + EN**, portal formatında) |

İkonlar Capacitor varsayılanı değil, gerçek tasarım (26 KB / xxxhdpi, 2026-09-12 tarihli).

### Olmayanlar

| Eksik | Kanıt |
|---|---|
| **Play feature graphic 1024×500** | `grep -rn "1024x500\|feature graphic" docs -i` → 0 sonuç; depoda böyle bir görsel yok |
| **Play telefon ekran görüntüleri (min 2, önerilen 4-8)** | `find . -ipath "*screenshot*"` → 0 sonuç |
| **Play tablet / 7"–10" ekran görüntüleri** | yok |
| **Play tanıtım videosu (YouTube)** | yok |
| **Play formatlı metin: başlık ≤30, kısa açıklama ≤80, tam açıklama ≤4000; TR + EN** | yok. `docs/game-description.md` TR ve serbest formatta; `portal-kit.md` EN var ama portal formatında |
| **Adaptive icon `<monochrome>` katmanı** (Android 13+ temalı ikon) | `cat mipmap-anydpi-v26/ic_launcher.xml` → yalnızca background+foreground. Kozmetik, engel değil |
| **`store/`, `marketing/`, `fastlane/` klasörü** | `find . -maxdepth 3 -type d -iname "store*" -o -iname "market*" -o -iname "fastlane"` → yalnızca `./src/store` (Redux) |

**Ne yapılmalı:**
- Feature graphic + ekran görüntüleri → **proje sahibi** (ajan görsel üretemez; ama `docs/portals/assets/templates/*.html` + `scripts/portal/generate-assets.mjs` altyapısı var, ajan aynı boru hattıyla 1024×500 şablonu **yazabilir**).
- Play formatlı TR+EN metin (başlık/kısa/tam) → **ajan yazabilir**, sahibi onaylar. `docs/store/play-listing.md` gibi tek dosya önerilir.

---

## 2. Web yayını

**Durum: Deploy hedefi depoda YAPILANDIRILMAMIŞ — yalnızca dokümanda yazıyor.**

| Kontrol | Sonuç | Kanıt |
|---|---|---|
| Firebase Hosting | **yok** | `firebase.json` yalnızca `firestore` + `functions` anahtarlarını içerir, `hosting` yok |
| `vercel.json` | yok | dosya mevcut değil |
| CI/CD (GitHub Actions vb.) | **yok** | `find . -maxdepth 2 -name "*.yml"` → yalnızca `electron-builder.yml` ve `dist-electron/` artefaktları; `.github/` klasörü yok |
| Cloudflare Pages yapılandırması | **kodda yok** | `public/_headers` ve `public/_redirects` yok; kökte `wrangler.*` yok (yalnızca `syncron-worker/wrangler.jsonc` — o Worker, site değil) |
| Tek kaynak | `docs/platforms.md:30-34` "Web (Cloudflare Pages) … Deployed automatically" — **depoda bunu kanıtlayan hiçbir dosya yok**. Panelden bağlanmış bir Pages projesi olabilir; **doğrulanamadı** |

**Build çıktısı:** `next.config.ts` → `output:'export'`, `trailingSlash:true` → `out/` statik.

### Domain ve hukuki sayfalar

- Hedef domain kodda 3 yerde sabit: `src/app/layout.tsx:19` `BASE_URL='https://syncron.polimelo.com'`, `public/robots.txt`, `public/sitemap.xml`. Worker `ALLOWED_ORIGIN`'inde de var (`syncron-worker/wrangler.jsonc`).
- DNS **var ve Cloudflare'e işaret ediyor**: `nslookup syncron.polimelo.com` → `104.21.12.118`, `172.67.152.73` (Cloudflare).
- `curl http://syncron.polimelo.com/` → **HTTP 503**. HTTPS bu ortamdan ölçülemedi (`https://www.cloudflare.com/` de aynı hatayı veriyor → sandbox TLS engeli). **Site canlı mı, doğrulanamadı** — proje sahibi tarayıcıdan bakmalı.
- `/privacy`, `/kvkk`, `/terms` **statik export'ta üretiliyor** (`ls out/kvkk/index.html` → var) ve portal build'lerine de dahil (`src/app/_portal/portalRoutes.tsx:44-46`). Yani oyun içinden erişiliyor; **herkese açık URL'den servis edilip edilmediği site canlı olmadan doğrulanamaz.** Play Console gizlilik politikası URL'i olarak `https://syncron.polimelo.com/privacy/` verilecekse bu adresin 200 dönmesi ZORUNLU.
- `https://polimelo.com/app-ads.txt` → **404** (ölçüldü). `docs/platforms.md` bunu AdMob için şart koşuyor. `public/ads.txt` depoda var (`google.com, pub-3798429741438186, DIRECT, ...`) ama o **oyun domaini için ads.txt**, geliştirici sitesi için `app-ads.txt` değil.

**Ne yapılmalı:**
- Cloudflare Pages projesini bağla / doğrula, `syncron.polimelo.com` 200 dönsün → **proje sahibi**.
- `polimelo.com/app-ads.txt` yayınla → **proje sahibi**.
- Deploy yöntemini depoda yazılı hale getir (Pages proje adı, build komutu, output dizini) → **ajan** (`docs/platforms.md` güncellemesi).

---

## 3. Platform build'leri

**Durum: SDK'lar gerçekten bağlı, iskelet değil. Kimlikler eksik.**

| Komut | `NEXT_PUBLIC_PLATFORM` | Sağlayıcı | Ek adım |
|---|---|---|---|
| `build` | `web` | **noop — reklamsız** | — |
| `build:mobile` | `android` | AdMob (`@capacitor-community/admob`) | `npx cap sync` |
| `build:crazygames` | `crazygames` | CrazyGames SDK v3 | `assetPrefix:'./'`, `package-portal.mjs` → zip |
| `build:gd` | `gamedistribution` | GameDistribution SDK | aynı + `NEXT_PUBLIC_GD_GAME_ID` |

Portal build'lerinin web'den farkı (`next.config.ts:5-6`, `capabilities.ts`): göreli asset yolu, tek `index.html` + bellek içi router (`_portal/portalRoutes.tsx` — 10 rota), giriş UI'ı kapalı, üçüncü parti script yok, banner yok, bağış/satın alma yok.

### SDK bağlantıları gerçek mi? EVET

- `providers/crazygames/loadCrazyGamesSdk.ts:8` → `https://sdk.crazygames.com/crazygames-sdk-v3.js`
- `providers/gamedistribution/loadGdSdk.ts:9` → `https://html5.api.gamedistribution.com/main.min.js`
- Her ikisinin de birim testi var (`crazyGamesProvider.test.ts`, `gameDistributionProvider.test.ts`) — **ama şu an koşmuyorlar, bkz. §4-B.**

### Kimlik kapısı ölçümü (`node scripts/release/verify-release-config.mjs <platform>`)

| Platform | Sonuç |
|---|---|
| `web` | ✓ 7/7 kimlik tamam |
| `crazygames` | ✓ 7/7 (CrazyGames ayrı kimlik istemiyor) |
| `gamedistribution` | ✗ **`NEXT_PUBLIC_GD_GAME_ID` yok** → `build:gd` test GUID'iyle sahte reklam gösterir |
| `android` | ✗ **4 eksik**: `NEXT_PUBLIC_ADMOB_BANNER_ID`, `..._INTERSTITIAL_ID`, `..._REWARDED_ID`, `admobAppId` |

Kanıt (bağımsız): son üretilen release manifest'i hâlâ Google'ın **test** App ID'sini taşıyor —
`grep -o 'ca-app-pub-[0-9~/]*' android/app/build/intermediates/merged_manifest/release/processReleaseMainManifest/AndroidManifest.xml` → `ca-app-pub-3940256099942544~3347511713`.
`NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID` kapıda hata vermedi → **tanımlı**.

### Reklam/gelir durumu platform bazında

- **Web sürümü hiç reklam göstermiyor ve satın alma da yok** → gelir 0. `capabilities.ts` `web.{interstitial,rewarded,banner}Ads = false`; `layout.tsx:27` `ADSENSE_ENABLED = false`; `providers/adsense.draft.ts` taslak halinde. Bilinçli (AdSense onayı bekleniyor) ama "her şey hazır" hedefine göre açık bir boşluk.
- **"Reklamları Kaldır" satın alımı yok.** `services/monetization/offer.ts` → `purchasable: false`, fiyat `'₺49,99'` yer tutucu; `entitlement.ts` → `adFreeSource = () => false`, `setAdFreeSource` hiçbir yerden çağrılmıyor. `.plans/monetization/07-reklamlari-kaldir.md` planı var, **raporu yok** (`ls .plans/monetization/raporlar/` → 01,03,04,05,06). Kullanıcıya `tr.ts:372` "Reklamsız paket çok yakında!" gösteriliyor.
- **Android'de bağış kapalı** (`capabilities.android.donations=false`, `CapacitorBlockedView.tsx`) — Play politikasına uygun, doğru.

### Merged manifest izinleri (ölçüldü)

`INTERNET, ACCESS_NETWORK_STATE, VIBRATE, WAKE_LOCK, FOREGROUND_SERVICE, USE_CREDENTIALS, com.google.android.gms.permission.AD_ID, ACCESS_ADSERVICES_{AD_ID,ATTRIBUTION,TOPICS}`.
`AD_ID` var (AdMob için gerekli, doğru). Manifest'te **hiç `<service>` tanımlı değil** (`grep -c foregroundServiceType` → 0) ama `FOREGROUND_SERVICE` izni eklentilerden miras geliyor — Play Console'un ek beyan isteyip istemeyeceği **doğrulanamadı**.

**Ne yapılmalı:** Eksik kimlikler → **proje sahibi** (`.env.local`, `android/local.properties`). AdSense kararı → **proje sahibi**. Görev 07 (IAP) uygulanacaksa → **ajan** (plan hazır).

---

## 4. Testi olmayan alanlar

### B) ÖNCE ŞU: kök test paketi tamamen çökük

```
$ npx vitest run --reporter=dot
 Test Files  51 failed (51)
      Tests  no tests
TypeError: Cannot read properties of undefined (reading 'config')   ← her dosyada, describe() satırında
```

- **Test kodu suçlu değil.** `src/__tmpdiag__/diag.test.ts` adında 2 satırlık boş bir test yazıldı (`describe('x',()=>it('y',()=>expect(1).toBe(1)))`) — **aynı hatayı verdi**, sonra silindi. Altyapı/bağımlılık seviyesinde bir kırılma.
- `syncron-worker` tarafı **sağlam**: `cd syncron-worker && npx vitest run` → **19 dosya / 263 test PASS** (32.3 sn).
- `npx tsc --noEmit` → **temiz** (exit 0).
- Bağımlılık ipuçları: `vitest@5.0.0`, `vite@8.3.0`, node v22.22.0. `npm ls --all` içinde `@types/node@20.19.37 invalid: "^22.0.0 || >=24.0.0" from node_modules/vitest`. **Kök neden kesin olarak doğrulanamadı** (`@vitest/runner` vitest 5'te artık bağımlılık değil, eksikliği normal).
- `.plans/yayin-hazirlik/raporlar/07-vitest-onarim-rapor.md` aynı belirtiyi "reprodüksiyon yok, muhtemelen geçici" diye kapatmış. **Belirti geri geldi ve artık kalıcı.** O rapordan bu yana test dosyası sayısı 19 → 51 oldu.
- Sonuç: `docs/release/yayin-kontrol-listesi.md` §0'daki "`npm test` — hepsi yeşil" maddesi **bugün geçilemez**.

### Hiç otomatik testi olmayan kritik akışlar

Kanıt: `find src -name "*.test.ts*"` (34 dosya) ile aşağıdakilerin kesişimi boş.

| Akış | Test | Not |
|---|---|---|
| Satın alma / IAP ("reklamları kaldır") | **kod yok, test yok** | `offer.ts`, `entitlement.ts` testsiz |
| Bağış (Lemon Squeezy) — istemci | **yok** | `src/features/donate/**` hiç test yok |
| Bağış — sunucu | kısmi | `syncron-worker/test/donorApi.spec.ts` var; `src/routes/store.ts` (webhook) için ayrı spec **yok** (`grep -ril lemon syncron-worker/test` → donorApi, securityEvents) |
| Reklam gösterimi — orkestrasyon | **yok** | `adService.ts` testsiz. Sağlayıcı bazında test var (admob/cg/gd) ama koşmuyor (bkz. B) |
| UMP / rıza akışı | **yok** | `providers/admob/admobConsent.ts` testsiz |
| Google girişi | **yok** | `src/contexts/AuthContext.tsx` testsiz; `src/contexts/` altında hiç test dosyası yok |
| Çevrimdışı oynama / Dexie | **yok** | `src/services/db/` (7 dosya) altında hiç `.test.ts` yok |
| Veri senkronizasyonu (D1 ↔ Dexie) | **yok** | `FirestoreSync.tsx`, `useLevelCompletion.ts` testsiz |
| Herhangi bir React bileşeni | **yok** | `vitest.config.mts` → `environment:'node'`; `package.json`'da jsdom/happy-dom/testing-library **yok** |
| Uçtan uca (E2E) | **yok** | playwright/cypress bağımlılığı yok |

Kapsanan taraf (dürüst olmak gerekirse geniş): oyun motoru render katmanı (19 test dosyası), reklam sıklığı politikası, ödüllü erişim politikası, skor/ilerleme hesapları, portal paket sınırları, release kimlik kapısı, ses motoru, navigasyon.

### "Ancak gerçek cihazda / gerçek hesapla doğrulanabilir" olanlar

Bunlar için test yazmanın anlamı yok; kontrol listesine madde olarak girmeli:

1. İmzalı release AAB'de **Google ile giriş** (release SHA-1 + Play App Signing sertifikası Firebase'e ekli mi).
2. **Gerçek AdMob reklamı** gelmesi: banner + geçiş + ödüllü (test reklamı değil).
3. **UMP rıza formu** gerçek coğrafyada açılıyor mu, seçim kalıcı mı, `/privacy` içindeki "reklam tercihlerini değiştir" butonu görünüyor mu.
4. Banner'ın WebView üstüne çizilmesi → `--ad-banner-height` / `.ad-banner-inset` düzeni gerçek ekranda bozuluyor mu.
5. Çevrimdışı: uçak modunda daha önce açılmış bölüm oynanabiliyor mu, tekrar bağlanınca skor senkronize oluyor mu.
6. Lemon Squeezy gerçek ödemesi → `/great-supporter` polling'i hakkı gerçekten aktive ediyor mu.
7. Play internal testing track'te kurulum, ilk açılış, splash→menü geçişi, geri tuşu davranışı.
8. `minifyEnabled` açılacaksa reflection kullanan her şey (bkz. `notlar.md` §3).

---

## 5. Sürüm yönetimi

**Durum: Tamamen ELLE. Otomasyon yok.**

- Kaynak: `android/app/build.gradle` → `versionCode 1`, `versionName "1.0"` (sabit literal; `versionCode` için hiçbir env/gradle property okuması yok — `grep -n versionCode android/app/build.gradle`).
- Doğrulama: son merged release manifest → `android:versionCode="1" android:versionName="1.0"`.
- Yordam `docs/release/yayin-kontrol-listesi.md` §3.2'de yazılı ve doğru.
- **Tutarsızlık:** aynı yordamın 3. maddesi "`package.json` `version` alanını `versionName` ile hizalı tut" diyor; `package.json` → `"version": "0.3.0"`, `versionName` → `"1.0"`. **Şu an hizasız.** Electron dağıtımları `package.json`'u kullanır (`electron-builder.yml`).
- Kimse `versionCode`'u artırmayı unutursa Play yüklemeyi reddeder; hata build zamanında değil yükleme zamanında görülür.

**İkinci sürüm yüklerken:** (1) `versionCode` +1, (2) `versionName` güncelle, (3) `package.json.version` hizala, (4) **build almadan önce commit et**, (5) `npm run release:android` kapısını geç, (6) `bundleRelease` çıktısındaki `[admob]`/`[signing]` uyarılarını oku.

**Ne yapılmalı:** `versionCode`'u `package.json` + tek bir `android/version.properties`'ten türeten küçük bir gradle okuması veya bir `scripts/release/bump-version.mjs` → **ajan yapabilir** (isteğe bağlı, 30 dk'lık iş). En azından `package.json` ↔ `versionName` hizalaması → **ajan**.

---

## 6. Kimsenin fark etmediği diğer şeyler

### 6.1 `public/sw.js` — üçüncü parti reklam ağı service worker'ı **(yayın engeli)**

```js
// public/sw.js — dosyanın TAMAMI (6 satır)
self.options = { "domain": "3nbf4.com", "zoneId": 11343110 }
self.lary = ""
importScripts('https://3nbf4.com/act/files/service-worker.min.js?r=sw')
```

- Uygulama kodunda **hiçbir yerde kayıt edilmiyor** (`grep -rn "serviceWorker" src` → 0 sonuç), yani muhtemelen unutulmuş bir kalıntı.
- Ama `public/` doğrudan çıktıya kopyalanıyor: `out/sw.js` **var** ve `android/app/src/main/assets/public/sw.js` **var** (ikisi de 156 byte, 2026-07-18). Yani **bu dosya APK'nın içinde**.
- `git log --oneline -- public/sw.js` → `d59f9b5 "levels eskisi öncesi"` — commit'li, kasıtsız görünüyor.
- Risk: Google Play, APK içindeki bilinmeyen bir reklam/push ağı SDK referansını "İstenmeyen Mobil Yazılım" veya açıklanmamış üçüncü parti veri toplama olarak işaretleyebilir; web tarafında da `/sw.js` adresinden herkes tarafından çekilebilir durumda. Gizlilik politikanızda bu ağ **geçmiyor**.
- Portal zip'lerinde **yok** (`package-portal.mjs` yalnızca `index.html`, `_next/`, `sounds/`, favicon kopyalıyor; `ls out-gamedistribution/sw.js` → yok). Yani yalnızca web + Android etkileniyor.

**Ne yapılmalı: `public/sw.js` sil. → ajan (tek satırlık iş, ama önce proje sahibi "bunu ben mi koydum?" diye onaylamalı).**

### 6.2 `box_push` sesi git'te kırık **(yüksek)**

`git status`: `D public/sounds/box_push.flac` (silinmiş, commit edilmemiş) + `?? public/sounds/box_push.mp3` (takipsiz).
`src/services/audio/registry.ts:62` → `file('/sounds/box_push.mp3', ...)`.
Bu depoyu bugün HEAD'den klonlayan (veya CI) `box_push.mp3`'ü **alamaz** → kutu itme sesi 404.
**Ne yapılmalı: `box_push.mp3`'ü ekleyip `.flac` silmesini commit et → ajan/proje sahibi.**

### 6.3 `public/sounds/_backup_original/` build'e sızıyor

320 KB (7 dosya), git'te takipsiz ama `.gitignore`'da da **yok** → `public/` kopyalandığı için `out/` ve APK'ya giriyor. `du -sh public/sounds/_backup_original` → 320K (toplam `public/` = 807K, yani **%40'ı çöp**).
**Ne yapılmalı: klasörü `public/` dışına taşı veya `.gitignore` + build hariç tutması ekle → ajan.**

### 6.4 Capacitor Google Auth eklentisi sürüm uyumsuzluğu **(yüksek)**

`npm ls --all` → `@capacitor/core@8.3.0 deduped invalid: "^6.0.0" from node_modules/@codetrix-studio/capacitor-google-auth`.
Ayrıca sürüm `3.4.0-rc.4` — **release candidate**, yayına giriyor.
Android'de Google girişinin tek yolu bu eklenti (`AuthContext.tsx:206-219`). Capacitor 6→8 arasında native köprü API'si değişmiş olabilir; bu **ancak imzalı build'de gerçek cihazda** görülür (§4'teki liste madde 1 ile birleşiyor).
**Ne yapılmalı: gerçek cihazda Google girişini dene; kırılırsa `@capacitor/google-auth` resmi eklentisine veya `@capacitor-firebase/authentication`'a geçiş değerlendir → proje sahibi test eder, ajan geçişi yapar.**

### 6.5 `npx eslint .` → 356 sorun (273 hata, 83 uyarı)

Build'i **durdurmuyor** (Next 16 build sırasında lint koşmuyor; `next.config.ts`'te de lint ayarı yok). Dağılım:

| Kural | Hata |
|---|---|
| `@typescript-eslint/no-explicit-any` | 193 |
| `@typescript-eslint/no-require-imports` | 27 |
| **`react-hooks/set-state-in-effect`** | **22** |
| `prefer-const` | 10 |
| `react-hooks/refs` | 7 |
| `react/no-unescaped-entities` | 6 |
| `react-hooks/purity` | 5 |
| `react-hooks/immutability` | 2 |

Çoğu `any` worker testlerinde (`test/friendsApi.spec.ts` 21, `test/badgesApi.spec.ts` 14) — kozmetik.
Ama **22 `set-state-in-effect` + 5 `purity` + 2 `immutability`** React 19 altında gerçek davranış hatası (gereksiz render döngüsü, concurrent mode'da yanlış sonuç) işaret edebilir; en yoğun yerler `src/features/friends/hooks/useFriends.ts` (10), `src/game-engine/solver/generator.ts` (15, çoğu `any`).
Ayrıca `functions/lib/index.js` (derlenmiş artefakt) lint'e giriyor — `eslint.config.mjs`'te ignore edilmemiş.
**Ne yapılmalı: `react-hooks/*` hatalarını tek tek incele → ajan. `any` temizliği yayın engeli değil, erteленebilir.**

### 6.6 `docs/platforms.md` gerçekle uyuşmuyor

`docs/platforms.md:39` → `appId: 'com.syncron.app'`, `androidScheme: 'https'`.
Gerçek `capacitor.config.ts:5` → `appId: 'com.polimelo.syncroncap'`, `androidScheme` **hiç yok** (varsayılana düşüyor).
Ayrıca `android/app/build.gradle` `namespace = "com.polimelo.syncron.app"` ama `applicationId "com.polimelo.syncroncap"` — ikisi farklı, teknik olarak geçerli ama Play'de görünen paket adı `com.polimelo.syncroncap` olacak ve **bir kez yayınlandıktan sonra asla değiştirilemez**. Sahibin bu adı bilerek seçtiğinden emin olması gerekir.
**Ne yapılmalı: paket adını onayla (proje sahibi, GERİ DÖNÜŞSÜZ); dokümanı düzelt (ajan).**

### 6.7 `android/app/release/app-release.aab` diskte duruyor

4.9 MB, 2026-06-25 tarihli, `android/.gitignore:7 *.aab` ile korunuyor (git'e girmez). Ama **3 ay önceki bir build** — yanlışlıkla Play'e yüklenirse test AdMob ID'li, eski kodlu bir sürüm çıkar. Yayın öncesi silinmeli. → **proje sahibi**

### 6.8 `functions/` klasörü hâlâ deploy zincirinde

`firebase.json` `functions.predeploy` → `npm --prefix functions run build`. `firebase deploy` çalıştıran biri Cloud Functions'ı da dağıtır. Sunucu mantığı Cloudflare Worker'a taşınmış görünüyor; `functions/`'ın hâlâ canlı olup olmadığı **doğrulanamadı** — ölü kodsa kaldırılmalı, canlıysa kontrol listesine deploy adımı eklenmeli. → **proje sahibi netleştirir**

---

## YAPILACAKLAR — öncelik sırası

### A. Bölümler bitmeden önce halledilmesi gerekenler

| # | İş | Kim |
|---|---|---|
| 1 | **`public/sw.js` sil** (3nbf4.com reklam SW'si, APK içinde) | ajan — sahibi onaylasın |
| 2 | **Kök `npm test`'i onar** — 51 dosya/0 test; bağımlılık grafiği (`@types/node` 20→22, vitest/vite) | ajan |
| 3 | **`box_push.mp3` ekle + `.flac` silmesini commit et** | ajan |
| 4 | `public/sounds/_backup_original/` klasörünü `public/` dışına taşı | ajan |
| 5 | **Paket adını onayla**: `com.polimelo.syncroncap` (geri dönüşsüz) | proje sahibi |
| 6 | `react-hooks/set-state-in-effect` (22) + `purity`/`immutability` (7) hatalarını incele/düzelt | ajan |
| 7 | Play formatlı TR+EN mağaza metni yaz (`docs/store/play-listing.md`: başlık ≤30, kısa ≤80, tam ≤4000) | ajan yazar, sahibi onaylar |
| 8 | Feature graphic 1024×500 üretimi için `docs/portals/assets/templates/` boru hattına şablon ekle | ajan |
| 9 | `package.json.version` ↔ `versionName` hizala; `versionCode` bump script'i (opsiyonel) | ajan |
| 10 | `docs/platforms.md` düzelt (appId, androidScheme, Cloudflare Pages deploy yöntemi yazılı hale) | ajan |
| 11 | Web deploy hattını doğrula: Cloudflare Pages projesi bağlı mı, `syncron.polimelo.com` 200 mü (HTTP 503 ölçüldü, HTTPS doğrulanamadı) | proje sahibi |
| 12 | `polimelo.com/app-ads.txt` yayınla (şu an **404**) | proje sahibi |
| 13 | `functions/` canlı mı, ölü mü — netleştir | proje sahibi |
| 14 | **Karar:** "Reklamları Kaldır" satın alımı (görev 07) yayına yetişecek mi? Yetişmeyecekse "çok yakında" metniyle çıkılacağı bilinçli kabul edilmeli | proje sahibi |
| 15 | **Karar:** Web sürümü reklamsız/gelirsiz mi çıkacak (AdSense kapalı)? | proje sahibi |

### B. Bölümler bitince yapılacaklar

| # | İş | Kim |
|---|---|---|
| 1 | Feature graphic + 4–8 telefon ekran görüntüsü + (varsa) tanıtım videosu üret | proje sahibi |
| 2 | Gerçek kimlikleri `.env.local` / `android/local.properties`'e gir; `verify:release` 4 platformda da ✓ olana kadar tekrarla (bugün `gd` 1, `android` 4 eksik) | proje sahibi |
| 3 | `android/app/release/app-release.aab` (eski, 2026-06-25) sil | proje sahibi |
| 4 | `versionCode` +1, `versionName` belirle, commit → sonra build | proje sahibi |
| 5 | İmzalı AAB → internal testing; **gerçek cihazda**: Google girişi (RC eklenti + Capacitor 8 uyumsuzluğu riski), gerçek reklam ×3, UMP formu, banner düzeni, çevrimdışı tur, geri tuşu | proje sahibi |
| 6 | Release SHA-1 + Play App Signing sertifika SHA-1 → Firebase (biliniyor) | proje sahibi |
| 7 | Play Console: veri güvenliği formu, yaş/reklam beyanı, gizlilik URL'i (biliniyor) | proje sahibi |
| 8 | `npm run release:crazygames` / `release:gd` → zip'leri `serve:portal` ile oynayarak doğrula, portallara başvur | proje sahibi |
| 9 | Worker deploy + D1 migration + `SECURITY_IP_SALT` sırrı (`yayin-kontrol-listesi.md` §0) | proje sahibi |
| 10 | Yayın sonrası ilk 48 saat kontrolleri (`yayin-kontrol-listesi.md` §4) | proje sahibi |
