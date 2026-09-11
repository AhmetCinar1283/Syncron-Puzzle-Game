# 01 — Reklam Adaptör Katmanı — Rapor

## Ne yapıldı

- `src/services/monetization/` modülü kuruldu:
  - `types.ts` — `AdProvider` arayüzü (init/loadingFinished/gameplayStart/Stop/showInterstitial/showRewarded/happyTime), sonuç tipleri.
  - `platform.ts` — `NEXT_PUBLIC_PLATFORM` okuma/doğrulama (`CURRENT_PLATFORM`).
  - `capabilities.ts` — 6 platform (web/android/electron/crazygames/gamedistribution/mock) için yetenek tablosu.
  - `providerRegistry.ts` — **tek kompozisyon kökü**, platform→sağlayıcı, hepsi dinamik `import()`.
  - `adService.ts` — tembel init, `withTimeout` + `try/catch` ile her çağrı sarılı (asla throw etmez), gameplay start/stop tekilleştirme, `requestInterstitial`/`showRewarded`/`happyTime`, `before-ad`/`after-ad` event bus, `syncCompletedTotal` (kalıcı toplam tamamlama sayısını politikaya besler).
  - `entitlement.ts` — `isAdFree()` / `setAdFreeSource()` (07 bağlayacak; şimdilik her zaman `false`).
  - `policy/` — saf `frequencyPolicy.ts` (+ `frequencyPolicy.test.ts`, 8 test, hepsi geçiyor) ve `policyConfig.ts` (5 level / 3 level / 90 sn).
  - `providers/noopProvider.ts`, `providers/mock/{mockProvider,mockAdOverlay,scenario}.ts`, `providers/adsense.draft.ts` (kayıtsız taslak).
  - `index.ts` + `README.md`.
- `src/contexts/MonetizationContext.tsx` — `MonetizationProvider`, `useAds()`, `useCapabilities()`.
- `src/components/common/MonetizationDebugPanel.tsx` — sadece `mock` platformunda görünen, senaryo seçimi + elle interstitial/rewarded tetikleme + politika durumu gösteren dev paneli.
- `src/features/play/hooks/usePlayAds.ts` — play akışını adaptöre bağlayan tek nokta: level hazır → `loadingFinished` (bir kez) + `gameplayStart`; unmount/level değişimi → `gameplayStop`; kazanma → `notifyLevelCompleted()` (`gameplayStop` + `happyTime` + sayaç ilerletme); `beforeNextLevel(afterError)` → politika kontrollü `requestInterstitial`.
- `usePlayPage.ts`'e minimal bağlama: `handleNextLevel` artık `await beforeNextLevel(...)` sonra navigasyon yapıyor; restart bilgisi bir ref ile takip edilip bir sonraki level geçişinde "restart sonrası reklam yok" kuralına besleniyor. Mevcut win/telemetri/worker akışı **değişmedi**.
- `src/app/layout.tsx`: eski `AdSenseLoader` script'i kaldırıldı, `MonetizationProvider` + `MonetizationDebugPanel` eklendi. `google-adsense-account` meta etiketi `ADSENSE_ENABLED=false` bayrağının arkasına alındı (hesap onaylanınca `true` + `CURRENT_PLATFORM==='web'` ile tekrar açılabilir).
- `src/components/common/AdSenseLoader.tsx` silindi.
- `package.json`: `vitest`/`vite`/`cross-env` devDependency; `npm test` (`vitest run`); `npm run dev:mock`; tüm build/dev/electron scriptleri kendi `NEXT_PUBLIC_PLATFORM` değerini set ediyor. `vitest.config.ts` eklendi (`@/` alias, node ortamı, `src/**/*.test.ts`).
- i18n: `ads.rewarded_unavailable`, `ads.rewarded_failed` (tr/en) — 04'ün kullanacağı nazik mesajlar.
- Dokümantasyon: modülün kendi `README.md`'si, `src/README.md` (§4 yeni bölüm), `src/services/README.md`, `docs/platforms.md` (env değeri tablosu).

## Plandan sapmalar ve neden

- **MonetizationDebugPanel lazy import değil, statik import.** Plan "lazy yüklenen" diyordu; pratikte panel ve bağımlı `scenario.ts` toplam ~1KB, hiçbir SDK'ya bağımlı değil. Build çıktısını inceledim (`out/`): gerçek mock sağlayıcı kodu (`mockAdOverlay`, DOM manipülasyonu) ayrı bir async chunk'ta kalıyor ve web/android/electron build'lerinin script listesinde **hiç görünmüyor** — yalnızca `mock` platformunda `providerRegistry`'nin çalışma zamanı çağrısıyla indiriliyor. Panelin kendisi ve `scenario.ts` (localStorage okuma/yazma, SDK yok) her build'de küçük bir eklenti olarak kalıyor; bunu ihmal edilebilir gördüm ve statik bıraktım. Gerekirse ileride `dynamic(() => import(...), { ssr: false })` ile de sarılabilir.
- **Ödüllü reklamda "adFree bypass" bu görevde yok.** 07 görev tanımı "reklamsız kullanıcı ödüllü aksiyonları reklamsız alır" diyor ama bunun kararı feature katmanında (04/05) verilecek — `adService.showRewarded()` bilerek entitlement kontrolü yapmıyor, sadece yetenek + sağlayıcı çağrısı yapıyor. 04/05 kendi entitlement kontrolünü `isAdFree()` ile yapmalı.
- **`syncCompletedTotal` eklendi (plan taslağında yoktu, gerekliliği plan yazımı sırasında netleşti).** "İlk 5 level" kuralının `adService`'in kendi bellek içi sayacına değil, oyuncunun kalıcı (Redux + Dexie) tamamlama sayısına bakması gerekiyordu; aksi halde her sayfa yenilemesinde sayaç sıfırlanıp deneyimli oyuncular da 5 level boyunca "reklam yok" durumuna düşerdi (asıl kural bunun tersini istiyor: 5'ten SONRA reklam başlar, ama kalıcı olarak). `adService.syncCompletedTotal(n)` sadece **yükseltir**, düşürmez; `usePlayAds` her level yüklendiğinde `max(Redux completedCount, Dexie playedLevels.length)` ile çağırıyor.

## Açık kalan konular

- Gerçek AdMob/CrazyGames/GameDistribution sağlayıcıları henüz yok (02/03'ün işi); `providerRegistry.ts`'te hepsi noop'a düşüyor.
- `adsense.draft.ts` bağlanmadı, kayıtlı değil — hesap onayı bekleniyor.
- Ödüllü reklamın hiçbir UI tüketicisi yok (04'ün işi); `ads.rewarded_*` i18n anahtarları önceden eklendi.
- `next.config.ts`'te `typescript.ignoreBuildErrors: true` duruyor (kapsam dışı, dokunulmadı) — bu yüzden `npm run build` tip hatalarını gizleyebilir; ben ayrıca `npx tsc --noEmit` ile tüm projeyi kontrol ettim, hata yok.
- `npm run lint` bu görevden ÖNCE de kırık: `syncron-worker/test/*.spec.ts` ve `syncron-worker/worker-configuration.d.ts` içinde 200'den fazla önceden var olan `no-explicit-any` hatası var. Hiçbiri bu görevde dokunulan dosyalarda değil (doğruladım: hatalı dosyaların tamamı `syncron-worker/` altında, `src/` içindeki tüm yeni/değişen dosyalar temiz). Kapsam dışı olduğu için düzeltilmedi (00-mimari-ilkeler §6).

## Sonraki görevin (02) bilmesi gerekenler

- Yeni bir sağlayıcı eklemek = `providers/<isim>.ts` + `capabilities.ts`'te bir satır + `providerRegistry.ts`'te bir dinamik import satırı + yeni build komutunda `NEXT_PUBLIC_PLATFORM=<isim>`.
- `AdProvider` arayüzü CrazyGames/GameDistribution SDK dokümantasyonuyla karşılaştırılarak tasarlandı (init/loadingFinished/gameplayStart/Stop/showInterstitial/showRewarded/happyTime) — bu iki SDK'nın sağlayıcıları bu arayüze birebir oturmalı.
- `adService` her sağlayıcı çağrısını zaten timeout+try/catch ile sarıyor; yeni sağlayıcılar kendi içinde ekstra bir hata toleransı eklemek zorunda değil.
- Sıklık politikası (`policy/frequencyPolicy.ts`) platformdan bağımsız ve test edilmiş; 02 sadece `capabilities.interstitialAds/rewardedAds`'ı `true`'ya çekip gerçek sağlayıcıyı bağlamalı, politika mantığına dokunmasına gerek yok.

## Doğrulama

- `npm test` → 8/8 test geçti (frequencyPolicy: ilk 5 level, 3 levelde bir, 90 sn, hata/restart sonrası, adFree, immutability).
- `npx tsc --noEmit` → hatasız.
- `npx eslint` (değişen dosyalar) → 0 hata (1 önceden var olan font uyarısı, bu değişiklikle ilgisiz).
- `npm run build` (web) → başarılı; `out/` incelendi: `adsbygoogle` hiçbir dosyada yok; gerçek mock sağlayıcı kodu (`showMockAd`, DOM overlay) ayrı bir async chunk'ta ve web build'inin hiçbir sayfasının initial script listesinde referanslanmıyor.
- Tarayıcıda uçtan uca (`npm run dev:mock`) manuel test bu rapor yazılırken yapılmadı — kullanıcıya "run" skill ile canlı deneme önerilecek.
