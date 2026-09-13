# services/monetization

Oyunun, hangi platformda çalıştığından bağımsız olarak reklam ve platform
olaylarını tek bir arayüz üzerinden kullanmasını sağlar. Uygulamanın geri kalanı
platform adını değil **yetenekleri** (`getCapabilities()`) sorgular; platform
seçimi build-time `NEXT_PUBLIC_PLATFORM` env değeriyle tek bir yerde
(`providerRegistry.ts`) çözülür (bkz. `.plans/monetization/00-mimari-ilkeler.md`).

## Katmanlar

```
types.ts              — AdProvider arayüzü + sonuç tipleri
platform.ts            — NEXT_PUBLIC_PLATFORM okuma
capabilities.ts         — platform → yetenek tablosu
providerRegistry.ts     — KOMPOZİSYON KÖKÜ: platform → sağlayıcı (dinamik import)
adService.ts            — tek giriş noktası: init/prewarm, gameplay start/stop, interstitial/rewarded/banner, event bus
entitlement.ts          — "reklamsız mı?" bağlantı noktası (07'de bağlanacak)
policy/                 — reklam sıklığı politikası (saf, birim testli): tek havuz,
                          "level bitişi" (kazanma VEYA ölüm/restart) sayacı +
                          süre eşiği, misafir/kayıtlı için ayrı değerler
offer.ts                — "reklamları kaldır" teklifinin fiyatı (07'ye kadar yer tutucu)
rewarded/               — aksiyondan bağımsız "ödüllü aksiyon" akışı: erişim kararı
                          (reklamsız / reklam / level başına ücretsiz) → sunucu hazırlar →
                          ödüllü reklam → sunucu teslim eder (bkz. features/rewarded-actions/README.md)
providers/               — sağlayıcı uygulamaları
```

`adService`, sağlayıcı çağrılarını her zaman zaman aşımı + `try/catch` ile sarar:
bir SDK yüklenemezse, reklam engelleyici devreye girerse ya da no-fill olursa
oyun kilitlenmez, `Promise` her zaman çözülür (bkz.
`.plans/monetization/00-mimari-ilkeler.md` §4).

## React erişimi

`src/contexts/MonetizationContext.tsx` içindeki `useAds()` ve `useCapabilities()`
hook'ları — bu modülü doğrudan import etmek yerine feature'lar bunları kullanır.

## Şu an kayıtlı sağlayıcılar

| Platform | Sağlayıcı | Not |
|---|---|---|
| `web`, `electron` | `providers/noopProvider.ts` | Reklamsız |
| `android` | `providers/admob/admobProvider.ts` | AdMob: bölüm arası + ödüllü + kalıcı alt banner, UMP rıza akışı (bkz. o klasörün `README.md`'si) |
| `crazygames` | `providers/crazygames/crazyGamesProvider.ts` | CrazyGames HTML5 SDK v3, script enjeksiyonu ile |
| `gamedistribution` | `providers/gamedistribution/gameDistributionProvider.ts` | GameDistribution SDK, `NEXT_PUBLIC_GD_GAME_ID` env değeri gerekir |
| `mock` | `providers/mock/mockProvider.ts` | Geliştirme sırasında tarayıcıda uçtan uca test için |

## Banner

`AdProvider`'ın `showBanner`/`hideBanner`/`onBannerHeight` metotları **isteğe
bağlıdır**; yalnızca banner destekleyen sağlayıcılar (AdMob, mock) tanımlar ve
`capabilities.bannerAds` ile açılır. Banner native olarak WebView'in üstüne
çizildiği için gerçek yüksekliği React tarafına bildirilir ve
`components/common/AdBannerMount.tsx` bunu `--ad-banner-height` CSS değişkenine
yazar (bkz. `docs/platforms.md` → "Banner ve sayfa düzeni").

CrazyGames/GameDistribution sağlayıcıları yalnızca ilgili `NEXT_PUBLIC_PLATFORM`
değeriyle build alındığında dinamik import ile yüklenir — SDK script'leri diğer
build'lerin bundle'ına hiç girmez. Reklam sırasında ses kısma, sağlayıcıdan
bağımsız olarak `adService`'in `before-ad`/`after-ad` olaylarına abone olan
`features/play/hooks/useAdPauseAudio.ts` tarafından yapılır (her iki portal da
bunu zorunlu tutar).

`providers/adsense.draft.ts` **hiçbir platforma kayıtlı değildir** — AdSense
hesabı onaylanana kadar hiçbir build'e girmez (dosyanın başındaki yorum,
bağlanacağı zaman izlenecek adımları anlatır).

## Geliştirme sırasında sahte sağlayıcıyı kullanmak

```bash
npm run dev:mock
```

Sahte sağlayıcının senaryosunu (`success` / `no-fill` / `error` / `timeout` /
`user-closed`) tarayıcıda sağ altta görünen debug panelinden değiştirebilirsin
(bkz. `src/components/common/MonetizationDebugPanel.tsx`, yalnızca `mock`
platformunda render edilir).

## Yeni bir sağlayıcı nasıl eklenir

1. `providers/<isim>Provider.ts` — `AdProvider` arayüzünü uygulayan bir dosya yaz.
2. `capabilities.ts`'e ilgili `PlatformId` için bir yetenek satırı ekle (yoksa
   `types.ts`'teki `PlatformId`'ye önce yeni değeri ekle).
3. `providerRegistry.ts`'te o platformun `PROVIDER_LOADERS` girdisini bu dosyaya
   dinamik import ile bağla.
4. `NEXT_PUBLIC_PLATFORM=<isim>` ile build/dev başlat.

Kodun başka hiçbir yerine platform dallanması eklenmez.
