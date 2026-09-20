# 04 — Overlay Katmanları: İz, Kablo, Kenar, Portal, Oda Çerçevesi

> Bağlayıcı: `.plans/canvas-render/00-ilkeler.md`. Önce `raporlar/02-rapor.md` ve
> `raporlar/03-rapor.md` oku.
> **Model: sonnet.** Hücre deseninin aynısının farklı bir geometriye uygulanması.

---

## 1. Okuyacağın dosyalar

| Dosya | Neden |
|---|---|
| `.plans/canvas-render/00-ilkeler.md`, `raporlar/03-rapor.md` | Sözleşme ve devir |
| `src/game-engine/render/cells/common.ts` | Faz 03'ün paylaşılan yardımcıları — `clipCell`, `drawText`, `strokeArc`, `strokeDashedRect`, `cssBezier`. **Yeniden yazma, kullan.** |
| `src/game-engine/render/cells/index.ts` | `occupancySignature` deseni — §2.8'de gerekecek |
| `src/game-engine/render/paintTokens.ts`, `spriteCache.ts`, `types.ts` | Altyapı |
| `src/game-engine/render/cells/ice.ts` | Durağan + ambient ayrımının referansı |
| `src/game-engine/components/board/RoomOverlays.tsx` | İz ve kablo katmanlarının kaynağı |
| `src/game-engine/components/GameBoard.tsx` | `renderEdgeStrip`, `renderEdgeLabel`, oda çerçevesi/başlığı, `connectionPaths` — hepsi burada |
| `src/game-engine/components/board/boardKeyframes.ts` | `edge-slide-*`, `edge-glow-pulse`, `label-breath`, `portal-spin`, `crawlPath` keyframe'leri |
| `src/game-engine/components/playerColors.ts` | `getPlayerColor` |
| `src/game-engine/logic/engine/rooms.ts` | `routePortalPath` — portal yolunun SVG `d` dizgisi |

---

## 2. Yapılacaklar — `render/overlays.ts`

Hepsi `static` katmanına çizilir; **istisna** §2.4 ve §2.5'teki animasyonlu parçalar,
onlar `ambient` katmanına gider.

### 2.1 Oda çerçevesi ve başlığı

`GameBoard.tsx`'te her odanın sarmalayıcı `div`'i: `themeConfig.board.border(isControlled)`,
`boxShadow(isControlled)`, `background`, `borderRadius`, ve `opacity: isControlled ? 1 : 0.4`.
Üstünde `-20px` konumunda oda adı (10px, 700 ağırlık, `#00c4ff` / `#475569`).

Canvas'ta: `paintTokens` yardımcılarıyla dolgu + kenar; metin `ctx.fillText`
(`letterSpacing: 0.08em` karşılığı için `ctx.letterSpacing` destekleniyorsa kullan,
desteklenmiyorsa harf harf çizme — farkı rapora yaz).

`opacity` için katmanın tamamına `globalAlpha` **verme**; oda başına `save()/restore()`
arasında ver, aksi halde başka odalar da soluklaşır.

Oda çerçevesi bir sprite **değildir** (boyutu odaya göre değişir, önbelleğe almak
faydasız). Doğrudan çiz.

### 2.2 İz (trail) katmanı

`RoomTrailsImpl`'in birebir portu. Hücre başına: komşuluk durumuna göre 4 kol
(`left/right/up/down`, 32×6 veya 6×32 piksel) + merkezde 14×14 beyaz nokta,
3px oyuncu renginde kenar. Parlama: `0 0 8px color, 0 0 16px glow` ve merkez için
`0 0 10px, 0 0 20px`.

Kol ve nokta **sprite olarak önbelleğe alınır**: anahtar
`trail|<playerIndex>|<yön>` ve `trailnode|<playerIndex>`. Oyuncu sayısı ≤ 6 olduğu için
önbellek en fazla 6×4 + 6 = 30 girdi. Parlamalar rasterizasyonda çizilir; kare
döngüsünde yalnızca blit (00-ilkeler §2.1).

Komşuluk mantığını (`hasLeft`, `isPlayerLeft` vb.) kaynaktan **birebir** taşı —
oyuncunun kendi hücresine bitişik iz kolunun çizilmesi buna bağlı.

### 2.3 Kablo katmanı

`RoomCablesImpl`'in birebir portu. `right`/`down` bağlantıları için 64×2 ve 2×64
şerit (`rgba(251,191,36,0.85)`, `0 0 4px rgba(234,179,8,0.6)`) + 4×4 beyaz düğüm.
Katman opaklığı `isCurrentlyVisible ? 0.65 : 0.15` — sis Faz 07'de gelecek, şimdilik
`0.65` sabit.

Bu da sprite: `cable|h`, `cable|v`, `cablenode`. Üç girdi, hepsi bu kadar.

### 2.4 Kenar şeritleri (`renderEdgeStrip`)

Üç durum var:

- **`wall`**: düz `rgba(30,58,138,0.4)` şerit. Durağan, `static` katmanı.
- **`lava` / `portal`**: 4px kalınlığında akan gradient + dış parlama + `edge-glow-pulse`
  opaklık nabzı. Bu **animasyonlu** → `ambient` katmanı.

Akan gradient bugün 3 kat uzunlukta bir katmanın `transform` ile kaydırılmasıyla
yapılıyor (`edge-slide-horiz/vert`, %0 → %-66.667 → %0, 4s/3s). Canvas'ta: 3 kat
uzunlukta bir sprite'ı bir kez rasterize et, kare döngüsünde `drawImage` kaynağını
faza göre kaydırarak çiz. Bu, 00-ilkeler §3.2'deki faz örneklemesinin doğal hâli ve
12 ayrı sprite gerektirmez — **tek sprite, kayan kaynak dikdörtgeni.** Bu istisnayı
kullan ve rapora yaz.

`edge-glow-pulse` (0.85 → 1 → 0.85 opaklık) `globalAlpha` ile faz başına hesaplanır;
sprite'a girmez.

### 2.5 Kenar etiketleri (`renderEdgeLabel`)

24×24 daire, tema rengine göre arka plan/kenar/ikon (`skull` veya `portal`),
`label-breath 2.5s` (scale 1 → 1.15 → 1, opacity 0.82 → 1) ve portal ikonunda ek
`portal-spin 6s`.

Daire + ikon tek sprite (2 varyant: lava, portal). Nefes ve dönüş kare döngüsünde
`translate/scale/rotate` + `globalAlpha` ile — hepsi 00-ilkeler §2.1'in izin verdiği
çağrılar. `ambient` katmanı.

### 2.6 Portal bağlantı yolları

`GameBoard.tsx`'teki `connectionPaths`: `routePortalPath(...)` bir SVG `d` dizgisi
döndürüyor, iki kez çiziliyor — kalın bulanık alt katman (`rgba(168,85,247,0.4)`,
6px, `filter: blur(4px)`) ve ince kesikli üst katman (`#c084fc`, 2.5px,
`strokeDasharray 6,6`, `crawlPath 1.2s` ile `stroke-dashoffset: -20`).

Canvas'ta `new Path2D(d)` SVG yol dizgisini doğrudan kabul eder — `d`'yi elle
ayrıştırma. Bulanık alt katman **bir kez** bir sprite'a rasterize edilir
(`shadowBlur` orada serbest); üst katman `ctx.setLineDash([6,6])` +
`ctx.lineDashOffset` ile her ambient karesinde çizilir. `lineDashOffset`'i zamandan
hesapla; bu ucuz bir stroke, sprite gerekmez.

Yollar oda düzeni değişmedikçe sabit olduğundan, bulanık sprite'ın anahtarı
`portalpath|<connectionKey>` olsun ve `rooms` referansı değişince
`spriteCache.clear()` **çağırma** — tema değişmediği sürece geçerliler.

### 2.7 `drawStaticLayer` / `drawAmbientLayer` güncellemesi

Çizim sırası (alttan üste), `static`:
oda arka planı ve çerçevesi → hücreler → kablolar → izler → `wall` kenar şeritleri →
oda başlığı.

`ambient`: lava/portal kenar şeritleri → kenar etiketleri → portal bağlantı yolları →
hücre süsleri.

> Bugün DOM'da izler `zIndex: 5`, kablolar `zIndex: 6`. Yani **kablolar izlerin
> üstünde.** Yukarıdaki sırayı buna göre düzelt ve kaynaktaki `zIndex` değerlerini
> teyit et — tahmin etme.

### 2.8 `static` katmanının geçersizleştirme sinyali genişliyor

Faz 02 `static`'i `rooms` referansına **ek olarak** bir varlık doluluk imzasına
bağladı (`occupancySignature`), çünkü buz hücresinin dolu/boş görünümü `rooms`
değişmeden değişiyor. İz katmanı aynı sorunu daha güçlü yaşıyor: iz kolları
oyuncunun **komşu hücrede olup olmadığına** bakıyor (`isPlayerLeft` vb.), yani
oyuncu kıpırdadığında `rooms` değişmeden iz görüntüsü değişir.

`RoomOverlays.tsx` bunu `playersSignature(entities)` ile çözüyor. Aynı imzayı
kullan — `boardIndex.ts`'ten hazır geliyor, yeniden yazma. `static` katmanının
sinyali bu fazdan sonra: `rooms` referansı **veya** tema **veya** doluluk imzası
**veya** oyuncu imzası.

Bunları tek bir yerde birleştir (`BoardCanvas` içindeki mevcut karşılaştırma
noktası); her fazın kendi sinyalini ayrı bir `useRef` ile eklemesi dağınıklaşıyor.

---

## 3. Kapsam dışı

- Varlıklar, hareket, efektler, zafer (Faz 05–06).
- Sis / `explored` mantığı (Faz 07). Şimdilik her şey görünür çizilir.
- İpucu işareti (`HintBoardMarker`) — DOM'da kalıyor, Faz 07'nin köprüsü.
- `paintTokens.ts`'e yeni yardımcı eklemek — gerekiyorsa dur ve sor.

---

## 4. Kabul kriterleri

- [ ] `overlays.ts` §2'deki altı katmanı çiziyor ve 250 satırı geçmiyorsa tek dosya,
      geçiyorsa `overlays/` altında mantıklı parçalara bölünmüş.
- [ ] Çok odalı, portal kenarlı, lav kenarlı, izli ve kablolu bir bölüm canvas ve DOM
      modlarında yan yana ayırt edilemiyor (varlıklar hariç).
- [ ] Akan kenar gradienti ve kesikli portal yolu DOM'dakiyle **aynı hızda** akıyor.
- [ ] Kontrol edilmeyen oda sadece kendisi soluk; diğer odalar etkilenmiyor.
- [ ] `cache.size()` ölçüldü ve **rapora yazıldı**. Sayısal tavan yok
      (00-ilkeler §3.1 bütçe kararı); denetlenen şey anahtarlama kuralıdır:
      `key()` içinde `cell.id`, `position` veya görüntüyü etkilemeyen
      `customData` **olmayacak** ve bunu bir test kilitleyecek.
- [ ] `grep -rn "shadowBlur\|ctx\.filter" src/game-engine/render/overlays*` çıktısı
      yalnızca sprite rasterleyici fonksiyonların içinde.
- [ ] 00-ilkeler §6 tablosundaki dört kontrol yeşil.
- [ ] `raporlar/04-rapor.md` yazıldı.

---

## 5. Elle kontrol (proje sahibi)

- İzlerin oyuncuya bitiştiği yerdeki kol doğru çiziliyor mu?
- Lav kenarındaki akış yönü DOM'dakiyle aynı mı (ters akıyor olabilir — bak)?
- İki odalı bir portal bölümünde bağlantı çizgisi doğru yerden doğru yere gidiyor mu?
