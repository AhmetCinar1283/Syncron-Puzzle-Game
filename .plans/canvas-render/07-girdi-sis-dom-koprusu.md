# 07 — Sis, Girdi ve DOM Köprüsü

> Bağlayıcı: `.plans/canvas-render/00-ilkeler.md`. Önce `raporlar/06-rapor.md` oku.
> **Model: sonnet.** Mevcut mantığın canvas tarafına bağlanması; yeni mimari karar yok.

Bu faz, canvas yolunun **eksik kalan son parçalarını** kapatır. Faz 02'den beri
bilinçli olarak ertelenen sis burada geliyor.

---

## 1. Okuyacağın dosyalar

| Dosya | Neden |
|---|---|
| `.plans/canvas-render/00-ilkeler.md`, `raporlar/06-rapor.md` | Sözleşme ve devir |
| `src/game-engine/components/board/boardIndex.ts` + `boardIndex.test.ts` | `isCellVisible`, `playersIn`, `playersSignature` — **yeniden yazma, kullan** |
| `src/game-engine/components/board/BoardCell.tsx` | `isExplored` / `isCurrentlyVisible` / `fogKeepRevealed` mantığının bugünkü tanımı |
| `src/game-engine/components/GameBoard.tsx` | Varlık görünürlüğü ve `opacity` kuralları |
| `src/game-engine/components/board/RoomOverlays.tsx` | `explored()` yardımcısı ve iz/kablo opaklıkları |
| `src/game-engine/components/play-screen/hint/HintBoardMarker.tsx` | Board koordinatlarında DOM çizen katman |
| `src/game-engine/components/play-screen/BoardArea.tsx` | `boardOverlay` girişi |
| `src/game-engine/components/PlayScreen.tsx` | Swipe girdisinin bugün nereye bağlandığı |

---

## 2. Yapılacaklar

### 2.1 Sis (fog of war)

Bugünkü üç ayrı davranış canvas'a taşınır:

| Durum | Bugünkü DOM davranışı | Canvas karşılığı |
|---|---|---|
| Keşfedilmemiş hücre | `#020617` dolu kare, `1px solid rgba(30,58,138,0.05)` kenar | Hücre sprite'ı yerine bu kare çizilir |
| Keşfedilmiş ama şu an görünmeyen | `filter: brightness(0.3) contrast(0.8)`, 0.3s geçişli | Hücre sprite'ının **karartılmış varyantı** — ayrı sprite, anahtara `dim` eklenir |
| Görünür | Normal | Normal |

`brightness(0.3) contrast(0.8)` sprite rasterizasyonunda `ctx.filter` ile
uygulanabilir (00-ilkeler §2.1 rasterizasyonda serbest bırakıyor). Destek yoksa
karartma, sprite üstüne `globalAlpha`'lı siyah dikdörtgen ile taklit edilir —
hangisini kullandığını rapora yaz.

**0.3s geçiş:** bugün CSS `transition: filter 0.3s`. Canvas'ta hücre başına geçiş
durumu tutmak, 100 hücre için 100 zamanlayıcı demek. Bunun yerine: sis durumu
değiştiğinde `static` katmanı 300ms boyunca kirli tutulur ve iki varyant arasında
`globalAlpha` ile geçilir. Tek bir küresel ilerleme değeri yeter — hücreler zaten
aynı anda değişiyor (oyuncu hareket ettiğinde).

> Bu bir basitleştirme: bugün her hücre kendi geçişini bağımsız yürütüyor ama pratikte
> hepsi aynı anda tetikleniyor, dolayısıyla görünürde fark olmamalı. Yine de yan yana
> bak ve farkı rapora yaz.

İz ve kablo katmanlarının opaklıkları da sise bağlı (`RoomOverlays.tsx`'teki
`opacity: isCurrentlyVisible ? 1.0 : 0.2` ve `0.65 : 0.15`). Faz 04'te sabit
bırakılmışlardı; burada gerçek değerlerine bağlanır.

**Geçersizleştirme sinyali.** Sis durumu oyuncu konumuna bağlı ve `rooms`
değişmeden değişir — bu açık uç 01-rapor §6.6'dan beri buraya erteleniyor.
Çözüm mevcut: Faz 02 `occupancySignature`, Faz 04 `playersSignature` ile
`static` katmanının sinyalini zaten genişletti. Sis de **aynı birleşik sinyale**
bir terim olarak eklenir; ayrı bir mekanizma kurma, sisi `actors` katmanına da
taşıma.

Varlık görünürlüğü: `GameBoard.tsx`'teki kural — oyuncular sis altında **her zaman**
görünür, diğer varlıklar `isCellVisible`'a tabi.

### 2.2 Girdi

Swipe bugün `BoardArea`'nın kendi `onTouchStart/Move/End` işleyicilerinde ve tahtadan
bağımsız. Canvas tuvalleri `pointerEvents: 'none'` olduğu için **hiçbir değişiklik
gerekmiyor** — bunu doğrula ve rapora yaz.

Tahtada hücreye tıklama/isabet testi oynanışta kullanılmıyor (editör ayrı bir yol).
Yeni bir isabet testi **kurma**. Gerekiyorsa dur ve sor.

### 2.3 İpucu işareti köprüsü

`HintBoardMarker` board'un native koordinatlarında DOM çiziyor ve `BoardArea`'ya
`boardOverlay` olarak geçiliyor. Canvas modunda da **aynen böyle kalır** — canvas'a
port edilmez.

Tek gereken: `BoardArea`'nın `boardOverlay`'i, `GameBoard` yerine `BoardCanvas`
çizildiğinde de aynı sarmalayıcı içinde ve aynı z-sırasında durmalı. Faz 01'de
bağlandı; burada **doğrula** ve ipucunun canvas modunda doğru hücreyi işaretlediğini
gör.

### 2.4 Erişilebilirlik ve yedek

Canvas ekran okuyucuya görünmez. Bugünkü DOM tahtası da anlamlı bir erişilebilirlik
ağacı sunmuyor (hücreler `div`, `aria` yok), dolayısıyla **gerileme yok**.

Yine de iki şey yap:

- Tuvallere `role="img"` ve seviye adını içeren bir `aria-label` ver.
- `canvas.getContext('2d')` `null` dönerse (çok eski WebView, GPU sorunu)
  `BoardCanvas` sessizce `GameBoard`'a düşsün. Bu bir emniyet kemeri; Faz 08'de
  varsayılan canvas olduğunda tek koruma bu olacak.

### 2.5 Devralınan iş: vignette sprite'ı küçültülür (06-rapor §4.1)

Faz 06, zafer vignette'ini plandaki gibi tek sprite yaptı ve 640×640 bir tahtada
**7,91 MB** ölçtü — önbelleğin tek başına en pahalı girdisi. Ajan kendi başına
değiştirmedi, doğru yaptı. Karar (proje sahibi):

- Vignette **yarı çözünürlükte** rasterize edilir ve blit sırasında `drawImage`'in
  hedef boyutuyla iki katına ölçeklenir. Düz bir radial gradient olduğu için
  yüksek frekanslı detayı yok; gözle ayırt edilemez, bellek **1,98 MB**'a iner.
  `ctx.imageSmoothingEnabled` açık kalsın.
- Vignette **tek yuvalıdır**: tahta boyutu değişince eski vignette sprite'ı
  önbellekten **silinir**, yenisi yazılır. Bu, 00-ilkeler §3.1'deki "ayıklama yok"
  kararının bilinçli tek istisnası ve gerekçesi o kararın kendi gerekçesidir:
  ayıklama yasağı "animasyon sürerken yeniden rasterizasyon tetiklenmesin" diye
  konmuştu; vignette ise koreografi **başlamadan** üretiliyor. Bu istisnayı
  `victory.ts` içinde bir yorumla belgele; genel bir ayıklama mekanizması **kurma**.
- Faz 08'in 20MB eşiği yine de aşılırsa yedek çözüm hazır: vignette'i sprite
  yapmayıp, önbelleğe alınmış bir `CanvasGradient` nesnesiyle `fillRect` etmek.
  Şimdi yapma — ölçüm bunu gerektirirse Faz 08 yapar.

### 2.6 Ölçüm kancası — `render/profiler.ts` (Faz 08'den öne alındı)

Bu faz canvas yolunun son eksiğini kapatıyor; bitince oyun canvas modunda **baştan
sona oynanabilir** olacak. Proje sahibinin ölçüm yapabilmesi için ölçüm aracının da
o anda hazır olması gerekiyor, yoksa Faz 08'e kadar hiçbir sayı üretilemiyor.
Bu yüzden `profiler.ts` bu faza alındı.

```ts
/** `userStorage`'da `boardProfiler='1'` iken açılır. Kapalıyken sıfır maliyet. */
export function isProfilerEnabled(): boolean;
export function recordFrame(layer: LayerName, ms: number): void;
export function frameStats(): { layer: LayerName; avg: number; p95: number; count: number }[];
```

`BoardCanvas`, profiler açıkken tahtanın köşesinde küçük bir DOM katmanı gösterir:
katman başına ortalama ve p95 kare süresi, saniyedeki çizim sayısı, `cache.size()`
ve yaklaşık sprite belleği (Faz 08 §2.5b formülü).

**Kapalıyken hiçbir `performance.now()` çağrısı yapılmamalı** — ölçümün kendisi
ölçtüğü şeyi bozmasın. `isProfilerEnabled()` bir kez okunup modül seviyesinde
saklanır. Bayrağın nasıl açılacağını rapora **tek satırlık komut** olarak yaz
(tarayıcı konsolundan çalıştırılabilir hâlde).

### 2.7 `LevelMiniPreview` ve editör — dokunma

00-ilkeler §5 gereği bu iz oynanış tahtasıyla sınırlı. Bu fazda da öyle.
Önizlemelerin yavaş olduğu görülürse rapora yaz, düzeltme.

---

## 3. Kapsam dışı

- Yeni isabet testi veya tıklamayla oynama.
- `HintBoardMarker`'ı canvas'a taşımak.
- Editör, menü, önizleme.
- DOM çizicilerinde herhangi bir değişiklik.

---

## 4. Kabul kriterleri

- [ ] Sisli bir bölüm canvas ve DOM modlarında yan yana ayırt edilemiyor:
      keşfedilmemiş kareler, karartılmış kareler, görünür kareler, izler, kablolar.
- [ ] `fogKeepRevealed: false` olan bir seviyede de davranış aynı.
- [ ] Sis altında oyuncu görünür, kutular görünmez.
- [ ] Swipe canvas modunda DOM modundaki gibi çalışıyor; hiçbir işleyici değişmedi.
- [ ] İpucu işareti canvas modunda doğru hücreyi ve doğru yönü gösteriyor.
- [ ] `getContext('2d')` `null` simüle edildiğinde oyun `GameBoard` ile açılıyor,
      çökmüyor.
- [ ] `cache.size()` sis varyantlarıyla birlikte ölçüldü ve **rapora yazıldı**.
      Sayısal tavan yok (00-ilkeler §3.1 bütçe kararı). Ama dikkat: `dim` varyantı
      **her** hücre sprite'ını ikiye katlar. Karartmayı sprite varyantı yerine
      blit sırasında üstüne `globalAlpha`'lı siyah dikdörtgenle yapmak önbelleği
      iki kat küçültür — hangisini seçtiğini gerekçesiyle rapora yaz.
- [ ] Vignette yarı çözünürlükte (§2.5); yeni ölçülen bellek rapora yazıldı.
- [ ] Vignette tek yuvalı; tahta boyutu değişince eskisi siliniyor, genel bir
      ayıklama mekanizması **kurulmadı**.
- [ ] `profiler.ts` yazıldı (§2.6); kapalıyken ölçüm yapmıyor, açıkken katman
      başına avg/p95/sayı + `cache.size()` + yaklaşık bellek gösteriyor.
      Açma komutu rapora tek satır olarak yazıldı.
- [ ] 00-ilkeler §6 tablosundaki dört kontrol yeşil.
- [ ] `raporlar/07-rapor.md` yazıldı; sis geçişi basitleştirmesinin (§2.1) görsel
      sonucu içinde.

---

## 5. Elle kontrol (proje sahibi)

- Sisli bir bölümde hareket et: karartma geçişi DOM'daki kadar yumuşak mı?
- İpucunu canvas modunda aç: halka ve ok doğru yerde mi?
