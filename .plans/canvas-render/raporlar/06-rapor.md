# Faz 06 Raporu — Zafer Koreografisinin Canvas Portu

> Plan: `.plans/canvas-render/06-zafer-koreografisi.md` · Bağlayıcı: `00-ilkeler.md`
> Devir: `raporlar/05-rapor.md`

> **Görsel doğrulama YAPILMADI.** Tarayıcı/cihaz yok. Bu raporda görsel
> eşdeğerlik iddiası yoktur; yalnızca değerlerin `VictoryCelebration.tsx`'ten
> birebir taşındığı ve koreografi matematiğinin testle kilitlendiği iddia
> edilir. §8'deki elle kontrol listesi proje sahibinde.

---

## 1. Ne yapıldı

| Dosya | İçerik |
|---|---|
| `render/victory.ts` | **Yeni.** Çizim ve tek giriş noktası: `drawVictory`, `drawGlowRing` (şok dalgası), `drawCopy`. `victoryState.ts`'i yeniden dışa aktarır (197 satır) |
| `render/victoryState.ts` | **Yeni.** Durum ve zaman matematiği: `VictoryState`, `createVictoryState`, `advanceVictory` (üç aşamanın tamamı), `createVictoryTracker` (294 satır) |
| `render/victorySprites.ts` | **Yeni.** Vignette, parçacık (şekil × renk), süpernova yıldızı ve oyuncunun zafer varyantları (ana + üç bulanık hayalet iz) |
| `render/blur.ts` | **Yeni.** `blurCanvas` — CSS `blur(Npx)`in karşılığı; üç kutu geçişiyle Gauss yaklaşımı, alfa önceden çarpılmış. `blurPad` |
| `render/victory.test.ts` | **Yeni.** 30 test — aşama eşikleri ve formülleri, iz halkası, parçacık eşikleri, şok dalgası/süpernova, sprite anahtarları, takipçinin sıfırlama kuralı, taşma payı |

### Değişen dosyalar

| Dosya | Değişiklik |
|---|---|
| `render/surface.ts` | `BOARD_BLEED` sabiti kaldırıldı; yerine `BOARD_BLEED_LITE`/`BOARD_BLEED_FULL` + `boardBleedFor(tier)`. Pay artık `Surfaces.bleed` alanı; `resize` beşinci parametre olarak alıyor, `clearLayer` oradan okuyor. Tuvalin `left/top`u `createSurfaces`tan `resize`a taşındı (pay orada belli oluyor) |
| `render/paintTokens.ts` | `rasterDprOf(ctx)` dışa açıldı — zafer sprite'ları ara tuvali cihaz pikselinde kurmak için DPR'yi bilmek zorunda |
| `render/entities/index.ts` | `drawActorsLayer` altıncı parametre `victory: VictoryTracker \| null` alıyor; varlık döngüsünden SONRA `drawVictory` çağrılıyor ve dönüşü `alive`a katılıyor |
| `render/BoardCanvas.tsx` | `createVictoryTracker` kuruldu, sahne değişince `victory.update`, çizimde takipçi `drawActorsLayer`a geçiliyor, `unmount`ta `clear`. `boardBleedFor(motionTier)` ile pay hesaplanıp `resize`a veriliyor |

`VictoryCelebration.tsx`, `GameBoard.tsx`, `boardKeyframes.ts` ve diğer DOM
dosyalarına **dokunulmadı** (faz planı §5, 00-ilkeler §5). `render/` dışında
değişen dosya yok (00-ilkeler §8).

---

## 2. Plandan ayrılan noktalar

**2.1 `VictoryState` plandaki şekilden geniş.** Plan `{ startedAt; trails:
Map<number, ...[]>; particles }` diyordu. Kaynak aşama 3'te bir önceki karenin
**konumunu ve dönüşünü** okuyor (`cx + (current.x - cx) * (1 - p3 * 0.35)`,
`current.rotation + p3 * 720`), yani yalnızca izleri saklamak yetmiyor. Durum
kaynaktaki `entityStatesRef` ile aynı şekle getirildi: `configs` ve `states`
paralel diziler, izler `states[idx].trails` içinde. `Map` yerine dizi, çünkü
kaynak da diziyle çalışıyor ve sıra çizim sırasını belirliyor.

**2.2 `drawVictory` imzasına `cache` eklendi, `scene` çıkarıldı.**
`drawVictory(ctx, state, cache, now)`. Sprite önbelleği olmadan blit yapılamaz;
`scene` ise gereksiz, çünkü tahta ölçüsü ve oyuncu yapılandırması zaten
`VictoryState` içinde donmuş durumda (koreografi başladıktan sonra sahne
değişmiyor).

**2.3 `advanceVictory` dışa açıldı.** Aşama matematiği bu fazın en kırılgan saf
parçası; 00-ilkeler §6.1 saf olan her şeyin test edilmesini istiyor. `drawVictory`
dışında çağıranı yok.

**2.4 Şok dalgası gradient'i her karede yeniden kuruluyor** (faz planı §4.4
"birim yarıçapta hazırla ve `ctx.scale` ile ölçekle" diyordu). Planın bu iki
şartı birbirini dışlıyor: `ctx.scale` yarıçapı büyütürken parlamanın
**genişliğini** de büyütür, oysa §4.4'ün asıl gerekçesi parlamanın her yarıçapta
sabit kalması. Sabit genişlikli bir şeridi değişen yarıçapta veren **tek** bir
gradient nesnesi matematiksel olarak mümkün değil. Ölçülü bedel: şok dalgaları
~315ms sürüyor → 60fps'te ~19 kare × 2 halka = **toplam ~38 `createRadialGradient`
çağrısı**, koreografinin tamamı boyunca. Kare döngüsünde gölge/filtre yok
(00-ilkeler §2.1 korunuyor).

**2.5 Bulanıklık `ctx.filter` ile değil, piksel üzerinde.** Kabul kriteri
`victory.ts` içinde `ctx.filter` istemiyor; ayrıca `ctx.filter`ın uzunluk birimi
dönüşüm matrisine göre tarayıcıdan tarayıcıya değişiyor (04b'de `shadowBlur`ın
DPR sorununun aynısı). `blur.ts` üç kutu geçişiyle Gauss'u yaklaşıklıyor,
yarıçabı DPR ile çarpıyor ve alfayı önceden çarparak saydam kenarlarda koyu hale
oluşmasını engelliyor. Maliyet yalnızca rasterizasyonda: zafer başına oyuncu × 3.

**2.6 `BOARD_BLEED` cihaz kademesine bağlandı — proje sahibi kararı.** Ayrıntı
§3'te.

**2.7 Plandaki tek `victory.ts` ÜÇ dosya oldu.** Hepsi bir arada ~750 satır
ederdi; 00-ilkeler §1 ~250 diyor. Bölme işe göre: `victory.ts` çizim (197),
`victoryState.ts` zaman matematiği ve durum (294), `victorySprites.ts`
rasterizasyon (283). `victory.ts` diğer ikisini yeniden dışa aktarıyor, yani
çağıranlar için hâlâ **tek modül**; kabul kriterindeki `grep … victory.ts`
hedefi olduğu gibi duruyor ve boş dönüyor. `motion.ts` ↔ `entityMotion.ts` ve
Faz 04'ün `overlays/` bölmesiyle aynı desen. `victoryState.ts` 294 satırla
sınırın üstünde: tek iş yapıyor (zaman → koreografi durumu) ve daha küçük
parçalara bölmek `advanceVictory`i kendi veri tiplerinden ayırırdı.

---

## 3. Taşma payı (`BOARD_BLEED`) — proje sahibi kararı

Faz 04b tuvale her yönde 32 CSS piksel pay vermişti. Zafer koreografisi bunun
çok üstünü istiyor:

| Efekt | Tahtanın dışına taşma |
|---|---|
| Vignette (`inset: -40`) | 40px |
| Oyuncu yörüngesi (`maxRadius = min(w,h) * 0,38`) | taşmıyor |
| Şok dalgası (`min(w,h) * 0,7` yarıçap) | `min(w,h) * 0,19` (640'lık tahtada ~122px) |
| Parçacıklar (kare başına 1,2–4,7px, ~90 kare) | merkezden 108–423px, yani kenardan ~100–420px |

Tam kapsama ~460px pay demek; tuval alanı payla **karesel** büyüdüğü ve DPR² ile
çarpıldığı için 512x512 tahtada 3 katman @DPR2 = **97 MB**. Giriş seviyesi
telefonda kabul edilemez.

**Karar (proje sahibi):** pay `motionTier`'a bağlandı.

| Kademe | Pay | 512 tahta | 640 tahta |
|---|---|---|---|
| `lite` | 64 | 18,8 MB | 27,0 MB |
| `full` | 160 | 31,7 MB | 42,2 MB |

(3 katman, DPR 2. Önceki sabit 32 payla 512 tahtada 15,9 MB idi.)

`lite` zaten hücre süslerini tamamen kapatan kademe, yani cihaza göre görüntü
ayrımı bu izde yeni bir ilke değil. **Ama sonuç şu: "DOM ile ayırt edilemez"
iddiası yalnızca `full` kademede geçerli**, ve orada bile en uzağa uçan
parçacıkların son kısmı ile şok dalgasının son karesi kırpılıyor (bkz. §5).

Mekanik: `BOARD_BLEED` sabiti `Surfaces.bleed` alanına dönüştü. Pay değişince
`resize` zaten var olan "boyut değişti → üç katmanı yeniden çiz" yolunu
tetikliyor. Çizim kodu payı hâlâ **bilmiyor** (00-ilkeler §3.3); tek fark
dönüşüm matrisine gömülen sayının sabit olmaması.

---

## 4. Karar bekleyen konu (proje sahibi)

**4.1 Vignette sprite'ı 640x640 tahtada 7,91 MB.** Faz planı §4.5 "tahta boyutu
değişmediği sürece bir sprite" diyor ve öyle yapıldı — ama tahta boyu kadar bir
sprite, önbelleğin tek başına en pahalı girdisi (720x720 CSS px × DPR² × 4 bayt).

Vignette **tamamen düz bir radial gradient**; hiçbir keskin kenarı yok. Yarı
çözünürlükte rasterize edilip blit'te 2× büyütülse görüntü gözle ayırt edilemez
ve maliyet **1,98 MB**'a iner (4 kat azalma). Alternatif, sprite'ı hiç
önbelleğe almayıp gradient'i her karede tahta boyunca `fillRect` etmek — o da
kare başına ~1,4 M piksellik bir gradient boyaması demek, yani ters takas.

00-ilkeler §8 gereği kendi başıma değiştirmedim; plan "bir sprite" diyor, öyle
bırakıldı. **Önerim: yarı çözünürlük.** Karar senin; Faz 08'in bellek turuna da
bırakılabilir.

---

## 5. Görsel farklar

| Nerede | Fark | Sebep |
|---|---|---|
| **Parçacıklar ve şok dalgası** | Tahtanın `bleed` kadar dışında **kırpılıyor** (`full`: 160px, `lite`: 64px). DOM'da kırpma yok | §3. Tam kapsama 97 MB tuval demek |
| **Daire parçacığın parlaması** | `p.size` ile ölçekleniyor (2,4–6,4px); DOM'da sabit 4px | Kaynak daireye `transform` uygulamıyor, `r`yi doğrudan yazıyor. Faz planı §4.3 "şekil × renk başına bir sprite" diyor; boyutu anahtara katmak sürekli değişen `size` yüzünden sınırsız önbellek üretirdi. Yıldız ve parıltıda fark yok — onların parlaması DOM'da da ölçekle büyüyor |
| **Süpernova yıldızı** | Kenarları DOM'daki SVG'den daha yumuşak | Sprite 2× çözünürlükte rasterize ediliyor ama kare döngüsünde `scale(3,0..4,0)` uygulanıyor → 1,7 kat büyütme kalıyor. 1× rasterize edilse 3,4 kat olurdu; daha yükseği tek sprite'ı 4 MB'ın üstüne çıkarır |
| **Şok dalgası parlaması** | Gauss profili gradient duraklarıyla (9 durak) yaklaşıklanıyor | `drop-shadow` kare döngüsünde yasak (00-ilkeler §2.1). Tepe genliği `width / (σ√2π)` ile, görünür sınır 3σ ile modellendi |
| **Hayalet iz bulanıklığı** | Üç kutu geçişi, gerçek Gauss değil | §2.5. 1,5–3,5px yarıçapta fark gözle görülmez |
| **Zincirlenmiş `drop-shadow`lar** | Her parlama şeklin kendisinden çiziliyor, bir öncekinin sonucundan değil | `paintTokens.outerShadows`un Faz 02'den beri kullandığı yaklaşım; tutarlılık için aynısı |
| Göz kırpma / neon nabzı | Koreografi boyunca donuk | **DOM'da da öyle**: `[data-victory-freeze] * { animation: none }`. `animation: none` duraklatmaz, başlangıç durumuna döndürür → göz açık, nabız `scale(1)` |
| Süpernova gradient'i | Yıldızın büyük kısmı saydam | **DOM'da da öyle**: `supernovaGrad` `cx="0%" cy="0%" r="50%"` + `objectBoundingBox` → gradient merkezi yıldızın sınırlayıcı kutusunun sol üst köşesi. Hata gibi duruyor, 00-ilkeler §4 gereği birebir taşındı |
| Kutular | Zafer sırasında çizilmeye devam ediyor | DOM'daki `isPlayerCelebrating` kuralının aynısı |

Faz 05'in **"zafer anında oyuncular kayboluyor"** farkı (05-rapor §5) bu fazla
**kapandı**.

---

## 6. Ölçüm — `cache.size()` ve bellek (00-ilkeler §3.1, Faz 08 §2.5b)

Senaryo: **5 oyuncu**, 640x640 tahta, DPR 2. Anahtar üreticileri ve `size()`
doğrudan sayıldı (geçici ölçüm dosyası sonrasında silindi).

### Zaferin önbelleğe eklediği girdi sayısı

| Girdi | Sayı |
|---|---|
| Oyuncu varyantı (5 oyuncu × 4 bulanıklık: 0 / 1,5 / 2,5 / 3,5) | **20** |
| Parçacık (şekil × renk) | **6** |
| Vignette | **1** |
| Süpernova | **1** |
| **Toplam `cache.size()` artışı** | **28** |

Parçacık sayısı 36 ama sprite 6: kaynak şekli `i % 3`, rengi `i % 6` ile
seçtiğinden yalnızca altı kombinasyon doğuyor.

### Bellek (sprite alanı × DPR² × 4 bayt)

| Tema | 20 oyuncu sprite'ı | Sprite kutuları (oyuncu 0) |
|---|---|---|
| `legacy` | **5,68 MB** | blur0 154², blur1.5 124², blur2.5 130², blur3.5 136² |
| `arcade` / `neon` | **3,47 MB** | blur0 124², blur1.5 94², blur2.5 100², blur3.5 106² |
| `blueprint` | **3,73 MB** | blur0 128², blur1.5 98², blur2.5 104², blur3.5 110² |
| `cosmic` | **4,00 MB** | blur0 132², blur1.5 102², blur2.5 108², blur3.5 114² |

| Diğer | Kutu | Bellek |
|---|---|---|
| Parçacık (6 × 64²) | 64x64 | **0,38 MB** |
| Vignette (640x640 tahta) | 720x720 | **7,91 MB** (bkz. §4.1) |
| Süpernova (2× raster) | 372x372 | **2,11 MB** |

**Toplam (legacy, 5 oyuncu, 640 tahta, DPR 2): ~16,1 MB.** Bunun yarısından
fazlası vignette + süpernova, yani oyuncu sayısından bağımsız sabit.

Sayısal tavan yok (00-ilkeler §3.1); denetlenen şey anahtarlama kuralıdır ve
bunu `victory.test.ts` kilitliyor: göz kırpma ve nabız fazı anahtara **girmiyor**
(koreografi boyunca donuk), parçacık boyutu anahtara **girmiyor**, mod/kilit/
oyuncu indeksi/bulanıklık **giriyor**.

### Ölçülmeyi bekleyen (faz planı §6)

- **5 oyunculu bir bölümün bitişinde koreografinin giriş seviyesi cihazda
  takılmaması.** Ölçüm proje sahibinde — **ölçülmeyi bekliyor**.

---

## 7. Doğrulama (00-ilkeler §6)

| Kontrol | Komut | Sonuç |
|---|---|---|
| Tip denetimi | `npx tsc --noEmit` | ✅ temiz |
| Testler | `npm test` | ✅ **37 dosya / 374 test** (Faz 05: 36 / 344; +30 `victory.test.ts`) |
| Lint (tüm repo) | `npm run lint` | ✅ **431 hata / 13240 uyarı** — tabanla aynı |
| Lint (yalnız `src`) | `npx eslint src` | ✅ **154 hata / 52 uyarı** — tabanla aynı |
| Lint (yeni kod) | `npx eslint src/game-engine/render` | ✅ çıktı boş, 0 sorun |
| Android build | `npm run build:mobile` | ✅ `Sync finished in 0.581s` |
| Kabul kriteri | `grep -rn "shadowBlur\|ctx\.filter" src/game-engine/render/victory.ts` | ✅ **çıktı boş** |
| 00-ilkeler §2.1 | `grep -rn "shadowBlur\|ctx\.filter" src/game-engine/render/` | ✅ tek atama `paintTokens.ts:70` (`setShadow` gövdesi); kalan 6 eşleşmenin hepsi yorum satırı |

### Kodda garanti edilen, DevTools ile doğrulanmayanlar

- **Koreografi bitince `actors` katmanı temizleniyor ve RAF duruyor.**
  `drawVictory` `progress >= 1` olduğunda bağlama **hiç dokunmadan** `false`
  dönüyor; zamanlayıcı her karede katmanı zaten `clearRect` ediyor, yani son
  karede tuvalde yalnızca kutular kalıyor. `alive` `false` → `invalidate('actors')`
  çağrılmıyor → döngü duruyor (00-ilkeler §2.2). Durum **sıfırlanmıyor**: takipçi
  aynı anahtarı görüp yeniden kursaydı koreografi baştan oynardı. Test:
  `drawVictory` süre dolduktan sonra ikinci çağrıda da `false` dönüyor.
- **`onAnimationEnd` zamanlaması değiştirilmedi.** `BoardCanvas`'taki
  `VICTORY_CELEBRATION_DURATION`'lık `setTimeout` Faz 01'den beri kurulu ve bu
  fazda ona dokunulmadı; koreografi de aynı sabiti kullanıyor.
- Beş temada yan yana görsel karşılaştırma.
- `full` ve `lite` kademelerde kırpma sınırının gözle kabul edilebilirliği.

---

## 8. Elle kontrol (proje sahibi)

```js
localStorage.setItem(`${localStorage.getItem('activeUserId') ?? 'anon'}:boardRenderer`, 'canvas');
location.reload();
```

1. Aynı bölümü iki modda bitir, iki videoyu yan yana izle. Fark var mı?
2. Telefonda 4-5 oyunculu bir bölüm bitir: koreografi akıyor mu, telefon ısınıyor mu?
3. **Parçacıkların tahta kenarından ~160px sonra kaybolması kabul edilebilir mi?**
   (`lite` kademede ~64px — `motionTier`'ı elle `lite`a alıp da bak:
   `localStorage.setItem('<uid>:motionTier', 'lite')`)
4. Süpernova yıldızının kenarları DOM'dakiyle aynı keskinlikte mi (§5)?
5. Şok dalgası halkalarının parlaması DOM'daki kalınlıkta mı?
6. Koreografi bittiğinde sonuç ekranı **gecikmeden** geliyor mu?
7. §4.1 — vignette için yarı çözünürlük kararı.

---

## 9. Sonraki faza not

- **Faz 07 (sis).** Görünürlük noktası hâlâ `entities/index.ts`'teki varlık
  döngüsü (05-rapor §9). Zafer koreografisi sisten **etkilenmez**: DOM'da
  `VictoryCelebration` sis katmanının dışında, `zIndex: 150`'de duruyor.
- **Faz 08 (ölçüm ve varsayılan).**
  - §6'daki 28 girdi ve ~16,1 MB bellek, hesabın girdisi.
  - **§4.1 (vignette çözünürlüğü) karar bekliyor** — bellek turunun en büyük
    tek kalemi.
  - `BOARD_BLEED` artık sabit değil (`surface.ts`, `boardBleedFor`). Tuval
    belleği kademeye göre 18,8–42,2 MB arasında; Faz 08'in bellek raporu bunu
    ayrı bir satır olarak taşımalı.
  - DOM yolu kapanınca `VictoryCelebration.tsx` ve `boardKeyframes.ts`'teki
    `[data-victory-freeze]` kuralı silinebilir; canvas yolunda karşılığı yok
    (dondurma sprite girdisine gömülü).
- **`blur.ts` yeni ve paylaşılabilir.** `ctx.filter` gerektiren başka bir yer
  çıkarsa (05-rapor §4.1'deki ölüm filtreleri gibi) oraya bakılmalı — ama
  dikkat: orada sorun bulanıklık değil, renk kayması (`hue-rotate`,
  `saturate`, `grayscale`), yani `blur.ts` onu çözmez.
