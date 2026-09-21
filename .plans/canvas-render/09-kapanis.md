# 09 — Kapanış: Katman Başına Pay, Varsayılanın Çevrilmesi, Temizlik

> Bağlayıcı: `.plans/canvas-render/00-ilkeler.md`. Önce `raporlar/08-rapor.md` oku.
> **Model: sonnet.** Bütün kararlar aşağıda verildi; bu faz yalnızca uygular.

Faz 08 kasıtlı olarak yarım kaldı: varsayılanı çevirmek proje sahibinin ölçümüne ve
işaretlerine bağlıydı. Bu faz o kararları uygular ve izi kapatır.

---

## 0. Başlamadan — proje sahibinden gelecek tek bilgi

Görev verilirken proje sahibi şunlardan **birini** yazar:

- **(a) Ölçüm sayıları:** en az "aynı bölümde DOM janky %X, canvas janky %Y" ve
  "boşta 30sn: DOM N kare, canvas M kare". Bunları `08-rapor.md` §5 tablosuna işle. Ölçüm yalnızca **telefonda** gerekir (masaüstü DOM'da kalıyor).
- **(b) "Ölçüm atlandı, seçimi etkinleştir"** — proje sahibinin kararıdır, sorgulama.
  Rapora aynen böyle yaz.

İkisi de yoksa §2.4'ü **yapma**, geri kalanını yap ve sor. (a)'da canvas DOM'dan
kötüyse §2.4'ü yapma, rapora yaz.

---

## 1. Okuyacağın dosyalar

| Dosya | Neden |
|---|---|
| `00-ilkeler.md`, `raporlar/08-rapor.md` | Sözleşme ve devir |
| `src/game-engine/render/surface.ts` | §2.1 — pay |
| `src/game-engine/render/BoardCanvas.tsx` | §2.1, §2.2, §2.5 |
| `src/game-engine/render/boardRenderer.ts` | §2.4 |
| `src/game-engine/render/victorySprites.ts` | §2.3 |
| 08-rapor §1.1'de anılan geçici DOM/CANVAS anahtarının dosyası | §2.5 |
| `eslint.config.mjs` | §2.6 |
| `src/game-engine/render/README.md` | §2.7 |

---

## 2. Yapılacaklar

### 2.1 Pay katmana göre verilir (08-rapor §6.2 — proje sahibinin kararı)

Faz 06 zafer koreografisi için payı `full` kademede 160px'e çıkardı ve bu **üç
tuvale birden** uygulandı. Oysa taşan tek şey zafer koreografisi, o da yalnızca
`actors` katmanında çiziliyor. `static` ve `ambient` 160px'lik payın bedelini
ödüyor ama onu hiç kullanmıyor.

Karar: **pay bir katman özelliğidir.**

| Katman | Pay |
|---|---|
| `static` | 32 (Faz 04b'deki değer: kenar etiketleri, oda dış parlaması) |
| `ambient` | 32 |
| `actors` | kademenin mevcut zafer payı (`full` 160, `lite` 64) — **değişmez** |

Mekanizma 00-ilkeler §3.3'teki ile aynı: her tuval kendi payı kadar büyür, kendi
payı kadar negatif kenar boşluğuyla kaydırılır, kendi dönüşümüne kendi payını
gömer. **Hiçbir çizim koordinatı değişmez** ve katmanlar ekranda hizalı kalır —
çünkü her birinin (0,0)'ı tahtanın (0,0)'ına oturur.

Hizalamayı bir testle kilitle: üç katman için hesaplanan CSS konumu + dönüşüm
sonrası tahta (0,0)'ı aynı ekran noktasına düşmeli.

Profiler'ın tuval belleği satırı katman başına payı yansıtmalı. 08-rapor §6.2
tablosunu yeni değerlerle yeniden hesaplayıp rapora yaz. Beklenen: 512×512 DPR 2'de
~20,7 MB, 640×640'ta ~29,2 MB.

**20 MB eşiği bundan sonra uygulanmaz.** Proje sahibi `full` kademede aşılmasını
kabul etti (08-rapor seçenek D); eşik bir tahmindi, ölçülmüş bir sınır değil.
Belleğin gerçekten dar olduğu cihazlar `lite` kademede.

### 2.2 Ekran okuyucu etiketi bir kez okunur (08-rapor §7.5 #34)

`role="img"` + `aria-label` **üç tuvalden birinde değil**, sarmalayıcı öğede olur;
üç tuval `aria-hidden="true"` alır.

### 2.3 Kullanılmayan iki sembol silinir (08-rapor §7.3)

`victorySprites.ts`'teki `victoryPlayerBox()` ve `VICTORY_HALF`. Silmeden önce
`grep` ile son kez teyit et.

### 2.4 Çizici cihaza göre seçilir — yalnızca §0 izin veriyorsa

**Karar (proje sahibi): DOM yalnızca cihazın güçlü olduğuna dair OLUMLU kanıt
varsa; belirsizlikte canvas.** Kasmama garantisi, görüntü sadakatinden önce gelir.

`detectBoardRenderer()` şu sırayla karar verir:

1. `userStorage`'da `boardRenderer` `'dom'`/`'canvas'` ise o kazanır.
2. **Aşağıdakilerin HEPSİ doğruysa `'dom'`:**
   - yerel uygulama (Capacitor) **değil**,
   - `matchMedia('(pointer: coarse)')` **eşleşmiyor** (birincil işaretleyici fare),
   - `navigator.hardwareConcurrency` **tanımlı** ve `> 4`,
   - `navigator.deviceMemory` **tanımlı** ve `> 4`,
   - `detectMotionTier() !== 'lite'`.
3. Aksi halde `'canvas'`.

**Kritik ayrıntı:** `motionTier.ts` eksik değerleri `8` sayıyor (`?? 8`). Bu karar
için **kullanma**: `deviceMemory` Firefox ve Safari'de yok, dolayısıyla onlar
"güçlü" görünürdü. Ham `navigator` değerlerini `boardRenderer.ts` içinde kendin
oku, `motionTier.ts`'e dokunma (00-ilkeler §8: `render/` dışı değişiklik yasak).
`detectMotionTier()`'ı yalnızca 5. koşul için çağır.

Sonuç, bilinçli kabul: Firefox ve Safari masaüstünde de canvas çalışır; DOM yalnızca
Chromium tabanlı, çok çekirdekli, RAM'i yeterli masaüstünde çalışır.

Karar **oturum başına bir kez** verilir; seviye ortasında çizici değişmez
(otomatik yükseltme hariç: Faz 11). `getContext('2d')` `null` → otomatik DOM
(Faz 07 §2.4).

**İlk kare.** Karar `window` gerektirir; ilk değer `'dom'` olursa telefonda bir kare
DOM tahtası çakar. Çözüm: `useBoardRenderer` `BoardRenderer | null` döndürür,
**`null` iken tahta hiç çizilmez** (aynı boyutta boş yer tutucu, yerleşim kaymaz).
Kararı `useLayoutEffect` içinde (boyamadan önce) ver; böylece kullanıcı yer
tutucuyu hiç görmez. Oyun ekranı istemci tarafı yükleniyorsa ve `BoardArea`
sunucuda üretilmiyorsa `useState(() => detectBoardRenderer())` daha da basit;
hangisinin geçerli olduğunu doğrula ve rapora yaz. Sunucu HTML'i ne olursa olsun
hiçbir tahta içermemeli — hidrasyon uyumsuzluğu çıkmamalı.

**Yan etki, bilinçli kabul:** masaüstünde geliştirirken DOM görülür; canvas'ta
bozulan bir şey ancak telefonda fark edilir. Geliştirme anahtarı (§2.5) bu yüzden
kalıyor ve `render/README.md`'ye (§2.7) şu kural yazılır: tahta görüntüsünü
etkileyen her değişiklik **iki yolda da** denenir.

### 2.5 Geçici DOM/CANVAS anahtarı

08-rapor §1.1'de oyun ekranına eklenen anahtar bu fazda **yalnızca geliştirme
build'inde** (`process.env.NODE_ENV !== 'production'`) görünür hâle gelir. Silme.
Faz 11 kullanıcıya dönük kalıcı bir ayar (Otomatik / DOM / Canvas) ekleyecek;
üretimdeki kontrol orada olacak, bu anahtar orada da geliştirme aracı olarak kalır.

### 2.6 Lint yoksayması (08-rapor §7.4)

`eslint.config.mjs` `globalIgnores`'a `out-crazygames/**` ve
`out-gamedistribution/**` eklenir. Bundan sonra lint tabanı değişecek; yeni
değerleri ölç ve 00-ilkeler §6 tablosunu güncelle.

### 2.7 Belgeleme

`src/game-engine/render/README.md`'ye iki satır:

- pay katman özelliğidir (§2.1),
- varsayılan `'canvas'`, `'dom'` bir kaçış yolu; nasıl zorlanacağı.

---

## 3. Proje sahibinin işaretleri — bilgi için, uygulanacak iş yok

08-rapor §7'deki listeler şöyle kapandı:

- **§7.1** (bağlanmamış 4 süs): **kalsın.** Oyuncu onları hiç görmedi; açmak yeni
  özellik olur.
- **§7.2** (iki DOM tuhaflığı): **kalsın.** İkisi DOM'da da var; bu izin konusu
  değil. `roomId`'siz bitişiklik ayrı bir hata olarak izlenecek.
- **§7.5**: #34 bu fazda (§2.2). #3, #7, #9, #12, #19, #21 **`10-davranis-farklari.md`**
  fazına ayrıldı. Kalanların hepsi **kabul**.

Bu işaretleri `08-rapor.md` §7 tablolarına işle ki iz tek yerde kapansın.

---

## 4. Kapsam dışı

- `10-davranis-farklari.md`'deki davranış farkları.
- 20 MB eşiği için başka bir optimizasyon.
- DOM çizicileri, editör, menü, önizleme.

---

## 5. Kabul kriterleri

- [ ] Pay katman başına; üç katman ekranda hizalı ve bunu bir test kilitliyor.
- [ ] Tuval belleği tablosu yeni paylarla yeniden hesaplandı ve rapora yazıldı.
- [ ] `aria-label` bir kez; tuvaller `aria-hidden`.
- [ ] İki kullanılmayan sembol silindi.
- [ ] §0 izin verdiyse çizici §2.4'teki sırayla seçiliyor; **eksik/tanımsız**
      `deviceMemory`/`hardwareConcurrency` `'canvas'` veriyor (Firefox, Safari);
      birim test bu tabloyu kilitliyor.
- [ ] `useBoardRenderer` karar verilene kadar `null`; hiçbir yolda yanlış çizicinin
      ilk karesi boyanmıyor; hidrasyon uyarısı yok.
- [ ] Elle `boardRenderer` yazmak ve `getContext` düşüşü hâlâ çalışıyor.
- [ ] Geçici anahtar üretimde görünmüyor, geliştirmede duruyor (Faz 11 yerine ayarı ekler).
- [ ] Lint yoksayması eklendi; 00-ilkeler §6 yeni tabanla güncellendi.
- [ ] 08-rapor §7 tabloları işaretlerle dolduruldu.
- [ ] 00-ilkeler §6 kontrolleri yeşil; `npm run build:mobile` başarılı.
- [ ] `raporlar/09-rapor.md` yazıldı.

---

## 6. Elle kontrol (proje sahibi)

- Uygulamayı temiz kurulumla aç: canvas'la mı açılıyor, açılışta bir an eski
  tahta görünüp kayboluyor mu?
- 4-5 oyunculu bir bölümü bitir: zafer parçacıkları eskisi kadar geniş yayılıyor mu
  (payı yalnızca `actors`'da kaldı, orada da aynı)?
