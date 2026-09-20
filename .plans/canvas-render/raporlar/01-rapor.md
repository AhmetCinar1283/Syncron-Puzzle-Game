# Faz 01 Raporu — Render Çekirdeği: Yüzey, Zamanlayıcı, Sprite Önbelleği

Tarih: 2026-09-20 · Dal: `refactor/architecture`

Bu faz hiçbir oyun içeriği çizmez. Çıktısı, `boardRenderer='canvas'` iken ekranda
duran **boş ama doğru boyutlu, doğru DPR'li üç tuval** ve sonraki yedi fazın
üzerine inşa edeceği altyapıdır.

---

## 1. Ne yapıldı

### `src/game-engine/render/` (7 dosya + 2 test)

| Dosya | Satır | İçerik |
|---|---|---|
| `types.ts` | 87 | `LayerName`, `PHASES = 12`, `CellPaintInput`, `SpritePainter<T>`, `BoardScene`, `RoomOffset`; `NATIVE_CELL_SIZE` ve `BoardAmbientMode` yeniden dışa aktarımı |
| `surface.ts` | 110 | `createSurfaces` / `resize` / `clearLayer` / `dispose` / `currentDpr` |
| `scheduler.ts` | 93 | `createScheduler` — kirli bayrak, boşta durma, ambient kısma |
| `spriteCache.ts` | 81 | `createSpriteCache` — ekran dışı rasterizasyon, `skipCache` yolu, 600 gözetimi |
| `icons.ts` | 126 | `getIcon` / `onIconsReady` / `clearIcons` — `GameIcon` SVG'lerinin bir kerelik rasteri |
| `boardRenderer.ts` | 55 | `BOARD_RENDERER_KEY`, `setBoardRendererOverride`, `detectBoardRenderer`, `useBoardRenderer` |
| `BoardCanvas.tsx` | 336 | Giriş noktası: oynatma mantığı, sahne hesabı, yüzey + zamanlayıcı kurulumu, üç boş katman çizicisi |
| `scheduler.test.ts` | 172 | 7 test |
| `spriteCache.test.ts` | 156 | 6 test |

**`surface.ts`** — üç `<canvas>`, `position:absolute; inset:0`, `zIndex` 1/2/3
(`static` < `ambient` < `actors`), hepsinde `pointerEvents:'none'`. Bağlam
seçenekleri `{ alpha: true, desynchronized: true }`. `resize` ölçüler gerçekten
değişmediyse **hiçbir şey yapmaz** ve değiştiyse `true` döner (çağıran tüm
katmanları geçersizleştirir) — `canvas.width`'e aynı değeri yazmak bile tuvali
temizlediği için bu şart.

**DPR üst sınırı: `Math.min(window.devicePixelRatio || 1, 2)`.** Kasıtlı. 3x ve 4x
DPR telefonlarda sınırsız ölçek 9–16 kat piksel demek; bu izin amacı tam olarak o
maliyetten kaçmak. Bu ekranlarda 2x ile 3x gözle ayırt edilemez.

**`scheduler.ts`** — DOM'a bağlı değil, `raf`/`caf` enjekte edilebilir. Hiçbir
katman kirli değilken RAF planlanmaz. Kare içinde `rafId` çizimden **önce**
sıfırlanır; böylece `draw` içinden gelen `invalidate` (Faz 03'ün ambient döngüsünü
sürdürme deseni) yeni bir kare planlayabilir, kare sonundaki `hasDirty` kontrolü
de çift planlama yapmaz. Ambient kısmasında kare atlanırken bayrak **kirli kalır**,
döngü uyanık tutulur. `actors` kısılmaz.

**`spriteCache.ts`** — `document.createElement('canvas')` (`OffscreenCanvas`
kullanılmadı: eski Android WebView'lerde yok). Rasterleyici tuvali de DPR ölçekli
açılır ve `setTransform(dpr,0,0,dpr,0,0)` uygulanır, böylece `painter.draw` yine
CSS pikselinde çizer. Üst sınır yok; `size() > 600` olunca **bir kez**
`console.warn`. `getContext('2d')` `null` dönerse çökmez: `draw` atlanır, boş tuval
döner, önbelleğe hiçbir şey yazılmaz.

**`skipCache` yolu:** `SpritePainter.draw` artık `void | boolean` döndürüyor;
`false` = "bu sprite'ı önbelleğe alma". Bu, 00-ilkeler §3.1'deki `draw: ... => void`
imzasının faz planı §3.5 gereği genişletilmiş hâli. Eksik ikonlu sprite önbelleğe
yazılmaz, bir sonraki karede yeniden denenir.

**`BoardCanvas.tsx`** — `GameBoard` ile birebir aynı props ve aynı oynatma mantığı:
kare ilerletme (`MIN_FRAME_MS=55` / `MAX_FRAME_MS=90`, aynı `frameMs` formülü),
`snapshots` uzatma tespiti, ses (`VFX_TO_SOUND`), titreşim, ölüm için 800ms /
zafer için `VICTORY_CELEBRATION_DURATION` gecikmeli `onAnimationEnd`, aynı
`ambientMode` kuralı (`motionTier==='lite' || isVictoryActive ? 'off' : isPlaying
? 'paused' : 'on'`). Oda yerleşimi `calculateRoomLayoutOffsets(rooms,
NATIVE_CELL_SIZE, ROOM_LAYOUT_GAP)` — bugünkü çağrının birebir aynısı.

Katman geçersizleştirme kuralları:

- `static` → `scene.rooms` **referansı** veya `scene.theme` değişince
  (`gridRevision.ts`'in yapısal paylaşımı bu sinyali zaten veriyor; ayrı mekanizma
  kurulmadı).
- `ambient` → `ambientMode` değişince; `'on'` değilse tuval **temizlenir**.
- `actors` → her sahne değişiminde.
- DPR değişince (window `resize`) → tuvaller yeniden ölçeklenir, sprite önbelleği
  ve ikon rasterleri atılır, üç katman da geçersizleşir.
- `onIconsReady` → üç katman geçersizleşir.

### `src/game-engine/render/` dışındaki tek değişiklik

`src/game-engine/components/play-screen/BoardArea.tsx`: 3 satır eklendi
(`BoardCanvas` + `useBoardRenderer` import'u, `const Board = renderer ===
'canvas' ? BoardCanvas : GameBoard`) ve `<GameBoard .../>` → `<Board .../>`.
Props, sarmalayıcı `div`, `boardOverlay` ve `isAnimating` noktası aynı yerde.

---

## 2. Karar: ikon rasterizasyon yolu (§3.5)

**Seçilen: üçüncü yol — `react-dom/client` ile kopuk bir kökte `flushSync` +
`innerHTML` serileştirmesi.** Planın iki seçeneğinin ikisi de alınmadı; gerekçe:

| Yol | Paket maliyeti | Görsel doğruluk | İkon kaynağı |
|---|---|---|---|
| `renderToStaticMarkup` (plan 1) | `react-dom/server` ~60KB gzip — **15KB sınırının çok üstünde** | Birebir | Tek |
| `Path2D` + elle çıkarılmış `d` (plan 2) | 0 KB | Elle aktarım riski: `stroke`/`fill`/opacity/`polygon`/`circle` semantiği yeniden yazılır | **İki** (kopyalanmış yollar) |
| `react-dom/client` + `flushSync` (seçilen) | **0 KB** — `react-dom/client` zaten pakette | Birebir (tarayıcı gerçek SVG'yi çizer) | **Tek** (`classicIcons`) |

Plan "15KB'ı geçecekse ikinci yolu seç" diyordu; ikinci yol 0 KB koşulunu
sağlıyor ama 00-ilkeler §4'ün ("bir renk, bir yarıçap tahminle yazılmaz") ve §5'in
("hücre görünümünün iki kaynağı olması bilinçli bir bedel — elden geldiğince
azaltılsın") gerektirdiğinden fazlasını feda ediyor: 11 ikonun yolları elle
kopyalanırsa `classicIcons` değiştiğinde canvas sessizce eskir. Seçilen yol her
iki maliyeti de sıfırlıyor: ikon bileşeni kopuk bir `<div>`'e `flushSync` ile
senkron çizilir, `innerHTML`'i okunur, `xmlns` eksikse eklenir, `data:image/svg+xml`
URI'sinden `Image` yüklenir, yüklenince ekran dışı tuvale çizilir.

İkonlar `GameIcon` üzerinden değil doğrudan `classicIcons`'tan alınıyor — `GameIcon`
tema context'i okur ve canvas çizim yolunda React context'i yok; ayrıca
`THEMES` içindeki üç tema (`classic`/`legacy`/`arcade`) zaten `classicIcons`'a
işaret ediyor, yani görüntü birebir aynı.

Asenkronluk korundu: `getIcon` hazır değilse `null` döner, çağıran ikonu atlar,
`onIconsReady` gelince katman geçersizleşir. Bu yüzden `spriteCache`'in
`skipCache` yolu ölü kod değil — gerçekten çalışan bir yol.

Üst örnekleme: `getIcon` imzası DPR almıyor (dondurulmuş sözleşme), bu yüzden
ikonlar `SUPERSAMPLE = 2` ile (DPR üst sınırıyla aynı oran) büyük rasterize
edilir; `drawImage` hedefte küçültünce 1x–2x DPR'de keskin kalır.
`image.onerror` durumu `'failed'` olarak işaretlenir — aksi halde bozuk bir ikon
her karede yeniden yüklenmeye çalışırdı.

---

## 3. Ne yapılmadı ve neden

- **Hiçbir hücre, varlık, iz, kablo, kenar, portal veya efekt çizimi yok.**
  `drawStaticLayer` / `drawAmbientLayer` / `drawActorsLayer` boş. İmzaları
  donduruldu; Faz 02–06 bunları doldurur, değiştirmez.
- **`GameBoard.tsx`'e dokunulmadı.** DOM yolu bugünküyle birebir aynı.
- **Girdi/isabet testi yok** (Faz 07). Üç tuvalde de `pointerEvents:'none'`;
  swipe bugünkü gibi `BoardArea`'nın dinleyicilerinde.
- **Ortak `useFilmPlayback` hook'u çıkarılmadı** (faz planı §3.7). `GameBoard`
  hâlâ üretimde ve varsayılan yol; tek değişiklikle iki yolu birden riske atmamak
  için oynatma mantığı `BoardCanvas` içinde tekrar edildi. Faz 08'de DOM yolu
  kapanınca sadeleşir.
- **Tuvale çizim testi yazılmadı** (00-ilkeler §6.1). Test ortamı `node`;
  çizim doğruluğu gözle, gerçek cihazda doğrulanacak.
- **Yeni npm bağımlılığı eklenmedi.** `jsdom` kurulu olmadığı için
  `spriteCache.test.ts` `document.createElement`/`getContext` ikilisini taklit
  ediyor (`node` ortamında). `spriteCache`'in DOM'a başka bir teması yok.

### Kapsam dışı görülüp düzeltilmeyen noktalar

- **`RoomOffset` tipinin evi yok.** `calculateRoomLayoutOffsets`'ın oda başına
  döndürdüğü `{left, top, width, height}` şekli `rooms.ts` içinde anonim; dışa
  aktarılmış bir adı yok (`RoomOverlays.tsx` kendi yerel kopyasını tanımlıyor).
  `BoardScene` ona ad vermek zorunda olduğu için `render/types.ts` içinde
  tanımlandı, gerekçesi dosyada yazılı. `rooms.ts` bu izin kapsamı dışında.
- **`GameBoardProps` dışa aktarılmıyor.** `GameBoard.tsx` içinde yerel bir
  `interface`; o dosya bu fazda değiştirilmediği için `BoardCanvas` birebir aynı
  alanlarla kendi `BoardCanvasProps`'unu tanımlıyor.
- **`levelEdges` prop'u ölü.** `GameBoard` de onu arayüzünde tutuyor ama hiç
  kullanmıyor; `BoardCanvas` aynı davranışı taşıdı (props "birebir aynı" olmalı).

### Aşılan sınır (proje sahibi onayıyla)

`BoardCanvas.tsx` **336 satır** — 250 satır sınırının üstünde. Sebep: faz planı
§3.7 oynatma mantığının `GameBoard` ile birebir tekrar edilmesini istiyor
(~95 satır efekt) ve aynı dosyada yüzey/zamanlayıcı kurulumu (~90 satır) ile üç
dondurulmuş çizim imzası da var. Mantığı `render/` altında canvas'a özel bir
8. dosyaya (`filmPlayback.ts`) bölmek önerildi; proje sahibi **tek dosyada
kalmasını** seçti — 00-ilkeler §3'teki dosya listesi birebir korunsun diye. Faz
08'de DOM yolu kapanıp tekrar ortadan kalkınca dosya kendiliğinden sınırın altına
inecek. Diğer altı dosya 55–126 satır aralığında.

---

## 4. Doğrulama (00-ilkeler §6)

| Kontrol | Komut | Sonuç |
|---|---|---|
| Tip denetimi | `npx tsc --noEmit` | **hatasız** (çıktı boş) |
| Testler | `npm test` | **30 dosya / 211 test geçti** (taban: 28 / 198 → +2 dosya, +13 test) |
| Lint (tüm repo) | `npm run lint` | **431 hata / 13240 uyarı** — tabanla **birebir aynı** |
| Lint (yalnız `src`) | `npx eslint src` | **154 hata / 52 uyarı** — tabanla birebir aynı |
| Lint (yalnız yeni kod) | `npx eslint src/game-engine/render src/.../BoardArea.tsx` | **çıktı boş, 0 sorun** |
| Android build | `npm run build:mobile` | **`cap sync` bitti** — `Sync finished in 1.734s`, 5 Capacitor eklentisi bulundu |

### Lint taban çizgisi düzeltmesi

Faz planı ve 00-ilkeler §6, tabanı "**6 hata**" olarak kaydediyor. Gerçek ölçüm:
`npm run lint` → 431 hata, `npx eslint src` → 154 hata. Plandaki 6 sayısı
büyük olasılıkla ESLint'in son satırındaki *"6 errors ... potentially fixable with
the `--fix` option"* ifadesinin hata toplamı sanılmasından geliyor. Bağlayıcı olan
kural ("**artmayacak**") sağlandı: üç ölçümün üçü de tabanla birebir aynı. Sonraki
fazlar için doğru taban yukarıdaki tabloda.

### Kabul kriterleri

- [x] `render/` altında §3'teki 7 dosya var; her biri `DOSYA AMACI` yorumu
      taşıyor. **Satır sınırı:** 6 dosya sınırın altında, `BoardCanvas.tsx` 336
      satır (§3'te gerekçesi ve onay notu).
- [x] `boardRenderer` ayarsız veya `'dom'` iken oyun bugünküyle birebir aynı —
      `BoardArea`'daki tek değişiklik bir koşullu bileşen seçimi; `GameBoard`
      dosyası hiç değişmedi.
- [x] `scheduler.test.ts` (7 test) ve `spriteCache.test.ts` (6 test) yazıldı ve
      geçiyor.
- [x] Boştayken `scheduler` RAF planlamıyor — `scheduler.test.ts`:
      *"invalidate çağrılmadan RAF planlamaz"* ve *"tek invalidate sonrası tam bir
      kare çizer ve döngüyü durdurur"*.
- [x] `grep -rn "shadowBlur\|ctx\.filter" src/game-engine/render/` → tek satır,
      `spriteCache.ts:5`, **yorum içinde**. Kare döngüsünde gölge/filtre çağrısı yok.
- [x] 00-ilkeler §6 tablosundaki dört kontrol yeşil.
- [x] `raporlar/01-rapor.md` yazıldı; ikon yolu kararının gerekçesi §2'de.
- [ ] **`localStorage.setItem('boardRenderer','canvas')` + yenile → tahta boş,
      HUD/swipe/ses/ipucu çalışıyor, hamleler ilerliyor.** Bu kriter gerçek
      tarayıcıda elle doğrulanmalı (§5'e taşındı). Otomatik kanıtı yok: tuvale
      çizim testi bu izin kapsamı dışında (00-ilkeler §6.1).

---

## 5. Elle kontrol (proje sahibi)

`boardRenderer` **kullanıcı bazlı** bir anahtar: `userStorage` onu aktif kullanıcının
UID'siyle ön ekliyor. DevTools konsoluna doğru yazım:

```js
localStorage.setItem(`${localStorage.getItem('activeUserId') ?? 'anon'}:boardRenderer`, 'canvas');
location.reload();
```

Geri almak için `'dom'` yaz veya anahtarı sil.

1. Bir bölüm aç: **tahta alanı boş** görünmeli (oda çerçevesi, hücre, oyuncu yok)
   ama oyun kilitlenmemeli — HUD, swipe, ses, ipucu çalışmalı ve her hamle
   `onAnimationEnd` tetiklendiği için ilerlemeli.
2. Elements sekmesinde ölçeklenen `div`'in içinde üç `<canvas data-layer="...">`
   olmalı; CSS ölçüleri tahtanın native boyutu, `width`/`height` nitelikleri onun
   DPR katı (mobilde en fazla 2x).
3. DevTools → Performance: **boşta beklerken kare kaydı boş** olmalı (RAF yok).

---

## 6. Sonraki faza not

1. **Boşta RAF yok — ambient döngüsünü Faz 03 kuracak.** Bu fazda `ambient`
   katmanı yalnızca `ambientMode` değişince geçersizleşiyor, kendini yeniden
   kirletmiyor. Sebep: çizilecek animasyonlu süs henüz yok, ve §6'nın elle
   kontrolü "boşta RAF yok" diyor. **Faz 03, süsleri eklerken `drawAmbientLayer`
   sonunda `scene.ambientMode === 'on'` ise `invalidate('ambient')` çağırmalı** —
   zamanlayıcı bu deseni destekliyor ve testi var (*"draw içinden gelen invalidate
   bir sonraki kareyi planlar"*). `'paused'` ve `'off'` modlarında çağırmamalı,
   yoksa 00-ilkeler §2.2 kaybedilir.
2. **Faz 05 aynı şeyi `actors` için yapacak:** hareket interpolasyonu süresince
   (`tickStartedAt + frameMs` dolana kadar) `drawActorsLayer` sonunda
   `invalidate('actors')`. Şu an actors yalnızca sahne değişiminde, yani tick
   başına bir kez çiziliyor.
3. **`BoardScene.tickStartedAt`** `snapshot` referansı değişince `performance.now()`
   ile alınıyor. Faz 05'in interpolasyon tabanı bu; hareket ilerlemesi
   `(now - tickStartedAt) / frameMs`.
4. **`prevEntities`** `snapshots[frameIndex - 1].entities`; ilk karede `null`.
   `GameBoard`'un `prevIndex`'inin canvas karşılığı. Faz 05 kendi indeksini
   kurmak isterse `boardIndex.ts`'teki `buildBoardIndex` yeniden kullanılabilir.
5. **`SpritePainter.draw` `false` döndürebilir.** Faz 02'nin yazacağı her
   rasterleyici, ikon `null` geldiğinde `false` döndürmeli — yoksa ikonsuz sprite
   kalıcı olarak önbelleğe girer ve ikon hiç görünmez.
6. **`static` katmanının sinyali `scene.rooms` referansı.** Faz 02 bu katmana
   çizeceği her şeyin yalnızca `rooms` + `theme`'e bağlı olmasına dikkat etmeli.
   Sis (fog) durumu oyuncu konumuna bağlı ve **`rooms` değişmeden değişebilir** —
   Faz 04 sisi ele alırken ya ayrı bir geçersizleştirme sinyali ekleyecek ya da
   sisi `actors` katmanına taşıyacak. Bu açık uç bilinçli bırakıldı.
7. **`clearIcons()`** tema değişiminde **çağrılmıyor.** Şu an yalnızca DPR
   değişiminde çağrılıyor; sprite önbelleği ise temada da (`lastTheme` üzerinden
   `static` geçersizleştirmesiyle) yenilenmiyor — çünkü bu fazda çizim yok.
   **Faz 02, tema değişiminde `cache.clear()` + `clearIcons()` çağrısını eklemek
   zorunda** (00-ilkeler §3.1: "Tema değişince tamamen boşaltılır").
8. **Zafer koreografisi (Faz 06) `ambientMode === 'off'`** durumunu tetikliyor
   ve `actors` katmanına düşüyor; `VictoryCelebration` DOM bileşeni `BoardCanvas`
   tarafından **çizilmiyor** — Faz 06 onu canvas'a taşıyacak. `onAnimationEnd`
   zamanlaması `VICTORY_CELEBRATION_DURATION` ile şimdiden doğru.

---

## 7. Görsel farklar

Bu faz hiçbir şey çizmediği için **DOM'dan bilinen görsel bir farkı yok**.
`boardRenderer='canvas'` iken tahta bilinçli olarak boştur.

Sonraki fazlar için şimdiden bilinen tek risk, 00-ilkeler §4'ün uyardığı
`backdrop-filter: blur(4px)` türü efektler ve `GameBoard`'un portal bağlantı
yolundaki `filter="blur(4px)"` SVG filtresi. Bunların canvas karşılığı sprite
rasterizasyonunda (`shadowBlur`) yaklaşık olarak kurulabilir ama birebir değil;
Faz 04 buna geldiğinde **kendi kararıyla değiştirmeyip proje sahibine sormalı**.
