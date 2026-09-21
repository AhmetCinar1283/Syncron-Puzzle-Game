# Faz 07 Raporu — Sis, Girdi ve DOM Köprüsü

> Plan: `.plans/canvas-render/07-girdi-sis-dom-koprusu.md` · Bağlayıcı: `00-ilkeler.md`
> Devir: `raporlar/06-rapor.md`

> **Görsel doğrulama YAPILMADI.** Tarayıcı/cihaz yok. Bu raporda "DOM ile ayırt
> edilemez" iddiası yoktur; yalnızca değerlerin `BoardCell.tsx` / `GameBoard.tsx` /
> `RoomOverlays.tsx`'ten birebir taşındığı ve saf mantığın testle kilitlendiği iddia
> edilir. §8'deki elle kontrol listesi proje sahibinde. Aynı sebeple faz planı §4'ün
> "yan yana ayırt edilemiyor", "ipucu doğru hücreyi gösteriyor" ve "swipe çalışıyor"
> maddeleri **cihazda doğrulanmayı bekliyor**; kodda doğrulanabilenler §3'te.

---

## 1. Ne yapıldı

### Yeni dosyalar (`src/game-engine/render/`)

| Dosya | İçerik |
|---|---|
| `fog.ts` | Sis çekirdeği: `computeFogLevels` (hücre başına 0 gizli / 1 karartılmış / 2 görünür; `boardIndex.isCellVisible`/`playersIn` kullanır, kural yeniden yazılmadı), `createFogTracker` (seviye değişimi, 0.3s geçiş, sürüm sayacı), `FogFrame` (çizicilerin okuduğu `explored` / `lit` / `entityAlpha`) — 169 satır |
| `cells/dim.ts` | `dimVariantOf(painter)`: herhangi bir hücre sprite'ının karartılmış varyantı, anahtar `<temel>\|dim`. `ctx.filter` YALNIZCA burada (rasterizasyon) |
| `cells/fogBlit.ts` | Kare döngüsü tarafı: `blitFogged` (karartılmış / normal / ikisi arası geçiş), `drawHiddenBorder` (keşfedilmemiş kare) |
| `profiler.ts` | `isProfilerEnabled`, `recordFrame`, `frameStats` (plandaki imzalar) + `drawsPerSecond` |
| `ProfilerOverlay.tsx` | Profiler açıkken köşede küçük DOM katmanı |
| `fog.test.ts`, `profiler.test.ts`, `surface.test.ts` | 29 test (+ `spriteCache.test.ts`'e 2, `victory.test.ts`'e 1) |

### Değişen dosyalar

| Dosya | Değişiklik |
|---|---|
| `cells/index.ts` | `drawCellsStatic`/`drawCellsAmbient` beşinci/altıncı parametre `fog: FogFrame \| null`. Keşfedilmemiş hücre: `#020617` zemin + `1px rgba(30,58,138,0.05)` kenar, sprite ve süs yok. Yerel `blit` kaldırıldı, `blitFogged` kullanılıyor |
| `overlays/trails.ts`, `overlays/cables.ts`, `overlays/index.ts` | Keşfedilmemiş hücrenin izi/kablosu çizilmez; opaklık iz `0.2→1.0`, kablo `0.15→0.65` (`FogFrame.lit` ile); kablo şeridi komşu hücre keşfedilmemişse çizilmez (`RoomCablesImpl`'deki `isRightExplored`/`isDownExplored`) |
| `entities/index.ts` | `drawActorsLayer` yedinci parametre `fog`. Oyuncu keşfedilmiş hücrede hep görünür, diğer varlıklar yalnızca görünür hücrede (`GameBoard`'daki `opacity` kuralı). Geçiş sürerken `alive = true` |
| `BoardCanvas.tsx` | (a) sis izleyicisi kuruldu, `static` katmanının birleşik sinyaline `fog: revision` terimi eklendi; (b) geçiş sürerken `static` (ve `ambient`, mod `off` değilse) 300ms kirli tutuluyor; (c) tuvallere `role="img"` + `aria-label`; (d) `getContext('2d')` yoksa `GameBoard`'a düşüş; (e) profiler ölçümü ve `ProfilerOverlay` |
| `surface.ts` | `canUseCanvas2d`, `labelSurfaces` |
| `spriteCache.ts` | `bytes()` (Σ tuval genişlik × yükseklik × 4) ve `delete(key)` |
| `victorySprites.ts`, `victory.ts` | §2.5: vignette yarı çözünürlük + tek yuvalı |
| `components/play-screen/BoardArea.tsx`, `components/PlayScreen.tsx` | **Yalnızca** `levelName` prop geçişi (proje sahibi onayı; 00-ilkeler §8, `render/` dışı) |

DOM çizicilerine (`GameBoard`, `BoardCell`, `RoomOverlays`, `HintBoardMarker`, `cells/`, `entities/`) **dokunulmadı**.

---

## 2. Plandan ayrılan noktalar

**2.1 `BoardCanvas` ikiye bölündü: dışta `BoardCanvas` (sarmalayıcı), içte `CanvasBoard`.**
Plan "`BoardCanvas` sessizce `GameBoard`'a düşsün" diyor. İç bileşen kendi film
oynatma efektlerini (kare ilerletme, ses, titreşim, `onAnimationEnd`) yürütüyor;
düşüşü iç bileşenin *içinde* yapsaydım `GameBoard` da bağlanınca `onAnimationEnd` iki
kez tetiklenirdi. Karar dışta verilir: `canUseCanvas2d()` ön yoklaması + tuvaller
kurulurken `createSurfaces` fırlatırsa `onUnsupported` çağrısı. Dışa açık arayüz
(`default export BoardCanvas`, props) aynı, yalnızca `levelName` eklendi.

**2.2 Karartma: sprite varyantı seçildi, siyah dikdörtgen değil.** (Kabul kriterinin
"hangisini seçtin, gerekçe" maddesi.)
`brightness(0.3) contrast(0.8)` zincirinin sonucu `0,24·c + 0,1` — `contrast(0.8)`
siyahı %10 griye **kaldırıyor**. `globalAlpha`'lı siyah dikdörtgen yalnızca
`c·(1−a)` verir; koyu hücreler DOM'dan bariz ayrılırdı (00-ilkeler §4). Bunun bedeli
önbellek büyümesi; ölçüsü §4'te. Bedel yalnızca **sisli odalarda, karartılmış
görülen hücre tiplerinde** ödeniyor; sissiz seviyede varyant hiç üretilmez.
`ctx.filter` kullanıldı (rasterizasyon, 00-ilkeler §2.1 izinli); `brightness`/
`contrast` uzunluk birimi taşımadığı için DPR sorunu yok. Filtre desteği olmayan
bağlamda (`typeof ctx.filter !== 'string'`) `source-atop` + `rgba(0,0,0,0.7)` ile
taklit edilir — **bu yedek yol gerçek bir cihazda denenmedi**, katsayısı (0,7)
tahmindir.

**2.3 Karartma varyantı ambient katmanına da uygulandı.** Plan yalnızca "hücre
sprite'ı" diyor ama DOM'da süsler karartma sarmalayıcısının *içinde*
(`BoardCell.tsx:60`). Süsler `ambient` katmanında olduğundan onların da `dim`
varyantı gerekiyor; aksi halde sis altındaki buz/portal/konveyör/hedef parlak
kalırdı. Keşfedilmemiş hücrede süs çizilmiyor.

**2.4 Varlıklar için de 0.3s geçiş var.** Plan yalnızca "oyuncu her zaman görünür,
diğerleri `isCellVisible`'a tabi" diyor. DOM'da varlığın `opacity`si
`transition: opacity 0.3s ease` ile geçiyor; anlık gizlemek DOM'dan ayrılırdı. Aynı
küresel ilerleme değeri kullanıldı, yeni mekanizma yok.

**2.5 Fog sinyali `players` terimini tekrarlıyor gibi görünüyor ama değil.** Görünürlük
oyuncu konumlarından türediği için `playersSignature` zaten değişiyor. Yine de plan
"sis de aynı birleşik sinyale bir terim olarak eklenir" dediği için `fog:
revision` terimi eklendi; ek olarak `ambient` katmanını da yalnızca sis değiştiğinde
uyandırmak için ayrı bir işlev görüyor (hamle sırasında `ambient` `paused`).

**2.6 Tuval etiketi üç tuvalde de.** Plan "tuvallere" diyor; üçü de aynı
`role="img"` + `aria-label`i taşıyor. Ekran okuyucu aynı etiketi üç kez okuyabilir;
istenirse yalnızca `static`e etiket, ikisine `aria-hidden` verilebilir (rapor sahibine
soru). Etiket metni `Board: <seviye adı>`, çeviri anahtarı kullanılmadı (yeni anahtar
locale dosyalarına dokunmak demek, kapsam dışı).

**2.7 Tahta boyutu / sis geçişinin küresel ilerleme basitleştirmesi.** Bkz. §5.

---

## 3. Kodda doğrulananlar (tarayıcısız)

- **Swipe (§2.2).** `surface.ts:84` her üç tuvale `pointerEvents: 'none'` veriyor;
  `BoardArea`'nın `onTouchStart/Move/End`i tahtadan bağımsız kapsayıcıda. Hiçbir
  işleyiciye dokunulmadı. Cihazda swipe **denenmedi**.
- **İpucu köprüsü (§2.3).** `BoardArea` `boardOverlay`'i `BoardCanvas`/`GameBoard`
  seçiminin hemen altında, aynı ölçekli sarmalayıcıda render ediyor; `HintBoardMarker`
  katmanı `zIndex: 40`, ana `host` `position: relative` ama `z-index`i yok (yığın
  bağlamı kurmuyor), tuvaller `z-index` 1–3 → işaret tuvallerin üstünde. Koordinatlar
  board'un native piksel sistemi, canvas'ınki de aynı (`BOARD_BLEED` kaydırması
  tuvalin `left/top`unda, çizim koordinatlarında değil). Doğru hücreyi/yönü
  gösterdiği cihazda **görülmedi**.
- **`getContext('2d')` null (§2.4).** `surface.test.ts`: `null` döndüğünde, fırlattığında
  ve `document` yokken `canUseCanvas2d` `false` → `BoardCanvas` `GameBoard` döndürür.
  Tam uçtan uca (React render) test yok: test ortamı `node`, `jsdom` yok.
- **Kare döngüsünde gölge/filtre yok.** `grep -rn "shadowBlur\|ctx\.filter" src/game-engine/render/`
  yorum satırları dışında yalnızca `paintTokens.ts:70` (`setShadow` gövdesi) ve
  `cells/dim.ts:57-58` (rasterleyici) veriyor. Kare döngüsü dosyaları (`fogBlit.ts`,
  `cells/index.ts`, `trails.ts`, `cables.ts`, `entities/index.ts`) temiz.
- **Profiler kapalıyken ölçüm yok.** `BoardCanvas`'ta `performance.now()` yalnızca
  `isProfilerEnabled()` true iken çağrılıyor; bayrak modül seviyesinde bir kez
  okunuyor (`profiler.test.ts`).

---

## 4. Ölçüm — `cache.size()` ve bellek (00-ilkeler §3.1)

> **Bu sayılar sentetik.** Gerçek `CanvasRenderingContext2D` yok; hücre çizicileri
> hiçbir şey yapmayan bir sahte bağlamla çalıştırıldı, ikonlar sahte (`getIcon`
> her zaman doluyor). Sayılan şey **anahtar sayısı** ve `size()`'dan gelen tuval
> ölçüsü; piksel doğruluğu değil. Geçici ölçüm dosyası sonradan silindi.

Senaryo: 10×10 tek oda, on iki hücre tipi dönüşümlü, DPR 2, hücre kutuları gerçek
`size()`'lardan. "Oyuncu ızgarada gezer" = oyuncu 15 farklı konumda, böylece her
tip hem görünür hem karartılmış görülür (en kötü durum). Ambient fazları 12 000ms
boyunca örneklendi. Sis mesafesi 1,5.

| Tema | Sissiz | Sisli (oyuncu gezer) | Fark |
|---|---|---|---|
| `legacy` | 12 sprite / 0,86 MB | 24 sprite / 1,71 MB | +12 / +0,86 MB (×2) |
| `arcade` | 41 sprite / 3,19 MB | 65 sprite / 5,01 MB | +24 / +1,82 MB (×1,57) |
| `neon` | 41 sprite / 3,24 MB | 65 sprite / 5,10 MB | +24 / +1,86 MB |
| `blueprint` | 41 sprite / 3,19 MB | 65 sprite / 5,01 MB | +24 / +1,82 MB |
| `cosmic` | 41 sprite / 3,19 MB | 65 sprite / 5,01 MB | +24 / +1,82 MB |

Yorum: `dim` varyantı plandaki "**her** hücre sprite'ını ikiye katlar" uyarısının
doğrulaması — `legacy`'de (süs yok) tam ikiye katlıyor. Diğer temalarda ×1,57
çünkü ambient fazlarının bir kısmı (buz doluluk durumları) karartılmış hâlde
görülmüyor. Sis yalnızca sisli odası olan seviyelerde etkin; sissiz seviyelerde
sıfır ek maliyet. Yani sisli bir seviyede **en kötü durumda +~1,9 MB** (DPR 2, 10×10).
Bu, Faz 08'in 20MB eşiğinin yanında küçük; siyah dikdörtgen alternatifi bunu
sıfırlardı ama §2.2'deki görsel farkı getirirdi. **Karar proje sahibinde**: bu
bedel kabul edilebilir bulunmazsa dikdörtgene geçmek `cells/dim.ts` + `fogBlit.ts`
ile sınırlı bir değişiklik.

### Vignette (§2.5)

| | Önce (06-rapor §6) | Şimdi |
|---|---|---|
| 640×640 tahta, DPR 2, sprite kutusu | 720×720 CSS px | 360×360 CSS px (yarı çözünürlük) |
| Bellek | **7,91 MB** | **1,98 MB** (2 073 600 bayt; `victory.test.ts` kilitliyor) |

Blit `victoryVignetteBox` (tam boyut) ile yapılıyor, `imageSmoothingEnabled = true`.
Tek yuvalı: `victory.ts` içinde `WeakMap<SpriteCache, string>` o önbelleğin tuttuğu
vignette anahtarını hatırlıyor, farklı anahtar gelince eskisi `cache.delete()` ile
siliniyor. Genel bir ayıklama mekanizması yok: `delete(key)` yalnızca bu yerden
çağrılıyor. İstisna `victory.ts`'te gerekçesiyle yorumlandı. **Not:** vignette
koreografinin *ilk karesinde* üretiliyor ("başlamadan önce" değil); bu, eski
vignette'i silmenin animasyon sırasında yeniden rasterizasyon tetiklemediği
gerekçesini bozmuyor çünkü tahta boyutu koreografi sırasında sabit.

Vignette kalitesi **görsel olarak doğrulanmadı** (yumuşak gradient olduğu için
sorun beklenmiyor, ama beklenti bu).

---

## 5. Görsel farklar

| Nerede | Fark | Sebep |
|---|---|---|
| **Sis geçişi (küresel ilerleme)** | Oyuncu art arda birkaç tick hareket ederken her tick yeni bir geçiş başlatıyor ve önceki geçiş *o hücre için* biter: bir hücre 0,3s'de yumuşak açılmak yerine ~1 tick (~60–90ms) sonra tam açılıyor. DOM'da her hücrenin kendi geçişi mevcut değerinden devam eder | Plan §2.1'in kendi seçtiği basitleştirme ("tek bir küresel ilerleme değeri yeter"). **Görsel sonucu cihazda gözlenmedi**; yukarıdaki, kod okumasından çıkan öngörü. Tek adım / dururken ve son tick'te geçiş DOM'la aynı. Gerekirse: hücre başına yalnızca `{başlangıç damgası, hedef}` tutan küçük bir harita (zamanlayıcı değil) bunu giderir — kararı proje sahibine bırakıyorum |
| **İz/kablo opaklığı** | Her sprite kendi `globalAlpha`'sıyla çiziliyor; DOM'da hücrenin tüm iz grubu tek `opacity` altında. Sis altında (0,2 / 0,15) kol ile düğümün üst üste bindiği parlama bölgesinde küçük fark olabilir; tam görünürde (1,0 / 0,65) fark yok | `opacity` grup katmanı canvas'ta kare başına ara tuval demek, §2.1 ruhuna aykırı |
| **Karartma yedeği** | `ctx.filter` desteklenmeyen WebView'de `source-atop` siyah örtü, `contrast` tabanını taklit etmez | §2.2 |
| **Yeni turun ilk karesi** | `prevEntities === null` iken sis geçişsiz yazılıyor; DOM aynı bileşen yeniden kullanıldığında (ör. yeniden dene) eski karartma durumundan geçiş oynatabilir | Yeni bölümde eski bölümün sisinden animasyon oynamasın diye bilinçli |
| **Keşfedilmemiş ↔ keşfedilmiş** | Anlık (geçiş yok) | DOM'da da öyle: farklı ağaç render ediliyor, `filter` geçişi tetiklenmiyor |
| Tuval etiketi | Ekran okuyucuda üç kez okunabilir | §2.6 |

---

## 6. Ne yapılmadı ve neden

- **Yeni isabet testi / tıklamayla oynama** — kapsam dışı (§2.2, §3).
- **`HintBoardMarker`'ın canvas'a taşınması** — kapsam dışı (§2.3, §3).
- **Editör, menü, `LevelMiniPreview`** — dokunulmadı (§2.7). Önizlemelerin yavaşlığına dair gözlem yok.
- **Genel ayıklama / LRU** — kurulmadı (§2.5).
- **Vignette için `CanvasGradient` + `fillRect` yedeği** — yapılmadı; Faz 08 ölçümü gerektirirse.
- **Cihazda görsel ve etkileşim doğrulaması** — imkânsızdı, §8.
- **Çeviri anahtarı** (`aria-label`) — yeni locale anahtarı kapsam dışı.

---

## 7. Doğrulama (00-ilkeler §6)

| Kontrol | Komut | Sonuç |
|---|---|---|
| Tip denetimi | `npx tsc --noEmit` | ⚠️ **1 hata, bu fazın değil:** `src/features/levels/components/circuit/ConstellationCircuit.tsx(111,21): Cannot find name 'useCallback'`. Dosya bu fazdan önce de değişikliklerle doluydu (git status başında `M`, +206/−12 satır). Faz 07 dosyalarında hata yok |
| Testler | `npm test` | ✅ **41 dosya / 415 test**, hepsi geçiyor (Faz 06: 37 / 374). Bu fazın eklediği 32 test: `fog` 17, `profiler` 8, `surface` 4, `spriteCache` +2, `victory` +1. Toplam artışın kalanı (1 dosya / 9 test) bu fazın değil; kaynağını doğrulamadım |
| Lint (yeni kod) | `npx eslint src/game-engine/render` + `BoardArea.tsx` | ✅ çıktı boş, çıkış kodu 0 |
| Lint (yalnız `src`) | `npx eslint src` | ⚠️ **163 hata / 55 uyarı** (taban 154 / 52). Faz 07 dosyaları temiz; artış başka dosyalardan geliyor, ama **kaynağını tek tek doğrulamadım**. `PlayScreen.tsx`'te 1 hata var (`react-hooks/refs`, satır 140, `useGameOverSound`), benim eklediğim satır değil |
| Lint (tüm repo) | `npm run lint` | ⚠️ **440 hata / 13243 uyarı** (taban 431 / 13240), aynı gerekçe |
| Android build | `npm run build:mobile` | ❌ **Next build başarısız** — aynı `ConstellationCircuit.tsx` `useCallback` hatası (satır 111). `cap sync`e ulaşmadı. Bu faz bunu tetiklemiyor, ama **bu kontrol yeşil değil** |
| 00-ilkeler §2.1 | `grep -rn "shadowBlur\|ctx\.filter" src/game-engine/render/` | ✅ yorum dışı yalnızca `paintTokens.ts:70` ve `cells/dim.ts:57-58` (ikisi de rasterleyici) |

Tabanın (154/52, 431/13240) ölçüldüğü andan bugüne çalışma ağacında benim dışımda
çok sayıda değişiklik var (git status başında ~40 dosya `M`/`D`); lint ve build
farkı oradan. Bu değişiklikleri düzeltmek kapsam dışı olduğundan dokunmadım.

---

## 8. Elle kontrol (proje sahibi)

Canvas modunu aç:

```js
localStorage.setItem(`${localStorage.getItem('activeUserId') ?? 'anon'}:boardRenderer`, 'canvas'); location.reload();
```

**Profiler'ı aç** (tek satır, sonra sayfayı yenile):

```js
localStorage.setItem(`${localStorage.getItem('activeUserId') ?? 'anon'}:boardProfiler`, '1'); location.reload();
```

Kapatmak için `'1'` yerine `'0'` yaz veya anahtarı sil. Açıkken tahtanın sol üstünde
katman başına ortalama/p95 kare süresi, çizim/sn, `sprite N ~X MB` görünür.

1. Sisli bir bölümde hareket et, iki modu yan yana izle: keşfedilmemiş kareler, karartılmış kareler, görünür kareler, izler, kablolar aynı mı? **Özellikle 3–4 hücrelik uzun bir kayma sırasında karartma geçişi DOM'daki kadar yumuşak mı?** (§5 ilk satır)
2. `fogKeepRevealed: false` bir seviyede aynı.
3. Sis altında oyuncu görünüyor, kutular görünmüyor mu?
4. Swipe canvas modunda çalışıyor mu?
5. İpucunu aç: halka ve ok doğru hücrede/yönde mi?
6. Zafer vignette'i (yarı çözünürlük) gözle DOM'dakinden ayırt ediliyor mu? (§4)
7. Profiler açıkken sisli bölümde `sprite N ~X MB` değerini oku; §4'teki sentetik sayıyla kıyasla.
8. **`getContext('2d')` yedeği:** DevTools konsolunda
   `HTMLCanvasElement.prototype.getContext = () => null` çalıştırıp (sayfa yüklenmeden önce, ör. bir snippet ile) oyunu aç: `GameBoard` ile açılmalı.

---

## 9. Sonraki faza not

- **Faz 08** `profiler.ts`'i **kullanır**; §2.5b'nin istediği bellek gösterimi
  (`sprite N ~X MB`) zaten var (`spriteCache.bytes()`). Tuval belleği (kademe payı,
  06-rapor §3) profiler'da **yok**, ayrı bir satır olarak eklenmeli.
- `useFilmPlayback` çıkarılırken (Faz 08 kabul kriteri) `BoardCanvas` artık iki
  bileşen: oynatma mantığı `CanvasBoard` içinde, `GameBoard` fallback'i dışta.
  Çıkarılan hook her ikisinin de kullanabileceği yerde durmalı; şu an düşüş
  sırasında `CanvasBoard` sökülüyor, `GameBoard` kendi oynatmasını başlatıyor.
- **Açık uç (proje sahibi kararı):** §5'teki sis geçişi basitleştirmesinin görsel
  sonucu ve §2.2/§4'teki `dim` bellek bedeli.
- `victoryVignetteSprite.size()` artık sprite'ın *gerçek* (yarı) kutusunu veriyor,
  blit ölçüsünü değil (`SUPERNOVA_RASTER` ile aynı sözleşme, ters yön). Yeni bir
  çağıran blit için `victoryVignetteBox` kullanmalı.
- `ConstellationCircuit.tsx`'teki `useCallback` içe aktarması eksik: `tsc` ve
  `build:mobile` bu yüzden kırık. Bu fazın işi değil, ama Faz 08 doğrulaması
  yeşil bir taban isteyecek.
