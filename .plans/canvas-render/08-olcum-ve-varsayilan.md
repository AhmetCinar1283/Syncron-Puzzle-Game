# 08 — Ölçüm, Varsayılanın Çevrilmesi ve Temizlik

> Bağlayıcı: `.plans/canvas-render/00-ilkeler.md`. Önce `raporlar/01..07-rapor.md`
> dosyalarının **hepsini** oku.
> **Model: opus.** Bu fazda "yeterince iyi mi" kararı veriliyor ve üretim yolu
> değiştiriliyor. Yanlış karar, iyileştirme sanılan bir gerileme demek.

---

## 1. Okuyacağın dosyalar

| Dosya | Neden |
|---|---|
| `.plans/canvas-render/00-ilkeler.md` ve `raporlar/` altındaki 7 rapor | İzin tamamı; özellikle "Görsel farklar" başlıkları |
| `src/game-engine/render/boardRenderer.ts` | Varsayılanı çevireceğin yer |
| `src/game-engine/render/BoardCanvas.tsx` | Ölçüm kancalarını ekleyeceğin yer |
| `src/game-engine/components/play-screen/BoardArea.tsx` | İki yolun ayrıldığı nokta |
| `src/lib/motionTier.ts` | `lite` kademesinin canvas'ta ne anlama geleceği |

---

## 2. Yapılacaklar

### 2.1 Ölçüm kancası — `render/profiler.ts`

Geliştirme ve cihaz testi için, **üretimde kapalı** bir ölçüm katmanı:

```ts
/** `userStorage`'da `boardProfiler='1'` iken açılır. Kapalıyken sıfır maliyet. */
export function isProfilerEnabled(): boolean;
export function recordFrame(layer: LayerName, ms: number): void;
export function frameStats(): { layer: LayerName; avg: number; p95: number; count: number }[];
```

`BoardCanvas` bu istatistikleri, profiler açıkken tahtanın köşesinde küçük bir
DOM katmanında gösterir: her katmanın ortalama ve p95 kare süresi, saniyedeki
çizim sayısı, `cache.size()`.

**Kapalıyken hiçbir `performance.now()` çağrısı yapılmamalı** — ölçümün kendisi
ölçtüğü şeyi bozmasın. `isProfilerEnabled()` bir kez okunup modül seviyesinde
saklanır.

### 2.2 Karşılaştırmalı ölçüm — proje sahibiyle birlikte

Ajan tek başına yapamaz. Ajanın işi: **ölçüm protokolünü rapora yazmak** ve
proje sahibinden gelen sayıları rapora işlemek.

Protokol:

1. `npm run build:mobile` + Android Studio'dan giriş seviyesi telefona kur.
2. Aynı üç bölümü iki modda da oyna:
   - kalabalık, süslü, çok odalı bir bölüm,
   - sisli bir bölüm,
   - 4-5 oyunculu, zaferle biten bir bölüm.
3. Her modda kaydet: ortalama kare süresi, p95, zafer koreografisi sırasındaki en kötü
   kare, 5 dakika oynadıktan sonra telefonun sıcaklığı ve şarj düşüşü.
4. Ayrıca **boşta bekleme**: bölüm açık, hiç dokunmadan 2 dakika. DOM modunda CSS
   animasyonları yüzünden sürekli çizim bekleniyor; canvas modunda `ambientMode='on'`
   ile 20fps, `'off'` (lite kademe) ile **sıfır** çizim bekleniyor.

### 2.3 Karar

Rapora net bir karar yazılır. Ölçütler:

| Ölçüt | Eşik |
|---|---|
| Oynanışta p95 kare süresi | Canvas, DOM'un altında olmalı |
| Zafer koreografisinin en kötü karesi | Canvas'ta 16.7ms'yi aşmamalı |
| Boşta çizim | Canvas'ta `lite` kademede sıfır olmalı |
| Görsel fark | Raporlarda biriken farkların hiçbiri proje sahibince "kabul edilemez" işaretlenmemiş olmalı |

Hepsi sağlanıyorsa varsayılan çevrilir. Biri sağlanmıyorsa **çevrilmez**; eksik
rapora yazılır ve proje sahibine sorulur. Bayrak zaten var, kimse engellenmiyor.

### 2.4 Varsayılanın çevrilmesi

`detectBoardRenderer()` varsayılanı `'canvas'` olur. `'dom'` bir **kaçış yolu**
olarak kalır:

- `userStorage`'da `boardRenderer='dom'` yazılırsa DOM yoluna döner,
- `getContext('2d')` başarısız olursa otomatik DOM'a düşer (Faz 07 §2.4).

### 2.5 `lite` kademesi canvas'ta ne demek

`motionTier === 'lite'` bugün ambient animasyonları kapatıyor. Canvas'ta ek olarak:

- `ambient` katmanı hiç oluşturulmaz (tuval bile yaratılmaz),
- DPR üst sınırı 2 yerine **1.5**'e çekilir,
- zafer koreografisinde parçacık sayısı düşürülür mü? **Hayır** — proje sahibinin
  talimatı görüntünün değişmemesi. Sorulmadan yapma.

### 2.5b Sprite belleği ölçümü

Sayısal önbellek tavanları 00-ilkeler §3.1'de kaldırıldı; yerine **bellek** ölçülür.
`profiler.ts`'e ekle:

```
toplam ≈ Σ (sprite genişliği × yüksekliği × dpr² × 4 bayt)
```

Faz 03 sonunda hücre sprite tavanı 69'du; Faz 04–06 iz/kablo/kenar/oyuncu ve
bulanık iz varyantlarını ekleyecek. Giriş seviyesi telefonda toplamı raporla.
Eşik: **20MB'ı aşıyorsa** proje sahibine bildir ve seçenekleri sun (faz sayısını
düşürmek, dönen süsleri tek sprite + `ctx.rotate`'e çevirmek, DPR sınırını 1.5'e
çekmek). Aşmıyorsa dokunma.

### 2.5c Geliştirme route'u üretim build'ine sızmasın

Faz 03 `src/app/dev-cell-compare/page.tsx` sayfasını açtı — doğru bir karar, ama
bu bir **geliştirme** yüzeyi. `scripts/portal/package-portal.mjs` admin ve editör
ekranlarını dışarıda bırakıyor; bu route'u da bırakıp bırakmadığını **doğrula**.

Yap:

1. `npm run build:crazygames` ve `npm run build:gd` çıktılarında
   `dev-cell-compare` var mı, kontrol et.
2. `npm run build:mobile` sonrası `android/app/src/main/assets/public/` altında
   var mı, kontrol et.
3. Sızıyorsa: paketleyicinin dışlama listesine ekle **veya** sayfayı
   `NEXT_PUBLIC_PLATFORM === 'web'` dışında render etmeyecek şekilde kapat.
   Hangisini seçtiğini rapora yaz.

Aynı kontrolü ileride açılacak her `dev-*` route'u için geçerli bir kural olarak
`render/README.md`'ye (§2.7) yaz.

### 2.5d Proje sahibine sunulacak iki liste

**(a) DOM'da bağlanmamış süsler.** Faz 03 (§5) şunların `animationStyles.ts`'te
tanımlı ve `AMBIENT_CLASSES`'ta listeli olduğunu ama **hiçbir çizici tarafından
uygulanmadığını** buldu:

- `power-ring-active`, `power-bolt-active`
- `toggle-symbol-active`
- `target-pulse-green`
- `target-pulse-blue` (uygulanıyor ama `@keyframes` gövdesi hiçbir yerde tanımlı değil)

Yani bu animasyonlar **bugün de çalışmıyor**; canvas onları çizmiyor çünkü DOM da
çizmiyor. Kasıtlı mı, yoksa kopmuş bir bağ mı — karar proje sahibinin. Ajan
**düzeltmez**, listeyi rapora taşır.

**(b) Birikmiş görsel farklar.** 02-rapor §4, 03-rapor §11 ve sonraki raporların
"Görsel farklar" başlıkları tek bir tabloda birleştirilir. Bilinen başlıklar:
`innerShadow`'un doğrusal solması ve köşe koyulaşması, `backdrop-filter`'ın yok
sayılması, `teleport` nabız ritmi, `target` halkasının %10 yavaşlığı, geçici
hâllerin `transition`sız ani geçişi, `conveyor` gri karışımı, yazı tipi.

Her satır için proje sahibinden **kabul / düzelt** işareti alınır. §2.3 kararı
bu işaretler olmadan verilemez.

### 2.6 Temizlik

Bu fazda silinecekler — **yalnızca canvas varsayılan olduktan ve ölçüm geçtikten sonra**:

- Faz 01 §3.7'de kabul edilen `BoardCanvas` / `GameBoard` kare oynatma mantığı
  tekrarı: ortak kısım `src/game-engine/hooks/useFilmPlayback.ts`'e çıkarılır ve
  iki bileşen de onu kullanır. (`GameBoard` hâlâ kaçış yolu olduğu için silinmiyor.)
- Kullanılmayan hâle gelmiş `render/` yardımcıları.

**Silinmeyecekler** (00-ilkeler §5): `GameBoard.tsx`, `BoardCell.tsx`,
`RoomOverlays.tsx`, `physicsWrapper.tsx`, `VictoryCelebration.tsx`,
`components/cells/`, `entities/`. Hepsinin ya kaçış yolunda ya editörde/menüde
kullanıcısı var. Silmeden önce `grep` ile teyit et; gerçekten kullanıcısı kalmamış
bir dosya bulursan **silme, rapora yaz** — proje sahibi karar versin.

### 2.7 Belgeleme

`src/game-engine/render/README.md` yaz (kısa, ~60 satır):

- üç katman ve bütçeleri,
- sprite atlası kuralı ve neden `shadowBlur` yasak,
- yeni bir hücre tipi eklerken yapılacaklar (iki yerde: DOM çizici + canvas sprite),
- bayrak ve profiler nasıl açılır.

Bu, 00-ilkeler §5'teki "iki kaynak" riskine karşı tek gerçek savunma.

---

## 3. Kapsam dışı

- Editör, menü veya önizlemeleri canvas'a taşımak.
- Yeni görsel özellik.
- Yeni bağımlılık.
- Ölçüm eşikleri sağlanmadan varsayılanı çevirmek.

---

## 4. Kabul kriterleri

- [ ] `profiler.ts` yazıldı; kapalıyken ölçüm yapmıyor, açıkken katman başına
      avg/p95/sayı gösteriyor.
- [ ] §2.2 protokolü uygulandı ve **gerçek sayılar** rapora işlendi.
- [ ] §2.3 kararı rapora yazıldı, gerekçesiyle.
- [ ] Karar olumluysa varsayılan `'canvas'`; `boardRenderer='dom'` hâlâ çalışıyor.
- [ ] `getContext('2d')` başarısızlığında DOM'a düşüş çalışıyor.
- [ ] `useFilmPlayback` çıkarıldı; `GameBoard` ve `BoardCanvas` aynı oynatma
      mantığını paylaşıyor ve ikisi de çalışıyor.
- [ ] Sprite belleği ölçüldü ve raporlandı (§2.5b).
- [ ] `dev-cell-compare` route'unun portal ve Android build'lerine sızmadığı
      **doğrulandı** (§2.5c).
- [ ] §2.5d'deki iki liste rapora işlendi ve proje sahibinden işaret alındı.
- [ ] `src/game-engine/render/README.md` yazıldı.
- [ ] 00-ilkeler §6 tablosundaki dört kontrol yeşil.
- [ ] `raporlar/08-rapor.md` yazıldı; önceki yedi raporun "Görsel farklar"
      başlıklarının birleşik listesi içinde.

---

## 5. Elle kontrol (proje sahibi) — bu fazın asıl işi

Bu faz senin ölçümün olmadan **bitmez**. Ajan protokolü hazırlar, sayıları sen
üretirsin:

- Giriş seviyesi telefona iki modu da kur, §2.2'deki üç bölümü oyna.
- Özellikle şunlara bak: hamle akıcılığı, zafer koreografisi, 5 dakika sonra
  telefonun arkası, şarj yüzdesi.
- Canvas modunda gözüne çarpan **her** görsel farkı not et; raporlardaki
  "Görsel farklar" listesiyle karşılaştır. Listede olmayan bir fark varsa,
  o bir hatadır.
