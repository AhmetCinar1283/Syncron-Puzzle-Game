# Faz 04b Raporu — Taşma Payı, DPR'ye Duyarlı Gölge, Çerçeve Sprite'ı

> Plan: `.plans/canvas-render/04b-duzeltmeler.md` · Bağlayıcı: `00-ilkeler.md`

> **Görsel doğrulama YAPILMADI.** Tarayıcı/cihaz yok; §2.1 ve §2.2 kabul
> kriterlerinin gözle kısmı proje sahibinde (bkz. §5).

## 1. Ne yapıldı

| Dosya | Değişiklik |
|---|---|
| `surface.ts` | `BOARD_BLEED = 32` (tek tanım). Tuval bit/CSS boyutu her yönde pay kadar büyük, `left/top: -BLEED`, dönüşüm `setTransform(dpr,0,0,dpr,BLEED*dpr,BLEED*dpr)`, `clearLayer` negatif başlangıçlı ve payı kapsıyor. Üç tuval aynı kodu kullanıyor. |
| `paintTokens.ts` | `setShadow(ctx, renk, blur, ox, oy)` + `registerRasterDpr`. `outerShadows` ve `outerGlow` buna çevrildi. |
| `spriteCache.ts` | Rasterleyici bağlamını kurarken `registerRasterDpr(ctx, dpr)` çağırıyor (global okuma yok; bağlam başına `WeakMap`). |
| `overlays/portalPaths.ts` | Elle `getTransform().a` çarpımı kaldırıldı, `setShadow` kullanıyor. |
| `overlays/roomFrame.ts` | Çerçeve sprite: anahtar `roomframe\|WxH\|isControlled\|theme` (hücre sayısı). Kutu her yönde 40px paylı; blit payı geri sayıyor. Opaklık blit'te `globalAlpha`. Başlık doğrudan çizilmeye devam ediyor. |
| `BoardCanvas.tsx` | `drawRoomFrames(ctx, scene, cache)` imzası. |

Hiçbir çizim koordinatı değişmedi. `pointerEvents: 'none'` üç tuvalde duruyor,
büyüyen tuval girdiyi yakalamaz (kodda doğrulandı; cihazda swipe denenmedi).

## 2. Ne yapılmadı
- Kapsam dışı maddelere (Faz 04 sapmaları, DOM çizicileri) dokunulmadı.
- `00-ilkeler` §3.3 zaten 04b güncellemelerini içeriyordu; değiştirmedim.

## 3. Doğrulama

| Kontrol | Sonuç |
|---|---|
| `npx tsc --noEmit` | ✅ temiz |
| `npm test` | ✅ **308 test geçti** (taban 308) |
| `npm run lint` | ✅ 431 hata / 13240 uyarı (taban) |
| `npx eslint src` | ✅ 154 hata / 52 uyarı (taban) |
| `npx eslint src/game-engine/render` | ✅ 0 sorun |
| `npm run build:mobile` | ✅ `Sync finished in 0.682s` |
| `grep -rn "shadowBlur\|shadowOffset" render/` | ✅ Kalan satırlar: `setShadow` gövdesi (`paintTokens.ts:59–61`) ve yorumlar (`paintTokens.ts:46`, `portalPaths.ts:120`, `spriteCache.ts:5`). Doğrudan atama yok. |

DPR 1/2 karşılaştırması **yapılmadı**: mantık gereği `blur × dpr` cihaz pikseli =
her DPR'de aynı göreli yarıçap; gözle teyit proje sahibinde.

## 4. Ölçüm (§2.4)
Gerçek tuval yok, **ölçülemedi; kâğıt üstü tahmin.** Çerçeve sprite'ı oda başına
değil boyut × kontrol × tema başına bir tane. Örnek: 5×5 oda (~326px kutu) →
(326+80)² × 4 B ≈ 0,66 MB (DPR 1), ≈ 2,6 MB (DPR 2). Bu faz `cache.size()`'a en
fazla (farklı oda boyutu sayısı × 2) sprite ekliyor; Faz 04'teki 40'ın üstüne. Üç
tuval de payla büyüdü: (W+64)(H+64)·dpr²·4 B, ör. 700×500 tahta DPR 2'de 3 tuval ≈
3 × 4,9 MB ≈ 15 MB (önceden ≈ 11 MB). Faz 08 gerçek sayıyı ölçmeli.

## 5. Görsel farklar / elle kontrol
Bilinen yeni fark yok. Kontrol edilenmemiş: kontrol edilmeyen odada çerçeve artık
sprite'ın tamamı 0.4 alfa (öncesi parça parça); gölge+kenarlık üst üste binen
bölgede sonuç aynı ya da daha yakın DOM'a. Gözle bakılmalı: dış köşedeki lav/portal
etiketi tam mı, oda parlaması kesilmiyor mu, oyuncu adımında titreme var mı, DPR 2'de
parlama inceliği.

## 6. Sonraki faza not
- `BOARD_BLEED` 32; Faz 06 gerekirse büyütür (tek sabit).
- Yeni kod `ctx.shadowBlur` yazmaz; `setShadow` kullanır (sprite bağlamında).
- Sprite rasterize eden her yeni yol `spriteCache.get` üzerinden geçmeli, yoksa
  `setShadow` DPR'yi 1 sanar.
