# Faz 05 Raporu — Varlık Katmanı: Oyuncu, Kutu ve Hareketin Tamamı

> Plan: `.plans/canvas-render/05-varlik-katmani.md` · Bağlayıcı: `00-ilkeler.md`
> Devir: `raporlar/04-rapor.md`, `raporlar/04b-rapor.md`

> **Görsel doğrulama YAPILMADI.** Tarayıcı/cihaz yok. Bu raporda görsel
> eşdeğerlik iddiası yoktur; yalnızca değerlerin kaynak DOM dosyalarından
> birebir taşındığı ve saf mantığın testle kilitlendiği iddia edilir.
> §7'deki elle kontrol listesi proje sahibinde.

---

## 1. Ne yapıldı

| Dosya | İçerik |
|---|---|
| `render/motion.ts` | **Yeni.** `cssBezier` (taşındı) + `cubicBezier` fabrikası + `EASE_MOVE/IN_OUT/OUT/IN/LINEAR`; `Track`/`TrackStop`/`Transform` tipleri, **20 keyframe'in `TRACKS` tablosu** ve `sampleTrack` yorumlayıcısı |
| `render/motion.test.ts` | **Yeni.** 16 test — easing uç değerleri ve yönü, `EASE_MOVE` aşımı, `TRACKS` bütünlüğü, `sampleTrack` durak/ara değer/tekrar kuralları |
| `render/entityMotion.ts` | **Yeni.** Varlık başına efekt durumu, `physicsWrapper`'dan birebir taşınan seçim zinciri, iniş kilidi, ışınlanma tespiti, `entityXY` |
| `render/entities/index.ts` | **Yeni.** `drawActorsLayer` — tick interpolasyonu, z sıralaması, esneme/eğilme, efekt dönüşümü, toz |
| `render/entities/player.ts` | **Yeni.** `playerSprite` (5 `styleType`), göz kırpma/nabız zaman fonksiyonları, `playerInputOf` |
| `render/entities/playerStyles.ts` | **Yeni.** Beş temanın değer tablosu + jeton arkası süsler (neon halkası, blueprint çentikleri, kozmik yörünge) |
| `render/entities/box.ts` | **Yeni.** `boxSprite` (5 tema gövdesi + `▣` + üç rozet), `boxInputOf` |
| `render/entities/dust.ts` | **Yeni.** `iceDustSprite` + `dustParticlesAt` (üç parçacık, 220ms, dört yön) |
| `render/entities/entities.test.ts` | **Yeni.** 20 test — sprite anahtarları, seçim zinciri SIRASI, iniş kilidi, ışınlanma, toz uç değerleri |

### Değişen dosyalar

| Dosya | Değişiklik |
|---|---|
| `render/cells/common.ts` | `cssBezier` gövdesi `motion.ts`'e taşındı, yerinde `export { cssBezier } from '../motion'` kaldı. `TextStyle`'a `family?` eklendi ve `weight` sayısal değere açıldı (monospace + `font-weight: 900` için) |
| `render/cells/ice.ts` | `easeInOut` artık `motion.ts`'teki `EASE_IN_OUT`'u sarıyor |
| `render/types.ts` | `BoardScene.isVictoryActive` eklendi (gerekçe §2.5) |
| `render/BoardCanvas.tsx` | `createEntityMotionTracker` kuruldu, sahne değişince `motion.update`, çizimde `drawActorsLayer` → `invalidate('actors')`; Faz 01'in boş `drawActorsLayer` gövdesi dolduruldu ve artık `boolean` dönüyor; ölü `eslint-disable` satırı kaldırıldı |

`physicsWrapper.tsx`, `PlayerGraphic.tsx`, `BoxGraphic.tsx`, `GameBoard.tsx` ve
diğer DOM çizicilerine **dokunulmadı** (faz planı §4, 00-ilkeler §5).

---

## 2. Plandan ayrılan noktalar

**2.1 `entities.ts` yerine `entities/` klasörü.** Beş oyuncu stili + beş kutu
teması + toz + katman çizimi tek dosyada ~800 satır ederdi. Faz 04 aynı durumda
`overlays/` klasörüne bölmüştü; aynı desen. Kabul kriterindeki
`grep -rn … src/game-engine/render/entities*` klasörü de kapsıyor.

**2.2 `motion.ts` 327 satır** (00-ilkeler §1'deki "~250" sınırının üstünde).
Bölmedim: plan `TRACKS`'i açıkça `motion.ts`'e koyuyor ve tabloyu ayrı bir
dosyaya alıp `motion.ts`'ten yeniden dışa aktarmak **döngüsel içe aktarma**
üretiyor (tablo `EASE_*` sabitlerine bağlı, sabitler modül gövdesinde
hesaplanıyor → TDZ hatası). Dosya tek iş yapıyor: zaman → dönüşüm.
`player.ts` ise aynı sebeple bölündü (`playerStyles.ts`), orada döngü yok.

**2.3 `sampleTrack`'e üçüncü, isteğe bağlı parametre: `durationMs`.**
`bump-*`, `blocked-push-*`, `conveyor-reject-*`, `collision-shake` ve
`teleportInEffect` DOM'da `frameMs` ile oynatılıyor; `frameMs` her tick'te
değişiyor. `Track.durationMs` sabit bir veri alanı olduğu için gerçek süre
çağrıda geçiliyor. Tablodaki varsayılan 80 (`BoardCanvas`'ın `frameMs` yedeği).

**2.4 `EntityMotionState` iki alan fazla taşıyor.**
- `lastZ`: DOM'daki `useEffect(..., [z])` **yalnızca `z` değişince** koşuyor.
  `prevZ` (= `prevZRef.current`) ile bağımlılık değeri aynı şey değil; iniş
  tetiklendiğinde kaynak kod erken döndüğü için `prevZRef` güncellenmiyor.
  Bu tuhaflık birebir korundu, iki alan gerekti.
- `track.durationMs`: §2.3'ün sonucu.

**2.5 `BoardScene.isVictoryActive` eklendi.** §3.7 "zafer koreografisi oynarken
oyuncular bu katmanda çizilmez" diyor, ama sahnede bu bilgi yoktu.
`ambientMode === 'off'` yerine geçemez: zayıf cihazda (`motionTier === 'lite'`)
de `'off'` oluyor ve o zaman oyuncular haksız yere kaybolurdu.

**2.6 Sprite anahtarları plandakinden geniş.** İkisi de 00-ilkeler §3.1'in
kuralına uyuyor (yalnızca GÖRÜNTÜYÜ etkileyen girdi):
- `player|<styleType>|<playerIndex>|<mode>|<locked>|<blink>|<pulsePhase>` —
  `pulsePhase` eklendi; neon temasının ters mod halkası (`playerPulse 1.3s`)
  sprite'ın İÇİNDE ve faza örneklenmiş (00-ilkeler §3.2). Nabzı olmayan
  hâllerde 0, kilitliyken `blink` daima 0.
- `box|<theme>|<hex>|<dimmed>|<powered>|<requiresPower>|<durability>|<colorDot>` —
  plan `<styleType>|<colorIndex>` diyordu. `BoxGraphic` `themeConfig.box`
  jetonlarını **kullanmıyor**, beş temayı kendi içinde `theme` üzerinden
  dallandırıyor (tema ↔ `styleType` birebir). `colorIndex` yerine `hex`, çünkü
  görüntüye giren o. Üç rozet (güç şimşeği, dayanıklılık sayısı, renk noktası)
  görüntüyü değiştiriyor; anahtarda olmasalardı yanlış sprite dönerdi.

**2.7 Buz tozu faza örneklenmedi.** §3.6 "faza örneklenmiş tek bir parçacık
sprite'ı" diyor; parçacığın **görüntüsü** zamanla değişmiyor — yalnızca konum,
ölçek ve opaklık akıyor. Üçü de kare döngüsünde serbest çağrılar
(00-ilkeler §2.1) ve `overlays/timing.ts` Faz 04'te aynı gerekçeyle aynı yolu
seçmişti. Tek `icedust` sprite'ı + üç `animationDelay` ofseti.

**2.8 `entityMotion` `nextExpiry()` + `setTimeout` takipçisi KURMADI.**
§3.8'in son paragrafı `cells/activity.ts` desenini tekrarlamayı öneriyor. Orada
gerekliydi çünkü hücre katmanı efekt boyunca kirli **tutulmuyor**. Burada
`drawActorsLayer` aktif bir efekt varken her karede `true` dönüyor, yani döngü
efekt bitene kadar zaten uyanık; bir zamanlayıcı ölü kod olurdu. Mekanizma
plandaki birinci yol: dönüş değeri → `invalidate('actors')`.

**2.9 `victory-spin`'in ötelemesi baştan ölçeklenmiş yazıldı.** CSS'te
`scale(1.2) translateY(-6px) rotate(180deg)` soldan sağa çarpılır, yani ölçek
ötelemeyi de büyütür (−7.2px). Canvas'ta öteleme önce uygulandığı için değer
tabloya −7.2 olarak girdi. Diğer 19 keyframe'de `translate` zaten `scale`'den
önce geliyor; `rotate` yalnızca tekdüze (uniform) ölçekle birlikte göründüğü
için sırası sonucu değiştirmiyor.

**2.10 Ara değerleme planın dediği gibi.** §3.2: easing TÜM animasyona bir kez,
duraklar arası doğrusal. CSS aslında her durak çiftine ayrı uygular; fark
yalnızca ara karelerin hızında, uç ve durak değerleri aynı.

---

## 3. Ne yapılmadı ve neden

- **Zafer koreografisi (Faz 06).** `isVictoryActive` iken oyuncular `actors`
  katmanında çizilmiyor (§3.7 gereği) ama `VictoryCelebration` karşılığı henüz
  yok. **Sonuç: canvas modunda zafer anında oyuncular ekrandan kayboluyor.**
  Faz 06'ya kadar bilinen ve kabul edilmiş durum; bkz. §5.
- **Sis / görünürlük (Faz 07).** `opacity` mantığı (`isEntityExplored &&
  isEntityVisible`) uygulanmadı; varlıklar `1.0` çiziliyor.
- **`filter: brightness(1.15) contrast(1.05)`** (buzda kayarken) — plan §3.4
  atlanmasını söylüyor, atlandı.
- **Diğer `filter` katmanları** — §4.1'de karar bekliyor.
- **DOM çizicilerinde hiçbir değişiklik** (faz planı §4).
- **Çizim testi yazılmadı** (00-ilkeler §6.1).
- `themeConfig.box`/`themeConfig.player` jetonlarının `BoxGraphic` tarafından
  kullanılmaması kapsam dışı bir gözlem; düzeltilmedi (00-ilkeler §1).

---

## 4. Karar bekleyen konu (proje sahibi)

**4.1 Ölüm ve çarpışma keyframe'lerindeki `filter` katmanları çizilmiyor.**
Plan yalnızca buz kaymasındaki `brightness/contrast`'ı atlamamı söylemişti, ama
aynı sorun dört ölüm ve çarpışma keyframe'inde de var:

| Keyframe | Atlanan |
|---|---|
| `death-forbidden` | `saturate(1→3)`, `brightness(1→1.5→0.2)` |
| `death-crushed` | `grayscale(0→1)`, `brightness(1→0.1)` |
| `death-lava` | `sepia(1) hue-rotate(-50deg) brightness(2)`, `drop-shadow(0 0 12px #ef4444)` |
| `death-trail` | `hue-rotate(0→180→90)`, `brightness(2.5)`, `drop-shadow(0 0 12px #00ff88)` |
| `collision-shake` | `brightness(1.2)` |
| `victory-spin` | `brightness(1.5)`, `drop-shadow(0 0 20px rgba(0,255,136,.9))` |

Sebep: `ctx.filter` kare döngüsünde **yasak** (00-ilkeler §2.1) ve bu filtreler
zamanla değiştiği için sprite'a da giremiyor — faza örneklense her ölüm için
12× sprite eder. Geometri (ölçek, dönüş, öteleme, opaklık) birebir oynuyor;
eksik olan renk kayması ve parlama.

Kaybın anlamı: **lav ölümü kızarmadan**, **ize çarpma ölümü neon şok parlaması
olmadan**, **ezilme ölümü griye dönmeden** oynuyor. Geometri okunuyor ama
"karakter" zayıflıyor. 00-ilkeler §8 gereği kendi başıma değiştirmedim.

Üç seçenek:
1. **Bırak** — geometri yeterince okunur (en ucuz).
2. **Kaba bir renk katmanı** — varlığın üstüne `globalAlpha`'lı düz renk
   dikdörtgeni (`source-atop`) ile kızarma/griye dönme taklidi. Ucuz, `filter`
   kullanmaz, tam eşdeğer değil.
3. **Ölüm başına 12 faz sprite'ı** — birebire en yakın, önbelleği 4×12 sprite
   büyütür ve ölüm anında rasterizasyon yapar (en kötü an).

Önerim (2); ama karar senin.

---

## 5. Görsel farklar

| Nerede | Fark | Sebep |
|---|---|---|
| **Boşta duran oyuncu** | **Göz kırpmıyor, neon ters mod halkası nabız atmıyor** | Faz planı §3.8 `actors` katmanını yalnızca dört durumda kirli tutuyor (tick geçişi, aktif efekt, zıplama, buzda kayma); süs animasyonları listede yok ve kabul kriteri "hamle bittikten sonra RAF durur" diyor. Süsler zamandan örnekleniyor, yani katman **başka bir sebeple** çizildiğinde doğru fazda görünüyorlar — ama boşta donuyorlar. Bu, 00-ilkeler §2.2'nin doğrudan sonucu |
| **Zafer anı** | Oyuncular kayboluyor | Faz 06 henüz yok (§3) |
| Göz kırpma | Ara kareler yok: göz açık ya da kapalı | §6.1'deki karar |
| Ölüm / çarpışma / zafer | Renk ve parlama katmanları yok | §4.1 |
| Buzda kayma | `brightness(1.15) contrast(1.05)` yok | Plan §3.4 |
| Ara kareler | Easing tüm animasyona bir kez uygulanıyor | §2.10 |
| Sis | Varlıklar daima opak | Faz 07 |
| Ağız / rozet metni | `line-height: 1` kutusunun merkezi `textBaseline: 'middle'` kabul edildi | 03-rapor §11 ile aynı yaklaşım |
| Neon dış halkası | `1px dashed` tire periyodu Chromium'unkiyle birebir değil | `paintTokens`'taki `DASH_RATIO = 3` yaklaşımı (Faz 02'den beri) |
| Varlık konumu | Hücrelere göre oda kenarlığı kadar (2–3px) sol-üste kayık | **DOM'da da böyle**: `PhysicsWrapper` oda `<div>`'inin dışında, `offset.left + col*64`'te; ızgara ise kenarlığın içinden başlıyor. İz/kablo ile aynı tuhaflık (04-rapor §2.4) |

---

## 6. Kararlar

### 6.1 Göz kırpma fazı (faz planı §3.5)

`@keyframes playerBlink`: `0%, 92%, 100% → scaleY(1)`, `96% → scaleY(0.1)`.
Gözün **kapalı sayıldığı** aralık (scaleY < 0.5) periyodun **~%3.6'sı**
(%94.2–%97.8) — plandaki "%5'ten dar" eşiğinin altında. Yani 12 faz kırpmayı
tamamen kaçırırdı.

Planın iki seçeneğinden **"iki durumlu (açık/kapalı)"** seçildi, `PHASES`
24'e çıkarılmadı. Gerekçe:

- 24 faz, oyuncu sprite'larını 24 ile ÇARPAR. Neon ters modda anahtar zaten
  nabız için 12 faz taşıyor; ikisi birleşince 6 oyuncu için 6 × 2 × 24 × 12 =
  **3456 sprite**. `spriteCache`'in 600'lük kaçak alarmı (00-ilkeler §3.1) tek
  başına bu süs yüzünden çalardı.
- Kapalı pencere zamandan doğrudan hesaplanıyor (%94.2–%97.8), faz
  yuvarlamasından değil: 4 sn'lik periyotta **~144 ms** kapalı kalıyor. CSS'in
  gerçek kapalı süresine yakın; 12 fazlı örnekleme 333 ms verirdi.
- Gözler 4–5 px. Ara kareler (scaleY 0.6, 0.3 …) tek bir karede geçiyor.

`PHASES` sabitine **dokunulmadı** (00-ilkeler §3.2 hâlâ 12).

### 6.2 `brightness/contrast` (faz planı §3.4)

Plan gereği atlandı. Kayma zaten eğilme (`skewX ±12deg`, `skewY ±6deg`) ve üç
toz parçacığıyla okunuyor. Aynı ailedeki diğer filtreler için bkz. §4.1.

---

## 7. Doğrulama (00-ilkeler §6)

| Kontrol | Komut | Sonuç |
|---|---|---|
| Tip denetimi | `npx tsc --noEmit` | ✅ temiz |
| Testler | `npm test` | ✅ **36 dosya / 344 test** (Faz 04b: 308; +36: 16 `motion.test.ts`, 20 `entities.test.ts`) |
| Lint (tüm repo) | `npm run lint` | ✅ **431 hata / 13240 uyarı** — tabanla aynı |
| Lint (yalnız `src`) | `npx eslint src` | ✅ **154 hata / 52 uyarı** — tabanla aynı |
| Lint (yeni kod) | `npx eslint src/game-engine/render` | ✅ çıktı boş, 0 sorun |
| Android build | `npm run build:mobile` | ✅ `Sync finished in 0.812s` |
| `shadowBlur`/`ctx.filter` | `grep -rn "shadowBlur\|ctx\.filter" src/game-engine/render/entities*` | ✅ **hiç eşleşme yok** — varlık sprite'ları gölgeyi `paintTokens.setShadow` üzerinden alıyor (04b sözleşmesi), doğrudan atama yapmıyor |
| `shadowBlur` (tüm `render/`) | aynı arama | ✅ tek atama `paintTokens.ts:59` (`setShadow` gövdesi); kalanlar yorum |

### Ölçüm — `cache.size()` (00-ilkeler §3.1)

Gerçek tuval yok; anahtar üreticileri doğrudan sayıldı (geçici dosya ölçümden
sonra silindi). Senaryo: **2 oyuncu**, her ikisi de normal + ters modda,
kilitli ve kilitsiz, göz açık ve kapalı; 1 kutu (güç gerektiren: soluk/yanık,
dayanıklılık rozetli) + 1 sade kutu; + 1 toz sprite'ı.

| Tema | Varlık sprite sayısı |
|---|---|
| `legacy` (nabız yok) | **18** |
| `neon` (ters modda 12 fazlık nabız) | **84** |

Kaba tavan: `oyuncu sayısı × 2 (mod) × 2 (kilit) × 2 (göz)` — neon ters modda
ayrıca `× 12 (nabız)` — artı kutu varyantı sayısı artı 1 (toz). Sayısal tavan
yok (00-ilkeler §3.1); denetlenen kural anahtarın kendisi ve bunu
`entities.test.ts` kilitliyor (kimlik/konum anahtara girmiyor).

Sprite kutuları: oyuncu `legacy` 94×94, diğer temalar 68×68–72×72; kutu 72×72;
toz 16×16. Bellek ölçümü Faz 08'de.

### Doğrulanamayanlar

- **RAF döngüsünün gerçekten durduğu DevTools Performance ile doğrulanmadı**
  (§3.8 bunu istiyor) — tarayıcı yok. Kodda garanti: `drawActorsLayer` yalnızca
  tick geçişi sürerken, aktif efekt varken, `z > 0` iken veya buzda kayarken
  `true` dönüyor; `BoardCanvas` bu değere bakıp `invalidate('actors')` ediyor,
  aksi hâlde katman temiz kalıyor. **Ambient katmanı boşta `ambientMode === 'on'`
  iken kendi 20fps döngüsünü sürdürmeye devam ediyor** (Faz 02 kararı) — yani
  "hamle bitince RAF durur" kriteri `actors` katmanı için geçerli.
- Beş temada yan yana görsel karşılaştırma.
- Beş senaryo (engele çarpma, kutu itememe, buzda kayma, trambolin, ışınlanma).
- Dört ölüm türünün son karede kalması.

---

## 8. Elle kontrol (proje sahibi)

```js
localStorage.setItem(`${localStorage.getItem('activeUserId') ?? 'anon'}:boardRenderer`, 'canvas');
location.reload();
```

1. **Beş temada** oyuncu ve kutu `canvas` ↔ `dom` yan yana ayırt edilebiliyor mu?
   (ters mod oku `▼`, kilitli oyuncu, güç/dayanıklılık/renk rozetli kutular)
2. **Hareket akıcı mı** — DOM'daki gibi yaylanarak duruyor mu, yoksa takılıyor mu?
   Arka arkaya birkaç hamle oyna.
3. Beş senaryo: engele çarpma, kutu itememe, **uzun bir buz kayması** (eğilme
   yönü ve toz parçacıkları doğru mu?), trambolinle zıplayıp inme, ışınlanma.
4. Dört ölüm türü (yasak hücre, ezilme, lav kenarı, ize çarpma): animasyon
   oynuyor ve **son karede kalıyor** mu? §4.1'deki renk kaybı kabul edilebilir mi?
5. Zıplayan varlık, altındakinin **üstünde** mi çiziliyor?
6. Boşta duran oyuncunun göz kırpmaması (§5) kabul edilebilir mi?
7. Zafer anında oyuncuların kaybolması — Faz 06'ya kadar.
8. DPR 2 cihazda oyuncu parlamaları DOM'daki kalınlıkta mı?

---

## 9. Sonraki faza not

- **Faz 06 (zafer).** `BoardScene.isVictoryActive` hazır; `actors` katmanı bu
  bayrak açıkken `type === 'player'` varlıkları **atlıyor** (`entities/index.ts`).
  Kutular çizilmeye devam ediyor — DOM'daki `isPlayerCelebrating` kuralının
  aynısı. `victory-spin` izi `TRACKS`'te ve `loop`; koreografi onu kullanacaksa
  `sampleTrack` ile örnekleyebilir. `BOARD_BLEED` hâlâ 32 (04b §6).
- **Faz 06 zamanlayıcı:** `drawActorsLayer` `boolean` dönüyor ve `BoardCanvas`
  dönen değere bakıp `invalidate('actors')` ediyor. Koreografi sürerken `true`
  dönmeye devam etmeli.
- **Faz 07 (sis).** Görünürlük noktası tek: `entities/index.ts`'teki varlık
  döngüsünde `isPlayerCelebrating` kontrolünün hemen yanı. `GameBoard`'daki
  kural: `opacity = isPlayerCelebrating ? 0 : (isEntityExplored && isEntityVisible ? 1 : 0)`,
  `transition: opacity 0.3s`.
- **Faz 08 (ölçüm).** §7'deki sprite sayıları ve kutu boyutları bellek
  hesabının girdisi.
- **easing artık tek yerde.** `motion.ts`. `cells/common.ts` ve `cells/ice.ts`
  yalnızca yeniden dışa aktarıyor; yeni kod doğrudan `motion.ts`'ten almalı.
  02-rapor §3.3 ve 03-rapor §6'daki "Faz 05 taşımalı" notu **kapandı**.
- `entities/playerStyles.ts` `Path2D(<svg path d>)` kullanıyor (blueprint köşe
  çentikleri). Hedef WebView'lerde mevcut; yine de cihazda bir kez gözle
  doğrulanmalı — desteklenmezse çentikler çizilmez, gerisi etkilenmez.
- `BoardCanvas.tsx` 487 satır (Faz 01'de sınır aşımı zaten onaylıydı).
