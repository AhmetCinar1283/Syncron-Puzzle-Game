# Faz 10 Raporu — Davranış Farkları: Kaybolan Geri Bildirimler ve Geçişler

> Plan: `.plans/canvas-render/10-davranis-farklari.md` · Bağlayıcı: `00-ilkeler.md`
> Devir: `raporlar/08-rapor.md` §7.5, `raporlar/09-rapor.md`

> **Görsel doğrulama YAPILMADI.** Tarayıcı/cihaz yok. Bu raporda "DOM ile ayırt
> edilemez" iddiası yoktur; yalnızca değerlerin kaynak DOM dosyalarından
> (`animationStyles.ts`, `iceCellRenderer.tsx`, `teleportCellRenderer.tsx`,
> `trampolineCellRenderer.tsx`, `GameBoard.tsx`) okunup taşındığı ve saf mantığın
> testle kilitlendiği iddia edilir. §7'deki elle kontrol listesi proje sahibinde.

Kapsam: 08-rapor §7.5'teki **#3, #7, #9, #12, #19, #21**. Başka hiçbir fark, süs
veya DOM çizicisine dokunulmadı.

---

## 1. Ne yapıldı

### 1.1 Tek "kirli tut" yeri — `render/keepAlive.ts` (yeni)

`hold(katmanlar, bitişDamgası)` / `active(katman, now)`. Faz 07'de sis geçişi için
`BoardCanvas` çizim geri çağrısına gömülü olan ("`fogFrame.transitioning` ise
`static`ve `ambient`i yeniden kirlet") mantık buraya **genelleştirildi**; sis
geçişi de artık bunu kullanır (`fog.update` sonrası `holds.hold(['static',
'ambient', 'actors'], …)`). `BoardCanvas` her çizimden sonra tek satırla bakar:

```ts
if (holds.active(layer, now) && !(layer === 'ambient' && ambientMode === 'off')) invalidate(layer)
```

`entities/index.ts`'teki `if (fog?.transitioning) alive = true` satırı bu yüzden
**kaldırıldı** (aynı iş iki yoldan yapılmasın). `fog.ts`'in `EASE_CSS`'i
`motion.ts`'e taşındı (yeni easing yazılmadı; tek kaynak).

### 1.2 #3, #7, #12 — çapraz geçişler — `render/fades.ts` (yeni)

Hücre veya oda görünümü değişince eski hâl, başlangıç damgası ve süre tutulur;
çizim iki sprite'ı `globalAlpha × (1 − e)` / `× e` ile blit eder. `e` CSS `ease`
(`EASE_CSS`). Sprite yeniden rasterize edilmez, iki hâl zaten önbellekte.

| # | Süre (kaynak) | Nerede |
|---|---|---|
| 3 buz | 200 ms — `iceCellRenderer.tsx:78` | `cells/ice.ts` `ICE_FADE_MS`, çizim `cells/index.ts` |
| 7 teleport | 600 ms — `teleportCellRenderer.tsx:116` | `cells/teleport.ts` `TELEPORT_FADE_MS`; **ambient süsü de** belirir/söner (`drawCellsAmbient`) |
| 12 oda | 250 ms — `GameBoard.tsx:297` | `fades.ts` `ROOM_FADE_MS`; `opacity` odanın çerçeve, hücre, şerit, etiket ve başlık çizimlerinin hepsine `alpha` olarak gelir (`forEachRoom` 4. parametre); çerçeve sprite'ı ayrıca eski/yeni çapraz geçer (`overlays/roomFrame.ts`) |

Geçişi **kim başlatır:** `BoardCanvas` sahne efektinde `observeCellFades` /
`observeRoomFades` (activity'den SONRA — buz/teleport `isActive`e bakar) ve
etkinlik zamanlayıcısı söndüğünde (teleport dinlenmeye dönerken). Yeni tur
(`prevEntities === null`) ve tema değişimi **snap**'tir: hâli yazar, animasyon
oynatmaz (fog'daki kuralın aynısı).

### 1.3 #9 — trambolin ezilmesi

`TRACKS.trampolineLaunch` eklendi (`0% scale(1.3, .35)`, `40% (.7, 1.4)`,
`70% (1.15, .85)`, `100% (1, 1)`; `500ms cubic-bezier(.25, 1, .5, 1) forwards` —
`EASE_PUSH` ile aynı eğri, yeni easing yok). DOM'da **yalnızca yay** ezilir
(`transform-origin: bottom center`, hücre kutusu ezilmez); bu yüzden ezilme
süresince tam sprite yerine **gövde + yay** ayrı blit edilir ve ölçek, yay yönüne
göre döndürülmüş eksende uygulanır (`drawTrampolineSquash`).

- Tam sprite (`trampolineCellSprite`) ve anahtarı **değişmedi**: `dev-cell-compare`
  ve `keys.test.ts` etkilenmedi. Gövde ve yay sprite'ları yalnızca ezilme
  sırasında, tembel üretilir.
- Ezilme `static`te oynar ve yalnızca `['static']` 500 ms tutulur.
- Başlangıç anı `fades`teki geçiş kaydıdır; yalnızca **etkinleşirken** kaydedilir
  (sönerken süre 0). Etkin pencere içindeki yeni gelen varlık ezilmeyi yeniden
  başlatmaz — DOM'da sınıf zaten takılı olduğu için animasyon yeniden başlamaz.

### 1.4 #21 — ölüm ve çarpışmada renk ve parlama

Kaynak `filter` değerleri `animationStyles.ts`'ten okundu ve `TRACKS`'e veri olarak
girdi: her `Track`'in `layers` listesi (renk katmanı: `filter` zinciri, `drop-shadow`
HARİÇ; parlama katmanı: `{color, blur}`) ve her durağın `fx` ağırlıkları.
`sampleTrack` ağırlıkları **aynı easing ve aynı yorumlayıcıyla** ara değerler
(yeni easing yok). Kapsanan izler: `death-forbidden`, `death-crushed`,
`death-lava`, `death-trail`, `collision-shake`.

- **Renk → sprite varyantı** (`source-atop` örtüsü DEĞİL). Gerekçe: `source-atop`
  tuvalin O ANKİ içeriğini boyar; `actors` tuvalinde altta başka varlıklar duruyor,
  örtü onları da boyardı. Varyant ise varlığın kendi silüetine bağlıdır ve
  kaynaktaki `grayscale`/`sepia`/`hue-rotate`/`saturate`/`brightness` zincirinin
  **aynısıdır** (`ctx.filter` yalnızca `variants.ts` rasterleyicisinde).
- **Parlama → sprite varyantı** (`haloVariantOf`): gövdesiz, yalnızca
  `setShadow` ile üretilen hale; gövdenin arkasına, kendi ağırlığıyla çizilir.
  `drop-shadow` zincirin sonunda olduğu için DOM'da da renk kaymasından
  etkilenmez; burada da ayrı katman.
- **Karıştırma** (`entities/effects.ts` `planEffects`): renk katmanları ardışık
  "üstüne çizme" ile ağırlıklı ortalamaya çevrilir (alfa = ağırlık / şimdiye kadarki
  toplam) — opak sprite'larda tam doğrusal; ağırlık 1 olunca temel sprite hiç
  çizilmez. Testle kilitli.
- `dim.ts` (sis karartması) aynı rasterleyiciye (`variants.filterVariantOf`)
  bağlandı; davranışı ve anahtarı (`|dim`) aynı, tekrar kalmadı.

Kapsam dışı bırakılan iki `filter`: `victory-spin` (zaferde oyuncu zaten `actors`ta
çizilmiyor, 05-rapor §9) ve `teleportInEffect`'in `brightness(3) hue-rotate(90deg)`i
(#21 "ölüm / çarpışma" diyor).

### 1.5 #19 — boşta oyuncu göz kırpar, neon halka nabız atar

`render/idle.ts` (yeni) + `BoardCanvas`'ın ambient geri çağrısında **bir koşul**;
yeni zamanlayıcı yok. Ambient bir kare çizince:

- ekranda boşta animasyonlu oyuncu varsa (kilitsiz → kırpar; neon ters modda kilitli
  olsa da halka nabız atar) ambient döngüsü sürer,
- kırpma/nabız durumu **son `actors` çiziminden beri değiştiyse** `actors` da
  kirletilir. Göz kırpma iki durumlu olduğundan 4 sn'de iki çizim; neon nabzı 12
  fazlı. (Plan "basit kalıyorsa" diyordu; imza karşılaştırması ~10 satır.)

`actors` her çizildiğinde son durum kaydedilir (hamle sırasında da): aksi halde
hamleden sonra bayat bir kare kalabilirdi (testte).

**Vaat:** `ambientMode !== 'on'` iken (`lite`, zafer, hamle sürerken `paused`)
hiçbir şey uyanmaz. `idle.test.ts` bunu gerçek `createScheduler` ve enjekte `raf`
ile sınar: `off`'ta ilk çizimden sonra 30 sn boyunca **RAF sayısı artmıyor**.

### 1.6 Dosyalar

| Dosya | İçerik |
|---|---|
| `keepAlive.ts`, `fades.ts`, `idle.ts`, `variants.ts` | **Yeni** |
| `entities/effects.ts` | **Yeni** — `planEffects`, `blitWithEffects` |
| `motion.ts` | `EASE_CSS`, `EffectLayer`, `TrackStop.fx`, `Track.layers`, `Transform.fx?`, `trampolineLaunch`, beş izde `layers`/`fx` |
| `entityMotion.ts` | `effectLayersOf` |
| `entities/index.ts`, `entities/player.ts` | Efektli blit; `isIdleAnimated`; `fog.transitioning` satırı gitti |
| `cells/index.ts` | `drawCellsStatic/Ambient`'e `fades`; `observeCellFades`; `forEachCell` artık `alpha` veriyor |
| `cells/ice.ts`, `cells/teleport.ts` | Süre sabitleri (yorum güncellendi) |
| `cells/trampoline.ts` | Gövde + yay sprite'ları, `drawTrampolineSquash` |
| `cells/dim.ts` | `variants.ts`'e bağlandı |
| `overlays/geometry.ts`, `roomFrame.ts`, `edgeStrips.ts`, `edgeLabels.ts`, `index.ts` | Oda `alpha`sı ve çerçeve çapraz geçişi |
| `fog.ts` | `EASE_CSS` `motion.ts`'ten |
| `BoardCanvas.tsx` | Bağlantı (bkz. §1.1, §1.2, §1.5) |
| Testler | `keepAlive.test.ts` (5), `fades.test.ts` (13), `idle.test.ts` (13), `entities/effects.test.ts` (17), `cells/trampoline.test.ts` (4), `motion.test.ts` (+5) |
| Belgeler | `00-ilkeler.md` §3 ve §3.4, `render/README.md`, `08-rapor.md` §7.5 (altı satır "Düzeltildi") |

---

## 2. Plandan ayrılan noktalar

**2.1 Süre/easing kaynağı.** Plan §2.4 süre ve easing'in "`animationStyles.ts`'teki
`transition` değerlerinden" okunmasını söylüyor; **o dosyada hiç `transition`
yok** (yalnızca `@keyframes` ve sınıflar). Değerler asıl yerlerinden alındı:
`iceCellRenderer.tsx:78` (200 ms ease), `teleportCellRenderer.tsx:116` (600 ms
ease), `GameBoard.tsx:297` (`opacity 0.25s`, varsayılan `ease`). Keyframe
değerleri planın dediği gibi `animationStyles.ts`'ten okundu.

**2.2 00-ilkeler §3.4'ün "`drawStaticLayer` … `true`" ifadesi.** Plan "geçiş
sürdüğü sürece `true` olacak şekilde güncelle" diyor. Uygulamada `drawStaticLayer`
hâlâ `void`: geçiş sahne değişince BAŞLIYOR (çizim sırasında değil), bu yüzden
"bir kare daha" bilgisi dönüş değeriyle değil bitiş damgasıyla taşınıyor
(`KeepAlive`). Sözleşmenin **davranışı** plandaki gibi (static geçiş sürerken
kirli kalır); §3.4 bunu ve gerekçeyi yazıyor. (§3.4 zaten `void` yazan koda
"boolean" diyordu; şimdi kodla uyumlu.)

**2.3 Trambolin: tam sprite ikiye bölünmedi, üçüncü/dördüncü sprite eklendi.**
Yalnızca yay ezilecekse gövde ve yay ayrı çizilmeli; tam sprite'ı bölmek
`CELL_SPRITES`, `dev-cell-compare` ve anahtar testlerini bozardı. Ezilme dışında
eski yol aynen kullanılıyor.

**2.4 `Transform.fx` opsiyonel.** Diğer izlerin çıktısı ve `motion.test.ts`'in
`toEqual` beklentisi değişmesin diye yalnızca `filter` taşıyan izlerde dolu.

**2.5 `motion.test.ts` beklenen liste 20 → 21 iz.** `TRACKS`'e `trampolineLaunch`
girdiği için testin sabit listesi güncellendi (plan: "Faz 05'in `TRACKS`'i").

---

## 3. Ne yapılmadı ve neden

| İş | Neden |
|---|---|
| Cihazda/tarayıcıda görsel doğrulama | Ortam yok (§7) |
| Trambolin yayının `brightness(1.6 → 2)` parlaması | Plan §2.3 yalnızca `scale` diyor; süreye göre değişen filtre kare döngüsünde yasak ve hücre sprite'ına da giremiyor. Geometri ezilmesi oynuyor |
| `victory-spin` ve `teleportInEffect` `filter`ları | §1.4 |
| Buz gövdesi/teleport için "ters yöne dönerken mevcut ara değerden devam" | DOM'da geçiş yarıda tersine dönerse mevcut ara değerden döner; burada eski hâlin TAM görüntüsünden başlar (hızlı art arda dolu/boş, örn. uzun buz kayması). Sis geçişindeki aynı basitleştirme (07-rapor §5) |
| Geçiş sürerken `static` maliyetini ölçmek | Cihaz gerektirir, §4.6 |
| DOM çizicilerinde değişiklik | Kapsam dışı (plan §3) |

---

## 4. Görsel farklar ve riskler (hepsi cihazda görülmedi)

1. **Çapraz geçiş "iki görüntüyü karıştırma"dır**, CSS'in renk interpolasyonu
   değil. Düşük alfalı (yarı saydam) sprite'larda fark küçük; opak bölgelerde
   yoğunluk ortada hafifçe (~%5–15) sapabilir. Ayrıca `neon` temasında buz
   arka planı `linear-gradient`: CSS iki gradyan arasında interpolasyon yapmayabilir
   (tarayıcı ayrık geçebilir); canvas her durumda yumuşak geçer.
2. **Teleport süsü:** DOM'da girdapların `scale(1 → 1.4)` geçişi ayrı bir eğriyle
   (`cubic-bezier(0.16, 1, 0.3, 1)`) akıyor; burada süs `e` ile belirir/söner.
   Buz ikonu iki hâlde de var olduğu için geçişin ortasında ~%25 kadar seyrelebilir.
3. **Oda çerçevesi:** DOM'da `border-color` geçişe girmez (anında değişir); sprite
   kenarı gölgeyle birlikte 250 ms'de yumuşar.
4. **Ölüm/çarpışma (#21):**
   - `hue-rotate` gibi filtreler iki durak arasında **sabit ara varyantlar
     olmadan** karıştırılıyor: `death-trail`'de 0° → 180° → 90° arası, DOM'daki gibi
     hue'yu "döndürmek" yerine iki uç renk karışıyor (orta kareler daha soluk olabilir).
   - Kaynak keyframe'lerde `death-lava` 0%'daki `brightness(1) drop-shadow(…)` ile
     40%'daki `brightness sepia hue-rotate drop-shadow` **liste türü uyuşmuyor**;
     tarayıcı bunu ayrık geçebilir. Burada yumuşak.
   - Opaklık (`alpha`) varlığın tüm çizimine uygulanıyor; yarı saydamken üst üste
     binen katmanlar (temel + renk varyantı + parlama) DOM'un grup opaklığından
     biraz **opak** çıkabilir (`alpha` 1'den uzaklaştıkça, ~%25'e kadar).
   - Parlama, gövdeyi tuvalin dışına çizip `shadowOffsetX` ile gölgesini içeri alma
     hilesiyle "yalnızca gölge" olarak üretiliyor (`haloVariantOf`). Bu, hedef
     WebView'lerde **denenmedi**; çalışmazsa parlama sessizce kaybolur, gövde ve
     renk etkilenmez.
5. **Bellek (analitik; ölçülmedi):** varyantlar tembel ve yalnızca ölüm/çarpışma
   anında üretilir. Bir temel sprite için en kötü durum: `death-forbidden` 2,
   `death-crushed` 2, `death-lava` 2 + 1 hale, `death-trail` 3 + 2 hale,
   `collision-shake` 1 → 10 renk + 3 hale. `legacy` oyuncu (94×94 css), DPR 2:
   renk varyantı ~138 KB, hale (+24 css) ~218 KB → tümü üretilirse ~2 MB; gerçekçi
   bir oyunda birkaç tanesi. Sayısal tavan konmadı (00-ilkeler §3.1); Faz 08'in
   profiler'ı `sprite N ~X MB`'yi zaten gösteriyor.
6. **Maliyet — geçiş sürerken `static` tam hızda çiziliyor** (buz/teleport 200/600 ms,
   oda 250 ms, trambolin 500 ms; sis 300 ms zaten böyleydi). Uzun bir buz kaymasında
   her hücre doluluğu değiştikçe süre yeniden başlıyor: kayma boyunca ve +200 ms `static`
   ~60 fps. Bu, "değişen yoksa çizim yok"un **sınırlı ve geçici** istisnasıdır ama
   düşük cihazda ölçülmeli (`lite` kademede de geçerli; `lite`ta yalnızca `ambient`
   kapalı). Gerekirse `lite`ta çapraz geçişi kapatmak (snap) tek satırlık bir karar —
   **proje sahibine soruyorum**, kendim değiştirmedim.
7. **Boşta oyuncu:** ambient döngüsü, animasyonlu hücre süsü olmayan bir bölümde de
   (yalnızca oyuncu için) 20 fps'te yoklama yapıyor; çizim yalnızca kırpma/nabız
   değişince olur ama ambient tuvali her yoklamada temizlenip (boş) yeniden çiziliyor.
   Isınma açısından ucuz; ölçülmedi.

---

## 5. Doğrulama (00-ilkeler §6)

| Kontrol | Komut | Sonuç |
|---|---|---|
| Tip denetimi | `npx tsc --noEmit` | ✅ hatasız |
| Testler | `npm test` | ✅ **46 dosya / 479 test** geçiyor (Faz 09: 422; +57: 5 yeni dosya (52) + `motion.test.ts` +5) |
| Lint (yeni kod) | `npx eslint src/game-engine/render` | ✅ çıktı boş, 0 sorun |
| Lint (yalnız `src`) | `npx eslint src` | ✅ **160 hata / 53 uyarı** — taban ile aynı |
| Lint (tüm repo) | `npm run lint` | ✅ **275 hata / 79 uyarı** — taban ile aynı |
| Android build | `npm run build:mobile` | ✅ çıkış 0; `Sync finished in 0.578s` |
| 00-ilkeler §2.1 | `grep -rn "shadowBlur\|ctx\.filter" src/game-engine/render/` | ✅ kod satırı yalnızca `paintTokens.ts:70` (`setShadow`) ve `variants.ts:82-83` (rasterleyici); `cells/dim.ts` artık `variants.ts`'i çağırıyor. Kare döngüsü dosyaları temiz |

---

## 6. Kabul kriterleri — durum

- [x] Boşta oyuncu `full` kademede göz kırpıyor ve neon halka nabız atıyor → **kodda ve testte**; cihazda görülmedi
- [x] `lite` kademede ve zafer sırasında boşta RAF planlanmıyor — **test kilitliyor** (`idle.test.ts`)
- [x] Ölüm ve çarpışmada renk ve parlama — kaynak keyframe değerleriyle; **DOM'la "aynı" iddiası yok** (§4.4)
- [x] Trambolin ezilmesi oynuyor → kodda; cihazda görülmedi (brightness hariç, §3)
- [x] Buz, teleport ve oda geçişleri DOM'daki sürelerle → kodda; cihazda görülmedi
- [x] Geçiş mekanizması tek yerde; sis geçişiyle aynı yolu kullanıyor (`keepAlive.ts`)
- [x] `grep` çıktısı yalnızca rasterleyicilerde
- [x] 00-ilkeler §3.4 güncellendi (§2.2 notu); §6 kontrolleri yeşil
- [x] `08-rapor.md` §7.5'te #3, #7, #9, #12, #19, #21 "düzeltildi" olarak işaretlendi
- [x] `raporlar/10-rapor.md` yazıldı

---

## 7. Elle kontrol (proje sahibi)

Canvas modu: oyun ekranının sağ üstündeki **DOM / CANVAS** anahtarı (geliştirme build'i).

1. Bir bölüm aç, **bekle**: karakter göz kırpıyor mu? Neon temada ters moddaki
   oyuncunun halkası nabız atıyor mu?
2. `setMotionTierOverride('lite')` ile aynısı; 30 sn Performance kaydı: çizelge
   **boş** mu? (Zafer koreografisi sırasında da boş.)
3. Bir oyuncuyu öldür (dört tür: yasak hücre, ezilme, lav kenarı, ize çarpma) ve iki
   oyuncuyu kafa kafaya çarptır: kızarma / griye dönme / yeşil-mavi parlama var mı?
   **`death-trail`'in renk döngüsünü ve lavda parlamayı özellikle DOM ile yan yana
   izle** (§4.4).
4. Bir trambolinden zıpla: yay ezilip uzuyor mu, kutu sabit mi? Dört yönde dene.
5. Buz hücresine gir/çık; teleport hücresine gir/çık; kontrol edilen odayı değiştir:
   geçişler yumuşak mı, DOM ile aynı sürede mi?
6. **Uzun bir buz kaymasında** performansı gözle ve Performance kaydıyla kontrol et
   (§4.6). Sorun görürsen `lite`ta çapraz geçiş kapatılır.

---

## 8. Sonraki faza not

- Faz 11 (otomatik geçiş) bu izden bağımsız; `render/README.md` "Geçişler" bölümü
  ve `KeepAlive` orada da geçerli.
- `TRACKS`'e yeni bir `filter` taşıyan keyframe eklenirse yalnızca `layers` + durak
  `fx`'i yazmak yeterli; çizim `entities/effects.ts`'te hazır.
- Yeni bir `transition`lı hücre tipi eklenirse: `cells/index.ts` `FADE_MS` tablosuna
  süre eklenir; gerisi (`observeCellFades`, çapraz geçiş, `KeepAlive`) otomatik.
