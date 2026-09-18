# GameDistribution — Teknik Kontrol Listesi

Kaynak: [GD-HTML5 SDK Implementation](https://github.com/GameDistribution/GD-HTML5/wiki/SDK-Implementation),
[GD-HTML5 Rewarded Ads](https://github.com/GameDistribution/GD-HTML5/wiki/Rewarded-Ads).

## Kurulum

| Gereksinim | Uygulama |
|---|---|
| `GD_OPTIONS.gameId` | `NEXT_PUBLIC_GD_GAME_ID` env değişkeni (`providers/gamedistribution/loadGdSdk.ts`) |
| `GD_OPTIONS.onEvent` | Aynı dosyada olay yayıcı (`onGdEvent`) |
| Script: `html5.api.gamedistribution.com/main.min.js` | `loadGdSdk.ts` içinde enjekte edilir |
| `SDK_READY` beklenmeli | `waitForEvent('SDK_READY')`, 8sn zaman aşımı |

**GD panelinde "Rewarded Ads" bayrağı açılmadan ödüllü reklam istekleri
çalışmaz** — https://developer.gamedistribution.com üzerinden kontrol edin.

## Reklam akışı

| Gereksinim | Uygulama |
|---|---|
| `showAd()` (ara reklam) | `gameDistributionProvider.showInterstitial()` |
| `preloadAd('rewarded')` + `showAd('rewarded')` | `gameDistributionProvider.showRewarded()` — level hazır olunca önceden yüklenir |
| Ödül SADECE `SDK_REWARDED_WATCH_COMPLETE` gelirse verilir | Aynı dosyada, `showAd()` başarıyla çözülse bile event gelmezse `rewarded:false` |
| Reklam sırasında ses kısma | `features/play/hooks/useAdPauseAudio.ts` (SDK'nın kendi `SDK_GAME_PAUSE/START` yerine, genel `before-ad`/`after-ad` mekanizması kullanılır) |

## Yasaklar (bu build'de kapalı)

Aynı liste — bkz. [`crazygames.md`](crazygames.md#yasaklar-bu-buildde-kapalı).
Kapılar platformdan bağımsız aynı `capabilities` alanlarıyla çalışır.

## Test

```bash
npm run build:gd
npm run serve:portal gamedistribution
```

- [ ] Konsolda `SDK_READY` görünüyor
- [ ] Tarayıcı konsolunda `gdsdk.openConsole()` ile sahte reklam çağrılabiliyor
- [ ] Ödüllü reklam yalnızca `SDK_REWARDED_WATCH_COMPLETE` sonrası ödül veriyor
- [ ] GD panelinde gerçek `gameId` ile pre-roll reklam izlenerek entegrasyon
      doğrulandı (GD'nin kendi yükleme onayı için zorunlu adım)

## Panel Görsel ve Meta Materyalleri

Materyal detayları için: [`portal-kit.md`](portal-kit.md), dosyalar için: [`assets/README.md`](assets/README.md).

- [ ] **Küçük İkon:** `docs/portals/assets/gamedistribution/icon-512x512.png` (512×512) yüklendi
- [ ] **Standart Küçük Resim:** `docs/portals/assets/gamedistribution/cover-720x480.png` (720×480) yüklendi
- [ ] **Geniş Kapak:** `docs/portals/assets/gamedistribution/cover-1280x720.png` (1280×720) yüklendi
- [ ] **Açıklama & Kontroller:** `portal-kit.md` içindeki metinler Assets/Info paneline girildi
- [ ] **Kategori & Etiketler:** `Puzzle`, `Brain`, `logic`, `grid`, `cyberpunk` seçildi
