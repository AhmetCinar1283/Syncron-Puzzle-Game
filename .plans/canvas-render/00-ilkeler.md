# 00 — Canvas Render İlkeleri (Tüm Fazlar İçin Bağlayıcı)

Bu klasör, oynanış tahtasının DOM'dan `<canvas>`'a taşınmasını fazlara böler.
Bu iz **özellik eklemez, aynı görüntüyü daha ucuza çizer.**

---

## 1. Devralınan ilkeler

`.plans/monetization/00-mimari-ilkeler.md` bu iz için de aynen geçerli. Özellikle:

- Bağımlılık yalnızca aşağı akar: `app/ → features/ → services/ → game-engine/ → level-format/`.
- Her dosya tek iş yapar, başında `DOSYA AMACI` açıklaması bulunur, ~250 satırı geçmez.
- Gerekçesiz `any` yok.
- Kapsam dışı bir sorun görülürse düzeltilmez, rapora not edilir.

---

## 2. Bu izin üç kuralı — hepsi bağlayıcı

### 2.1 Kare başına yolda gölge hesabı yasak

`ctx.shadowBlur`, `ctx.filter`, `ctx.shadowColor` **kare döngüsünde çağrılmaz.**
Bunlar canvas'ın Gauss bulanıklığıdır ve tam olarak bugün DOM'da ödediğimiz bedeldir.

Parlamalar **yalnızca** sprite rasterizasyonu sırasında (bir kez) çizilir. Kare
döngüsünde izin verilen çağrılar: `drawImage`, `setTransform`/`translate`/`scale`/
`rotate`, `globalAlpha`, `clearRect`, `save`/`restore`.

Bu kurala uymayan bir faz kabul edilmez. Gözden geçirme yöntemi: aşağıdaki aramanın
çıktısında yalnızca sprite rasterizasyon dosyaları görünmeli.

    grep -rn "shadowBlur\|ctx\.filter" src/game-engine/render/

### 2.2 Değişen yoksa çizim yok

Zamanlayıcı bir **kirli bayrağı** üzerinden çalışır. Hiçbir katman kirli değilse
`requestAnimationFrame` **planlanmaz** — döngü durur, uyanmaz. Bu, ısınma ve şarj
tüketimi sorununun asıl cevabı; kaybedilirse izin ana gerekçesi kaybolur.

### 2.3 Üç katman, üç ayrı bütçe

Üst üste duran üç tuval:

| Katman | İçerik | Ne zaman çizilir |
|---|---|---|
| `static` | Hücrelerin durağan gövdesi, iz, kablo, kenar şeritleri, oda çerçevesi | Yalnızca `rooms` referansı veya tema değişince |
| `ambient` | Hücrelerin animasyonlu süsleri (buz ikonu, portal girdabı, konveyör okları, hedef nabzı, güç halkası) | `ambientMode === 'on'` iken, **20fps'e kısılmış** |
| `actors` | Oyuncular, kutular, hareket/çarpma/ölüm efektleri, zafer koreografisi | Hareket veya efekt sürerken tam hızda |

`rooms` nesnesi, ızgara değişmediği tick'lerde referans olarak aynı kalıyor
(yapısal paylaşım; bkz. `src/game-engine/logic/engine/gridRevision.ts` ve testleri).
Bu, `static` katmanının geçersizleştirme sinyalidir — ayrı bir mekanizma kurma.

`ambientMode === 'off'` (zayıf cihaz veya zafer koreografisi) durumunda `ambient`
katmanı hiç çizilmez ve tuvali temizlenir.

---

## 3. Modül sözleşmesi

Tüm yeni kod `src/game-engine/render/` altında. Dışarıya tek giriş noktası
`BoardCanvas.tsx`. Yerleşim:

    src/game-engine/render/
      surface.ts            Faz 01  — tuval oluşturma, DPR, yeniden boyutlandırma
      scheduler.ts          Faz 01  — RAF döngüsü, kirli bayrağı, boşta durma, ambient kısma
      spriteCache.ts        Faz 01  — ekran dışı rasterizasyon, anahtarlama, tema geçersizleştirme
      icons.ts              Faz 01  — GameIcon SVG'lerinin bir kerelik raster'ı
      types.ts              Faz 01  — aşağıdaki arayüzler ve sabitler
      BoardCanvas.tsx       Faz 01'de iskelet, her fazda doldurulur
      paintTokens.ts        Faz 02  — tema jetonlarının canvas karşılığı
      cells/                Faz 02 + 03 — hücre tipi başına bir dosya
      overlays.ts           Faz 04  — iz, kablo, kenar, portal
      entities.ts           Faz 05  — oyuncu, kutu
      motion.ts             Faz 05  — easing ve zaman tabanlı hareket/efekt durumu
      victory.ts            Faz 06  — zafer koreografisi

### 3.1 Sprite sözleşmesi — izin merkezi kararı

Her çizilebilir görünüm iki parçadır: **anahtar** ve **rasterleyici**.

```ts
/** Bir hücrenin görünümünü belirleyen her şey. */
export interface CellPaintInput {
    cell: Cell;
    theme: GameTheme;
    /** Üzerinde veya bir önceki karede üzerinde varlık var mıydı. */
    isOccupied: boolean;
    /** Animasyonlu süsün kaçıncı fazı (0..PHASES-1). Durağan sprite'ta 0. */
    phase: number;
    /**
     * Faz 03'te eklendi (proje sahibi onayladı; bkz. 03-rapor §4).
     * Konveyör / teleport / trambolin hücrelerinin DOM'da `setTimeout` ile
     * sürdürdüğü geçici "çalışıyor" hâli. Kaynağı `render/cells/activity.ts`;
     * tick'lerden bağımsız akar ve sahne değişiminde güncellenir.
     */
    isActive: boolean;
}

export interface SpritePainter<TInput> {
    /**
     * Aynı görüntüyü veren her girdi için AYNI dizgiyi döndürmeli.
     * Yanlış anahtar = ya yanlış görüntü ya da sınırsız büyüyen önbellek.
     */
    key(input: TInput): string;
    /**
     * Sprite'ı BİR KEZ çizer. Gölge/filtre YALNIZCA burada serbesttir.
     * `false` döndürmek "bunu önbelleğe ALMA" demektir (Faz 01 §3.5: ikon henüz
     * yüklenmemişse eksik sprite kalıcı olarak önbelleğe girmesin).
     */
    draw(ctx: CanvasRenderingContext2D, input: TInput): void | boolean;
    /** Sprite kutusu (CSS pikseli). Hücreler 64x64; taşan parlama için büyütülebilir. */
    size(input: TInput): { w: number; h: number };
}
```

Önbellek `Map<string, HTMLCanvasElement>`. Tema değişince **tamamen boşaltılır**,
tek tek ayıklanmaz. DPR değişince de boşaltılır.

**Bütçe kararı (proje sahibi, Faz 03 §8'den sonra).** Faz 02 ve 03'e konan sayısal
tavanlar (`< 20`, `< 60`) yanlış tabanlanmıştı: kaç hücre tipinin animasyonlu
olacağı bilinmeden yazılmışlardı. 12 gövde + 4 animasyonlu tip × 12 faz = zaten 60.
Ölçülen gerçek tavan **69**. Karar:

- **LRU / ayıklama eklenmeyecek.** Ayıklama, yeniden rasterizasyonu tam da animasyon
  sürerken tetikler — yani en kötü anda. Önbellek sınırsız kalır.
- Sayısal tavan yerine ölçüt **anahtarlama kuralının kendisidir** (§3.1): `key()`
  içine `cell.id`, `position` veya görüntüyü etkilemeyen `customData` girmez.
  Bunu testler kilitliyor; sayı değil, kural denetlenir.
- `spriteCache.size() > 600` uyarısı korunur — gerçek kaçak alarmı odur.
- **Faz 08 bellek ölçecek**, sayı değil: sprite sayısı × sprite alanı × DPR² × 4 bayt.
  Giriş seviyesi telefonda toplam sprite belleği raporlanır.

Sonraki fazların kabul kriterlerinde sayısal önbellek tavanı **yoktur**; yerine
"ölçülen sayıyı rapora yaz" vardır.

### 3.2 Animasyonlu süsler kare örneklenir

Süsler canlı hesaplanmaz. Her animasyonlu süs **12 faza** örneklenir ve 12 sprite
olarak önbelleğe alınır; kare döngüsünde zamandan faz seçilip blit edilir:

```ts
const phase = Math.floor(((now % periodMs) / periodMs) * PHASES) % PHASES;
```

`PHASES = 12` `types.ts` içinde sabittir. 20fps'lik ambient bütçesiyle birleşince
süslerin görünümü bugünküyle ayırt edilemez, maliyeti ise bir blit.

### 3.3 Koordinat sistemi

Tuval **CSS pikselinde** çizer; DPR ölçeklemesi `surface.ts` içinde
`ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` ile bir kez kurulur. Hiçbir çizim kodu
DPR bilmez. Hücre boyutu `NATIVE_CELL_SIZE` (64) sabittir; tahtanın ekrana sığması
bugünkü gibi `BoardArea`'nın CSS `scale`'i ile sürer — **canvas yeniden
ölçeklenmez**, aksi halde her ölçekte atlas geçersizleşir.

Oda yerleşimi `calculateRoomLayoutOffsets(rooms, 64, 40)` ile hesaplanır; bugünkü
çağrının birebir aynısı.

### 3.4 Katman çizicilerinin dönüş sözleşmesi

Faz 01, üç katman çizicisinin imzasını `void` olarak dondurmuştu. Faz 02 bunu
`drawAmbientLayer` için `boolean`a çevirmek zorunda kaldı (02-rapor §3.1): çizici
zamanlayıcıya erişemiyor, dolayısıyla "bir kare daha lazım" bilgisini **dönüş
değeriyle** vermek zorunda. Karar doğru; üçü birden buna göre standartlaştırıldı:

```ts
/** true = bu katman bir kare daha çizilmeli (döngü uyanık kalsın). */
type LayerDraw = (...) => boolean;
```

- `drawStaticLayer` → daima `false` (kendini yeniden kirletmez).
- `drawAmbientLayer` → canlı bir süs çizildiyse **ve** `ambientMode === 'on'` ise `true`.
- `drawActorsLayer` → tick interpolasyonu sürüyorsa, aktif bir efekt varsa veya
  zafer koreografisi devam ediyorsa `true` (Faz 05–06).

`BoardCanvas`'taki çizim geri çağrısı dönen değere bakıp `invalidate` eder.
**Faz 05 ve 06 bu deseni kullanır, yeni bir mekanizma icat etmez.**

---

## 4. Görüntü değişmez

Her fazın çıktısı, aynı seviyenin DOM render'ıyla **yan yana konduğunda ayırt
edilemez** olmalı. Bir renk, bir kenar yarıçapı, bir parlama yarıçapı tahminle
yazılmaz — kaynak DOM dosyasındaki değer okunup birebir taşınır.

Kaçınılmaz bir görsel fark çıkarsa (ör. `backdrop-filter: blur(4px)`'in canvas'ta
tam karşılığı yok), ajan **kendi kararıyla değiştirmez**: rapora yazar ve proje
sahibine sorar.

---

## 5. DOM çizicileri silinmez

`src/game-engine/components/cells/`, `entities/PlayerGraphic.tsx` ve
`entities/BoxGraphic.tsx` **yerinde kalır**. Kullanıcıları:

- `src/features/editor/components/canvas/GridCore.tsx`
- `src/features/editor/components/canvas/InactiveRoomPreview.tsx`
- `src/features/editor/components/palette/paletteParts.tsx`
- `src/features/admin/pending-requests/components/GridPreview.tsx`
- `src/features/home/components/BoardPlayerLayer.tsx`, `HeroPlayCell.tsx`, `PuzzleMenuPlayer.tsx`
- `src/game-engine/components/LevelMiniPreview.tsx`
- `src/game-engine/components/GameCellAdapter.tsx`

Bu iz **yalnızca oynanış tahtasını** (`GameBoard` → `BoardCanvas`) taşır. Editörü,
menüyü veya önizlemeleri canvas'a çevirmek bu izin kapsamı **dışındadır**.

Sonuç: hücre görünümünün iki kaynağı olur. Bu bilinçli bir bedel. Hafifletme:
renk ve ölçü değerleri elden geldiğince `themeConfig`'ten okunur, canvas koduna
sabit yazılmaz — böylece tema değişikliği iki tarafı birden günceller.

---

## 6. Yeşil durum bozulmaz

Göreve başlamadan önceki taban çizgisi (`refactor/architecture`, 2026-09-20):

| Kontrol | Komut | Beklenen |
|---|---|---|
| Tip denetimi | `npx tsc --noEmit` | hatasız |
| Testler | `npm test` | 28 dosya / 198 test geçer |
| Lint (tüm repo) | `npm run lint` | **431 hata / 13240 uyarı** (taban; artmayacak) |
| Lint (yalnız `src`) | `npx eslint src` | **154 hata / 52 uyarı** (taban; artmayacak) |
| Lint (yeni kod) | `npx eslint src/game-engine/render` | **0 sorun** |
| Android build | `npm run build:mobile` | `cap sync` biter |

Faz bitiminde hepsi yeniden yeşil olmalı. Test sayısı artabilir, azalamaz.
Lint hata sayısı artamaz, yeni kodda sıfır olmalı.

> **Düzeltme (Faz 01 raporu §4).** Bu tablo başlangıçta lint tabanını "6 hata"
> olarak yazıyordu. Yanlıştı: o sayı ESLint'in son satırındaki *"6 errors
> potentially fixable with the `--fix` option"* ifadesinden geliyordu, hata
> toplamından değil. Yukarıdaki değerler Faz 01'de fiilen ölçülmüş tabandır.
> Test sayıları da faz faz artıyor; kendi fazından önceki raporun sayısını taban al.

### 6.1 Yeni kod test edilir

Saf olan her şey test alır — `src/game-engine/render/**/*.test.ts`:

- sprite anahtarının aynı girdide aynı, farklı girdide farklı olması,
- zamanlayıcının kirli bayrağı yokken RAF planlamaması,
- faz seçiminin (§3.2) periyot sınırlarında doğru olması,
- easing fonksiyonlarının 0 için 0, 1 için 1 vermesi.

Tuvale çizim testi yazma — `jsdom`'da `CanvasRenderingContext2D` yok ve kurmak
bu izin işi değil. Çizim doğruluğu göz ile, gerçek cihazda doğrulanır.

---

## 7. Her fazın bitiş şartı

Ajan `.plans/canvas-render/raporlar/<numara>-rapor.md` yazar:

1. **Ne yapıldı** — dosya dosya, kısa.
2. **Ne yapılmadı ve neden** — kapsam dışı bırakılanlar.
3. **Doğrulama** — §6 tablosunun çalıştırılmış hâli, gerçek çıktılarla.
4. **Görsel farklar** — DOM'dan ayrıldığı bilinen her nokta, gerekçesiyle.
5. **Sonraki faza not** — devredilen bilgi, açık bırakılan uç.

---

## 8. Belirsizlik anında sor, varsayma

Şu durumlarda ajan **kendi başına karar vermez**:

- Oyuncunun gördüğü bir davranış veya görüntü değişecekse (§4).
- Bir CSS efektinin canvas'ta tam karşılığı yoksa.
- `src/game-engine/render/` dışında bir dosyayı değiştirmek gerekiyorsa
  (tek istisna: `BoardArea.tsx`'in `BoardCanvas`'ı çağırması — Faz 01'de yapılır).
- Faz dosyasındaki bir tespit kodda doğrulanamıyorsa (kod değişmiş olabilir).
- Yeni bir npm bağımlılığı gerekiyorsa. **Bu izde yeni bağımlılık beklenmiyor**;
  PixiJS, Konva, Three vb. kapsam dışıdır (bkz. README'deki gerekçe).

---

## 9. Geçiş bayrağı

Canvas, DOM yolunun **yanına** kurulur, yerine değil. Seçim `userStorage` üzerinden:

    boardRenderer = 'canvas' | 'dom'

`src/lib/motionTier.ts`'teki `MOTION_TIER_KEY` deseninin birebir aynısı: anahtar
sabiti + `setBoardRendererOverride()` + okuma fonksiyonu. Faz 01 bunu kurar,
varsayılan `'dom'`. **Faz 08** ölçümden sonra varsayılanı `'canvas'`'a çevirir.

Bu bayrak sayesinde her faz sonunda oyun oynanabilir durumda kalır; yarım kalmış
bir canvas yolu kimseyi engellemez.
