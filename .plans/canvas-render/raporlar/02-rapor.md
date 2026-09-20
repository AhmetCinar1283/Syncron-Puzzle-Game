# Faz 02 Raporu — Hücre Çizim Deseni: Tema Jetonları + İlk Dört Hücre

Tarih: 2026-09-20 · Dal: `refactor/architecture`

Bu faz `boardRenderer='canvas'` iken tahtaya **ilk gerçek içeriği** çizer: boş, engel,
yasak ve buz hücreleri. Varlıklar, iz, kablo, kenar şeritleri, oda çerçevesi ve sis
yoktur (sonraki fazlar).

> **Görsel doğrulama YAPILMADI.** Aşağıdaki "DOM'la yan yana ayırt edilemiyor" ve
> "buz ikonu nabız atıyor" kriterleri gerçek tarayıcıda gözle kontrol edilmeli (§6).
> Bu raporda görsel eşdeğerlik iddiası yoktur; yalnızca kaynak DOM dosyalarından
> değerlerin birebir taşındığı ve saf mantığın test edildiği iddia edilir.

---

## 1. Ne yapıldı

### Yeni dosyalar (`src/game-engine/render/`)

| Dosya | Satır | İçerik |
|---|---|---|
| `cssValues.ts` | 148 | **Saf** ayrıştırıcılar: `parseCssColor`, `parseBorder`, `parseBoxShadow`, `parseRadius`, `parseGradientStop`, `gradientEndpoints`, `splitTopLevel`, `toCss` |
| `paintTokens.ts` | 235 | Çizen yardımcılar: `roundRectPath`, `applyBackground`, `strokeBorder`, `innerShadow`, `outerShadows`, `outerGlow`, `paintBox`; `cssValues.ts`'i yeniden dışa aktarır |
| `paintTokens.test.ts` | 157 | 24 test — renk, kenar, gölge, yarıçap, gradient açısı |
| `cells/normal.ts` | 34 | `themeConfig.normalCell`'den |
| `cells/obstacle.ts` | 125 | 5 tema / 5 `styleType` |
| `cells/forbidden.ts` | 56 | 3 `hazardType`; `skull`/`close` ikonu `icons.ts`'ten |
| `cells/ice.ts` | 180 | Durağan gövde + animasyonlu ikon (ayrı sprite'lar) |
| `cells/index.ts` | 175 | `CELL_SPRITES`, `CELL_AMBIENT_SPRITES`, `drawCellsStatic`, `drawCellsAmbient`, `normal`'e düşme + tek seferlik `console.warn` |
| `cells/keys.test.ts` | 112 | 12 test — `key()` anahtarlaması |

### Değişen dosya

`BoardCanvas.tsx` (336 → 385 satır; Faz 01'de sınır aşımı zaten onaylıydı):

- `drawStaticLayer` → `drawCellsStatic`; `drawAmbientLayer` → `drawCellsAmbient`.
- **Tema değişiminde `cache.clear()` + `clearIcons()`** (01-rapor §6.7'nin zorunlu kıldığı).
- `static` katmanı artık yalnızca `rooms` referansına değil, **varlık doluluk imzasına**
  da bağlı (buz hücresi dolu/boş görünümü `rooms` değişmeden değişir).
- Ambient döngüsü: çizim canlı bir süs çizdiyse ve `ambientMode === 'on'` ise katman
  yeniden kirletilir. Hiç animasyonlu hücre yoksa veya mod `paused`/`off` ise döngü durur.
- `ambientMode` `off`↔diğer geçişinde `static` yeniden çizilir (süs iki katman arasında yer değiştirir).

### Kabul edilen tasarım kararları

- **Sprite anahtarları** yalnızca görüntüyü etkileyen alanları içerir:
  `normal|<tema>`, `obstacle|<tema>`, `forbidden|<tema>`,
  `ice|<tema>|occ<0|1>` (durağan), `ice|<tema>|occ<0|1>|p<faz>` (ambient).
  `cell.id`, `position`, `customData` girmez (`keys.test.ts` kanıtlar).
- **Buz ikonu ne zaman animasyonlu:** DOM'da `ice-icon-animated` sınıfı yalnızca
  `legacy` **dışındaki** temalarda **ve** hücre doluyken veriliyor. Diğer hallerde
  ikon durağandır ve `static` katmanındaki gövde sprite'ına dahildir; ambient'e
  yalnızca gerçekten animasyonlu olan girer.
- **`ambientMode === 'off'`:** ambient katmanı hiç çizilmediği için animasyonlu
  ikon, taban hâliyle (`scale 1`, `opacity 1` — DOM'da `animation: none`'un
  bıraktığı durum) `static` katmanına düşer. Yoksa ikon tamamen kaybolurdu.
- **Kontrol edilmeyen oda:** hücre bazında `globalAlpha = 0.4`.

---

## 2. Ne yapılmadı ve neden

- **Kalan 8 hücre tipi** (Faz 03). Kayıtta olmayan tip `normal` olarak çizilir ve
  tip başına bir kez `console.warn` verir.
- **Oda çerçevesi/başlığı, iz, kablo, kenar şeritleri, portal yolları** (Faz 04).
  Hücreler odanın kenar kalınlığı kadar içeriden konumlanır (DOM'un gerçek düzeni);
  çerçevenin kendisi henüz çizilmiyor.
- **Sis** (Faz 07). Tüm hücreler görünür çizilir; sisli seviyeler canvas modunda
  **yanlış görünecek**. Bilinerek bırakıldı.
- **Varlıklar ve efektler** (Faz 05–06).
- **`GameBoard.tsx` ve DOM çizicilerine dokunulmadı.**
- **Çizim testi yazılmadı** (00-ilkeler §6.1). `cache.size()` çalışma zamanında
  **ölçülmedi** — bkz. §5 "Kabul kriterleri".

---

## 3. Sözleşmeden sapmalar (proje sahibi bilmeli)

1. **`drawAmbientLayer` artık `boolean` dönüyor** (Faz 01'de "donmuş" imza `void`'di).
   Gerekçe: Faz 01 raporu §6.1 ambient döngüsünü "`drawAmbientLayer` sonunda
   `invalidate('ambient')`" ile sürdürmeyi öneriyordu, ama bu fonksiyon zamanlayıcıya
   erişemiyor. Dönüş değeri "canlı süs var mı" der; `BoardCanvas`'taki çizim geri
   çağrısı kararı verir. Çağıranlar için geriye dönük uyumlu (dönüş değeri
   yok sayılabilir). İstersen `void`'e geri alıp zamanlayıcıyı parametre olarak geçirebiliriz.
2. **`cssValues.ts` planda yok.** `paintTokens.ts` tek dosyada 325 satıra çıkıyordu
   (250 sınırı, 00-ilkeler §1). Saf ayrıştırıcılar ayrıldı; `paintTokens.ts` hepsini
   yeniden dışa aktarır, yani faz planı §4.1'in "her şey `paintTokens`'tan" sözleşmesi korunur.
3. **`easeInOut` (CSS `cubic-bezier(.42,0,.58,1)`) `cells/ice.ts` içinde.**
   00-ilkeler §3'te evi `motion.ts` (Faz 05). O dosya yok; tek kullanıcı burası
   olduğu için erken açılmadı. **Faz 05 taşımalı.**
4. **`themeConfig.obstacleCell` kullanılmıyor.** Bkz. §4.3.

---

## 4. Görsel farklar

### 4.1 `innerShadow` — bir YAKLAŞIMDIR

Canvas'ta `inset` gölge yok. İki durum ayrı ele alındı:

| CSS | Yöntem | DOM ile fark |
|---|---|---|
| `inset 2px 2px 0 c` (ofsetli, bulanıksız — obstacle, arcade normal vb.) | Kutunun ilgili kenarlarında `\|ofset\|` kalınlığında şerit | **Beklenen fark yok.** CSS'in ürettiği şeklin aynısı. Köşe yarıçaplı kutularda kırpma (`clip`) ile |
| `inset 0 0 Npx c` (ofsetsiz, bulanık — buz, yasak, neon/cosmic normal) | Dört kenardan içe doğru `N px` boyunca `c → saydam` **doğrusal** gradient | **Gerçek fark var.** CSS Gauss profili kullanır (kenarda yoğun, hızlı sönen kuyruk); burada doğrusal solma. Ayrıca dört gradient'in **köşelerde üst üste binmesi** köşeleri hafif koyultur |

Bu farkın **gözle kabul edilebilir olup olmadığına ben karar veremem** — 00-ilkeler §4
gereği yan yana karşılaştırma senin. Kabul edilemezse alternatif: iç gölgeyi
`shadowBlur` ile "ters maske" yöntemiyle çizmek (sprite rasterizasyonunda serbest);
köşe davranışı daha doğru olur ama kod daha karmaşık.

### 4.2 `backdrop-filter: blur(4px)` — buz hücresi (**proje sahibine soru**)

DOM'da buz hücresi `backdrop-filter: blur(4px)` taşıyor (`legacy` hariç). Canvas'ta
karşılığı **yok**. Faz planı geçici davranışı "yok say" olarak verdiği için **yok
sayıldı**. Gerekçe: hücrenin arkasında yalnızca `BoardCell`'in düz `#020617`
zemini var; bulanıklaştırılacak içerik yok, dolayısıyla görsel fark **teorik olarak
sıfır**. **Ancak:** oyuncu/kutu varlıkları buz hücresinin **üzerinde** çizildiği ve
DOM'da `backdrop-filter` yalnızca hücrenin *arkasını* etkilediği için Faz 05'te de
etkilenmeyecek. Bu yüzden **kalıcı olarak yok sayılmasını öneriyorum** — onay ver
veya farklı bir karar bildir.

### 4.3 Engel hücresi DOM'u `themeConfig.obstacleCell`'i hiç okumuyor

`obstacleCellRenderer.tsx` her temanın değerlerini kendi içinde sabit yazıyor ve bu
değerler `themeConfig.obstacleCell`'dekilerden **farklı** (ör. `legacy` için
`#162338` vs `themeConfig`'te gradient). 00-ilkeler §4 ("kaynak DOM dosyasındaki
değer birebir taşınır") gereği canvas DOM dosyasını izler. Sonuç: `themeConfig`
değişirse engel hücresi **hiçbir yolda** değişmez (zaten DOM'da da böyle). Bu
**kapsam dışı bir tutarsızlık**; düzeltilmedi.

### 4.4 Diğer küçük farklar

- **Neon engel dış parlaması** (`0 0 10px rgba(0,255,136,0.15)`): sprite 10 px
  büyütüldü (84×84) ve `shadowBlur` ile çizildi. Spesifikasyonda ikisinin de
  Gauss sigması `blur/2`; motor uygulamaları arasında küçük fark olabilir ve bu
  **gözle doğrulanmadı**. Çok düşük opaklıkta (0.15), fark görünmeyebilir.
- **`dashed` kenar** (blueprint buz/yasak): CSS tire uzunluğu tarayıcıya bağlı;
  `width × 3` tire/boşluk yaklaşımı kullanıldı. Tire **ritmi** DOM'dan ayrılabilir.
- **Sprite tuvali DPR'de ölçekli** olduğu için 1 px'lik kenarlar DPR 1'de keskin,
  DPR 1.5'te hafif yumuşak görünebilir — DOM da aynı şeyi yapar.
- **`transition: background/border-color/box-shadow 200ms`** (buz): canvas'ta yok;
  dolu↔boş geçişi ani. DOM'da 200 ms yumuşak.

---

## 5. Doğrulama (00-ilkeler §6)

| Kontrol | Komut | Sonuç |
|---|---|---|
| Tip denetimi | `npx tsc --noEmit` | **hatasız** (çıkış kodu 0) |
| Testler | `npm test` | **32 dosya / 247 test geçti** (Faz 01: 30 / 211 → +2 dosya, +36 test) |
| Lint (tüm repo) | `npm run lint` | **431 hata / 13240 uyarı** — tabanla **birebir aynı** |
| Lint (yalnız `src`) | `npx eslint src` | **154 hata / 52 uyarı** — tabanla birebir aynı |
| Lint (yeni kod) | `npx eslint src/game-engine/render` | **çıktı boş, 0 sorun** |
| Android build | `npm run build:mobile` | **`cap sync` bitti** — `Sync finished in 1.593s`, 5 eklenti |
| `shadowBlur`/`ctx.filter` | `grep -rn "shadowBlur\|ctx\.filter" src/game-engine/render/` | Yalnızca `paintTokens.ts:191,213` (kod) ve `spriteCache.ts:5` (yorum) — **beklenen dosyalar** |

### Kabul kriterleri

- [x] `paintTokens.ts` §4.1'deki yardımcıları veriyor; `paintTokens.test.ts` geçiyor.
      (`applyBackground`, `parseBorder`, `strokeBorder`, `roundRectPath`,
      `innerShadow`, `outerGlow`, `parseCssColor` — hepsi `paintTokens`'tan erişilebilir.)
- [ ] **Beş temada canvas ↔ DOM ayırt edilemiyor** — **gözle doğrulanmadı.**
- [ ] **Buz ikonu ambient'te nabız atıyor; `off` iken duruyor** — **gözle doğrulanmadı.**
      Mantık: `pulseAt` 12 faza örnekliyor, `BASE_PHASE` durağan hali veriyor,
      `off`↔diğer geçişi `static`'i yeniden çizdiriyor.
- [ ] **100 hücrelik tahtada `cache.size() < 20`** — **ÖLÇÜLMEDİ, hesaplandı.**
      Tek temada en kötü durum: `normal` 1 + `obstacle` 1 + `forbidden` 1 + buz
      durağan ≤ 2 (`occ0`/`occ1`) + buz ambient ≤ 12 (yalnızca `occ1` animasyonlu) +
      `off` modu taban sprite'ı 1 = **≤ 18**. `cell.id`/`position` anahtara girmediği
      için hücre sayısından bağımsız. **Gerçek sayıyı tarayıcıda ölçmek gerek** (§6).
      Not: ikon henüz yüklenmemişken `forbidden`/`ice` sprite'ları önbelleğe
      **yazılmaz**, yani ilk karelerde sayı daha da düşüktür.
- [x] `grep shadowBlur|ctx.filter` yalnızca izin verilen dosyalarda.
- [x] 00-ilkeler §6 tablosundaki dört kontrol yeşil.
- [x] `raporlar/02-rapor.md` yazıldı; `innerShadow` ve `backdrop-filter` §4'te.

---

## 6. Elle kontrol (proje sahibi)

```js
localStorage.setItem(`${localStorage.getItem('activeUserId') ?? 'anon'}:boardRenderer`, 'canvas');
location.reload();
```

1. Tema seçiciden **5 temayı** dolaş; her birinde `canvas` ↔ `dom` karşılaştır
   (`dom` için değeri `'dom'` yap). Özellikle: buz **dolu/boş**, engel **iç karesi**
   (neon'da parlama, blueprint'te CAD artısı), yasak simgesinin parlaması.
2. Buz hücresine oyuncu girince (dolu) ikon nabız atmalı; ikon `legacy` temasında
   **hiç** atmamalı (DOM'da da atmıyor).
3. DevTools → Performance: oyuncu kıpırdamazken **üzerinde varlık olan (dolu) buz
   hücresi varsa** ~20 fps ambient çizimi görünür (beklenen); **yoksa** boşta kare
   **olmamalı** (boş buz hücresi animasyonlu değildir, döngüyü sürdürmez).
4. Konsolda `cache.size()` için geçici olarak `BoardCanvas.tsx` içinde
   `console.log(cache.size())` ekleyip 100 hücrelik bir bölümde sayıyı oku; rapora yaz.
5. Konsolda `[render/cells] 'portal' için canvas rasterleyicisi yok` gibi uyarılar
   **beklenen** (Faz 03 kalan hücreler).

---

## 7. Sonraki faza (03) not

1. **Desen (her hücre için aynısı):**
   - `cells/<tip>.ts` bir `SpritePainter<CellPaintInput>` verir; `key()` yalnızca tip,
     tema, görüntüyü etkileyen alanlar.
   - Değerleri **DOM dosyasından** kopyala (`themeConfig` okuyorsa `themeConfig`'ten).
   - Kutular için `paintBox(ctx, box, { background, border, boxShadow, borderRadius })`.
     Boyama sırası dış gölge → arka plan → iç gölge → kenar.
   - Taşan parlama varsa `size()` büyüt ve `draw` içinde `ctx.translate(pad, pad)`;
     `cells/index.ts` blit'te ortalıyor.
   - İkon için `getIcon(...)`; `null` ise **`return false`** (önbelleğe alınmaz).
2. **Animasyonlu süs = iki sprite:** durağan gövde `CELL_SPRITES`'a, animasyonlu
   parça `CELL_AMBIENT_SPRITES`'a (`painter`, `isAnimated`, `periodMs`). Gövde ikonu
   **içermez**; `isAnimated` false ise süs gövdeye dahil çizilir (buzun `legacy`
   hali örneği — `ice.ts`).
3. **`BASE_PHASE`** (`-1`): `ambientMode==='off'` iken animasyon durur ve öğe taban
   stiline döner. Her yeni süs bu fazı **anlamlı bir taban görünümle** karşılamalı
   (`cells/ice.ts` → `pulseAt`).
4. **`easeInOut`** `cells/ice.ts`'te; Faz 05'te `motion.ts`'e taşınmalı, portal/konveyör
   de kullanabilir.
5. **Sis açık uç (01-rapor §6.6):** `static` katmanı artık `rooms` + tema + **varlık
   doluluk imzası**na bağlı. Sis oyuncu konumuna bağlı ve `rooms` değişmeden
   değişebilir; Faz 07 ayrı sinyal ekleyecek ya da sisi `actors`'a taşıyacak.
   Doluluk imzası mekanizması (`occupancySignature`) bunun için bir örnek olabilir.
6. **`isOccupied` semantiği:** bu kare **veya** önceki karede üzerinde varlık olan
   hücre (`prevEntities` dahil) — DOM'daki `entityOnCell !== null ||
   prevEntityOnCell !== null` ile aynı. Sis altında yalnızca oyuncu sayıldığı kural
   Faz 07'ye ait; şimdilik **tüm** varlıklar sayılıyor.
7. **Performans notu:** `forEachCell` her çizimde `occupiedKeys` kuruyor (tick başına
   bir `Set`). Ambient 20 fps'te bu, her ambient karede yeniden hesaplanır. 100
   hücre / 2 varlık için ihmal edilebilir; Faz 08 ölçümünde bakılmalı, gerekirse
   sahne başına bir kez hesaplanıp `BoardScene`'e konabilir.
