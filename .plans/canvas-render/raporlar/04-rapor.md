# Faz 04 Raporu — Overlay Katmanları: İz, Kablo, Kenar, Portal, Oda Çerçevesi

> Plan: `.plans/canvas-render/04-overlay-katmanlari.md` · Bağlayıcı: `00-ilkeler.md`

> **Görsel doğrulama YAPILMADI.** DOM ile yan yana ayırt edilemezlik ve akış hızı
> kriterleri gerçek tarayıcıda gözle kontrol edilmeli (§6). Bu raporda görsel
> eşdeğerlik iddiası yoktur; yalnızca değerlerin kaynak DOM'dan birebir taşındığı ve
> saf mantığın test edildiği iddia edilir.

---

## 1. Ne yapıldı

Toplam 250 satırı aştığı için (≈1100 satır) `render/overlays/` altında bölündü.

| Dosya | İçerik |
|---|---|
| `overlays/geometry.ts` | Oda gezme, padding box, şerit/etiket konumu, `drawAt` |
| `overlays/timing.ts` | CSS animasyonlarının saf karşılıkları (nabız, akış, nefes, dönüş, kesik çizgi) |
| `overlays/roomFrame.ts` | Oda çerçevesi (`paintBox`, doğrudan) + oda başlığı |
| `overlays/trails.ts` | `trail\|<oyuncu>\|<yön>`, `trailnode\|<oyuncu>` + `drawTrails` |
| `overlays/cables.ts` | `cable\|h`, `cable\|v`, `cablenode` + `drawCables` |
| `overlays/edgeStrips.ts` | `wall` şeridi (static) + `lava`/`portal` akan şerit (ambient) |
| `overlays/edgeLabels.ts` | Daire + ikon sprite'ı, nefes/dönüş |
| `overlays/portalPaths.ts` | Bulanık alt katman sprite'ı + kesikli üst katman |
| `overlays/index.ts` | `drawRoomFrames`, `drawStaticOverlays`, `drawAmbientOverlays` |
| `overlays/overlays.test.ts` | 18 test — anahtarlar, yerleşim, zaman fonksiyonları |

### Değişen dosyalar

| Dosya | Değişiklik |
|---|---|
| `render/BoardCanvas.tsx` | `drawStaticLayer`/`drawAmbientLayer` overlay'leri çağırıyor; `static` sinyali tek ref'te birleşti (§2.8) |
| `render/cells/index.ts` | `roomBorderWidth` `export` edildi (overlay'ler aynı kenarlık kalınlığını okuyor) |

### §2.8 — `static` sinyali

`lastStaticRooms` + `lastOccupancy` iki ref'i tek `lastStatic` nesnesine
(`rooms`, `occupancy`, `players`) dönüştü. Tema ve yeniden boyutlandırma `null`
yazarak tetikler. Oyuncu imzası `boardIndex.ts`'teki `playersSignature`'tan.

---

## 2. Plandan ayrılan noktalar (kaynak DOM esas alındı)

1. **Z-sırası.** Plan `static`i "kablolar → izler" yazıyordu; kaynakta iz `zIndex: 5`,
   kablo `zIndex: 6` → **kablolar izlerin üstünde**. Plan ayrıca `ambient`i "şeritler →
   etiketler → yollar → hücre süsleri" diye sıralıyordu; kaynakta portal svg `80`,
   şeritler `90`, etiketler `95`, hücreler en altta. Uygulanan:
   - `static`: çerçeve → hücreler → iz → kablo → wall şeritleri → başlık
   - `ambient`: hücre süsleri → portal yolları → lava/portal şeritleri → etiketler
2. **Portal sprite anahtarı** `portalpath|<connectionKey>|<d>`. Plan yalnızca
   `connectionKey` diyordu; ama aynı oda kimlikleri (ör. `main`) başka bir bölümde
   başka yerleşimle gelebilir ve sprite yolun ŞEKLİNE bağlı — eski bölümün bulanık
   izi kalırdı. `d` görüntüyü tam belirler, anahtar hâlâ yalnızca görüntüyü etkileyen
   girdiyi içeriyor.
3. **Sprite kutusu için yol sınırı.** `Path2D`'nin sınır sorgusu yok. `d` yalnızca
   mutlak `M/L/Q` sayılarından oluştuğu için (`getRoundedCornerPath`) sayı çiftlerinin
   min/max'ı alınıyor (Bézier kontrol noktaları eğrinin üst sınırı). `d` **çizim için
   ayrıştırılmıyor**, yalnızca kutu için okunuyor.
4. **DOM'daki iki tuhaflık korundu** (görüntü değişmesin diye):
   - İz ve kablo `offset.left + c*64`'te; hücreler kenarlık kadar (2–3px) içeriden
     başlıyor. Yani DOM'da iz/kablo hücreye göre **kenarlık kalınlığı kadar sol-üste
     kayık**. Canvas aynı kaymayı yapıyor. Bu DOM'da bir hata olabilir — bkz. §5.
   - Oyuncuya bitişiklik (`isPlayerLeft` vb.) `roomId`'ye bakmıyor; başka odadaki aynı
     koordinat da sayılıyor. Aynen taşındı.
5. **İz ve kablo oda `opacity`sinden etkilenmez** (DOM'da oda `<div>`'inin dışındalar);
   yalnızca çerçeve, başlık, kenar şeritleri ve etiketler kontrol edilmeyen odada 0.4.

---

## 3. Ne yapılmadı ve neden

- Varlıklar, hareket, efektler, zafer (Faz 05–06).
- Sis / `explored` (Faz 07): her iz ve kablo görünür çizilir, kablo opaklığı `0.65` sabit.
- `HintBoardMarker` DOM'da kalıyor.
- `paintTokens.ts`'e dokunulmadı.
- Çizim testi yazılmadı (00-ilkeler §6.1).
- Karşılaştırma sayfası (`dev-cell-compare`) overlay'lerle genişletilmedi; plan istemiyor.

---

## 4. Karar bekleyen konular (proje sahibi)

**4.1 Tuval sınırı kenar etiketlerini ve dış parlamayı kırpıyor.**
`calculateRoomLayoutOffsets` tahtanın dört yanına 20px pay bırakıyor. DOM'da etiketler
kenarın 28px dışında (24px daire) ve tahtanın kendisi kırpmıyor; canvas ise
`totalWidth × totalHeight` ile sınırlı. Tahtanın **dış** kenarındaki `lava`/`portal`
etiketlerinin ~6px'i kesilir (kenarlık 2px iken). Oda `boxShadow`u (24–30px) de aynı
sebeple 20px'te kesilir. Çözüm tuvallere taşma payı vermek olurdu (`surface.ts` +
tüm koordinatların kayması) — bu fazın kapsamı dışında bir mimari karar; **yapmadım.**

**4.2 Oda çerçevesindeki gölge, `static` yeniden çizildikçe ana yolda hesaplanıyor.**
Plan çerçeveyi sprite yapmayıp "doğrudan çiz" dedi; uydum. Ancak §2.8 yüzünden
`static` artık her oyuncu adımında yeniden çiziliyor ve çerçevenin dış gölgesi
(`0 0 30px`) o sırada `paintBox` → gölge ile hesaplanıyor. Bu, 00-ilkeler §2.1'in
"kare başına yolda gölge yok" ilkesinin ruhuna ters düşebilir. `grep` kriteri
geçiyor (overlay dosyalarında yalnızca sprite içinde), ama ilke geçmeyebilir.
Alternatif: çerçeveyi `roomframe|<tema>|c<0|1>|<w>x<h>` anahtarıyla sprite yapmak
(tek `drawImage`). Önlem olarak Faz 08 ölçümünde bakılmalı; onay verirsen sprite'a
çeviririm.

---

## 5. Görsel farklar

| Nerede | Fark | Sebep |
|---|---|---|
| Kontrol edilmeyen oda | Çerçeve arka planı/kenarlığı/gölgesi ayrı ayrı 0.4 alfa; DOM'da grup olarak | Plan: oda başına `globalAlpha`. Üst üste binen 2–3px'te renk hafif farklı olabilir |
| Kontrol edilmeyen oda | `transition: opacity/box-shadow 0.25s` yok, geçiş anlık | Faz 05 hareket/geçiş altyapısına ait |
| Kablo | 4×4 düğüm ile şerit örtüşmesi grup opaklığı yerine ayrı alfa | Plan üç ayrı sprite istiyor; fark ~4px'lik alanda |
| Kenar etiketi | İkon dairenin tam merkezinde; DOM'da `vertical-align: middle` (≤1px fark olabilir) | Satır kutusu canvas'ta yok |
| Oda başlığı | `line-height: normal` = 1.15em kabul edildi | 03-rapor §11 ile aynı |
| Oda başlığı | `ctx.letterSpacing` yoksa harf harf çiziliyor (kerning kaybolur) | Plan gereği |
| Portal alt katmanı | `blur(4px)` (σ=4) → `shadowBlur = 2σ × DPR`, şekil tuvalin dışına çizilip gölgesi içeri alınıyor | `ctx.filter` yasak; gölge yolu yalnızca sprite içinde |
| Bölüm 4.1 | Dış kenar etiketleri ve dış parlama kırpılıyor | bkz. §4.1 |
| Nefes/dönüş/akış/nabız/kesik çizgi | Süreler ve eğriler CSS ile aynı; **DOM'un başlangıç fazı** (eleman oluşma anı) tutmuyor | Saat `now % periyot`; yüzü farklı anda başlıyor |

**Kapsam dışı gözlem (DPR).** Canvas 2D'de `shadowBlur` ve `shadowOffset` dönüşüm
matrisinden etkilenmez (cihaz pikseli). `paintTokens.outerShadows`/`outerGlow` bunu
DPR ile çarpmıyor; sprite tuvali DPR ölçekli olduğu için **DPR 2'de parlamalar
DOM'a göre yarı yarıçapta çıkabilir** (Faz 02–04'teki tüm glow'lar). Doğrulayamadım;
DPR 2 cihazda gözle bak. Yalnızca kendi portal sprite'ımda DPR'yi elle uyguladım.

---

## 6. Doğrulama (00-ilkeler §6)

| Kontrol | Komut | Sonuç |
|---|---|---|
| Tip denetimi | `npx tsc --noEmit` | ✅ temiz |
| Testler | `npm test` | ✅ **308 test geçti** (Faz 03: 290; +18, hepsi `overlays.test.ts`) |
| Lint (tüm repo) | `npm run lint` | ✅ **431 hata / 13240 uyarı** — tabanla aynı |
| Lint (yalnız `src`) | `npx eslint src` | ✅ **154 hata / 52 uyarı** — tabanla aynı |
| Lint (yeni kod) | `npx eslint src/game-engine/render` | ✅ çıktı boş, 0 sorun |
| Android build | `npm run build:mobile` | ✅ `Sync finished in 1.021s` |
| `shadowBlur`/`ctx.filter` | `grep -rn "shadowBlur\|ctx\.filter" src/game-engine/render/overlays` | ✅ yalnızca `portalPaths.ts:119–125`, yani `portalGlowSprite.draw` içi (sprite rasterleyici) |

### `cache.size()` ölçümü

Gerçek tuval yok; iki odalı (5×5 ve 7×4), lav + portal kenarlı, iki portal
bağlantılı, 7 oyuncu rengiyle izli ve kablolu sentetik bir sahne, sahte `cache`
ile çizdirilip **farklı anahtarlar sayıldı** (geçici test dosyası ölçümden sonra silindi):

| Mod | Overlay sprite sayısı |
|---|---|
| `ambientMode='on'` | **40** |
| `ambientMode='off'` | **40** |

Dökümü: iz kolu 14 (7 oyuncu × 2 yön; tavan 6×4 + 6 = 30), iz düğümü 7, kablo 3,
kenar gradient+parlama 12 (6 farklı tür/eksen/uzunluk × 2), etiket 2, portal yolu 2.
Tavan kaba biçimde: 30 + 3 + 2 + 2·(tür × eksen × farklı oda uzunluğu) + bağlantı
sayısı. Sayısal tavan yok (00-ilkeler §3.1); denetlenen kural: hiçbir `key()`
`cell.id`, `position` veya ilgisiz `customData` içermiyor — `overlays.test.ts` kilitliyor.

Not: kenar akış sprite'ı 3 kat uzunlukta (ör. 444px oda → 1332px). Bellek ölçümü
Faz 08'de sprite alanıyla birlikte yapılacak.

---

## 7. Elle kontrol (proje sahibi)

```js
localStorage.setItem(`${localStorage.getItem('activeUserId') ?? 'anon'}:boardRenderer`, 'canvas');
location.reload();
```

1. Çok odalı, portal ve lav kenarlı, izli ve kablolu bir bölümde `canvas` ↔ `dom`
   yan yana.
2. **İz kolu oyuncuya bitiştiği yerde** doğru mu çiziliyor?
3. **Lav kenarındaki akış yönü** DOM'dakiyle aynı mı (üçgen dalga: gidip geliyor)?
4. **Kesikli portal çizgisi** doğru yerden doğru yere gidiyor mu, DOM'la aynı hızda mı
   akıyor (`-20px / 1.2s`)?
5. Kontrol edilmeyen oda **yalnızca kendisi** soluk mu?
6. İz/kablonun hücreye göre kenarlık kadar kayık olması (§2.4) DOM'da da böyle mi
   görünüyor — DOM'daki bir hata olabilir.
7. Tahtanın dış kenarındaki etiket kırpılması (§4.1) gözle kabul edilebilir mi?
8. `ambientMode='off'` (zayıf cihaz veya zafer): kenar şeritleri, etiketler ve portal
   yolları durağan olarak görünmeye devam etmeli.

---

## 8. Sonraki faza not

- `overlays/timing.ts`'teki `breathCurve` `easeInOut`'a (`cells/ice.ts`) dayanıyor;
  Faz 05 `motion.ts`'i açınca ikisi birlikte taşınmalı (03-rapor §6'dan devam).
- `static` sinyali artık `BoardCanvas`'ta tek `lastStatic` nesnesi. Faz 07 sis
  sinyalini oraya ekleyecek. İz/kablo çiziminde sis noktaları `trails.ts` ve
  `cables.ts` başlıklarında işaretli (`explored`, `isCurrentlyVisible`, opaklık 1/0.2
  ve 0.65/0.15).
- Faz 05 varlıkları çizerken bilmeli: kenar etiketleri/şeritler `ambient`te, yani
  `actors` katmanının ALTINDA. DOM'da etiketler `zIndex: 95`, şeritler `90`; varlık
  katmanının `PhysicsWrapper` z-değerini bu fazda incelemedim — üstte mi altta mı
  olduğu Faz 05'te kaynaktan teyit edilmeli.
- `BoardCanvas.tsx` 453 satır (Faz 01'de sınır aşımı zaten onaylıydı).
