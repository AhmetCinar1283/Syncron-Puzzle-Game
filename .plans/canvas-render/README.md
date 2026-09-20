# Canvas Render İzi

Oyun tahtasının **DOM + CSS**'ten **`<canvas>`**'a taşınması. Hedef: giriş seviyesi
Android WebView'de oynanışta ve zafer koreografisinde **kesintisiz 60fps**, boştayken
**sıfır çizim** (ısınma ve şarj tüketimi yok).

Bu iz oyunun görüntüsünü **değiştirmez**. Her faz, mevcut DOM çıktısının piksel
karşılığını üretmekle yükümlüdür.

---

## Neden canvas — ve neyin karşılığında

Bugünkü darboğaz hesaplama değil, **boyama**. Tahtada ~100 DOM düğümü var; her biri
`box-shadow`, `inset` gölge, `drop-shadow`, `backdrop-filter` ve sonsuz döngüde CSS
animasyonu taşıyor. Bunların hepsi rasterizasyon işi ve çoğu her karede tekrar ediliyor.
Oyuncu ekrana hiç dokunmasa bile telefon 60fps boyama yapıyor.

Canvas bunu **kendiliğinden** çözmez. Naif bir port — her karede `ctx.shadowBlur` ile
parlama çizmek — bugünkünden **yavaş** olur; `shadowBlur` da bir Gauss bulanıklığıdır.
Kazanç yalnızca şu üç disiplinle gelir, ve bu izin tamamı bunların üzerine kurulu:

1. **Sprite atlası.** Her farklı hücre görünümü, ekran dışı bir tuvale **bir kez**
   rasterize edilir. Kare başına iş `drawImage` — saf blit, sıfır gölge hesabı.
2. **Boşta durmak.** Hareket ve animasyon yoksa RAF döngüsü durur. Bu, ısınma ve şarj
   sorununun asıl cevabı; DOM'da CSS animasyonu varken bu mümkün değil.
3. **Katman ayrımı.** Statik tahta yalnızca ızgara değişince, süsler düşük kare hızında,
   aktörler tam hızda çizilir. DOM'da böyle bir bütçe ayrımı yapılamıyor.

Bu üçü uygulandığında 10x10 bir tahtanın kare maliyeti ~100 `drawImage` + ~5 aktör olur;
giriş seviyesi bir cihazda bile kare bütçesinin küçük bir yüzdesi. Cevap net: **evet,
60fps akar ve boştayken telefonu ısıtmaz** — ama yalnızca bu üç kural bozulmazsa.

**Karşılığında ödenen bedel**, dürüstçe:

- CSS'in bedavaya verdiği her şey elle yazılacak: geçişler, easing, animasyon zamanlaması,
  isabet testi, DPR yönetimi, metin çizimi.
- **DOM hücre çizicileri silinmeyecek.** `CELL_RENDERERS`, `PlayerGraphic` ve `BoxGraphic`;
  editör (`GridCore`, `InactiveRoomPreview`, `paletteParts`), admin önizleme (`GridPreview`),
  ana menü (`BoardPlayerLayer`, `HeroPlayCell`) ve `LevelMiniPreview` tarafından da
  kullanılıyor. Bu iz yalnızca **oynanış tahtasını** taşır. Sonuç: hücre görünümünün iki
  kaynağı olur ve zamanla birbirinden kayabilir. Bunun bilinçli kabul edilmiş bir bedel
  olduğunu 00-ilkeler §5 yazıyor.

---

## Faz sırası

Sıra "sözleşmeyi önce dondur, sonra doldur" mantığıyla kuruldu. **Sırayı bozma.**

| # | Dosya | Konu | Model |
|---|---|---|---|
| 00 | `00-ilkeler.md` | Bağlayıcı ilkeler ve modül sözleşmesi — **her ajan önce bunu okur** | — |
| 01 | `01-render-cekirdegi.md` | Yüzey, zamanlayıcı, sprite önbelleği, ikon rasterizasyonu | **opus** |
| 02 | `02-hucre-cizim-deseni.md` | Tema jetonlarının canvas karşılığı + ilk 4 hücre (desen belirleyici) | **opus** |
| 03 | `03-kalan-hucreler.md` | Kalan 8 hücre tipi — desen belli, mekanik tekrar | **sonnet** |
| 04 | `04-overlay-katmanlari.md` | İz, kablo, kenar şeritleri, portal yolları, oda çerçevesi | **sonnet** |
| 04b | `04b-duzeltmeler.md` | Taşma payı, DPR'ye duyarlı gölge, çerçeve sprite'ı — **Faz 05'ten önce** | **sonnet** |
| 05 | `05-varlik-katmani.md` | Oyuncu/kutu çizimi + hareket, zıplama, çarpma, ölüm, ışınlanma | **opus** |
| 06 | `06-zafer-koreografisi.md` | `VictoryCelebration`'ın canvas portu | **opus** |
| 07 | `07-girdi-sis-dom-koprusu.md` | Swipe, sis geçişleri, ipucu işareti köprüsü, erişilebilirlik | **sonnet** |
| 08 | `08-olcum-ve-varsayilan.md` | Gerçek cihazda ölçüm, varsayılanın çevrilmesi, temizlik | **opus** |

Her faz bitince `raporlar/<numara>-rapor.md` yazılır. Sonraki faz o raporu okuyarak başlar.

> **Plan düzeltmeleri (Faz 03 sonrası).** İlk üç fazın raporları planın dört yerinde
> hata veya eksik buldu; hepsi düzeltildi:
> lint taban çizgisi (00-ilkeler §6), sprite önbelleği bütçesi (§3.1),
> `CellPaintInput.isActive` eklemesi (§3.1), katman çizicilerinin dönüş
> sözleşmesi (§3.4). Ayrıca `dev-cell-compare` route'unun üretim build'ine
> sızma riski ve DOM'da bağlanmamış süs listesi Faz 08'e madde olarak eklendi.
> Faz 04'ten itibaren başlayan ajanlar **güncel** 00-ilkeler'i okur.

> **Ara faz eklendi (Faz 04 sonrası).** 04-rapor üç gerçek sorun bildirdi:
> tuvalin tahta sınırında kenar etiketlerini kırpması, `shadowBlur`'ün dönüşüm
> matrisini yok sayması nedeniyle DPR 2'de parlamaların yarı yarıçapta çıkması,
> ve `static` katmanı artık her oyuncu adımında yeniden çizildiği için oda
> çerçevesinin gölgesinin ana yolda hesaplanması. Üçü de **`04b-duzeltmeler.md`**
> olarak ayrıldı ve Faz 05'ten önce çalıştırılır; 05 ve 06 bunların üstüne
> koordinat ve gölge ekleyeceği için sonraya bırakmak işi büyütür.
> 00-ilkeler §3.3 buna göre güncellendi (`BOARD_BLEED`, `setShadow`).

---

## Bir ajana görev verirken

Her faza **temiz bir ajanla** başla ve şu kalıbı kullan:

```
@.plans/canvas-render/<faz-dosyası>.md dosyası senin görevin.

Önce @.plans/canvas-render/00-ilkeler.md dosyasını oku — bağlayıcı.
Görev dosyasındaki "Okuyacağın dosyalar" listesi dışına çıkma; repoyu
serbestçe taramak yerine o listeyi oku, yeterli olmazsa bana sor.

Görevi eksiksiz uygula. Belirsizlik anında bana sor, varsayımla ilerleme.
Bitince 00-ilkeler.md §7'ye göre
.plans/canvas-render/raporlar/<numara>-rapor.md dosyasını yaz.
```

İkinci ve sonraki fazlarda bir satır ekle:

```
Başlamadan önce .plans/canvas-render/raporlar/ altındaki önceki raporları oku.
```

**Model seçimi tablodadır.** Sebebi: 01, 02, 05, 06 mimari karar veya zamanlama
matematiği içeriyor — yanlış kurulursa sonraki fazların hepsi yanlış kurulur.
03, 04, 07 desen tekrarı; ucuz model yeter.

---

## Bağlam bütçesi

Her faz dosyası, ajanın okuması gereken dosyaları isim isim sayar. Bu kasıtlı: bir
ajanın `grep -r` ile repoyu taraması, sonra 30 dosya açması, sonra işi yarılamadan
bağlamının dolması bu izin en büyük riski. **Ajan listedeki dosyaları okur, iş yapar,
rapor yazar.** Liste yetmiyorsa iş yapmaz, sorar.

Hiçbir faz 8'den fazla yeni dosya üretmemeli. Bir faz dosyası bundan fazlasını
gerektiriyorsa, faz yanlış bölünmüştür — proje sahibine bildir.

---

## Ajanın yapamayacağı iş

**Gerçek cihazda ölçüm.** Giriş seviyesi Android telefonda `npm run build:mobile` +
`cap open android` ile çalıştırıp kare hızına, ısınmaya ve şarj tüketimine bakmak
proje sahibinin işi. Ajanlar bunu raporlarına "senin yapman gereken" başlığıyla yazar.

**Nasıl ölçüleceği `olcum-rehberi.md`'de**: Chrome uzaktan hata ayıklama,
`adb shell dumpsys gfxinfo`, oyunun kendi profiler'ı, ısınma/şarj protokolü ve
Faz 08'e götürülecek karşılaştırma tablosu. Ölçüm **Faz 07'den sonra** anlamlı
(sis o zaman geliyor); `profiler.ts` de o yüzden Faz 08'den Faz 07'ye alındı.
