# 04b — Taşma Payı, DPR'ye Duyarlı Gölge, Çerçeve Sprite'ı

> Bağlayıcı: `.plans/canvas-render/00-ilkeler.md`. Önce `raporlar/04-rapor.md` oku.
> **Model: sonnet.** Üç nokta atışı düzeltme; mimari karar yok, hepsi aşağıda
> mekanizmasıyla birlikte verildi.

Bu bir ara fazdır. Faz 04'ün raporu üç gerçek sorun bildirdi ve üçü de **Faz 05'ten
önce** kapatılmalı: 05 ve 06 bu üçünün üstüne koordinat, gölge ve yeniden çizim
ekleyecek; sonra düzeltmek üç katı iş olur.

Yeni özellik yok, yeni dosya en fazla bir tane.

---

## 1. Okuyacağın dosyalar

| Dosya | Neden |
|---|---|
| `.plans/canvas-render/00-ilkeler.md`, `raporlar/04-rapor.md` | Sözleşme ve devir |
| `src/game-engine/render/surface.ts` | §2.1'in tek değişeceği yer |
| `src/game-engine/render/BoardCanvas.tsx` | Tuval boyutu ve CSS yerleşimi |
| `src/game-engine/render/paintTokens.ts` | §2.2'deki gölge yardımcısının yeri |
| `src/game-engine/render/spriteCache.ts` | Rasterizasyon bağlamının kurulduğu yer |
| `src/game-engine/render/overlays/` altındaki dosyalar | §2.3 ve §2.2'nin uygulanacağı çağrılar |
| `src/game-engine/render/cells/common.ts` | Gölge çağrılarının diğer yoğun yeri |
| `src/game-engine/components/GameBoard.tsx` | Oda çerçevesinin kaynak değerleri (§2.3) |

Bu listenin dışına çıkma. Yetmezse dur ve sor.

---

## 2. Yapılacaklar

### 2.1 Tuvale taşma payı (bleed)

**Sorun (04-rapor §"Kırpılan etiketler").** Tuval tam tahta boyutunda. Tahtanın dış
kenarındaki lav/portal etiketlerinin ~6px'i ve oda dış parlamasının 20px'lik payı
kırpılıyor. DOM'da kırpılmıyor — bu, 00-ilkeler §4'e göre bir **görsel gerileme**.

**Neden şimdi.** Faz 06'nın zafer koreografisindeki şok dalgaları ve parçacıklar
tahtanın dışına taşıyor. Pay verilmezse o faz da kırpılacak ve düzeltme o zaman
zafer koordinatlarını da kapsayacak.

**Çözüm — tek yerde, hiçbir çizim kodu değişmeden.** `surface.ts`'te bir sabit:

```ts
/**
 * Tuvalin tahta sınırının dışına verdiği pay (CSS pikseli).
 * Oda dış parlaması 20px, kenar etiketleri ~6px taşıyor; Faz 06'nın şok
 * dalgaları daha fazlasını isteyecek. Çizim kodu bu sayıyı BİLMEZ —
 * dönüşüm matrisine bir kez gömülür.
 */
export const BOARD_BLEED = 32;
```

Uygulama:

- Tuvalin bit boyutu: `(boardW + 2*BLEED) * dpr` × `(boardH + 2*BLEED) * dpr`.
- CSS boyutu aynı oranda büyür, ve tuval `margin: -BLEED` (veya `left/top: -BLEED`)
  ile **kaydırılır**, böylece tahtanın (0,0) noktası ekranda bugünkü yerinde kalır.
- Dönüşüm, 00-ilkeler §3.3'teki tek satırın yerine:

```ts
ctx.setTransform(dpr, 0, 0, dpr, BOARD_BLEED * dpr, BOARD_BLEED * dpr);
```

Bunun sonucu: **mevcut hiçbir koordinat değişmez.** Hücreler, odalar, izler, kablolar
hepsi bugünkü (0,0) tabanlı koordinatlarını kullanmaya devam eder; pay dönüşümün
içindedir. `clearRect` çağrılarının payı da kapsadığından emin ol — negatif başlangıç
gerekir (`clearRect(-BLEED, -BLEED, w + 2*BLEED, h + 2*BLEED)`).

Üç tuvalin üçü de aynı payı alır, yoksa katmanlar kayar.

`pointerEvents: 'none'` zaten var; büyüyen tuval girdiyi engellemez — **doğrula**.

**Kabul:** tahtanın en dış köşesindeki bir lav etiketi ve bir portal etiketi DOM
modundakiyle aynı şekilde tam görünüyor; oda dış parlaması kesilmiyor.

### 2.2 `shadowBlur` DPR'den etkilenmiyor — merkezî düzeltme

**Sorun (04-rapor §5).** `ctx.shadowBlur`, `shadowOffsetX/Y` **dönüşüm matrisinden
etkilenmez**; cihaz pikseli cinsinden uygulanır. Sprite'lar DPR ölçekli bir bağlamda
rasterize edildiği için, DPR 2'de `shadowBlur = 8` yazan her parlama DOM'un
`0 0 8px`'ine göre **yarı yarıçapta** çıkıyor. Bu Faz 01'den beri var ve **her fazın
çıktısını** etkiliyor — hücreler, izler, kablolar, kenarlar.

**Çözüm.** `paintTokens.ts`'e tek bir yardımcı ekle ve rasterleyicilerdeki **tüm**
doğrudan `shadowBlur` atamalarını buna çevir:

```ts
/**
 * CSS `box-shadow`/`drop-shadow` yarıçapının canvas karşılığı.
 * `shadowBlur` dönüşüm matrisini yok saydığı için DPR ile elle çarpılır;
 * aksi halde DPR 2'de parlamalar yarı yarıçapta çıkar (04-rapor §5).
 * YALNIZCA sprite rasterizasyonunda çağrılır (00-ilkeler §2.1).
 */
export function setShadow(
    ctx: CanvasRenderingContext2D,
    color: string,
    blurCssPx: number,
    offsetXCssPx = 0,
    offsetYCssPx = 0,
): void;
```

DPR'yi nereden aldığı bir uygulama detayı; `spriteCache`'in rasterizasyon bağlamını
kurduğu yerden geçirmek en temizi — global okuma yapma, bağlam DPR'sini kullan.

Taramayı yap ve **hiçbir atamayı atlama**:

    grep -rn "shadowBlur\|shadowOffset" src/game-engine/render/

Çıktıdaki her satır ya `setShadow` çağrısına dönmüş ya da `setShadow`'un kendi
gövdesi olmalı. 00-ilkeler §2.1'in kare-döngüsü yasağı aynen geçerli; bu düzeltme
yasağı gevşetmez, yalnızca rasterizasyondaki değeri doğrular.

**Kabul:** DPR 1 ve DPR 2'de üretilen sprite'lar, ölçek farkı dışında **aynı
göreli parlama yarıçapına** sahip. `window.devicePixelRatio`'yu simüle edemiyorsan,
`surface.ts`'in DPR'sini geçici olarak 2'ye sabitleyip gözle karşılaştır ve
nasıl doğruladığını rapora yaz.

### 2.3 Oda çerçevesi sprite'a çevrilir

**Sorun (04-rapor §"Çerçeve gölgesi").** Faz 04'te çerçeveyi doğrudan çizmesini ben
istedim; gerekçem "boyutu odaya göre değişir, önbelleğe almak faydasız" idi. **Bu
gerekçe §2.8'den sonra geçersiz kaldı:** `static` katmanı artık `playersSignature`
değişince, yani **her oyuncu adımında** yeniden çiziliyor. Dolayısıyla çerçevenin
`0 0 30px` gölgesi her adımda ana yolda yeniden hesaplanıyor. Ajanın tespiti doğru
ve 00-ilkeler §2.1'in ruhuna aykırı.

**Çözüm.** Çerçeve sprite olur. Anahtar:

    roomframe|<genişlikHücre>x<yükseklikHücre>|<isControlled>|<themeId>

Oda boyutları sonlu ve tekrar eden bir küme; anahtar odanın **kimliğini değil
ölçüsünü** taşıdığı için aynı boyuttaki odalar tek sprite paylaşır. Sprite kutusu
gölgenin taşmasını kapsayacak kadar büyük olmalı (her yönde ≥ 30px pay) ve blit
o payı geri sayarak yapılır.

`opacity: isControlled ? 1 : 0.4` sprite'a **girmez** — anahtar zaten `isControlled`
taşıyor ama opaklık blit sırasında `globalAlpha` ile verilir; iki varyantı ayrı
rasterize etmek gereksiz. Anahtardaki `isControlled` kenar **rengi** için var
(`themeConfig.board.border(isControlled)`), opaklık için değil.

Oda **başlığı** (metin) sprite'a girmez, doğrudan çizilmeye devam eder — `fillText`
ucuzdur ve oda adı odaya özeldir.

**Kabul:** `static` katmanının bir yeniden çiziminde hiçbir gölge hesabı yapılmıyor;
yukarıdaki `grep` çıktısı yalnızca rasterleyicileri gösteriyor. Görüntü değişmiyor.

### 2.4 Rapora yazılacak ölçüm

Bu faz sprite sayısını artırıyor (§2.3) ve sprite kutularını büyütüyor (§2.1, §2.3).
`cache.size()`'ı ve **Faz 08 §2.5b'deki formülle yaklaşık belleği** ölçüp rapora
yaz:

    toplam ≈ Σ (sprite genişliği × yüksekliği × dpr² × 4 bayt)

Sayısal tavan yok (00-ilkeler §3.1). Eşiği aşan bir şey görürsen düzeltme, **bildir**.

---

## 3. Kapsam dışı

- Faz 04'ün üç sapması (katman sırası, portal anahtarına `d` eklenmesi, DOM'daki
  kayıklık ve `roomId`'ye bakmayan bitişiklik) **kabul edildi, dokunma.**
  Son ikisi Faz 08'in "proje sahibine sunulacak liste"sine taşınacak; bu fazın işi değil.
- Varlıklar, hareket, zafer, sis.
- DOM çizicilerinde herhangi bir değişiklik.
- `BOARD_BLEED`'i "ne kadar yeterli" diye Faz 06'ya göre ayarlamaya çalışmak —
  32 şimdilik yeterli; 06 gerekirse büyütür.

---

## 4. Kabul kriterleri

- [ ] `BOARD_BLEED` tek bir yerde tanımlı; üç tuval de aynı payı alıyor; hiçbir
      çizim koordinatı değişmedi.
- [ ] Tahtanın dış kenarındaki lav ve portal etiketleri kırpılmıyor; oda dış
      parlaması kesilmiyor.
- [ ] Swipe hâlâ çalışıyor (büyüyen tuval girdiyi yakalamıyor).
- [ ] `grep -rn "shadowBlur\|shadowOffset" src/game-engine/render/` çıktısındaki
      her satır `setShadow` çağrısı veya `setShadow`'un gövdesi.
- [ ] Oda çerçevesi sprite; `static` yeniden çiziminde gölge hesabı yok.
- [ ] `cache.size()` ve yaklaşık sprite belleği ölçüldü ve rapora yazıldı.
- [ ] 00-ilkeler §6 tablosundaki dört kontrol yeşil (test sayısı tabanı: 308).
- [ ] `raporlar/04b-rapor.md` yazıldı.

---

## 5. Elle kontrol (proje sahibi)

- Tahtanın en sol/en üst kenarındaki bir lav etiketine bak: DOM'daki gibi tam mı?
- Bir oyuncu adımı at: tahta aynı görünüyor mu, bir titreme var mı?
- Varsa DPR 2 bir cihazda (çoğu modern telefon) parlamaların DOM'a göre inceliğine bak.
