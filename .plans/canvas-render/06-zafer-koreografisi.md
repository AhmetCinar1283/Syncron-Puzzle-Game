# 06 — Zafer Koreografisinin Canvas Portu

> Bağlayıcı: `.plans/canvas-render/00-ilkeler.md`. Önce `raporlar/05-rapor.md` oku.
> **Model: opus.** Üç aşamalı koreografi matematiği, hayalet izler ve 36 parçacık;
> hepsi zamana bağlı ve hepsi birbirine geçmiş. Yanlış port = oyunun en sevilen anı bozulur.

**Proje sahibinin bu animasyona özel talimatı var: görüntü olabildiğince
değişmeyecek.** Bu faz bir yeniden tasarım değil, birebir porttur. Bir şeyi
"daha iyi" yapma isteği gelirse yapma, rapora yaz.

---

## 1. Okuyacağın dosyalar

| Dosya | Neden |
|---|---|
| `.plans/canvas-render/00-ilkeler.md`, `raporlar/05-rapor.md` | Sözleşme ve devir |
| `src/game-engine/components/effects/VictoryCelebration.tsx` | **Tek kaynak.** 695 satır; tamamını oku |
| `src/game-engine/render/entities.ts`, `motion.ts`, `entityMotion.ts` | Faz 05'in ürettiği oyuncu sprite'ı ve easing — yeniden yazma, kullan |
| `src/game-engine/components/GameBoard.tsx` | `isVictoryActive`, `ambientMode='off'`, `VICTORY_CELEBRATION_DURATION` zamanlaması |
| `src/game-engine/components/board/boardKeyframes.ts` | `[data-victory-freeze]` kuralı — canvas'ta karşılığı kalmayacak, §4.4 |

---

## 2. Mevcut durum — port ederken koruyacakların

`VictoryCelebration.tsx` şu anda şöyle çalışıyor (bunlar birer **tespit**, kodda
doğrula):

- `VICTORY_CELEBRATION_DURATION = 1750`, `TRAIL_SLOTS = 3`, `PARTICLE_BOX = 64`.
- Üç aşamalı koreografi: 0–0.18, 0.18–0.82, 0.82–1.0 normalize ilerleme.
- Her oyuncu için 1 ana grafik + 3 hayalet iz kopyası; hepsi `blur()` + `drop-shadow()`
  arkasında.
- 36 parçacık, her biri kendi `div` katmanında, `translate3d + rotate` ile taşınıyor;
  şekiller (yıldız / parıltı / daire) sabit SVG çocukları.
- İki süpernova şok dalgası `<circle>`, `r` niteliği her karede yazılıyor,
  `drop-shadow` parlaması 12px/8px sabit.
- `entityStatesRef` ve `burstStateRef` ile kare dışı durum; React'e yalnızca bitişte
  tek `setTick`.
- Bitince `if (isCompletedRef.current) return null;`.

Bu koreografi bir önceki performans turunda zaten elden geçti: parçacıklar compositor
katmanlarına alındı, `[data-victory-freeze]` ile blur katmanı önbelleklenebilir kılındı.
**Canvas portu bu düzeltmelerin hepsini gereksiz kılar** — sprite atlası ve blit,
aynı işi daha ucuza yapar.

---

## 3. Hedef

`render/victory.ts` — `drawActorsLayer` içinden çağrılan, zafer aktifken oyuncuları
ve tüm efektleri çizen tek modül. DOM `VictoryCelebration` **silinmez**, canvas
modunda çizilmez (Faz 08'e kadar iki yol da yaşar).

---

## 4. Yapılacaklar

### 4.1 Durum ve zaman

React state yok. Zafer başladığı an (`scene`'den gelen bir damga) ve `now` yeterli:

```ts
export interface VictoryState {
    startedAt: number;
    /** Oyuncu başına hayalet iz halkası — son TRAIL_SLOTS konumu. */
    trails: Map<number, { x: number; y: number; rot: number; scale: number }[]>;
    particles: Particle[];   // kaynak dosyadakiyle aynı alanlar
}
export function createVictoryState(scene: BoardScene, now: number): VictoryState;
export function drawVictory(ctx, state: VictoryState, scene: BoardScene, now: number): boolean;
```

`drawVictory` `false` döndürdüğünde koreografi bitmiştir; çağıran artık çizmez ve
`actors` katmanını temizler.

Üç aşamanın ilerleme matematiğini kaynak dosyadan **birebir** taşı: aynı eşikler,
aynı easing, aynı yarıçap/açı formülleri. Sayıları yeniden türetme.

### 4.2 Oyuncu ve hayalet izler

Faz 05'in oyuncu sprite'ını kullan. Her kopya için kare döngüsünde yalnızca
`translate` + `rotate` + `scale` + `globalAlpha`.

**Bulanıklık burada bir karar noktası.** Bugün hayalet izler `blur(Npx)` arkasında.
Canvas'ta her karede blur hesaplamak 00-ilkeler §2.1'i çiğner. Çözüm: oyuncu
sprite'ının **bulanık varyantlarını** önbelleğe al — `TRAIL_SLOTS` kadar, her biri
kendi blur yarıçapıyla bir kez rasterize edilir:

```
player|<styleType>|<idx>|<mode>|blur<N>
```

Yani 3 iz × oyuncu sayısı kadar ek sprite. 6 oyuncuda 18 girdi. Kabul edilebilir.
Göz kırpma bu bulanık varyantlarda **dondurulur** (`phase` sabit) — bugünkü
`[data-victory-freeze]` kuralının aynısı, aynı gerekçeyle.

### 4.3 Parçacıklar

36 parçacık, kaynak dosyadaki şekil tanımlarıyla (yıldız / parıltı / daire),
`p.size/10` ölçeğiyle ve aynı `drop-shadow` parlamasıyla.

Şekil × renk kombinasyonu başına **bir sprite**. Kaynakta kaç şekil ve kaç renk
varsa, sprite sayısı onların çarpımıdır — muhtemelen 10'un altında. Kare döngüsünde
36 `drawImage` + `rotate`. Bu, bugünkü 36 filtrelenmiş DOM katmanının yerine geçer
ve karşılaştırılamayacak kadar ucuzdur.

### 4.4 Şok dalgaları

İki halka, `r` zamanla büyüyor, `drop-shadow` parlaması **her yarıçapta sabit**
(12px ve 8px). Bu yüzden `scale()` ile büyütülemiyordu — parlama da büyürdü.

Canvas'ta sorun yok: halkayı her karede `ctx.arc` + `ctx.stroke` ile çiz ve parlamayı
**ayrı bir sprite** olarak değil, halkanın hemen dışına sabit genişlikte bir radial
gradient şeridi olarak çiz. İki halka, ~315ms — bu, 00-ilkeler §2.1'in izin verdiği
"gölge yok" sınırı içinde kalır çünkü `shadowBlur` kullanmıyorsun.

Gradient nesnesini **her karede yeniden oluşturma**; `createRadialGradient` ucuz
değil. Yarıçap değiştiği için birim yarıçapta bir gradient hazırla ve
`ctx.scale` ile ölçekle.

### 4.5 Vignette

Kaynakta tahtayı karartan bir vignette var. Tek bir radial gradient; tahta boyutu
değişmediği sürece **bir sprite**. Anahtar: `vignette|<w>x<h>`.

### 4.6 `ambientMode` ve tetikleme

`BoardCanvas` zaten `isVictoryActive` biliyor (Faz 01). Zafer aktifken:

- `ambientMode = 'off'` → `ambient` katmanı temizlenir ve çizilmez (bugünkü davranış),
- `actors` katmanı `drawVictory` `false` dönene kadar her karede kirli,
- Faz 05'teki `isPlayerCelebrating` kuralı gereği oyuncular normal yoldan çizilmez.

`onAnimationEnd` zamanlaması `BoardCanvas` içinde zaten `VICTORY_CELEBRATION_DURATION`
ile kurulu — değiştirme.

---

## 5. Kapsam dışı

- `VictoryCelebration.tsx`'te **herhangi bir** değişiklik. DOM yolu dokunulmadan kalır.
- Koreografinin zamanlamasını, renklerini, parçacık sayısını veya aşamalarını
  "iyileştirmek". Birebir port.
- Sis (Faz 07).

---

## 6. Kabul kriterleri

- [ ] Canvas modunda zafer koreografisi DOM moduyla **yan yana ayırt edilemiyor**:
      aynı süre, aynı aşamalar, aynı parçacık yoğunluğu, aynı şok dalgası, aynı vignette.
- [ ] 5 oyunculu bir bölümün bitişinde koreografi giriş seviyesi cihazda takılmıyor.
      (Ölçüm proje sahibinde — rapora "ölçülmeyi bekliyor" yaz.)
- [ ] Koreografi bitince `actors` katmanı temizleniyor ve RAF döngüsü **duruyor**.
- [ ] `onAnimationEnd` DOM modundakiyle aynı anda tetikleniyor; sonuç ekranı gecikmiyor.
- [ ] Zafer sırasında `cache.size()` artışı 40'ın altında. Değeri rapora yaz.
- [ ] `grep -rn "shadowBlur\|ctx\.filter" src/game-engine/render/victory.ts` çıktısı boş.
- [ ] 00-ilkeler §6 tablosundaki dört kontrol yeşil.
- [ ] `raporlar/06-rapor.md` yazıldı; bulanık iz varyantı kararı (§4.2) ve şok dalgası
      gradient yaklaşımı (§4.4) içinde.

---

## 7. Elle kontrol (proje sahibi)

- Aynı bölümü iki modda bitir, iki videoyu yan yana izle. Fark var mı?
- Telefonda 4-5 oyunculu bir bölüm bitir: koreografi akıyor mu, telefon ısınıyor mu?
