# 03 — Android AdMob — Rapor

## Ne yapıldı

### Yeni sağlayıcı: `src/services/monetization/providers/admob/`

Her dosya tek bir işi yapıyor, hepsi 250 satırın altında, `DOSYA AMACI`
başlıklı; klasörün kendi `README.md`'si var.

| Dosya | Sorumluluk |
|---|---|
| `admobConfig.ts` | Reklam birimi kimliklerini `NEXT_PUBLIC_ADMOB_*`'tan çözer; eksik olanı Google test kimliğine düşürür, bir kez yüksek sesli uyarır |
| `admobConsent.ts` | UMP rıza akışı, `npa` bayrağının tek kaynağı, gizlilik seçenekleri formu |
| `admobInit.ts` | Idempotent başlatma: **önce rıza, sonra `AdMob.initialize()`** |
| `admobEvents.ts` | Eklentinin olay API'sini iptal edilebilir tek seferlik `Promise`'e çevirir |
| `admobTimeouts.ts` | Sağlayıcının kendi **yükleme** zaman aşımı (8 sn) |
| `admobInterstitial.ts` | Hazırla → göster → `Dismissed` bekle |
| `admobRewarded.ts` | Önden yükleme; ödül **sadece** `Rewarded` olayıyla verilir |
| `admobBanner.ts` | Alt banner + gerçek yükseklik bildirimi (+8px güvenlik boşluğu) |
| `admobLifecycle.ts` | `appStateChange` ile arka plandan dönüşte banner'ı geri getirir |
| `admobProvider.ts` | Hepsini `AdProvider` arayüzünde birleştirir |
| `admobProvider.test.ts` | 8 test |

### Adaptör katmanına eklenenler (mevcut mimariyi bozmadan)

- `types.ts`: `AdProvider`'a **isteğe bağlı** `showBanner` / `hideBanner` /
  `onBannerHeight` / `privacyOptionsRequired` / `openPrivacyOptions`. Banner'ı
  desteklemeyen sağlayıcılar (noop, CrazyGames, GD) hiç değişmedi.
- `capabilities.ts`: yeni `bannerAds` alanı. `android` artık
  `interstitialAds/rewardedAds/bannerAds: true`; `mock` da banner'ı destekliyor
  (tarayıcıda test için).
- `adService.ts`: `showBanner()/hideBanner()/onBannerHeight()` (capability +
  `isAdFree()` kontrollü, asla throw etmez), `prewarm()` ve
  `isFullscreenAdOpen()`, `isAdPrivacyOptionsRequired()/openAdPrivacyOptions()`.
- `providerRegistry.ts`: `android` → `admobProvider` (dinamik import).
- `providers/mock/mockBannerOverlay.ts`: tarayıcıda sahte banner şeridi.

### Android yapılandırması

- `AndroidManifest.xml`: sabit test App ID'si `${admobAppId}` placeholder'ıyla değiştirildi.
- `android/app/build.gradle`: App ID şu sırayla çözülüyor — `ADMOB_APP_ID` env →
  `android/local.properties`'teki `admobAppId` (gitignore'lu) → `admobAppId`
  gradle özelliği → Google test App ID + `logger.warn`.
- `capacitor.config.ts` ve eklenti kurulumuna dokunulmadı; `cap sync` AdMob'u
  zaten tanıyor (doğrulandı).

### UI ve içerik

- `components/common/AdBannerMount.tsx`: banner'ı açar, gerçek yüksekliği
  `--ad-banner-height` CSS değişkenine yazar, `<html>`'e `has-ad-banner` ekler.
  `app/layout.tsx`'e bağlandı.
- `app/globals.css`: `html.has-ad-banner body { padding-bottom: … }` ve tam
  ekran sabit ekranlar için `.ad-banner-inset` yardımcı sınıfı.
- `features/play/components/PlayContent.tsx`: `inset: 0` → `top/left/right: 0` +
  `.ad-banner-inset`. Grid ölçeği `useBoardScale`'deki `ResizeObserver` sayesinde
  kendini otomatik yeniden hesaplıyor; başka hiçbir oyun dosyasına dokunulmadı.
- `components/common/AdPrivacyOptionsButton.tsx` + `/privacy` ve `/kvkk`
  sayfalarına yeni "Reklamlar" bölümü (TR/EN). Buton yalnızca UMP "gerekli"
  derse render ediliyor.
- `components/common/BackButtonManager.tsx`: reklam açıkken fiziksel geri tuşu
  hiçbir gezinme yapmıyor ve **kesinlikle uygulamadan çıkmıyor**.
- i18n: `ads.privacy_options` (tr/en).

### Dokümantasyon

- `docs/platforms.md`: AdMob bölümü — kimlik yönetimi, yayın öncesi kontrol
  listesi, rıza akışı, banner/layout kuralı, `app-ads.txt` adımları, SSV değerlendirmesi.
- `providers/admob/README.md`, `services/monetization/README.md`, `src/README.md` güncellendi.
- `.env.local`'a yorum satırı hâlinde AdMob env şablonu eklendi.

## Kararlar ve gerekçeleri

### Banner: her ekranda (kullanıcı kararı)

Kullanıcı "banner her yerde" seçeneğini seçti; öyle uygulandı. Kaydettiğim kaygı
ve alınan önlemler:

- Oyun ekranı tam ekran bir grid bulmacası. Banner WebView'i küçültmediği için
  hiçbir şey yapılmasaydı grid'in alt kenarı reklamın altında kalırdı. Bu yüzden
  banner'ın **gerçek** yüksekliği ölçülüp sayfa düzenine aktarılıyor; oyun ekranı
  o kadar kısalıyor ve board ölçeği otomatik küçülüyor.
- Oyuncu grid'in alt kenarına dokunurken yanlışlıkla reklama basmasın diye
  banner ile içerik arasına **8px güvenlik boşluğu** bırakıldı
  (`BANNER_SAFE_GAP_PX`). AdMob'un geçersiz tıklama politikası açısından önemli.
- Banner doldurulamazsa (`FailedToLoad`) yükseklik 0'a çekiliyor; boş bir şerit
  ekranda yer kaplamıyor.

### Zaman aşımı tasarımı değişti (kapsam dışı görünen ama zorunlu düzeltme)

01'den gelen `AD_TIMEOUTS_MS` değerleri (interstitial 8 sn, rewarded 15 sn) tüm
sağlayıcı çağrısını sarıyordu. Gerçek bir ödüllü video 30 sn+ sürer; bu değerle
**kullanıcı reklamı sonuna kadar izlese bile ödül verilmezdi**. Bu yalnızca
AdMob'u değil CrazyGames/GD'yi de etkileyen bir hata. İki katmana ayrıldı:

1. **Yükleme sınırı** sağlayıcının içinde (AdMob'da 8 sn) — no-fill'de oyuncu beklemez.
2. **Asılma koruması** `adService`'in dışında, bilerek uzun (interstitial 120 sn,
   rewarded 300 sn) — izleme süresi sınırlanmaz.

`policyConfig.ts`'teki yorum bunu açıklıyor. Sıklık politikası mantığına
dokunulmadı, 8 politika testi geçmeye devam ediyor.

### Ödüllü reklamda SSV: uygulanmadı (gerekçeli)

Ödüllü reklamlar bu aşamada yalnızca ipucu (04) ve bölüm atlama (05) veriyor;
hiçbiri skoru, yıldızı veya liderlik tablosunu etkilemiyor. Skor bütünlüğü zaten
sunucuda korunuyor (`docs/scoring.md`) ve istemci beyanı skoru artıramıyor.
Dolayısıyla SSV'nin koruyacağı bir değer yok; eklenmesi worker'a imzalı bir
webhook ucu, kullanıcı eşleme ve replay koruması getirirdi.

**Ne zaman zorunlu olur:** ödüllü reklam para birimi, kalıcı ipucu stoğu,
enerji/can ya da skor/yıldız etkileyen bir şey vermeye başlarsa. O gün:
`RewardAdOptions.ssv.userId` ile Firebase UID gönder, AdMob panelinde callback
URL'ini worker'a yönlendir, worker'da Google imzasını doğrula, ödülü **yalnızca**
callback geldiğinde yaz. `docs/platforms.md`'ye de yazıldı.

### `app-ads.txt`: dokümante edildi, depoya eklenmedi

Dosya `https://polimelo.com/app-ads.txt` kökünde yayınlanmalı; bu depo
polimelo.com'u servis etmiyor. Bu yüzden `public/app-ads.txt` eklemek yanıltıcı
olurdu. Adım adım talimat `docs/platforms.md`'de — **bu adımı kullanıcı kendisi yapacak.**

## Plandan sapmalar

- **`prewarm()` eklendi.** Görev "rıza akışı ilk açılışta çalışır" diyor ama
  `adService` sağlayıcıyı tembel yüklüyordu — rıza ancak ilk reklam anında
  sorulurdu. Platform dallanması eklemek yerine `MonetizationProvider` mount'ta
  `adService.prewarm()` çağırıyor; noop sağlayıcılarda zararsız bir no-op.
- **`@capacitor-community/admob@8` `PrivacyOptionsRequirementStatus` enum'unu
  paket kökünden dışa açmıyor** (kendi barrel dosyasının eksiği; dosya `dist`'te
  var ama `consent/index.d.ts`'te re-export edilmemiş). Derin dosya yoluna
  bağımlı kalmamak için değer `'REQUIRED'` string'iyle karşılaştırılıyor,
  gerekçe kodda yorumlu.

## Açık kalan konular

- **Gerçek cihazda uçtan uca test yapılmadı.** Bu rapor yazılırken elde çalışan
  bir Android cihaz/emülatör yoktu. `npm run build:mobile` + `cap sync` başarılı
  (AdMob eklentisi tanınıyor), ancak rıza formunun gerçekten açıldığı, banner'ın
  yüksekliğinin doğru ölçüldüğü ve ödüllü videonun ödül verdiği **cihazda
  doğrulanmalı**. Android Studio'da `logcat`'i `[admob]` ile filtrelemek yeterli.
- Ödüllü reklamın hiçbir UI tüketicisi hâlâ yok (04/05'in işi). `showRewarded()`
  bu görevde yalnızca birim testleriyle doğrulandı.
- Banner'ın `.ad-banner-inset` sınıfı şu an yalnızca oyun ekranına eklendi.
  Diğer ekranlar `position:fixed` değil, `body` padding'i onları kapsıyor. Yeni
  bir tam ekran sabit konumlu ekran eklenirse sınıfın eklenmesi gerekiyor —
  `docs/platforms.md`'ye not düşüldü.
- `npm run lint` bu görevden ÖNCE de kırık (`syncron-worker/` ve
  `BackButtonManager.tsx:57`'deki mevcut `any`). Bu görevde eklenen/değiştirilen
  dosyaların hiçbirinde yeni hata yok (doğrulandı). Kapsam dışı olduğu için
  düzeltilmedi (00-mimari-ilkeler §6).
- `next.config.ts`'te `typescript.ignoreBuildErrors: true` duruyor (01'de de
  not edilmişti) — bu yüzden ayrıca `npx tsc --noEmit` çalıştırıldı.

## Doğrulama

- `npx tsc --noEmit` → hatasız.
- `npm test` → **43/43 test geçti** (7 dosya; 8'i yeni `admobProvider.test.ts`:
  ödül sadece `Rewarded` olayıyla, yarıda kapatmada ödül yok, no-fill'de gösterim
  denenmiyor, interstitial akışı, banner yüksekliği + no-fill'de 0, rıza
  `initialize`'dan önce, env yokken test kimlikleri).
- `npx eslint` (yeni/değişen dosyalar) → 0 hata, 0 uyarı.
- `npm run build` (web) → başarılı. `out/` incelendi: AdMob kodu
  (`prepareRewardVideoAd`, test kimlikleri) yalnızca iki **async chunk**'ta ve
  bu chunk'lar hiçbir HTML'de script olarak referanslanmıyor — web bundle'ına
  sızıntı yok (00-mimari-ilkeler §3).
- `npm run build:mobile` → başarılı; `cap sync` 3 eklentiyi buldu,
  `@capacitor-community/admob@8.0.0` dâhil.

## Sonraki görevlerin (04 / 05) bilmesi gerekenler

- `useAds().showRewarded()` artık Android'de gerçek bir AdMob ödüllü videosu
  gösteriyor. Dönen `reason` değerleri: `no-fill` (doldurulamadı), `closed`
  (kullanıcı yarıda kapattı, ödül yok), `error`, `timeout`, `unsupported`.
  Nazik mesaj anahtarları 01'de hazır: `ads.rewarded_unavailable` / `ads.rewarded_failed`.
- Ödül **asla** istemcinin beyanıyla skora/yıldıza dönüşmemeli; SSV bilerek
  eklenmedi (yukarıdaki gerekçe). 04/05 ödülü kalıcı/skor etkileyen bir şeye
  çevirecekse önce SSV konuşulmalı.
- Reklamsız hak (`isAdFree()`, 07) kontrolü `showRewarded()` içinde **yok**,
  `showBanner()` içinde **var**. 04/05 kendi entitlement kontrolünü yapmalı.

## Ek tur — cihaz testi sonrası sıklık politikası revizyonu

İlk sürüm cihazda denendi: banner ve rıza/gizlilik tarafı çalıştı, ancak bölüm
arası reklam hiç görünmedi (tasarım gereği: ilk 5 başarılı level reklamsızdı ve
hata/restart sonrası reklam bilerek atlanıyordu). Kullanıcı isteğiyle sıklık
modeli **tamamen değiştirildi**.

### Yeni model: tek havuz, sonuçtan bağımsız

- Kazanma ile ölüm/restart arasında **ayrım kalmadı** — ikisi de bir "level
  bitişi" sayılır ve aynı sayaca işler. `afterError` / `afterRestart` atlama
  kuralları ve "ilk N level reklamsız" ısınma kuralı kaldırıldı.
- Karar **VEYA** mantığı: iki eşikten hangisi önce dolarsa reklam gösterilir.

| Kullanıcı | Level bitişi | Ya da süre |
|---|---|---|
| Misafir | 3 | 60 sn |
| Hesap oluşturmuş | 6 | 120 sn |

- Bölüm arası ve ödüllü **her** reklam gösterimi iki sayacı da sıfırlar.
- Oturumda hiç reklam gösterilmemişken süre koşulu işlemez (kıyaslanacak "son
  reklam anı" yok) — ilk reklam yalnızca bitiş sayısıyla tetiklenir.
- Tüm değerler `policy/policyConfig.ts`'te, tek yerden ayarlanabilir.

### Dosya değişiklikleri

- `policy/policyConfig.ts`: `FrequencyPolicyConfig` artık misafir/kayıtlı diye
  iki katmanlı (`minFinishes` + `minSecondsBetweenAds`).
- `policy/frequencyPolicy.ts`: state `{ finishesSinceLastAd, lastAdAtMs }`'a
  indi (`totalCompleted`/`levelsSinceLastAd` kalktı); `onLevelCompleted` →
  `onLevelFinished`; skip sebepleri `'ad-free' | 'below-thresholds'`.
- `adService.ts`: `recordLevelCompleted` → `recordLevelFinished`;
  `syncCompletedTotal` **silindi** (artık ölü kod — kalıcı tamamlama sayısına
  dayanan "ilk 5 level" kuralı yok); `InterstitialRequestContext` artık
  `{ isRegisteredUser? }` taşıyor (varsayılan `false` = misafir, güvenli taraf).
- `usePlayAds.ts`: Dexie okuması ve `syncCompletedTotal` effect'i kalktı;
  `useAuthContext()` ile misafir/kayıtlı ayrımı yapılıyor; yeni
  `beforeLeavingWinScreen()` ve `beforeRestart()`; aynı denemenin iki kez
  sayılmasını önleyen `finishRecordedRef` (kazandıktan sonra "Tekrar"a basma
  senaryosu).
- `usePlayPage.ts`: `restart` artık async — `beforeRestart()` beklenir, reklam
  kapanınca `reload()` çalışır. Kazanma ekranındaki "Sonraki Level" ve "Menü"
  aynı `leaveWinScreen()` yolundan geçer. HUD'dan menüye çıkmak (oyunu yarıda
  bırakmak) bitiş sayılmaz, reklam göstermez.
- `MonetizationDebugPanel.tsx`: yeni sayaç alanlarını gösteriyor.

### Kazanma ekranına kalıcı "Menü" butonu

`WinActions.tsx` artık her zaman üç buton gösteriyor: [Tekrar] [Menü]
[Sonraki Level]. Önceden menü yalnızca sonraki level YOKKEN çıkıyordu
(son levelde). Menü butonu giriş durumundan bağımsızdır. Tekrar/Menü ortak bir
`SECONDARY_BUTTON_STYLE` sabitini paylaşıyor (kopyalanmış inline stil kalktı).

### Reklam sonrası teşvik kartı (`AfterAdPrompt.tsx`)

Reklam **gerçekten gösterildiyse** kapanışında açılır (politika reklamı
atladıysa hiçbir şey olmaz — `InterstitialResult.shown` bakılıyor).

- **Misafir:** "Hesap oluşturursan reklamları yarı yarıya azaltırız" +
  [HESAP OLUŞTUR] (mevcut `AuthModal`'ı açar) + [DAHA SONRA].
- **Kayıtlı:** "{fiyat} karşılığında reklamları tamamen kaldırmak ister misin?" +
  [EVET] + [DAHA SONRA]. Gerçek satın alma 07'de geleceği için [EVET] şimdilik
  "çok yakında" toast'u gösterip kartı kapatıyor.

Fiyat ve satın alınabilirlik `services/monetization/offer.ts`'te yer tutucu
olarak duruyor (`₺49,99`, `purchasable: false`) — 07 burayı gerçek mağaza
verisiyle değiştirecek.

i18n: `ads.cta_guest_*`, `ads.cta_premium_*`, `ads.cta_later` (tr/en).

### Bu turda alınan, kullanıcının açıkça söylemediği kararlar

- **HUD'daki elle restart da bitiş sayılıyor.** "Başarılı başarısız fark etmez"
  talimatını birebir uyguladım; oyuncu deneme amaçlı sık restart atıyorsa reklam
  sıklığı artar. İstenirse yalnızca ölüm kaynaklı restart'lar sayılacak şekilde
  daraltılabilir (`details.isDeath` zaten mevcut).
- **Menüye çıkmak (oyunu yarıda bırakmak) bitiş sayılmıyor**, reklam
  göstermiyor — çıkışı reklamla engellemek agresif olurdu.
- **"İlk N level reklamsız" ısınma kuralı tamamen kaldırıldı.** Yeni modelde
  karşılığı yok; istenirse config'e ayrı bir alan olarak geri eklenebilir.

### Doğrulama (ek tur)

- `npx tsc --noEmit` → hatasız.
- `npm test` → 44/44 (politika testleri yeni modele göre baştan yazıldı: VEYA
  mantığı, misafir/kayıtlı eşikleri, başarı-başarısızlık ayrımsızlığı, ilk
  reklamda süre koşulunun işlememesi, immutability, config değerleri).
- `npx eslint` (değişen dosyalar) → 0 hata.
- `npm run build:mobile` → başarılı, `cap sync` tamam.
