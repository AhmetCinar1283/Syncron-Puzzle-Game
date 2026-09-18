# Platforms

## Reklam Adaptörü ve `NEXT_PUBLIC_PLATFORM`

Her build/dev komutu `NEXT_PUBLIC_PLATFORM` env değerini set eder; bu değer, build-time
tek bir yerde (`src/services/monetization/providerRegistry.ts`) hangi reklam
sağlayıcısının kullanılacağını belirler. Uygulamanın geri kalanı platform adını
değil `getCapabilities()` ile dönen yetenek nesnesini sorgular.

| Değer | Kullanıldığı komut | Sağlayıcı (bu görevde) |
|---|---|---|
| `web` | `npm run dev`, `npm run build` | noop (reklamsız) |
| `android` | `npm run build:mobile` | AdMob (`@capacitor-community/admob`) |
| `electron` | `npm run electron:*` | noop (reklamsız) |
| `crazygames` | `npm run build:crazygames` | CrazyGames HTML5 SDK v3 |
| `gamedistribution` | `npm run build:gd` | GameDistribution SDK |
| `mock` | `npm run dev:mock` | sahte sağlayıcı — bkz. `src/services/monetization/README.md` |

## Web (Cloudflare Pages)

- `npm run build` → `next build` → static export to `out/`
- `next.config.ts`: `output: 'export'`, `trailingSlash: true`, `images.unoptimized: true`
- Deployed automatically; no Node.js server needed

## Android (Capacitor)

- `capacitor.config.ts`: `appId: 'com.syncron.app'`, `webDir: 'out'`, `androidScheme: 'https'`
- `trailingSlash: true` in next.config.ts — required for Capacitor WebView routing
- `android/` directory committed to git; build artifacts gitignored

### Build Workflow

1. `npm run build:mobile` → `next build && cap sync`
2. `npm run cap:open` → opens Android Studio
3. In Android Studio: Build → Generate Signed APK / Bundle

### Notes

- For Firebase `linkWithPopup` → use `linkWithRedirect` + `getRedirectResult` on Android/Capacitor
- Cloudflare Pages deployment is unaffected: runs `npm run build` only

### AdMob (reklamlar)

Android build'i bölüm arası, ödüllü ve kalıcı alt banner reklamlarını Google
AdMob üzerinden gösterir. Kod tarafı: `src/services/monetization/providers/admob/`
(modülün kendi `README.md`'si var). Sıklık kararı platformdan bağımsızdır —
bkz. aşağıdaki bölüm.

#### Reklam sıklığı politikası

Tüm sayısal değerler `src/services/monetization/policy/policyConfig.ts`
içindedir; karar mantığı saf ve birim testlidir (`policy/frequencyPolicy.ts`).

**Tek havuz:** bir level BİTTİĞİNDE sayaç ilerler — kazanma da, ölüm/restart de
aynı şekilde bir "bitiş" sayılır. Bölüm arası ve ödüllü **her** reklam gösterimi
bu sayacı ve süre sayacını birlikte sıfırlar.

**Karar (VEYA):** iki eşikten hangisi önce dolarsa reklam o anda gösterilir.

| Kullanıcı | Level bitişi | Ya da süre |
|---|---|---|
| Misafir (giriş yapmamış) | 3 bitiş | 60 sn |
| Hesap oluşturmuş | 6 bitiş | 120 sn |

Oturumda hiç reklam gösterilmemişken süre koşulu işlemez (kıyaslanacak bir "son
reklam anı" yoktur) — ilk reklam yalnızca bitiş sayısıyla tetiklenir.

**Tetiklenme anları** (hepsi oyuncunun kendi bastığı bir butondan sonra, asla
animasyon ortasında değil):

- Kazanma ekranından **Sonraki Level** veya **Menü** ile ayrılırken,
- Ölüm/başarısızlık ekranındaki **Tekrar Dene** ile ya da HUD'daki restart ile.

Oyunu yarıda bırakıp menüye çıkmak (HUD → menü) bitiş sayılmaz, reklam göstermez.

**Reklam sonrası teşvik kartı:** reklam GERÇEKTEN gösterildiyse kapanışında
`features/play/components/AfterAdPrompt.tsx` açılır — misafire "hesap aç,
reklamlar yarıya insin" (giriş modalını açar), hesabı olana "şu fiyata
reklamları kaldır" teklifi. Fiyat ve teklifin satın alınabilirliği
`services/monetization/offer.ts`'te; gerçek satın alma akışı 07 numaralı görevde
gelecek, o güne kadar "çok yakında" mesajı gösterilir.

#### AdMob kimlik yönetimi

Hiçbir gerçek kimlik depoya girmez. Eksik olan her kimlik Google'ın **test**
kimliğine düşer ve yüksek sesle uyarır — bu sayede gerçek reklama yanlışlıkla
tıklanıp hesabın askıya alınma riski olmaz.

**1. Reklam birimleri (JS tarafı) — `.env.local`** (gitignore'lu):

```bash
NEXT_PUBLIC_ADMOB_BANNER_ID=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
NEXT_PUBLIC_ADMOB_INTERSTITIAL_ID=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
NEXT_PUBLIC_ADMOB_REWARDED_ID=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX

# İsteğe bağlı: gerçek kimlikler tanımlıyken bile test reklamı göster
NEXT_PUBLIC_ADMOB_USE_TEST_ADS=true
# İsteğe bağlı: gerçek kimliklerle güvenle test edilecek cihaz ID'leri (virgülle)
NEXT_PUBLIC_ADMOB_TEST_DEVICE_IDS=33BE2250B43518CCDA7DE426D04EE231
```

**2. App ID (AndroidManifest) — gradle üzerinden.** Manifest artık
`${admobAppId}` placeholder'ı içerir; değer `android/app/build.gradle` içinde şu
sırayla çözülür:

1. `ADMOB_APP_ID` ortam değişkeni (CI için),
2. `android/local.properties` içindeki `admobAppId=...` (gitignore'lu — yerel geliştirme),
3. `admobAppId` gradle özelliği (`~/.gradle/gradle.properties` veya `-PadmobAppId=...`),
4. hiçbiri yoksa Google'ın test App ID'si + `logcat`'e uyarı.

```properties
# android/local.properties
admobAppId=ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX
```

**Yayın öncesi kontrol listesi:**

> Bu listeyi artık `npm run release:android` **otomatik olarak** zorluyor: kimlikler
> eksikse ya da test kimliğiyse build başlamadan durur. Ayrıntı:
> `docs/release/yayin-kontrol-listesi.md` ve `scripts/release/README.md`.
> `npm run build:mobile` (geliştirme yolu) eskisi gibi uyarır ama durdurmaz.

- [ ] `.env.local` içindeki üç `NEXT_PUBLIC_ADMOB_*_ID` gerçek değerlerle dolu.
- [ ] `NEXT_PUBLIC_ADMOB_USE_TEST_ADS` tanımlı **değil**.
- [ ] `android/local.properties` (veya CI'da `ADMOB_APP_ID`) gerçek App ID'yi taşıyor.
- [ ] `npm run build:mobile` çıktısında ve `logcat`'te `[admob] DİKKAT` uyarısı **yok**.
- [ ] `app-ads.txt` polimelo.com kökünde yayında (aşağıya bakın).
- [ ] Kendi reklamlarına asla tıklanmadı (test cihazı kaydı için `NEXT_PUBLIC_ADMOB_TEST_DEVICE_IDS`).

#### Rıza (GDPR/KVKK — UMP)

`admobProvider.init()` ilk açılışta Google UMP akışını çalıştırır: AEA/İngiltere
ve düzenlenmiş ABD eyaletlerindeki kullanıcıya rıza formu gösterilir. Rıza
alınmadıysa reklamlar `npa: true` ile **kişiselleştirilmeden** istenir; oyunun
hiçbir özelliği kısıtlanmaz. Kullanıcı tercihini sonradan
`/privacy` ve `/kvkk` sayfalarındaki "Reklam tercihlerini değiştir" butonundan
değiştirebilir (buton yalnızca UMP gerekli derse görünür).

AdMob panelinde **Gizlilik ve mesajlaşma → GDPR** (ve gerekiyorsa **ABD
eyalet düzenlemeleri**) mesajının oluşturulup yayınlanmış olması gerekir; aksi
halde `isConsentFormAvailable` false döner ve form hiç gösterilmez.

Test kimlikleriyle çalışırken rıza akışı `debugGeography: EEA` ile zorlanır —
formu Türkiye'den de görebilirsin. Gerçek kimliklerde bu zorlama devre dışıdır.

#### Banner ve sayfa düzeni

Banner native bir katman olarak WebView'in **üstüne** çizilir, WebView'i
küçültmez. Bu yüzden gerçek yüksekliği (+8px güvenlik boşluğu)
`components/common/AdBannerMount.tsx` tarafından `--ad-banner-height` CSS
değişkenine yazılır ve `<html>`'e `has-ad-banner` sınıfı eklenir:

- `globals.css`: `html.has-ad-banner body { padding-bottom: var(--ad-banner-height) }`
- Tam ekran (`position:fixed; inset:0`) ekranlar `.ad-banner-inset` sınıfını alır
  (`bottom: var(--ad-banner-height)`). Oyun ekranı (`PlayContent.tsx`) bunu
  kullanır; grid ölçeği `useBoardScale` içindeki `ResizeObserver` sayesinde
  kendini otomatik yeniden hesaplar.

Yeni bir tam ekran sabit konumlu ekran eklerken `.ad-banner-inset` sınıfını
eklemeyi unutma, yoksa alt kenarı banner'ın altında kalır.

#### `app-ads.txt` (bu adımı geliştirici kendisi yapar)

AdMob envanterinin yetkilendirilmiş satıcılardan geldiğini doğrular; eksikse
reklam talebi ve gelir düşer. Dosya, Google Play kayıt formundaki **geliştirici
web sitesinin kök alanında** yayınlanmalıdır.

1. Google Play Console → uygulamanın mağaza kaydında geliştirici web sitesinin
   `https://polimelo.com` olduğundan emin ol.
2. AdMob → **Uygulamalar → Tümünü görüntüle → app-ads.txt** sekmesinden sana
   özel satırı kopyala. Biçimi şöyledir (`pub-...` kendi yayıncı kimliğin):

   ```text
   google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
   ```

3. Bu içeriği `https://polimelo.com/app-ads.txt` adresinde, **düz metin**
   (`text/plain`), yönlendirmesiz ve 200 yanıtlı olarak yayınla. Alt alan adı
   (`www.polimelo.com`) tek başına yeterli değildir — kök alan adı erişilebilir olmalı.
4. AdMob'un taraması 24 saat ile birkaç gün sürebilir; durumu aynı sekmeden takip et.

Not: Dosya bu depodan değil, polimelo.com'u yayınlayan siteden servis edilir —
bu yüzden depoya bir `public/app-ads.txt` eklenmedi (Syncron'un kendi alan adı
geliştirici web sitesi değildir).

#### Ödüllü reklamda Sunucu Tarafı Doğrulama (SSV) — değerlendirme

**Şimdilik uygulanmadı.** Gerekçe: ödüllü reklamlar bu aşamada yalnızca ipucu
(04) ve bölüm atlama (05) veriyor; hiçbiri skoru, yıldızı veya liderlik
tablosunu etkilemiyor. Skor bütünlüğü zaten sunucuda korunuyor
(bkz. `docs/scoring.md`) ve istemcinin beyanı skoru artıramıyor. Dolayısıyla
SSV'nin koruyacağı bir değer yok; eklenmesi worker'a yeni bir imzalı webhook
ucu, kullanıcı eşleme ve tekrar oynatma (replay) koruması gerektirirdi.

**SSV şu durumlarda zorunlu hâle gelir:** ödüllü reklam para birimi, kalıcı
envanter (ipucu stoğu), enerji/can ya da skor/yıldız etkileyen bir şey vermeye
başlarsa. O gün yapılacaklar: `RewardAdOptions.ssv.userId` ile Firebase UID'yi
gönder, AdMob panelinde SSV callback URL'ini worker'a yönlendir, worker tarafında
Google'ın imza doğrulamasını yap ve ödülü **yalnızca** callback geldiğinde yaz.

## Electron (Desktop — Windows/Mac/Linux)

- `electron/main.js` — main process: creates fullscreen BrowserWindow, disables native context menu, disables DevTools in prod, F11 toggles fullscreen, ESC exits fullscreen
- `electron/preload.js` — exposes `window.electron.isElectron = true` for environment detection
- `electron-builder.yml`: `asar: false` (required for Next.js static files via `file://`), outputs to `dist-electron/`
- `"main": "electron/main.js"` in package.json

### Game Feel Features

- Starts fullscreen (`fullscreen: true`)
- No menu bar (`Menu.setApplicationMenu(null)`)
- Native context menu disabled
- DevTools shortcuts blocked in production (F12, Ctrl+Shift+I, Ctrl+U)
- F11 / ESC to toggle fullscreen

### Build Workflows

```bash
npm run electron:dist:win   # → dist-electron/ NSIS installer (.exe)
npm run electron:dist:mac   # → .dmg
npm run electron:dist:linux # → .AppImage
```

**Dev:** `npm run dev` in one terminal, `npm run electron:dev` in another.

## Portal build'leri (CrazyGames / GameDistribution)

Web/Android/Electron'dan farklı olarak portallar oyunu **bilinmeyen bir alt
dizinden, bir iframe içinde** sunar ve URL'i kendileri yönetir. Bu yüzden bu
iki build:

- `next.config.ts`'te `assetPrefix: './'` ile göreli asset yolu kullanır.
- Tek bir statik `index.html` üretir; tüm ekranlar `src/app/_portal/PortalShell.tsx`
  üzerinden **bellek içi router** ile render edilir (bkz. `src/lib/navigation/README.md`)
  — sayfa arası geçişte tarayıcı URL'i hiç değişmez.
- Yalnızca ana menü, kampanya haritası, oyun, kontroller ve
  gizlilik/şartlar/KVKK sayfalarını içerir (bkz. `src/app/_portal/portalRoutes.tsx`).
  Admin, editör, profil, arkadaşlar, liderlik tablosu, destek, bağış ve
  "Reklamları Kaldır" gibi ekranlar bu build'lerde hiç yoktur.
- Giriş isteğe bağlı değil, **kapalıdır** — oyun yalnızca misafir (Firebase
  anonim) olarak oynanır; CrazyGames'in kendi hesap sistemi entegrasyonu ayrı
  bir görev.
- Google Analytics ve her türlü üçüncü parti script yüklenmez.
- Leveller **build'e gömülmez** — Firestore'dan gelir ve Dexie'de önbelleklenir
  (mevcut davranış). Bir kez online açılan bir level ve kampanya haritası
  sonrasında çevrimdışı da oynanabilir; skor ve yıldızlar ise yalnızca
  sunucudan gelir — sunucuya ulaşılamazsa skor kaydedilmez, bir sonraki bölüm
  açılmaz (bkz. `.plans/monetization/02-portal-buildleri.md`).

### Build

```bash
npm run build:crazygames   # → dist-portals/crazygames.zip
npm run build:gd           # → dist-portals/gamedistribution.zip
```

`NEXT_PUBLIC_GD_GAME_ID` env değişkeni GameDistribution geliştirici panelinden
alınan gerçek oyun ID'sini taşır; ayarlanmazsa build kırılmaz, SDK kendi test
ID'siyle (sahte reklamlar) çalışır.

Her iki komut da `next build`'i çalıştırır, ardından
`scripts/portal/package-portal.mjs` `out/`'tan yalnızca `index.html`, `_next/`,
`sounds/` ve favicon'u alıp `out-<platform>/` klasörüne kopyalar, mutlak asset
yolu/dosya sayısı (≤1500)/toplam boyut (≤250MB) doğrular ve zip'ler.

### Yerel test

```bash
npm run serve:portal crazygames        # http://localhost:4300 — /game/1/ altında, iframe içinde
npm run serve:portal gamedistribution 4301
```

Bu, portalların gerçek dağıtım şeklini (bilinmeyen alt dizin + iframe) taklit
eder — göreli yol hatalarını erken yakalamak için.

**CrazyGames SDK'sını yerelde test etmek:** `localhost`'ta SDK otomatik olarak
demo reklamlar gösterir ve konsola olay loglar. Başka bir alan adında test
ediyorsan `?useLocalSdk=true` query parametresi ekle. Gerçekçi bir önizleme
için `crazygames.com/preview` aracı kullanılabilir.

**GameDistribution SDK'sını yerelde test etmek:** tarayıcı konsolunda
`gdsdk.openConsole()` çalıştır — sahte reklam çağırmak için küçük bir araç çubuğu açılır.

### Portal başvuru materyalleri

Kapak görseli boyutları, açıklama taslağı ve kontroller metni için
[`docs/portals/portal-kit.md`](portals/portal-kit.md). Teknik kontrol
listeleri: [`docs/portals/crazygames.md`](portals/crazygames.md),
[`docs/portals/gamedistribution.md`](portals/gamedistribution.md).
