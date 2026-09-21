# Faz 08 Raporu — Ölçüm, Varsayılan ve Temizlik

> Plan: `.plans/canvas-render/08-olcum-ve-varsayilan.md` · Bağlayıcı: `00-ilkeler.md`
> Devir: `raporlar/07-rapor.md`

> **BU FAZ YARIM KALDI — kasıtlı olarak.** Planın kalbi §2.2 ölçümü ve §2.3
> kararıdır; ikisi de cihazda oynamayı gerektirir ve ajan yapamaz. Proje sahibi
> "ne sayıları, bence canvas mı DOM mu olsun play sayfasından seçilebilsin
> şimdilik geçici olarak" dedi. Buna göre:
>
> - **Varsayılan ÇEVRİLMEDİ** (`detectBoardRenderer()` hâlâ `'dom'`). Plan §3
>   "ölçüm eşikleri sağlanmadan varsayılanı çevirmek" maddesini kapsam dışı
>   sayıyor; eşikler ölçülmediği için çevirmedim.
> - Yerine, iki yolu cihazda tek dokunuşla karşılaştırmayı sağlayan **geçici bir
>   DOM/CANVAS anahtarı** oyun ekranına eklendi (§1.1).
> - §2.3 kararı, §2.5d'deki üç listenin işaretlenmesi ve §2.5b bellek eşiği
>   **proje sahibinde açık duruyor** (§6, §7).

---

## 1. Ne yapıldı

### 1.1 Oyun ekranında geçici DOM/CANVAS anahtarı (proje sahibi isteği)

| Dosya | Değişiklik |
|---|---|
| `components/play-screen/BoardRendererToggle.tsx` | **Yeni.** Tahta alanının sağ üstünde iki düğme: `DOM` / `CANVAS`. GEÇİCİ olduğu dosya başında yazılı |
| `render/boardRenderer.ts` | `useBoardRenderer()` → `useBoardRendererChoice()`: okuma + değiştirme. Değiştirici hem `userStorage`'a yazar hem durumu yerinde günceller, **sayfa yenilenmez** |
| `components/play-screen/BoardArea.tsx` | Anahtarı render eder, seçimi `BoardCanvas`/`GameBoard` seçimine bağlar |

Seçim kalıcıdır (sonraki açılışta da geçerli) ve konsol yolu (`boardRenderer`
anahtarı) aynen çalışmaya devam eder. Karar verilip varsayılan çevrildiğinde bu
bileşen ve `BoardArea`'daki çağrısı **silinecek**; bayrağın kendisi kaçış yolu
olarak kalacak (00-ilkeler §9).

> Uyarı: anahtar **oyun sırasında** değiştirilirse çizici bileşeni baştan bağlanır
> ve o anki film (`snapshots`) ilk karesinden yeniden oynar — ses ve titreşim de
> tekrarlanır. Oyun mantığı etkilenmez. Karşılaştırmayı hamleler arasında yapmak
> en temizi.

### 1.2 `lite` kademesi canvas'ta ne demek (plan §2.5) — **uygulandı**

Plandaki üç maddenin ikisi kod işiydi ve bu faza kadar yapılmamıştı:

| Madde | Durum |
|---|---|
| `ambient` katmanı hiç oluşturulmaz (tuval bile yaratılmaz) | ✅ `createSurfaces(host, names)` artık istenen katmanları kurar; `BoardCanvas` `lite` kademede `['static','actors']` verir. `Surfaces.layers` `Partial`, `Surfaces.names` gerçek listedir; `resize`/`clearLayer`/`labelSurfaces`/`dispose`/`surfaceBytes` bu listeyi gezer. Var olmayan katmanın çizim isteği sessizce yutulur |
| DPR üst sınırı 2 yerine **1,5** | ✅ `currentDpr(tier)`; `MAX_DPR_FULL = 2`, `MAX_DPR_LITE = 1.5` |
| Zafer parçacıklarını azaltmak | ❌ **Yapılmadı** — plan "sorulmadan yapma" diyor |

Kademe mount sonrası ölçüldüğü için yüzey kurulum efektine `motionTier`
bağımlılığı eklendi; kademe değişince tuvaller yeniden kurulur ve sahne
değişmeden yeniden çizilir (efekt sonunda `lastStatic/lastTheme/lastAmbientMode`
sıfırlanıp `invalidateAll` çağrılıyor — yoksa tahta ilk hamleye kadar boş kalırdı).

### 1.3 `useFilmPlayback` çıkarıldı (plan §2.6)

`src/game-engine/hooks/useFilmPlayback.ts` (**yeni**): kare ilerletme ve
zamanlama (`MIN/MAX_FRAME_MS`, `frameMs` formülü), kare başına ses
(`VFX_TO_SOUND`), dokunsal geri bildirim eşiği, ölüm/zafer bekleme süreleri ve
`onAnimationEnd`. Döndürdüğü: `currentFrame`, `frameMs`, `snapshot`,
`prevSnapshot`, `finalSnapshot`, `isPlaying`, `isVictoryActive`.

`GameBoard.tsx` ve `render/BoardCanvas.tsx` artık **aynı** hook'u kullanıyor;
Faz 01 §3.7'de bilinçli kabul edilen kopya (üç efekt + iki sabit + ses tablosu)
iki dosyadan da kaldırıldı. `GameBoard` silinmedi (00-ilkeler §5: kaçış yolu +
editör/menü kullanıcıları).

Tek davranış farkı: `onAnimationEnd` ref'i artık render sırasında değil bir
efektte güncelleniyor (`react-hooks/refs` kuralı). Senkron efekt sırası
korunuyor — ref güncelleyen efekt, ilerletme efektinden önce tanımlı.

### 1.4 Profiler'ın eksiği tamamlandı (plan §2.1, 07-rapor §9 devri)

- `surface.ts`: **`surfaceBytes(surfaces)`** — Σ tuval genişlik × yükseklik × 4.
- `ProfilerOverlay.tsx`: artık üç satır okunuyor —
  `sprite N ~X MB`, `tuval KxWxH ~Y MB`, `toplam ~Z MB`.
  Tuval sayısı `lite` kademede 2 olarak görünür (§1.2).
- `surface.test.ts`: `surfaceBytes` için 3 test (toplama, boş yüzey, kurulmamış
  katmanı saymama) + kademe payı karşılaştırması.

### 1.5 `dev-cell-compare` üretim build'lerine sızmıyor (plan §2.5c)

`src/app/dev-cell-compare/page.tsx`: sayfa `CURRENT_PLATFORM !== 'web'` iken
`null` döner (dış bileşen kapı, iç bileşen `CellCompare`). **Seçim gerekçesi:**
paketleyici dışlaması yalnızca portalı korur; Capacitor `out/` dizinini olduğu
gibi kopyaladığı için Android'i korumaz. Platform kapısı ikisini birden kapatır
ve yeni `dev-*` route'ları için tekrarlanabilir bir kuraldır.

### 1.6 `src/game-engine/render/README.md` yazıldı (plan §2.7)

Üç katman ve bütçeleri, "değişen yoksa çizim yok", sprite/anahtar sözleşmesi ve
`shadowBlur` yasağının gerekçesi + denetim `grep`'i, **yeni hücre tipi eklerken
iki yer**, bayrak ve profiler açma satırları, `dev-*` route kuralı.

### 1.7 Kapsam dışı ama zorunlu tek düzeltme

`src/features/levels/components/circuit/ConstellationCircuit.tsx`: `useCallback`
import satırına eklendi. Bu hata `tsc`'yi ve `build:mobile`'ı Faz 07'den beri
kırıyordu (07-rapor §7); §6 tablosunun iki satırı ve §2.5c'nin Android kontrolü
onsuz doğrulanamazdı. **Proje sahibi onayıyla** yapıldı, tek satır.

---

## 2. Ne yapılmadı ve neden

| İş | Neden |
|---|---|
| **§2.2 ölçümü** | Cihaz gerektirir. Protokol §5'te hazır, tablo boş duruyor |
| **§2.3 kararı** | Ölçüm olmadan verilemez (plan: "Biri sağlanmıyorsa çevrilmez") |
| **§2.4 varsayılanın çevrilmesi** | Aynı sebep. `detectBoardRenderer()` varsayılanı `'dom'` kaldı |
| **Kullanılmayan `render/` yardımcılarının silinmesi** | Plan §2.6 silmeleri "yalnızca canvas varsayılan olduktan ve ölçüm geçtikten sonra" diye kapılıyor. Bulunan ikisi §7.3'te listeli, **silinmedi** |
| **Zafer parçacık sayısının düşürülmesi** | Plan §2.5: "Sorulmadan yapma" |
| **§2.5d listelerindeki tuhaflıkların düzeltilmesi** | Plan: "Ajan düzeltmez, listeyi taşır" |
| **Görsel doğrulama** | Tarayıcı/cihaz yok. Bu raporda hiçbir "DOM ile ayırt edilemez" iddiası yoktur |

`useFilmPlayback` çıkarımı da teknik olarak aynı kapının arkasındaydı; yine de
yapıldı, çünkü (a) kabul kriterlerinde ayrı bir madde, (b) iki yolu da
koruyan, davranış değiştirmeyen bir taşıma, (c) §1.1'deki anahtar iki yolu
canlı karşılaştırılabilir yaptığı için oynatma mantığının tek kaynaktan gelmesi
karşılaştırmayı **daha** dürüst kılıyor.

---

## 3. Doğrulama (00-ilkeler §6)

| Kontrol | Komut | Sonuç |
|---|---|---|
| Tip denetimi | `npx tsc --noEmit` | ✅ **hatasız** (Faz 07'de 1 hata vardı, §1.7 ile kapandı) |
| Testler | `npm test` | ✅ **41 dosya / 419 test** geçiyor (Faz 07: 41 / 415; +4 `surfaceBytes`) |
| Lint (yeni/dokunulan kod) | `npx eslint` — `render/`, `hooks/useFilmPlayback.ts`, `GameBoard.tsx`, `BoardArea.tsx`, `BoardRendererToggle.tsx`, `dev-cell-compare/page.tsx` | ✅ çıktı boş |
| Lint (yalnız `src`) | `npx eslint src` | ⚠️ **160 hata / 53 uyarı** (Faz 07: 163/55; taban 154/52). Benim düzeltmemle 3 hata **azaldı**; tabana göre kalan fark bu izin dışındaki çalışma ağacı değişikliklerinden (07-rapor §7 aynı tespit) |
| Lint (tüm repo) | `npm run lint` | ⚠️ **356 hata / 6660 uyarı**. Taban (431/13240) ile **karşılaştırılamaz**: `eslint.config` `out/**`'ı yok sayıyor ama `out-<platform>/**`'ı saymıyor; portal build'i açıkken sayı 437/13981'e çıkıyor, `out-crazygames/` silinince 356/6660'a düşüyor. Kaynak kodda artış yok (kapsam dışı gözlem, §7.4) |
| Android build | `npm run build:mobile` | ✅ `Compiled successfully` → 34 statik sayfa → `cap sync` bitti |
| Portal build | `npm run build:crazygames` | ✅ `107 dosya, 4.09MB → dist-portals\crazygames.zip` |
| 00-ilkeler §2.1 | `grep -rn "shadowBlur\|ctx\.filter" src/game-engine/render/` | ✅ kod satırı yalnızca `paintTokens.ts:70` (`setShadow`) ve `cells/dim.ts:57-58` — ikisi de rasterleyici. Kare döngüsü temiz |

---

## 4. `dev-cell-compare` sızma kontrolü (plan §2.5c) — ölçülmüş çıktılar

| Hedef | Kapı öncesi | Kapı sonrası |
|---|---|---|
| `out-crazygames/` (portal paketi) | `dev-cell-compare/` **yok** (paketleyici beyaz listesi: `index.html`, `_next`, `sounds`, favicon) ve `_next` altında route parçası bulunamadı | Aynı: `grep -rl dev-cell-compare out-crazygames` → boş |
| `android/app/src/main/assets/public/` | `dev-cell-compare/index.html` **VAR ve doluydu** (sayfa render ediliyordu) | Dosya hâlâ üretiliyor (28 217 bayt boş kabuk) ama **içerik yok**: `grep -c "Hücre karşılaştırma"` → `0` |

Yani portal zaten korunuyordu, **Android korunmuyordu**; platform kapısı onu
kapattı. Kabuk HTML ve RSC `.txt` dosyaları hâlâ kopyalanıyor (Next `output:
export` her route için üretir, Capacitor `out/`u olduğu gibi kopyalar) — bu bir
yüzey değil, ~28 KB ölü ağırlık. Tamamen yok etmek `out/`u `cap sync` öncesi
budayan bir adım ister; **kapsam dışı bıraktım**, isterseniz ayrı bir iş olarak
eklenebilir.

Kural `render/README.md` §"`dev-*` route kuralı"na yazıldı.

---

## 5. Ölçüm protokolü (plan §2.2) — **proje sahibi doldurur**

Ayrıntılı kurulum `.plans/canvas-render/olcum-rehberi.md`'de. Kısası:

1. `npm run build:mobile` + Android Studio'dan giriş seviyesi telefona kur.
2. Oyun ekranının sağ üstündeki **DOM / CANVAS** anahtarıyla mod seç (§1.1).
   Profiler'ı açmak için konsola (sonra sayfayı yenile):

   ```js
   localStorage.setItem(`${localStorage.getItem('activeUserId') ?? 'anon'}:boardProfiler`, '1'); location.reload();
   ```
3. **Aynı üç bölümü, aynı hamlelerle, iki modda da** oyna:
   kalabalık/süslü/çok odalı · sisli · 4–5 oyunculu, zaferle biten.
4. Boşta bekleme: bölüm açık, hiç dokunmadan 2 dakika.

| Ölçüt | DOM | Canvas | Eşik (plan §2.3) |
|---|---|---|---|
| Ortalama kare süresi (kalabalık bölüm) | | | — |
| p95 kare süresi | | | Canvas < DOM |
| Janky kare yüzdesi (`dumpsys gfxinfo`) | | | Canvas < DOM |
| Zafer koreografisinin en kötü karesi | | | Canvas ≤ 16,7 ms |
| Boşta 2 dk'da çizilen kare sayısı (`lite`) | | | Canvas'ta **sıfır** |
| Boşta 2 dk'da çizilen kare sayısı (`full`) | | | Canvas'ta ≤ 20/sn (ambient) |
| 10 dakikada şarj düşüşü | | | — |
| Bitişte pil sıcaklığı | | | — |
| Profiler: `sprite N ~X MB` | — | | §6.2 |
| Profiler: `tuval KxWxH ~Y MB` | — | | §6.2 |
| Profiler: `toplam ~Z MB` | — | | ≤ 20 MB |

Dördüncü eşik (görsel farklar) §7'deki tabloların işaretlenmesiyle kapanır.

---

## 6. Bellek (plan §2.5b)

### 6.1 Sprite belleği

Profiler `spriteCache.bytes()`'ı gösteriyor: Σ sprite genişlik × yükseklik × 4,
tuvaller zaten DPR ölçekli olduğu için formüldeki `dpr²` içlerinde. Faz 07'nin
**sentetik** ölçümü (10×10 tek oda, DPR 2, gerçek cihaz yok): sissiz temalar
12–41 sprite / 0,86–3,24 MB; sisli en kötü durumda 65 sprite / **5,10 MB**.
Gerçek cihaz sayısı §5 tablosunda boş.

### 6.2 Tuval belleği — **eşik burada zorlanıyor, karar sizde**

Tuval belleği `3 × ((kenar + 2·pay) · dpr)² × 4` ile analitik hesaplanabilir
(`lite` kademede çarpan 3 değil 2, §1.2). Hesaplanmış tablo:

| Tahta | Kademe (pay) | DPR 1,5 | DPR 2 |
|---|---|---|---|
| 384×384 (6×6) | `lite` (64) | 4,50 MB* | — (DPR 1,5 tavanlı) |
| 384×384 | `full` (160) | 12,76 MB | 22,69 MB |
| 512×512 (8×8) | `lite` (64) | 7,03 MB* | — |
| 512×512 | `full` (160) | 17,82 MB | **31,69 MB** |
| 640×640 (10×10) | `lite` (64) | 10,13 MB* | — |
| 640×640 | `full` (160) | 23,73 MB | **42,19 MB** |

\* `lite` satırları iki katmanla (ambient yok) ve DPR 1,5 tavanıyla hesaplandı.
§1.2 öncesinde aynı tahtalar üç katman ve DPR 2 ile sırasıyla **12,00 / 18,75 /
27,00 MB** tutuyordu; `lite` kademede kazanç ~%62.

**Bulgu:** plan §2.5b'nin **20 MB eşiği `full` kademede orta ve büyük tahtalarda
aşılıyor** (sprite belleği hariç). Sebep sprite sayısı değil, Faz 06'da zafer
koreografisi için büyütülen **160 piksellik taşma payı** (`BOARD_BLEED_FULL`):
bellek payla karesel büyüyor. Plan bu durumda seçenek sunmamı istiyor:

| Seçenek | Kazanç | Bedel |
|---|---|---|
| **A.** `full` kademede de DPR tavanını 1,5'e çekmek | 512×512'de 31,7 → 17,8 MB | Yüksek DPR ekranlarda hafif yumuşama; sprite'lar da 1,5'te rasterize olur (bellek oradan da düşer) |
| **B.** `full` payını 160 → ~96'ya indirmek | 512×512 DPR 2'de 31,7 → 23,4 MB | Zafer parçacıkları ve şok dalgası daha erken kırpılır (06-rapor §5'teki fark büyür) |
| **C.** `ambient` katmanını `full` kademede de tek tuvale katlamak | ⅓ azalma | Katman bütçesi ayrımı kaybolur — 00-ilkeler §2.3'e aykırı, **önermiyorum** |
| **D.** Dokunmamak | — | Zayıf cihazda `lite` zaten devrede; 20 MB eşiği `full` için fazla katı olabilir |

Ajan kararı: **hiçbiri uygulanmadı.** Plan "aşıyorsa proje sahibine bildir ve
seçenekleri sun" diyor. Ölçüm sizde olduğu için gerçek cihazda hangi kademeye
düştüğünüzü görmeden A–D arasında seçim yapmak erken olur. Profiler artık
`toplam ~Z MB` satırını gösteriyor; telefonda okuyup buraya yazın.

---

### 6.3 Karar ve yeniden hesap (Faz 09 §2.1)

Proje sahibi **D**'yi seçti (dokunmamak); 20 MB eşiği artık uygulanmaz. Pay bir
**katman özelliği** oldu: `static`/`ambient` 32, `actors` kademenin payı
(`full` 160, `lite` 64). Yeni tuval belleği (sprite hariç):

| Tahta | Kademe | DPR 1,5 | DPR 2 |
|---|---|---|---|
| 384×384 | `full` | 7,70 MB | 13,69 MB |
| 512×512 | `full` | 11,64 MB | **20,69 MB** (eski 31,69) |
| 640×640 | `full` | 16,42 MB | **29,19 MB** (eski 42,19) |
| 512×512 | `lite` (2 katman, DPR 1,5 tavanı) | 6,36 MB | — |

## 7. Proje sahibine sunulan listeler (plan §2.5d)

### 7.1 (a) DOM'da bağlanmamış süsler — **kodda yeniden doğrulandı**

| Sınıf | Tanımlı mı | Uygulanıyor mu | Karar |
|---|---|---|---|
| `power-ring-active` | `animationStyles.ts:179` + `boardKeyframes.ts:43` | ❌ hiçbir çizici uygulamıyor | **Kalsın** (Faz 09 §3: açmak yeni özellik olur) |
| `power-bolt-active` | `animationStyles.ts:182` + `boardKeyframes.ts:44` | ❌ | **Kalsın** (Faz 09 §3: açmak yeni özellik olur) |
| `toggle-symbol-active` | `animationStyles.ts:214` + `boardKeyframes.ts:49` | ❌ | **Kalsın** (Faz 09 §3: açmak yeni özellik olur) |
| `target-pulse-green` | `globals.css:114,122` + `boardKeyframes.ts:47` | ❌ | **Kalsın** (Faz 09 §3: açmak yeni özellik olur) |
| `target-pulse-blue` | `globals.css:118,123` | ✅ `targetCellRenderer.tsx:26` | **karar gerekmiyor** |

> **Faz 03'ün tespitinde bir düzeltme.** 03-rapor `target-pulse-blue`'nun
> `@keyframes` gövdesinin "hiçbir yerde tanımlı olmadığını" söylüyordu; **yanlış** —
> `src/app/globals.css:118`'de tanımlı ve çalışıyor. Diğer dört satır doğru:
> bugün de çalışmıyorlar, canvas da çizmiyor. Karar sizin; ajan düzeltmedi.

### 7.2 (a2) DOM'dan birebir taşınan iki tuhaflık

| Tuhaflık | Nerede | Karar |
|---|---|---|
| İz ve kablo katmanları hücrelere göre kenarlık kalınlığı (2–3px) kadar kayık; aynı kayma varlıklarda da var (05-rapor §5: `PhysicsWrapper` oda `<div>`'inin dışında) | DOM: `RoomOverlays.tsx` + `physicsWrapper.tsx` · Canvas: `overlays/trails.ts`, `cables.ts`, `entities/` | **Kalsın** (Faz 09 §3) |
| İz kolunun oyuncuya bitişikliği `roomId`'ye bakmıyor → farklı odadaki oyuncu da bitişik sayılabiliyor | aynı | **Kalsın**; `roomId`'siz bitişiklik ayrı bir hata olarak izlenecek (Faz 09 §3) |

İkisi de DOM'da **bugün de** böyle (00-ilkeler §4 gereği birebir taşındı).

### 7.3 Kullanılmayan `render/` yardımcıları — **silinmedi, kararınız**

`grep` ile tüm `render/` dışa aktarımları tarandı; kullanıcısı olmayan **iki**
sembol kaldı, ikisi de `victorySprites.ts`'te:

- `victoryPlayerBox()` (satır 301)
- `VICTORY_HALF` (satır 306)

Dosya bazında kullanıcısı olmayan hiçbir modül yok. Plan §2.6 "gerçekten
kullanıcısı kalmamış bir dosya bulursan silme, rapora yaz" diyor; sembol
düzeyinde de aynısını yaptım. **Faz 09'da silindi** (`grep` ile kullanıcısız olduğu son kez teyit edildi; artık kullanılmayan `NATIVE_CELL_SIZE` içe aktarımı da gitti).

### 7.4 Kapsam dışı gözlemler

- `eslint.config.mjs` `out/**`'ı yok sayıyor ama `out-crazygames/**` ve
  `out-gamedistribution/**`'ı saymıyor; portal build'i duruyorken repo lint'i
  ~740 uyarı şişiyor ve taban karşılaştırması anlamsızlaşıyor. Tek satırlık bir
  `globalIgnores` eklemesi çözer — **Faz 09 §2.6'da eklendi**.
- Android build'inde `dev-cell-compare/` boş kabuğu duruyor (§4).

### 7.5 (b) Birleşik görsel fark tablosu — **her satıra kabul / düzelt işareti gerekiyor**

Plan §2.3 kararı bu işaretler olmadan verilemez. Kaynak: 01–07 raporlarının
"Görsel farklar" başlıkları. **Hiçbiri cihazda gözle doğrulanmadı**; hepsi kod
okumasından çıkan bilinen ayrışmalar.

| # | Nerede | Fark | Kaynak | Karar (proje sahibi) |
|---|---|---|---|---|
| 1 | Tüm hücreler | `innerShadow`'un bulanık biçimi Gauss yerine **doğrusal** soluyor; dört gradient köşelerde üst üste binip köşeleri hafif koyultuyor | 02 §4.1 | ☑ Kabul |
| 2 | Buz hücresi | `backdrop-filter: blur(4px)` **yok sayıldı** (arkasında bulanıklaştıracak içerik yok; Faz 02 kalıcı yok sayma öneriyor) | 02 §4.2 | ☑ Kabul |
| 3 | Buz hücresi | Dolu↔boş geçişi ani; DOM'da 200 ms `transition` | 02 §4.4 | **Düzeltildi (Faz 10 §2.4)** |
| 4 | Neon engel | Dış parlamanın Gauss sigması motor farkına açık (opaklık 0,15) | 02 §4.4 | ☑ Kabul |
| 5 | Blueprint buz/yasak | `dashed` kenarın tire **ritmi** tarayıcınınkinden ayrılabilir (`DASH_RATIO = 3`) | 02 §4.4, 05 §5 | ☑ Kabul |
| 6 | `teleport` | Nabız halkası ve iç girdap farklı ritimde (tek periyoda örnekleme) | 03 §11 | ☑ Kabul |
| 7 | `teleport` | Etkin duruma/dinlenmeye anında geçiş; DOM'da 600 ms `transition` | 03 §11 | **Düzeltildi (Faz 10 §2.4)** |
| 8 | `target` | Halka **%10 yavaş** dönüyor (90°/periyot adımı) | 03 §11 | ☑ Kabul |
| 9 | `trampoline` | Tek atımlık ezilme (`trampoline-spring-active`) yok; etkin hâl animasyonun bitiş görünümünde | 03 §11 | **Düzeltildi (Faz 10 §2.3)** — yayın `brightness(1.6→2)` parlaması hariç (10-rapor §4) |
| 10 | `conveyor` (legacy) | Sönük oklarda `filter: grayscale(0.5)` yerine elle hesaplanmış gri karışım | 03 §11 | ☑ Kabul |
| 11 | Tüm metinler | Yazı tipi elle `Arial, Helvetica, sans-serif`; canvas `font` kalıtım yapmıyor. İki satırlı yığınların merkezleri `line-height: normal = 1.15em` kabulüyle sabit yazıldı | 03 §11, 04 §5, 05 §5 | ☑ Kabul |
| 12 | Kontrol edilmeyen oda | Çerçeve 0,4 alfa **sprite bütününe** uygulanıyor (DOM'da grup opaklığı); `transition: opacity/box-shadow 0.25s` yok, geçiş ani | 04 §5, 04b §5 | **Düzeltildi (Faz 10 §2.4)** — çerçeve kenar rengi 250 ms'de gölgeyle birlikte yumuşar (10-rapor §4) |
| 13 | Kablo / iz | Düğüm ile şerit örtüşmesinde grup opaklığı yerine ayrı alfa (~4px'lik alan); sis altında (0,2 / 0,15) fark büyür | 04 §5, 07 §5 | ☑ Kabul |
| 14 | Kenar etiketi | İkon dairenin tam merkezinde; DOM'da `vertical-align: middle` (≤1px) | 04 §5 | ☑ Kabul |
| 15 | Oda başlığı | `ctx.letterSpacing` yoksa harf harf çizim → kerning kaybolur | 04 §5 | ☑ Kabul |
| 16 | Portal alt katmanı | SVG `blur(4px)` → `shadowBlur = 2σ × DPR` yaklaşımı | 04 §5 | ☑ Kabul |
| 17 | Süsler | Periyotlar CSS ile aynı ama **başlangıç fazı** tutmuyor (saat `now % periyot`) | 04 §5 | ☑ Kabul |
| 18 | Tüm parlamalar | `shadowBlur` dönüşüm matrisini yok sayar; Faz 04b öncesi rasterlerde DPR 2'de parlamalar yarı yarıçapta çıkabilir — **DPR 2 cihazda gözle bakılmalı** | 04 §5 | ☑ Kabul |
| 19 | Boşta duran oyuncu | **Göz kırpmıyor, neon ters mod halkası nabız atmıyor** (00-ilkeler §2.2'nin doğrudan sonucu: katman kirli değilken çizim yok) | 05 §5 | **Düzeltildi (Faz 10 §2.1)** |
| 20 | Göz kırpma | Ara kare yok: göz açık ya da kapalı | 05 §5 | ☑ Kabul |
| 21 | Ölüm / çarpışma | Renk ve parlama katmanları yok | 05 §5 | **Düzeltildi (Faz 10 §2.2)** — cihazda görülmedi (10-rapor §4) |
| 22 | Buzda kayma | `brightness(1.15) contrast(1.05)` yok | 05 §5 | ☑ Kabul |
| 23 | Ara kareler | Easing tüm animasyona bir kez uygulanıyor | 05 §5 | ☑ Kabul |
| 24 | Zafer parçacıkları | Tahtanın payı kadar dışında **kırpılıyor** (`full` 160px, `lite` 64px); DOM'da kırpma yok | 06 §5 | ☑ Kabul |
| 25 | Daire parçacık parlaması | `p.size` ile ölçekleniyor; DOM'da sabit 4px | 06 §5 | ☑ Kabul |
| 26 | Süpernova yıldızı | Kenarları DOM SVG'sinden daha yumuşak (1,7 kat büyütme kalıyor) | 06 §5 | ☑ Kabul |
| 27 | Şok dalgası parlaması | Gauss profili 9 gradient durağıyla yaklaşıklanıyor | 06 §5 | ☑ Kabul |
| 28 | Hayalet iz bulanıklığı | Üç kutu geçişi, gerçek Gauss değil (1,5–3,5px) | 06 §5 | ☑ Kabul |
| 29 | Zincirlenmiş `drop-shadow`lar | Her parlama şeklin kendisinden çiziliyor, bir öncekinin sonucundan değil | 06 §5 | ☑ Kabul |
| 30 | Zafer vignette'i | Yarı çözünürlükte rasterize edilip tam boyda blit ediliyor (7,91 → 1,98 MB) | 07 §4 | ☑ Kabul |
| 31 | Sis geçişi | Art arda hamlede hücre 0,3s'de yumuşak açılmak yerine ~1 tick sonra tam açılıyor (küresel ilerleme basitleştirmesi). **Uzun kaymada özellikle bakılmalı** | 07 §5 | ☑ Kabul |
| 32 | Karartma yedeği | `ctx.filter` desteklenmeyen WebView'de `source-atop` siyah örtü `contrast` tabanını taklit etmez (katsayı 0,7 **tahmin**, cihazda denenmedi) | 07 §2.2, §5 | ☑ Kabul |
| 33 | Yeni turun ilk karesi | Sis geçişsiz yazılıyor (eski bölümün sisinden animasyon oynamasın diye) | 07 §5 | ☑ Kabul |
| 34 | Tuval etiketi | Ekran okuyucu `aria-label`i üç kez okuyabilir | 07 §2.6, §5 | **Düzeltildi (Faz 09 §2.2)** |

**DOM'da da aynı olan, yani fark OLMAYAN** kalemler (bilgi için, işaret
gerekmez): zafer sırasında göz kırpma/nabzın donması (`animation: none`),
süpernova gradient'inin merkezinin sol üst köşede olması, zafer sırasında
kutuların çizilmeye devam etmesi, varlıkların 2–3px kayıklığı (#13 ile aynı
kök), keşfedilmemiş↔keşfedilmiş geçişinin anlık olması.

---

## 8. Kabul kriterleri — durum

- [x] Faz 07'nin `profiler.ts`'i kullanıldı; eksiği (tuval belleği) tamamlandı (§1.4)
- [ ] §2.2 protokolü uygulandı ve **gerçek sayılar** rapora işlendi → **§5 tablosu boş, sizde**
- [ ] §2.3 kararı → **verilemedi** (ölçüm yok)
- [ ] Varsayılan `'canvas'` → **çevrilmedi** (karar yok). `boardRenderer='dom'` çalışıyor, ayrıca ekrandan seçilebiliyor (§1.1)
- [x] `getContext('2d')` başarısızlığında DOM'a düşüş → kod ve testler yerinde (`surface.test.ts`); **cihazda denenmedi**
- [x] `useFilmPlayback` çıkarıldı; `GameBoard` ve `BoardCanvas` aynı mantığı paylaşıyor (§1.3). İkisinin de **çalıştığı** ancak cihazda/tarayıcıda görülür
- [x] Sprite belleği ölçüldü ve raporlandı; tuval belleği de (§6)
- [x] `dev-cell-compare` sızma kontrolü **yapıldı ve kapatıldı** (§4)
- [x] §2.5d listeleri rapora işlendi (§7.1–7.2) — **işaretler sizde**
- [x] `src/game-engine/render/README.md` yazıldı (§1.6)
- [x] 00-ilkeler §6 tablosu: tsc/test/yeni kod lint/Android build **yeşil** (§3)
- [x] `08-rapor.md` yazıldı; birleşik görsel fark listesi §7.5'te

---

## 9. Sizden beklenen (bu faz bununla biter)

1. **Ölç** — §5 tablosunu doldur (DOM/CANVAS anahtarı sağ üstte, profiler tek satır konsolla).
2. **İşaretle** — §7.5'teki 34 satır ve §7.1–7.2'deki listeler için kabul/düzelt.
3. **Karar ver** — §6.2'deki A–D bellek seçeneği.
4. Bunlar gelince varsayılanı çevirmek (§2.4) ve temizliği bitirmek (§7.3,
   geçici anahtarın silinmesi) kısa bir iş.

**Listede olmayan bir görsel fark görürsen, o bir hatadır** (plan §5).
