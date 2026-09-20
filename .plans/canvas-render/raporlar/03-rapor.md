# Faz 03 Raporu — Kalan Sekiz Hücre Tipi

> Plan: `.plans/canvas-render/03-kalan-hucreler.md` · Bağlayıcı: `00-ilkeler.md`

---

## 1. Ne yapıldı

Sekiz yeni hücre rasterleyicisi yazıldı ve kayda alındı; `CELL_SPRITES` on iki
tipin hepsini içeren **tam** bir `Record` oldu, `normal`'e düşüş yolu ve onun
`console.warn`'ı kaldırıldı.

### Yeni dosyalar

| Dosya | İçerik |
|---|---|
| `cells/power.ts` | `powerCellSprite` |
| `cells/toggle.ts` | `toggleCellSprite` |
| `cells/conveyor.ts` | `conveyorCellSprite`, `conveyorAmbientSprite`, `conveyorIsAnimated`, `CONVEYOR_CHASE_MS = 500` |
| `cells/trampoline.ts` | `trampolineCellSprite` |
| `cells/teleport.ts` | `teleportCellSprite`, `teleportAmbientSprite`, `teleportIsAnimated`, `TELEPORT_VORTEX_MS = 4200` |
| `cells/target.ts` | `targetCellSprite`, `targetAmbientSprite`, `targetIsAnimated`, `TARGET_PULSE_MS = 2200` |
| `cells/controlSwitch.ts` | `controlSwitchCellSprite` |
| `cells/directionDeflector.ts` | `directionDeflectorCellSprite` |
| `cells/common.ts` | Sekiz dosyanın paylaştığı yardımcılar (§6) |
| `cells/activity.ts` | Geçici "çalışıyor" hâli takibi (§4) |
| `cells/activity.test.ts` | Takipçinin testleri |

### Değiştirilen dosyalar

| Dosya | Değişiklik |
|---|---|
| `cells/index.ts` | Kayıt tamamlandı, `Partial` kalktı, yedek yol silindi, `ActivityTracker` geçirildi |
| `render/types.ts` | `CellPaintInput.isActive` eklendi (§4) |
| `render/cssValues.ts` | `parseCssColor` 4 ve 8 haneli hex'i de kabul ediyor (§7) |
| `cells/ice.ts` | `easeInOut` dışa açıldı, gövdesi `common.ts`'teki `cssBezier`'e delege edildi |
| `render/BoardCanvas.tsx` | Takipçi kuruldu, sönme zamanlayıcısı bağlandı |
| `cells/keys.test.ts` | Sekiz yeni `key()` için testler |
| `app/dev-cell-compare/page.tsx` | 12 tipin 23 varyantı, "etkin durum" düğmesi, paylaşılan önbellek ve `cache.size()` okuması |

---

## 2. `teleport` periyot kararı (plan §2.2)

Kaynakta üç ayrı süs var:

| Süs | CSS | Periyot |
|---|---|---|
| `portal-pulse-ring-active` | `portalPulse 0.8s ease-out` | 800 ms |
| `portal-vortex-active` | `rotatePortal 4.2s linear` | 4200 ms |
| `portal-vortex-inner-active` | `rotatePortalReverse 2.2s linear` | 2200 ms |

Plan gereği üçü **tek** bir ambient sprite'ta birleştirildi ve örnekleme periyodu
`portal-vortex`e sabitlendi: **`TELEPORT_VORTEX_MS = 4200`**. Her faz için
`t = (faz/12) × 4200 ms` hesaplanıp her alt animasyon KENDİ ilerlemesinde
değerlendiriliyor (`t % 800`, `t % 4200`, `t % 2200`).

**Bilinen sonuç:** 4200/800 = 5.25 ve 4200/2200 = 1.909… tam sayı değil. Yani
nabız halkası ile iç girdap 12 faz üzerinde kendi hızlarında değil, 4.2 s'de
kapanan bir çevrimde görünüyor (aliasing). Nabız halkası bir periyotta 5.25 yerine
5 kez atıyormuş gibi, iç girdap ise ~1.9 yerine 2 tur atıyormuş gibi görünür. Göz
kırpma karşılaştırmasında fark edilen tek şey halkanın atış ritminin DOM'dakinden
biraz farklı düşmesi; ışınlanma penceresi zaten 600 ms olduğu için (bir periyodun
yedide biri) pratikte 2–3 faz görünüyor.

Ayrıca merkezdeki etiketler (`group` harfi ve `↑`/`↓`) DOM'da `zIndex: 2` ile
girdapların üstünde. Canvas'ta ambient katmanı static'in üstünde olduğu için,
hücre animasyonluyken etiketler de **ambient sprite'ın parçası**; animasyonsuzken
static gövdenin parçası. `BASE_PHASE` yolu sayesinde `ambientMode='off'` iken de
görünür kalıyorlar.

---

## 3. `target` iki periyot kararı

`target` de iki animasyon taşıyor: `targetPulse 2.2s ease-in-out` (simge) ve
`targetRotate 8s linear` (kesik halka). `teleport` için verilen kararla aynı
gerekçeyle tek ambient sprite'ta birleştirildi ve periyot **nabza** sabitlendi
(`TARGET_PULSE_MS = 2200`).

Halka her periyotta tam **90°** dönüyor; yani etkin dönüş süresi 8.8 s, DOM'un
8 s'sinden %10 yavaş. 90° seçildi çünkü tire deseni çember üzerine 16, kare
üzerine 20 tire periyodu (ikisi de 4'ün katı) oturtuldu — böylece 90°'lik adım
dikişsiz. Alternatif (8000 ms periyot) nabzı 3.6 kat yavaşlatırdı; nabız gözle
daha belirgin olduğu için ona sadık kalındı.

---

## 4. Onaylanan mimari ekleme: geçici "çalışıyor" hâli

**Sorun.** Üç DOM çizicisi görünümünü React state + `setTimeout` ile sürdürüyor:

| Hücre | Tetikleyici | Süre |
|---|---|---|
| `conveyor` | `isElectrified && (şimdi VEYA önceki karede varlık)` | 800 ms |
| `teleport` | varlık yeni geldi VEYA yeni gitti | 600 ms |
| `trampoline` | varlık yeni geldi | 500 ms |

Bu süre `BoardScene`'de yazılı değil; tick'lerden bağımsız akıyor ve sprite
deseni (anahtar + 12 faz) durum tutmuyor.

**Karar (proje sahibi onayladı: "Durum takibi ekle").** Durum çizimin dışında,
`cells/activity.ts`'te tutuluyor ve çizicilere `CellPaintInput.isActive` olarak
veriliyor. Bu, 00-ilkeler §3.1'in dondurduğu girdi sözleşmesinin gerekçeli bir
genişlemesidir; alternatifi (hâli hiç çizmemek) bu üç hücrede DOM'dan **görünür**
sapma demekti.

**Tazeleme kuralı.** DOM'da `useEffect`in bağımlılıkları varlık KİMLİKLERİ olduğu
için yerinde duran bir varlık zamanlayıcıyı tazelemez. Takipçi aynı kuralı bir
imza ile uyguluyor: `${nowEntityId}|${prevEntityId}|${electrified}`. İmza
değişmediyse bitiş damgası ileri kaymaz. Test edildi.

**Katman geçersizleştirme.** Görünüm etkin pencere boyunca SABİT olduğu için her
kare yeniden çizmeye gerek yok: `BoardCanvas` sahne değişince `update()` çağırıyor,
küme değiştiyse `static` + `ambient` kirletiyor ve `nextExpiry()` anına bir
`setTimeout` kuruyor. O an `expire()` çalışıp katmanları bir kez daha kirletiyor.
Boşta hiçbir kare planlanmıyor (00-ilkeler §2.2 korunuyor).

**Çözümsüz.** DOM'daki 600 ms'lik `transition`lar (arka plan/kenar/gölge geçişi ve
girdapların `scale`i) canvas'ta yok; etkin duruma ve dinlenmeye ANINDA geçiliyor.
Bu, faz 05'in hareket/geçiş altyapısına ait.

---

## 5. Plan ile kodun çeliştiği yerler (proje sahibi "DOM'u birebir izle" dedi)

00-ilkeler §4 "görüntü değişmeyecek" diyor; plandaki tablo ise kodda karşılığı
olmayan süsler sayıyor. Proje sahibinin kararıyla **kaynak dosya esas alındı**.
Sapmalar:

| Plan der ki | Kodda durum | Yapılan |
|---|---|---|
| `power`: `cell.isElectrified` görünümü değiştiriyor → `key()`'e girmeli | `powerCellRenderer.tsx` `isElectrified`'ı **hiç okumuyor** | `key()`'e girmedi; test bunu kilitliyor |
| `power`: `power-ring-active`, `power-bolt-active` süsleri | Bu sınıflar **hiçbir** çizicide kullanılmıyor | Süs çizilmedi; `power` ambient kaydı yok |
| `toggle`: `toggle-symbol-active` süsü | Sınıf **hiçbir** çizicide kullanılmıyor | Süs çizilmedi |
| `target`: `target-pulse-blue` (legacy simgesi bu sınıfı alıyor) | Sınıfın `@keyframes` gövdesi **hiçbir yerde tanımlı değil** → DOM'da da durağan | `legacy` teması animasyonsuz; `targetIsAnimated` orada `false` |
| `target`: `target-pulse-green` | Hiç kullanılmıyor | Yok sayıldı |

Her dosyanın başlığında bu gerekçe yazılı. **Bunlar DOM tarafında birer eksik
olabilir** (yazılmış ama bağlanmamış süsler); Faz 08'de DOM yolu kapanmadan önce
proje sahibinin bakması gereken bir liste.

Plan §2 tablosunun saymadığı ama anahtara giren iki alan:

- `control_switch` → `customData.action`: hücrenin ALT ETİKETİNİN metni. Anahtara
  girmezse iki farklı etiket aynı sprite'ı paylaşırdı (00-ilkeler §3.1 ihlali).
- `teleport` → `customData.isIn`: iki simgeyi ve renk yoğunluklarını değiştiriyor.

Plan §2 satır 5'in sorduğu soru (`customData.group` renk mi belirliyor?) kaynakta
yanıtlandı: `GROUP_COLOR[group]` hücrenin BÜTÜN renklerini üretiyor → **anahtara
girer**.

---

## 6. `cells/common.ts` — neden `paintTokens.ts`'e değil

Plan §3 "`paintTokens.ts`'e yeni yardımcı eklemek" i kapsam dışı sayıyor, o yüzden
oraya dokunulmadı. Sekiz dosyanın tekrar eden birkaç satırı `cells/common.ts`'te
toplandı. Buradakiler tema jetonu ÇEVİRMİYOR (o iş `paintTokens`'ın); hepsi
`paintTokens`'ın üstüne kuruluyor:

`CELL_BOX`, `CELL_CENTER`, `FONT_STACK`, `ROTATION`, `DIR_LETTER`, `directionOf`,
`outerPad`, `clipCell`, `drawText`, `measureText`, `drawIconGlow`, `cssBezier`,
`strokeArc`, `strokeDashedRect`.

`cssBezier` üç hücrenin (`ice`, `target`, `teleport`) ortak ihtiyacıydı; üçüncü
kopya yerine buraya alındı ve `ice.ts`'teki `easeInOut` ona delege edildi.
**00-ilkeler §3'te easing'in evi `motion.ts` (Faz 05) — o dosya açılınca taşınmalı.**

---

## 7. `parseCssColor` genişletmesi

Kaynak dosyalarda `${powerColor}80` gibi **8 haneli** hex jetonları var
(`#fbbf2480`). `parseCssColor` yalnızca 3 ve 6 haneyi tanıyordu; tanımadığı rengi
`innerShadow` sessizce atlıyordu, yani `power`, `toggle`, `conveyor` ve
`trampoline` hücrelerinin iç gölgeleri **hiç çizilmeyecekti**. Regexler 4 ve 8
haneyi (alfa kanalı) de kabul edecek şekilde genişletildi.

Bu, var olan bir çözümleyicideki boşluğun kapatılmasıdır, `paintTokens`'a yeni
yardımcı eklemek değil — plan §3'e takılmıyor.

---

## 8. `cache.size()` ölçümü — **kriter karşılanmadı, sebebiyle birlikte**

Ölçüm, on iki tipin her birinden birer hücre içeren tek bir tahtanın ürettiği
FARKLI anahtar sayısını `key()` fonksiyonlarından saydırarak yapıldı (önbellek
boyutu tanımı gereği farklı anahtar sayısıdır). Geçici ölçüm dosyası ölçümden
sonra silindi.

| Senaryo | `legacy` | Tema (ör. `neon`) |
|---|---|---|
| Boştaki tahta (hiçbir hücre dolu/etkin değil) | **12** | **24** |
| Aynı anda hepsi yoğun (buz dolu + konveyör elektrikli/etkin + teleport etkin) | 12 | **60** |
| Bir oturum boyunca birikebilecek TAVAN (bütün varyantlar görülmüş) | 13 | **69** |

Tip başına tavan (temalı): `ice=14`, `conveyor=15`, `teleport=14`, `target=13`,
`power/toggle/control_switch/direction_deflector/trampoline=2`, `normal/obstacle/forbidden=1`.

**Kriter "60'ın altında" diyordu; tavan 69.** Plan §4 bunu §2.1'in çiğnenmesine
bağlıyor, ama çiğnenmedi ve bunu testler kilitliyor: hiçbir `key()` `cell.id`,
`cell.position`, `customData.explored`, `customData.trailPlayerIndex` veya
`customData.cableConnections` içermiyor; `power` `isElectrified`'ı, `conveyor`
sönükken `isActive`'i, `legacy` teması `action`/`mapping`/`isActive`'i anahtara
almıyor.

Gerçek sebep aritmetik: Faz 02'de **bir** animasyonlu tip vardı (`ice`), Faz 03
sonunda **dört** var (`ice`, `conveyor`, `teleport`, `target`). 00-ilkeler
§3.2'nin dayattığı 12 fazla birlikte yalnızca ambient sprite'lar 4 × 12 = **48**
yapıyor; üstüne 12 gövde eklenince taban zaten 60. 60 bütçesi, dördün animasyonlu
olacağı bilinmeden konmuş.

Pratikte ekranda duran sayı **24**'tür; 60'a ancak dört tipin dördü de aynı anda
etkinken ve 12 fazın hepsi ziyaret edilmişken çıkılır. Önbellek şu an sınırsız
(`spriteCache.ts` ayıklama yapmıyor, yalnızca 600'de uyarıyor), bu yüzden tavan
oturum boyunca birikerek gerçekten görülebilir.

**Kendiliğimden düzeltmedim**: 69'u 60'ın altına indirmenin tek yolu ya faz
sayısını düşürmek (00-ilkeler §3.2'yi değiştirmek) ya da önbelleğe ayıklama
eklemek (`spriteCache.ts`'in açık kararına aykırı) — ikisi de bu fazın işi olmayan
mimari kararlar. Bütçenin 80'e çekilmesini veya önbelleğe LRU sınırı konmasını
öneriyorum; karar proje sahibinin.

---

## 9. Kontroller (00-ilkeler §6)

| Kontrol | Sonuç |
|---|---|
| `npx tsc --noEmit` | ✅ temiz |
| `npm test` | ✅ 33 dosya / 290 test geçti; `render/cells/` altındaki iki test dosyası 55 test |
| `npm run lint` | ✅ 431 hata / 13240 uyarı — **taban değerle aynı**; `render/` ve `dev-cell-compare/` 0 |
| `npm run build:mobile` | ✅ derleme + `cap sync` başarılı |
| `grep -rn "shadowBlur\|ctx\.filter" src/game-engine/render/cells/` | ✅ **çıktı boş** |

Bütün parlamalar `paintTokens.outerGlow` / `paintBox` / `outerShadows` üzerinden
geçiyor.

---

## 10. Karşılaştırma yüzeyi

`http://localhost:3000/dev-cell-compare/` Faz 03'te genişletildi:

- 12 tipin **23 varyantı** (iki `teleport` grubu, iki `target` oyuncusu, elektrikli
  ve sönük konveyör, dolu/boş çiftleri, iki `direction_deflector` eşlemesi).
- **"etkin durum"** düğmesi: açıkken DOM tarafı 300 ms'de bir gidip gelen bir
  varlıkla sürekli tetikleniyor (zamanlayıcılar 500–800 ms olduğu için hâl hiç
  sönmüyor), canvas tarafına da `isActive: true` veriliyor. Üç geçici tip satır
  başlığında ⏱ ile işaretli.
- **"animasyon: açık/kapalı"** düğmesi `ambientMode='on'`/`'off'` karşılığı:
  kapalıyken canvas `BASE_PHASE`i, DOM `data-board-ambient="off"` ile
  `animation: none`u kullanıyor.
- Sayfadaki bütün hücreler **tek** sprite önbelleğini paylaşıyor ve doluluk
  başlıkta canlı gösteriliyor (§8 ölçümünün gözle doğrulanabilir hâli).
- Göz kırpma modu ve 1x/2x/4x/6x yakınlaştırma Faz 02'den olduğu gibi duruyor.

Beş temanın hepsi düğmelerden seçilebiliyor. **Gözle ayırt edilemezlik kontrolü
proje sahibine ait** (plan §5); bu rapor onun yerine geçmiyor.

---

## 11. Bilinen görsel farklar

| Nerede | Fark | Sebep |
|---|---|---|
| `teleport` | Nabız halkası ve iç girdap DOM'dakinden farklı ritimde | Tek periyoda örnekleme (§2) |
| `teleport` | Etkin duruma/dinlenmeye anında geçiş | DOM'daki 600 ms `transition` karşılığı yok (§4) |
| `target` | Halka %10 yavaş dönüyor | 90°/periyot adımı (§3) |
| `trampoline` | `trampoline-spring-active` tek atımlık ezilme yok | Plan bu hücreyi "süsü yok" sayıyor; etkin hâl animasyonun BİTİŞ görünümünde çiziliyor |
| `conveyor` (legacy) | Sönük oklar `filter: grayscale(0.5)` yerine elle hesaplanmış gri karışımı | `ctx.filter` yasak; sRGB parlaklığıyla (0.2126/0.7152/0.0722) aynı sonuç hedeflendi |
| Tüm hücreler | `backdrop-filter: blur(4px)` yok | Faz 02'den devam (02-rapor §4) |
| Metin | Yazı tipi `Arial, Helvetica, sans-serif` (globals.css gövdesi) | Canvas `font` dizgisi kalıtım yapmıyor, elle yazıldı |

Metinlerin dikey yeri: DOM'da flex ile ortalanmış bir `<span>`'in em-ortası satır
kutusunun merkezine denk gelir (satır yüksekliği ne olursa olsun), bu yüzden
canvas'ta `textBaseline: 'middle'` + kutu merkezi birebir aynı yere düşüyor. İki
satırlı yığınlar (`teleport`, `control_switch`, `direction_deflector`) için
merkezler `line-height` ve `margin-top` değerlerinden hesaplanıp sabit olarak
yazıldı; `line-height: normal` 1.15em kabul edildi.

---

## 12. Faz 04'e devredilen

- `cells/common.ts`'teki `cssBezier` → Faz 05 `motion.ts`'e taşımalı.
- §8'deki önbellek bütçesi kararı (60 → 80 mi, LRU mu?).
- §5'teki bağlanmamış DOM süsleri listesi (DOM tarafında eksik olabilir).
- `isActive`'in kaynağı şu an yalnızca `BoardCanvas`; Faz 04 iz/kablo çizerken
  aynı takipçiyi kullanmak isterse `cells/activity.ts` hazır.
