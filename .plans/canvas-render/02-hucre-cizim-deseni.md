# 02 — Hücre Çizim Deseni: Tema Jetonları + İlk Dört Hücre

> Bağlayıcı: `.plans/canvas-render/00-ilkeler.md`. Önce `raporlar/01-rapor.md` oku.
> **Model: opus.** Bu fazda kurulan desen, Faz 03'te sekiz kez tekrarlanacak.
> Desen yanlış kurulursa sekiz dosya birden yanlış olur.

---

## 1. Okuyacağın dosyalar

| Dosya | Neden |
|---|---|
| `.plans/canvas-render/00-ilkeler.md`, `raporlar/01-rapor.md` | Sözleşme ve devir notu |
| `src/game-engine/render/types.ts`, `spriteCache.ts`, `icons.ts` | Faz 01'in ürettiği altyapı |
| `src/game-engine/themes/themeConfig.ts` | Beş temanın tüm jetonları — bu fazın ana kaynağı |
| `src/game-engine/components/cells/normalCellRenderer.tsx` | Port edeceğin 1. hücre |
| `src/game-engine/components/cells/obstacleCellRenderer.tsx` | Port edeceğin 2. hücre (5 `styleType`) |
| `src/game-engine/components/cells/forbiddenCellRenderer.tsx` | Port edeceğin 3. hücre (3 `hazardType`) |
| `src/game-engine/components/cells/iceCellRenderer.tsx` | Port edeceğin 4. hücre (animasyonlu süs örneği) |
| `src/game-engine/components/board/BoardCell.tsx` | `isOccupied` ve sis mantığının bugünkü tanımı |
| `src/game-engine/components/board/boardKeyframes.ts` | `ice-icon-animated` süsünün keyframe'i |
| `src/game-engine/components/effects/animationStyles.ts` | Süs keyframe'lerinin gövdesi |

---

## 2. Sorun

Hücre çizicileri CSS jetonlarıyla yazılmış: `linear-gradient(...)`, `1.5px solid rgba(...)`,
`inset 0 0 22px rgba(...)`, `drop-shadow(0 0 8px ...)`, `border-radius: 6px`,
`backdrop-filter: blur(4px)`. Bunların hiçbirinin canvas'ta doğrudan karşılığı yok.

Beş tema × 12 hücre tipi × (boş/dolu) = yüzlerce kombinasyon. Her hücre çizicisinin bu
dönüşümü kendi başına icat etmesi, hem tutarsızlık hem de 8 kat tekrar demek.

---

## 3. Hedef

1. `paintTokens.ts` — CSS jetonlarını canvas çağrılarına çeviren, **tek ve paylaşılan**
   yardımcı katman.
2. Dört hücrenin çizicisi, bu katmanı kullanarak yazılsın; bunlar Faz 03'ün kopyalayacağı
   referans desen olsun.
3. `drawStaticLayer` ve `drawAmbientLayer` gerçekten çizsin.

---

## 4. Yapılacaklar

### 4.1 `render/paintTokens.ts`

En az şu yardımcılar. Hepsi saf, hepsi CSS pikselinde, hepsi test edilebilir girdi/çıktı
ayrıştırıcıları içerir:

| Yardımcı | Karşılığı |
|---|---|
| `parseCssColor(s): {r,g,b,a}` | `#rgb`, `#rrggbb`, `rgb()`, `rgba()` |
| `applyBackground(ctx, box, css)` | Düz renk **ve** `linear-gradient(<açı>deg, stop, ...)`. Açıyı `createLinearGradient` uç noktalarına çevir. |
| `parseBorder(css): {width, style, color}` | `1.5px solid rgba(...)`, `2px dashed ...` |
| `strokeBorder(ctx, box, border, radius)` | `border-radius` ile birlikte; `dashed` için `setLineDash`. Kenar **içeriden** çizilir (`box-sizing: border-box` karşılığı): yol, kutudan `width/2` içeri alınır. |
| `roundRectPath(ctx, box, radius)` | `border-radius` değeri `'0px'`, `'6px'`, `'50%'` olabilir |
| `innerShadow(ctx, box, radius, css)` | `inset 0 0 Npx rgba(...)`. Canvas'ta inset gölge yok; kutunun kenarından içe doğru bir radial/linear gradient ile taklit et. **Bu bir yaklaşımdır** — sonucu DOM'la yan yana koy, farkı rapora yaz. |
| `outerGlow(ctx, drawShape, color, blur)` | `box-shadow: 0 0 Npx c` ve `drop-shadow`. `shadowBlur` **burada serbesttir** (sprite rasterizasyonu, 00-ilkeler §2.1). |

**`backdrop-filter: blur(4px)`** (buz hücresi) canvas'ta karşılıksız. Yapma, rapora
yaz, proje sahibine sor. Geçici davranış: yok say — altındaki tahta zaten düz renk.

`parseCssColor`, `parseBorder` ve `linear-gradient` açı dönüşümü için test yaz
(`paintTokens.test.ts`). Bunlar saf dizgi işleme; bu izde test edilmesi en kolay
ve en çok işe yarayacak yer burası.

### 4.2 `render/cells/index.ts` — kayıt

```ts
export const CELL_SPRITES: Partial<Record<CellTypes, SpritePainter<CellPaintInput>>>;
/** Animasyonlu süsü olan hücreler; yoksa ambient katmanında çizilmez. */
export const CELL_AMBIENT_SPRITES: Partial<Record<CellTypes, AmbientSprite>>;
```

`Partial` kasıtlı: Faz 02 dördünü, Faz 03 kalanını doldurur. Kayıtta olmayan bir tip
**`normal` hücreye düşer** ve bir kez `console.warn` ile bildirir — böylece Faz 03
bitene kadar tahta yine anlamlı görünür.

### 4.3 Dört hücre

| Dosya | Kaynak | Dikkat |
|---|---|---|
| `cells/normal.ts` | `normalCellRenderer.tsx` | En basit; `themeConfig.normalCell` |
| `cells/obstacle.ts` | `obstacleCellRenderer.tsx` | 5 `styleType` (`classic`, `brick`, `tech_plate`, `blueprint_hatch`, `obsidian`) — hepsi taşınacak |
| `cells/forbidden.ts` | `forbiddenCellRenderer.tsx` | 3 `hazardType`; `skull` ikonu `icons.ts`'ten |
| `cells/ice.ts` | `iceCellRenderer.tsx` | `isOccupied` iki ayrı görünüm; `ice` ikonu; `backdrop-filter` sorunu |

Her biri 00-ilkeler §3.1'deki `SpritePainter` sözleşmesine uyar. `key()` içine **yalnızca
görüntüyü etkileyen** şeyler girer: tip, tema, `isOccupied`, `phase`. `cell.id`,
`position` veya `customData`'nın tamamı **girmez** — girerse önbellek hücre sayısı kadar
büyür ve izin amacı kaybolur.

Örnek doğru anahtar: `ice|cosmic|occ1|p0`.

### 4.4 Buz ikonunun ambient süsü

`ice-icon-animated` sınıfı `animationStyles.ts`'te bir keyframe'e bağlı. Bu, hücrenin
**animasyonlu parçası**: 00-ilkeler §3.2 uyarınca 12 faza örneklenir ve `ambient`
katmanına çizilir. Hücrenin durağan gövdesi (arka plan, kenar, iç gölge) `static`
katmanına gider ve ikonu **içermez**.

Bu ayrımı `cells/ice.ts` içinde net kur; Faz 03 bunu portal, konveyör, hedef, güç ve
toggle için tekrarlayacak.

### 4.5 `drawStaticLayer` ve `drawAmbientLayer`

Faz 01'in bıraktığı boş gövdeleri doldur:

- `drawStaticLayer`: tuvali temizle; her oda için her hücreyi `roomPositions` ofsetiyle
  `drawImage(cache.get(CELL_SPRITES[type], input), x, y)`. Kontrol edilmeyen oda için
  `globalAlpha = 0.4` (bugünkü `opacity: isControlled ? 1 : 0.4` karşılığı).
- `drawAmbientLayer`: tuvali temizle; yalnızca `CELL_AMBIENT_SPRITES`'ta kaydı olan
  hücreler için faz seçip blit.

Sis (fog) bu fazda **kapsam dışı** — Faz 07. Şimdilik tüm hücreler görünür çizilir;
sisli seviyeler canvas modunda yanlış görünecek. Bu bilinerek bırakılıyor, rapora yaz.

---

## 5. Kapsam dışı

- Kalan 8 hücre tipi (Faz 03).
- İz, kablo, kenar şeritleri, portal yolları, oda çerçevesi/başlığı (Faz 04).
- Varlıklar ve efektler (Faz 05–06).
- Sis (Faz 07).
- `GameBoard.tsx` ve DOM çizicilerinde herhangi bir değişiklik.

---

## 6. Kabul kriterleri

- [ ] `paintTokens.ts` §4.1'deki yardımcıları veriyor ve `paintTokens.test.ts` geçiyor.
- [ ] `boardRenderer='canvas'` iken **beş temanın hepsinde**, boş/engel/yasak/buz
      içeren bir bölüm açıldığında tahta DOM moduyla yan yana ayırt edilemiyor
      (varlıklar ve overlay'ler henüz yok — onların eksikliği beklenen).
- [ ] Buz ikonu ambient katmanında nabız atıyor; `ambientMode='off'` iken duruyor.
- [ ] 100 hücrelik bir tahtada `cache.size()` **20'nin altında** — yani anahtarlama
      doğru. Bu sayıyı rapora yaz.
- [ ] `grep -rn "shadowBlur\|ctx\.filter" src/game-engine/render/` yalnızca
      `paintTokens.ts` / `spriteCache.ts` / `icons.ts` içinde eşleşiyor.
- [ ] 00-ilkeler §6 tablosundaki dört kontrol yeşil.
- [ ] `raporlar/02-rapor.md` yazıldı; `innerShadow` yaklaşımının ve
      `backdrop-filter`'ın durumu §4 başlığı altında açıkça anlatıldı.

---

## 7. Elle kontrol (proje sahibi)

- Tema seçiciden beş temayı tek tek dolaş; her temada canvas ve DOM modunu karşılaştır.
- Özellikle buz hücresinin dolu/boş hâllerine ve engel hücresinin iç karesine bak.
