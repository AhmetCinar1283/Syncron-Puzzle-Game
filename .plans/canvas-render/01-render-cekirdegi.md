# 01 — Render Çekirdeği: Yüzey, Zamanlayıcı, Sprite Önbelleği

> Bağlayıcı: `.plans/canvas-render/00-ilkeler.md`. Belirsizlik anında proje sahibine sor.
> **Model: opus.** Bu fazda donan sözleşme, kalan yedi fazın tamamını belirliyor.

**Bu faz hiçbir oyun içeriği çizmez.** Çıktısı, sonraki fazların üzerine inşa edeceği
altyapı ve ekranda **boş ama doğru boyutlu, doğru DPR'li** üç tuvaldir.

---

## 1. Okuyacağın dosyalar

Listenin dışına çıkma. Yetmezse dur ve sor.

| Dosya | Neden |
|---|---|
| `.plans/canvas-render/00-ilkeler.md` | Sözleşme |
| `src/game-engine/components/GameBoard.tsx` | Yerine geçeceğin bileşen; kare zamanlaması, `ambientMode`, `isVictoryActive` mantığı burada |
| `src/game-engine/components/play-screen/BoardArea.tsx` | `BoardCanvas`'ı buraya bağlayacaksın |
| `src/game-engine/components/play-screen/constants.ts` | `NATIVE_CELL_SIZE`, `ROOM_LAYOUT_GAP` |
| `src/lib/motionTier.ts` | §9 bayrağının birebir kopyalayacağın deseni |
| `src/lib/userStorage.ts` | `userStorageGet` / `userStorageSet` imzaları |
| `src/game-engine/logic/engine/rooms.ts` | `calculateRoomLayoutOffsets` imzası |
| `src/components/icons/GameIcon.tsx` + `src/components/icons/themes/classic/gameplayIcons.tsx` | İkon bileşenlerinin şekli — `icons.ts` için |

---

## 2. Hedef

1. Üç katmanlı tuval yüzeyi kurulsun; DPR doğru, yeniden boyutlandırma doğru.
2. Kirli bayraklı, boşta duran, ambient'i kısan bir zamanlayıcı olsun.
3. Sprite önbelleği ve ikon rasterleyici çalışsın.
4. `boardRenderer` bayrağı kurulsun; `'canvas'` seçildiğinde `BoardArea` `BoardCanvas`
   çizsin, `'dom'`'da bugünkü `GameBoard` çizsin. **Varsayılan `'dom'`.**

---

## 3. Yapılacaklar

### 3.1 `render/types.ts`

00-ilkeler §3.1'deki `CellPaintInput` ve `SpritePainter<T>` arayüzleri, `PHASES = 12`,
`NATIVE_CELL_SIZE` yeniden dışa aktarımı, katman adı birliği:

```ts
export type LayerName = 'static' | 'ambient' | 'actors';
```

Ayrıca sonraki fazların dolduracağı **sahne girdisi**:

```ts
/** Bir karede çizilecek her şeyin tek okunur kaynağı. */
export interface BoardScene {
    rooms: Record<string, RoomState>;
    entities: Entity[];
    prevEntities: Entity[] | null;
    roomPositions: Record<string, RoomOffset>;
    totalWidth: number;
    totalHeight: number;
    theme: GameTheme;
    controlledRoomIds: string[] | undefined;
    ambientMode: BoardAmbientMode;
    /** Tick geçişinin ms cinsinden süresi — hareket interpolasyonunun tabanı. */
    frameMs: number;
    /** Bu tick'in başladığı `performance.now()` damgası. */
    tickStartedAt: number;
}
```

Tipleri mevcut modüllerden içe aktar, yeniden tanımlama.

### 3.2 `render/surface.ts`

- `createSurfaces(host: HTMLElement): Surfaces` — üç `<canvas>` üretir, `host`'a
  `position:absolute; inset:0` ile yığar. z-sırası: `static` < `ambient` < `actors`.
  Hepsinde `pointerEvents: 'none'` (girdi bugünkü gibi `BoardArea`'da kalıyor).
- `resize(surfaces, cssW, cssH, dpr)` — `canvas.width = Math.round(cssW * dpr)`,
  `canvas.style.width = cssW + 'px'`, ardından `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`.
  Boyut gerçekten değişmediyse **hiçbir şey yapma** (tuval boyutu yazmak onu temizler).
- `dispose(surfaces)` — tuvalleri ayırır, referansları bırakır.
- DPR: `Math.min(window.devicePixelRatio || 1, 2)`. Üst sınır kasıtlı — 3x ve 4x DPR
  telefonlarda 9-16 kat piksel, bu izin amacına aykırı. Sınırı rapora yaz.

`context` seçenekleri: `{ alpha: true, desynchronized: true }`. `static` katmanı için
`alpha: true` şart (oda dışı boşluk saydam kalmalı).

### 3.3 `render/scheduler.ts`

Saf, DOM'a bağlı olmayan, **test edilebilir** bir zamanlayıcı:

```ts
export interface Scheduler {
    /** Katmanı kirletir ve gerekiyorsa döngüyü uyandırır. */
    invalidate(layer: LayerName): void;
    /** Döngüyü durdurur ve bekleyen RAF'ı iptal eder. */
    stop(): void;
}

export function createScheduler(opts: {
    draw: (layer: LayerName, now: number) => void;
    /** Ambient katmanının en fazla kaç kez/saniye çizileceği. Varsayılan 20. */
    ambientHz?: number;
    raf?: (cb: FrameRequestCallback) => number;   // test için enjekte edilebilir
    caf?: (id: number) => void;
}): Scheduler;
```

Davranış:

- Hiçbir katman kirli değilken **RAF planlanmaz**. (00-ilkeler §2.2 — bu izin ana kazancı.)
- Bir karede yalnızca kirli katmanlar çizilir; çizilen katmanın bayrağı temizlenir.
- `ambient` katmanı için son çizim damgası tutulur; `now - last < 1000/ambientHz` ise
  o kare atlanır ama **bayrak kirli kalır** ve döngü uyanık tutulur.
- `actors` kirliyse kısma yok, tam hızda çizilir.

Test (`scheduler.test.ts`): sahte `raf`/`caf` ile —
(a) `invalidate` çağrılmadan RAF planlanmaz,
(b) tek `invalidate` sonrası tam bir kare çizilir ve döngü durur,
(c) ambient kısması 20Hz'i aşan çağrılarda kareyi atlar ama döngüyü durdurmaz.

### 3.4 `render/spriteCache.ts`

```ts
export function createSpriteCache(dpr: number): SpriteCache;

export interface SpriteCache {
    /** Anahtar önbellekte yoksa `painter.draw` ile bir kez rasterize eder. */
    get<T>(painter: SpritePainter<T>, input: T): HTMLCanvasElement;
    /** Tema veya DPR değişince çağrılır; tüm girdileri atar. */
    clear(): void;
    /** Teşhis için — rapora sayı yaz. */
    size(): number;
}
```

- Ekran dışı tuval `document.createElement('canvas')` ile üretilir; `OffscreenCanvas`
  **kullanma** — eski Android WebView'lerde yok ve bu izin hedef cihazı orası.
- Rasterleyici tuvali de DPR ölçekli açılır ve `setTransform(dpr,...)` uygulanır, böylece
  `painter.draw` yine CSS pikselinde çizer (00-ilkeler §3.3).
- **Üst sınır yok ama gözetim var:** `size()` 600'ü aşarsa `console.warn` ile bir kez
  uyar. Aşıyorsa bir `key()` fonksiyonu duruma bağlı olmayan bir şey (ör. `cell.id`)
  katıyordur; bu bir hatadır, rapora yazılır.

Test (`spriteCache.test.ts`): sahte bir `SpritePainter` ile aynı girdinin `draw`'u bir
kez çağırdığı, farklı girdinin ikinci kez çağırdığı, `clear()` sonrası yeniden
çağırdığı. `document.createElement('canvas')` `jsdom`'da eleman döndürür;
`getContext('2d')` `null` dönebilir — bu durumda önbellek **çökmemeli**, `draw`
atlanmalı ve boş tuval dönmeli. Testi buna göre kur.

### 3.5 `render/icons.ts`

Hücreler ve oyuncu şu ikonları kullanıyor:
`check, close, ice, lightbulb, lightning, lock, palette, portal, skull, sparkles, switch`.

Bunlar React SVG bileşeni. Canvas'a alma yolu:

1. Bileşeni `react-dom/server`'ın `renderToStaticMarkup`'ı ile SVG dizgisine çevir
   (tek seferlik, modül yüklenirken değil — **ilk istendiğinde**, tembel).
2. `data:image/svg+xml;charset=utf-8,` + `encodeURIComponent(svg)` ile `Image` yükle.
3. Yüklenince ekran dışı tuvale çiz ve `Map<string, HTMLCanvasElement>`'e koy.

`Image.onload` asenkron. Sözleşme:

```ts
/** Hazırsa tuvali, değilse null döner ve hazır olunca `onReady` ile haber verir. */
export function getIcon(name: string, sizePx: number, color: string): HTMLCanvasElement | null;
export function onIconsReady(cb: () => void): () => void;
```

Çağıran taraf `null` gelince ikonu **atlar** ve `onIconsReady` geldiğinde ilgili
katmanı `invalidate` eder. Yani ilk karede ikon eksik olabilir, bir sonraki karede gelir.
Bu kabul edilebilir; ama **sprite önbelleğine ikonu eksik bir sprite yazılmamalı** —
`draw` içinde ikon `null` ise o sprite önbelleğe alınmaz, bir sonraki karede yeniden
denenir. Bu kuralı `spriteCache.get`'e bir `skipCache` dönüş yolu olarak ekle
(`painter.draw` bir `boolean` döndürebilir: `false` = önbelleğe alma).

> `renderToStaticMarkup` istemcide çalışır ama paket boyutunu büyütebilir. Alternatif:
> ikon SVG'lerinin `d` yollarını elle çıkarıp `Path2D` ile çizmek. **Hangisini seçeceğine
> sen karar ver, gerekçesini rapora yaz.** Paket boyutu artışı 15KB'ı geçecekse ikinci
> yolu seç.

### 3.6 `render/boardRenderer.ts` — geçiş bayrağı

`src/lib/motionTier.ts` desenini birebir kopyala:

```ts
export const BOARD_RENDERER_KEY = 'boardRenderer';
export type BoardRenderer = 'dom' | 'canvas';
export function setBoardRendererOverride(r: BoardRenderer | null): void;
export function detectBoardRenderer(): BoardRenderer;   // varsayılan: 'dom'
export function useBoardRenderer(): BoardRenderer;      // SSR'da daima 'dom'
```

Dosya `src/game-engine/render/` altında olsun (motionTier'in aksine `src/lib` değil —
bu bayrak yalnızca oyun motorunu ilgilendiriyor).

### 3.7 `render/BoardCanvas.tsx` — iskelet

`GameBoard`'un props'larının **aynısını** alır (`GameBoardProps`), aynı dönüşleri yapar:

- `snapshots` yoksa `null`,
- kare ilerletme, `frameMs` hesabı, ses ve titreşim efektleri, `onAnimationEnd`
  zamanlaması — **bunların hepsi `GameBoard`'dakiyle birebir aynı mantık.**

Bu tekrarı azaltmak için ortak mantığı `src/game-engine/hooks/useFilmPlayback.ts`
gibi bir hook'a çıkarmak **cazip ama bu fazda yapma**: `GameBoard` hâlâ üretimde ve
onu değiştirmek iki yolu birden riske atar. Tekrarı kabul et, rapora yaz, Faz 08'de
DOM yolu kapanınca sadeleşir.

Bu fazda `BoardCanvas` sahneyi hesaplar (`BoardScene`), yüzeyleri kurar, zamanlayıcıyı
başlatır ve **her katman için boş bir çizim fonksiyonu** çağırır. Boş fonksiyonlar
sonraki fazların giriş noktası:

```ts
// Faz 02–03 dolduracak
export function drawStaticLayer(ctx: CanvasRenderingContext2D, scene: BoardScene, cache: SpriteCache): void {}
// Faz 03 dolduracak
export function drawAmbientLayer(ctx: CanvasRenderingContext2D, scene: BoardScene, cache: SpriteCache, now: number): void {}
// Faz 05–06 dolduracak
export function drawActorsLayer(ctx: CanvasRenderingContext2D, scene: BoardScene, cache: SpriteCache, now: number): void {}
```

Bu üç imzayı **dondur**; sonraki fazlar bunları değiştirmez, doldurur.

### 3.8 `BoardArea.tsx` bağlantısı

`useBoardRenderer()` sonucuna göre `GameBoard` veya `BoardCanvas` çiz. Props aynı,
sarmalayıcı `div` aynı, `boardOverlay` ve `isAnimating` noktası aynı yerde kalır.
Bu, `src/game-engine/render/` dışındaki **tek** değişiklik olsun.

---

## 4. Kapsam dışı

- Herhangi bir hücre, varlık, iz, kenar veya efekt çizimi. Bu faz boş tuval bırakır.
- `GameBoard.tsx` içinde herhangi bir değişiklik. DOM yolu bu fazda hiç dokunulmaz.
- Girdi/isabet testi (Faz 07).
- `useFilmPlayback` gibi ortak hook çıkarımı (§3.7'deki gerekçe).

---

## 5. Kabul kriterleri

- [ ] `src/game-engine/render/` altında §3'teki 7 dosya var; her biri `DOSYA AMACI`
      yorumu taşıyor ve 250 satırı geçmiyor.
- [ ] `localStorage.setItem('boardRenderer','canvas')` + yenile → oyun açılıyor,
      tahta alanı **boş** ama HUD, swipe, ses, ipucu çalışıyor ve
      `onAnimationEnd` tetiklendiği için hamleler ilerliyor.
- [ ] `boardRenderer` ayarsız veya `'dom'` iken oyun **bugünküyle birebir aynı**.
- [ ] `scheduler.test.ts` ve `spriteCache.test.ts` yazıldı ve geçiyor.
- [ ] Boştayken (hiç hamle yokken) `scheduler` RAF planlamıyor — testle kanıtlandı.
- [ ] `grep -rn "shadowBlur\|ctx\.filter" src/game-engine/render/` çıktısı boş veya
      yalnızca `spriteCache`/`icons` içinde.
- [ ] 00-ilkeler §6 tablosundaki dört kontrol yeşil.
- [ ] `raporlar/01-rapor.md` yazıldı; içinde ikon yolu kararının (§3.5) gerekçesi var.

---

## 6. Elle kontrol (proje sahibi)

- Tarayıcıda `localStorage.setItem('boardRenderer','canvas')` yaz, bir bölüm aç:
  tahta boş görünmeli ama oyun kilitlenmemeli, hamleler ilerlemeli.
- DevTools → Performance: boşta beklerken kare kaydı **boş** olmalı (RAF yok).
