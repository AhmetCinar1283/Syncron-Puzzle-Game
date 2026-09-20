# 05 — Varlık Katmanı: Oyuncu, Kutu ve Hareketin Tamamı

> Bağlayıcı: `.plans/canvas-render/00-ilkeler.md`. Önce `raporlar/04-rapor.md` oku.
> **Model: opus.** Bu fazda CSS'in bedavaya verdiği her şey elle yazılıyor: geçiş
> zamanlaması, easing, 20'den fazla keyframe animasyonu ve bunların birbirini ezme
> kuralları. Oyunun okunabilirliği doğrudan buna bağlı.

---

## 1. Okuyacağın dosyalar

| Dosya | Neden |
|---|---|
| `.plans/canvas-render/00-ilkeler.md`, `raporlar/04-rapor.md` | Sözleşme ve devir |
| `src/game-engine/render/` altındaki mevcut dosyalar | Altyapı ve desen |
| `src/game-engine/render/cells/common.ts` | **`cssBezier` burada** — §3.1'de `motion.ts`'e taşınacak |
| `src/game-engine/render/cells/ice.ts` | `easeInOut` burada, `cssBezier`'e delege ediyor — §3.1 |
| `src/game-engine/render/cells/activity.ts` | Faz 03'ün geçici-hâl takipçisi; §3.3'te aynı deseni kullanacaksın |
| `src/game-engine/components/physicsWrapper.tsx` | **Bu fazın ana kaynağı** — konum, z, esneme, eğilme, hangi animasyonun ne zaman seçildiği |
| `src/game-engine/components/effects/animationStyles.ts` | Keyframe gövdeleri — değerleri buradan oku, tahmin etme |
| `src/game-engine/components/entities/PlayerGraphic.tsx` | 5 `styleType`, göz kırpma, kilit, ters mod |
| `src/game-engine/components/entities/BoxGraphic.tsx` | 5 `styleType`, elektriklenme |
| `src/game-engine/components/playerColors.ts` | `getPlayerColor` |
| `src/game-engine/themes/themeConfig.ts` | `box` ve `player` jetonları |
| `src/game-engine/components/GameBoard.tsx` | Varlık katmanının bugünkü çizim koşulları (`opacity`, `isPlayerCelebrating`) |

---

## 2. Sorun

Bugün her varlık iki iç içe `div`. Dıştaki `transform: translate3d(x, y+zOffset, 0)`
taşıyor ve `transition: transform ${frameMs}ms cubic-bezier(0.25,1.1,0.5,1.1)` ile
kayıyor. İçteki `scale(...)`, `skew(...)` ve `animation: <keyframe>` taşıyor.

Canvas'ta `transition` yok. Konum her karede **zamandan** hesaplanmalı: tick'in
başladığı an, `frameMs`, önceki konum, hedef konum ve easing eğrisi.

Ayrıca `physicsWrapper` bir **öncelik zinciri** uyguluyor — ölüm > zafer > çarpma >
ışınlanma > iniş. Bu zincir canvas'ta birebir korunmalı; yoksa ölmüş bir oyuncu
zıplamaya devam eder.

---

## 3. Yapılacaklar

### 3.1 `render/motion.ts` — zaman ve easing

**İlk iş: mevcut easing'i taşı.** Faz 02 ve 03, `motion.ts` henüz yokken
`cubic-bezier` çözücüsünü `cells/common.ts` içine (`cssBezier`) ve onun sarmalayıcısı
`easeInOut`'u `cells/ice.ts` içine koymak zorunda kaldı; her iki rapor da
(02-rapor §3.3, 03-rapor §6) "**Faz 05 taşımalı**" notunu bırakıyor.

Yap: `cssBezier`'i `motion.ts`'e taşı, `cells/common.ts` ve `cells/ice.ts` oradan
içe aktarsın. Kullanıcıları `ice`, `target`, `teleport`. Davranışı **değiştirme** —
bu bir taşıma, yeniden yazım değil; mevcut testler geçmeye devam etmeli.

```ts
/** CSS cubic-bezier(x1,y1,x2,y2) karşılığı. Newton-Raphson ile t çözümü yeterli. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number;

export const EASE_MOVE   = cubicBezier(0.25, 1.1, 0.5, 1.1);   // physicsWrapper geçişi
export const EASE_IN_OUT = cubicBezier(0.42, 0, 0.58, 1);
export const EASE_OUT    = cubicBezier(0, 0, 0.58, 1);
export const EASE_IN     = cubicBezier(0.42, 0, 1, 1);
export const LINEAR      = (t: number) => t;
```

Test (`motion.test.ts`): her easing 0→0 ve 1→1 veriyor, monoton artıyor,
`EASE_MOVE` tepe noktası 1'i aşıyor (overshoot — `y1=1.1` bunu kasten yapıyor;
kaybedilirse hareketin "yaylanma" hissi gider).

### 3.2 `render/motion.ts` — keyframe yorumlayıcısı

20'den fazla keyframe var. Her birini elle `if/else` ile yazmak yerine **küçük bir
veri tablosu + tek bir yorumlayıcı** yaz:

```ts
export interface Track {
    /** 0..1 arası ilerleme noktaları ve o noktadaki dönüşüm. */
    stops: { at: number; tx?: number; ty?: number; sx?: number; sy?: number;
             rot?: number; alpha?: number; skewX?: number; skewY?: number }[];
    durationMs: number;
    easing: (t: number) => number;
    /** `infinite` mi, `forwards` mı. */
    repeat: 'once' | 'loop' | 'hold-last';
}

export const TRACKS: Record<string, Track>;
export function sampleTrack(track: Track, elapsedMs: number): Transform;
```

`TRACKS`'e taşınacak keyframe'ler — `animationStyles.ts`'ten değerleri **oku**:

| Grup | Adlar |
|---|---|
| Çarpma | `bump-up/down/left/right` |
| Engellenmiş itme | `blocked-push-up/down/left/right` |
| Çarpışma | `collision-shake` |
| Konveyör reddi | `conveyor-reject-up/down/left/right` |
| Ölüm | `death-forbidden`, `death-crushed`, `death-lava`, `death-trail` |
| Zafer | `victory-spin` |
| Diğer | `teleportInEffect`, `landingSquashEffect` |

`stops` arası ara değer **doğrusal** hesaplanır; CSS de keyframe'ler arasında
böyle yapıyor (easing tüm animasyona bir kez uygulanıyor, aralara değil).

`sampleTrack` saf — test et: `at: 0` ve `at: 1` noktalarında tam değer,
ortada doğrusal ara değer, `repeat: 'hold-last'` süre dolunca son değerde kalıyor.

### 3.3 Varlık durumu — `render/entityMotion.ts`

`physicsWrapper`'ın React state'iyle yaptığını (`isLanded`, `prevZRef`) canvas'ta
kare dışı bir sözlük tutar:

```ts
/** entityId -> o varlığın süren efekt durumu. */
export interface EntityMotionState {
    prevZ: number;
    landedUntil: number | null;
    /** Aktif efekt adı ve başlangıç damgası. */
    track: { name: string; startedAt: number } | null;
}
```

Seçim zinciri `physicsWrapper`'dan **birebir** taşınır. Sırayı değiştirme:

1. `deathReason` varsa → `death-<reason>` (`forbidden`/`crushed`/`lava_edge`/`trail`),
   800ms, `hold-last`.
2. `isVictory` → `victory-spin`, 800ms, `loop`.
3. `bumpDirection` varsa → `bumpReason`'a göre `collision-shake` /
   `blocked-push-<dir>` / `conveyor-reject-<dir>` / `bump-<dir>`, süre `frameMs`.
4. Işınlanma (bir hücreden fazla atlama veya oda değişimi) → `teleportInEffect`,
   süre `frameMs`, **ve konum interpolasyonu yapılmaz** (bugün `transition: none`).
5. `prevZ > 0 && z === 0` → `landingSquashEffect`, 220ms.

### 3.4 Konum interpolasyonu

```
t = clamp((now - scene.tickStartedAt) / scene.frameMs, 0, 1)
e = EASE_MOVE(t)
x = prevX + (x - prevX) * e
y = prevY + (y - prevY) * e
```

`prevX/prevY` `prevEntities` içindeki aynı `id`'den gelir (bugünkü `prevEntity`
mantığı). Işınlanmada interpolasyon yok, doğrudan hedef.

`zOffset = -(z * 14)`, `stretchX = z > 0 ? 1 - z*0.06 : 1`,
`stretchY = z > 0 ? 1 + z*0.12 : 1`, `baseScale = 1 + z*0.15` —
`physicsWrapper`'daki sabitlerin aynısı.

Buzda kayma eğilmesi (`skewX ±12deg`, `skewY ±6deg`) canvas'ta `ctx.transform`
ile: `transform(1, skewY, skewX, 1, 0, 0)`. Açı → tanjant dönüşümünü unutma.

`filter: brightness(1.15) contrast(1.05)` (buzda kayarken) canvas'ta ucuz karşılığı
yok. **Bunu atla**, rapora yaz — kayma zaten eğilme ve parçacıklarla okunuyor.

### 3.5 Oyuncu ve kutu sprite'ları — `render/entities.ts`

`PlayerGraphic`'in 5 `styleType`'ı (`classic_arrow`, `arcade_sprite`, `neon_crosshair`,
`blueprint_reticle`, `cosmic_orb`) ve `BoxGraphic`'in 5 `styleType`'ı port edilir.

Sprite anahtarı — görüntüyü etkileyen her şey:
`player|<styleType>|<playerIndex>|<mode>|<locked>|<blinkPhase>`
`box|<styleType>|<colorIndex>|<dimmed>|<powered>`

Göz kırpma (`playerBlink 4s`) ve ters mod nabzı (`playerPulse 1.3s`) 00-ilkeler
§3.2'ye göre faza örneklenir. **Ama dikkat:** oyuncular `actors` katmanında, yani
tam kare hızında çiziliyorlar; 12 faz burada da yeterli ve doğru.

> Göz kırpmanın faz sayısı 12 iken 4 saniyelik periyotta faz başına 333ms düşer;
> göz kapağının kapanma anı (keyframe'de dar bir aralık) kaçabilir. `playerBlink`
> keyframe'ini oku: kapanma aralığı %5'ten darsa bu süs için `PHASES`'i 24'e çıkar
> (yalnızca bu sprite için, genel sabiti değiştirme) veya göz kırpmayı iki durumlu
> (açık/kapalı) çiz. Kararı rapora yaz.

Metin içeren parçalar (klasik temadaki `▲`/`▼` ağız, monospace) sprite içinde
`ctx.fillText` ile çizilir — sprite'a girdiği için kare başına maliyeti yok.

### 3.6 Buz tozu parçacıkları

`ice-dust-particle` + `ice-trail-<dir>` üç parçacık, 220ms döngü, yön başına ayrı
keyframe (`iceDustLeft/Right/Up/Down`). Bunlar `actors` katmanında, faza örneklenmiş
tek bir parçacık sprite'ı + üç farklı `animationDelay` ofsetiyle çizilir.

### 3.7 `drawActorsLayer`

Faz 01'in bıraktığı gövdeyi doldur. Çizim sırası: `zIndex: 10 + z` karşılığı —
varlıkları `z` değerine göre artan sırada çiz, böylece zıplayan varlık üstte kalır.

Görünürlük: bugünkü `opacity` mantığı (`isEntityExplored && isEntityVisible`) sis
Faz 07'ye kaldığı için şimdilik `1.0`; **ancak `isPlayerCelebrating` kuralı şimdi
gelmeli** — zafer koreografisi oynarken oyuncular bu katmanda çizilmez
(`opacity: 0.0`), çünkü onları Faz 06 çiziyor.

### 3.8 Zamanlayıcı ile bağ

`actors` katmanı şu durumlarda kirli tutulur (yani döngü uyanık kalır):

- tick geçişi sürüyorsa (`now - tickStartedAt < frameMs`),
- herhangi bir varlığın aktif `track`'i varsa,
- herhangi bir varlığın `z > 0` olduğu (zıplama) bir kare varsa,
- buzda kayan varlık varsa.

Hiçbiri yoksa `actors` **temiz** olmalı ve döngü durmalı. Bu, 00-ilkeler §2.2'nin
oynanış tarafındaki karşılığı; testle değil ama DevTools Performance ile doğrulanır.
Doğruladığını rapora yaz.

**Mekanizma:** yeni bir şey icat etme. `drawActorsLayer` 00-ilkeler §3.4 gereği
`boolean` döndürür (`true` = bir kare daha lazım); `BoardCanvas`'taki çizim geri
çağrısı `invalidate('actors')` eder. `drawAmbientLayer` Faz 02'den beri aynı deseni
kullanıyor — ona bak.

Zamanı tick'ten bağımsız akan efektler için (`landingSquashEffect` 220ms gibi)
`cells/activity.ts`'teki takipçi deseni hazır: durum çizimin dışında tutulur,
`nextExpiry()` anına `setTimeout` kurulur, o an katman bir kez daha kirletilir.
`entityMotion.ts` bunu varlık efektleri için tekrarlar.

---

## 4. Kapsam dışı

- Zafer koreografisi (`VictoryCelebration`) — Faz 06.
- Sis / görünürlük (Faz 07).
- `physicsWrapper.tsx` ve DOM çizicilerinde **hiçbir** değişiklik.
- `filter: brightness/contrast` karşılığı (§3.4 — atlanıyor, rapora yazılıyor).

---

## 5. Kabul kriterleri

- [ ] `motion.test.ts` easing ve `sampleTrack` testleriyle geçiyor.
- [ ] Beş temada oyuncu ve kutu, canvas ve DOM modlarında yan yana ayırt edilemiyor.
- [ ] Hareket **akıcı** — DOM'daki gibi yaylanarak duruyor, zıplamıyor.
- [ ] Şu beşinin hepsi canvas modunda doğru oynuyor: engele çarpma, kutu itememe,
      buzda kayma, trambolinle zıplayıp inme, ışınlanma.
- [ ] Dört ölüm türü de (yasak hücre, ezilme, lav kenarı, ize çarpma) DOM'daki
      animasyonu oynatıyor ve son karede **kalıyor** (`hold-last`).
- [ ] Hamle bittikten sonra (zafer/ölüm yokken) RAF döngüsü **duruyor**.
- [ ] `grep -rn "shadowBlur\|ctx\.filter" src/game-engine/render/entities*` yalnızca
      sprite rasterleyicilerde eşleşiyor.
- [ ] 00-ilkeler §6 tablosundaki dört kontrol yeşil.
- [ ] `raporlar/05-rapor.md` yazıldı; göz kırpma faz kararı (§3.5) ve atlanan
      `brightness/contrast` (§3.4) içinde.

---

## 6. Elle kontrol (proje sahibi)

- Uzun bir buz kayması: eğilme yönü ve toz parçacıkları doğru mu?
- Arka arkaya birkaç hamle: hareket DOM modundaki kadar akıcı mı, yoksa takılıyor mu?
- Ölüm animasyonundan sonra oyuncu ekranda doğru hâlde mi kalıyor?
