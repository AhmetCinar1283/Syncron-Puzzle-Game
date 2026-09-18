# CrazyGames — Teknik Kontrol Listesi

Kaynak: [docs.crazygames.com/requirements](https://docs.crazygames.com/requirements/technical/),
[docs.crazygames.com/sdk](https://docs.crazygames.com/sdk/intro/). Bu proje
için uygulama durumu, `.plans/monetization/02-portal-buildleri.md`'ye göre.

## Dosya/boyut sınırları

| Kural | Sınır | Bu projede |
|---|---|---|
| Toplam paket boyutu | ≤250MB | ~3MB (`scripts/portal/package-portal.mjs` doğrular) |
| İlk yükleme | ≤50MB (mobil vitrin: ≤20MB) | ~3MB |
| Dosya sayısı | ≤1500 | ~80 |
| Yol türü | Yalnızca göreli | `next.config.ts` `assetPrefix: './'` |

## SDK entegrasyonu

| Gereksinim | Uygulama |
|---|---|
| `SDK.init()` | `providers/crazygames/loadCrazyGamesSdk.ts` |
| `game.loadingStart/loadingStop` | `usePlayAds.ts` (mount'ta / level hazır olunca) |
| `game.gameplayStart/gameplayStop` | `usePlayAds.ts` |
| `game.happytime` | Level tamamlanınca (`notifyLevelCompleted`) |
| `ad.requestAd('midgame'\|'rewarded')` | `providers/crazygames/crazyGamesProvider.ts` |
| Reklam sırasında ses kısma + oyun durdurma | `features/play/hooks/useAdPauseAudio.ts` (`before-ad`/`after-ad` olayları) |
| Sadece SDK üzerinden reklam | Tek sağlayıcı `crazyGamesProvider`, başka reklam SDK'sı yok |

## Yasaklar (bu build'de kapalı)

- [x] AdSense / üçüncü parti reklam — `capabilities.thirdPartyScripts: false`
- [x] Dış linkler (portfolyo, sosyal medya) — `capabilities.externalLinks: false`
- [x] Bağış sayfası, "Reklamları Kaldır" — `capabilities.donations/purchases: false`, portal rota tablosunda yok
- [x] Dış giriş seçenekleri (Google, e-posta) — `capabilities.accountLogin: false`, misafir oynanış
- [x] Admin/editör rotaları — `capabilities.devTools: false`, `portalRoutes.tsx`'te yok

## Test

```bash
npm run build:crazygames
npm run serve:portal crazygames
```

- [ ] Konsolda 404/mutlak yol hatası yok
- [ ] Menü → kampanya → oyun akışı çalışıyor
- [ ] `localhost`'ta demo reklamlar görünüyor, ses reklam sırasında kısılıyor
- [ ] `?useLocalSdk=true` ile başka bir alan adında da test edildi
- [ ] `crazygames.com/preview` ile önizleme yapıldı (yükleme öncesi son kontrol)

## Panel Görsel ve Meta Materyalleri

Materyal detayları için: [`portal-kit.md`](portal-kit.md), dosyalar için: [`assets/README.md`](assets/README.md).

- [ ] **Kapak Görseli:** `docs/portals/assets/crazygames/cover-1200x675.png` (1200×675) yüklendi
- [ ] **Oyun İkonu:** `docs/portals/assets/crazygames/icon-512x512.png` (512×512) yüklendi
- [ ] **Başlık & Açıklama:** `portal-kit.md` içindeki TR ve EN açıklamalar girildi
- [ ] **Kategoriler:** Primary: `Puzzle`, Tags: `Brain`, `Grid`, `Logic`, `Minimalist`, `Cyberpunk / Neon` seçildi
