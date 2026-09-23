# `render/` — oynanış tahtasının canvas yolu

Bu klasör oynanış tahtasını `<canvas>` üzerine çizer. **Özellik eklemez, DOM'un
çizdiği görüntüyü daha ucuza çizer.** DOM yolu (`components/GameBoard.tsx`)
silinmedi: editör, menü ve önizlemeler onu kullanmaya devam ediyor ve o aynı
zamanda kaçış yolu. Bağlayıcı ilkeler: `.plans/canvas-render/00-ilkeler.md`.

Dışa açık tek giriş noktası `BoardCanvas.tsx`'tir.

## Üç katman, üç bütçe

| Katman | İçerik | Ne zaman çizilir |
|---|---|---|
| `static` | Hücre gövdeleri, iz, kablo, kenar şeritleri, oda çerçevesi | Yalnızca `rooms` referansı, tema, doluluk/oyuncu imzası veya sis sürümü değişince; ayrıca bir geçiş sürerken (aşağıda) |
| `ambient` | Animasyonlu hücre süsleri (buz, portal, konveyör, hedef) | `ambientMode === 'on'` iken **20fps'e kısılmış**; boşta oyuncunun göz kırpması/nabzı da bu bütçede |
| `actors` | Oyuncular, kutular, efektler, zafer koreografisi | Hareket/efekt sürerken tam hızda |

**Pay katman özelliğidir.** Her tuval tahtanın dışına kendi payı kadar taşar:
`static` ve `ambient` 32, `actors` kademenin payı (`full` 160, `lite` 64; zafer
koreografisi yalnızca orada çizilir). Çizim koordinatları değişmez; katmanlar
hizalı kalır (`surface.ts` `layerGeometry`, testle kilitli).

**Değişen yoksa çizim yok.** `scheduler.ts` kirli bayrağı üzerinden çalışır;
hiçbir katman kirli değilse `requestAnimationFrame` planlanmaz — döngü durur.
Isınma ve şarj tüketiminin asıl cevabı budur; "her kare çiz" diyen bir değişiklik
bu izin gerekçesini yok eder. Bir katmanın bir kare daha gerektiğini söylemesinin
yolu çizicisinden `true` dönmektir; süresi olan bir geçişin katmanı tutmasının
yolu ise bitiş damgasını `keepAlive.ts`'e yazmaktır (00-ilkeler §3.4).

## Sprite kuralı ve neden `shadowBlur` yasak

`ctx.shadowBlur`, `ctx.shadowColor` ve `ctx.filter` canvas'ın Gauss bulanıklığıdır
ve tam olarak bugün DOM'da ödediğimiz bedeldir. Bu yüzden **kare döngüsünde
çağrılmazlar**; yalnızca sprite rasterizasyonu sırasında, bir kez. Kare
döngüsünde serbest olanlar: `drawImage`, `setTransform`/`translate`/`scale`/
`rotate`, `globalAlpha`, `clearRect`, `save`/`restore`.

Denetim:

    grep -rn "shadowBlur\|ctx\.filter" src/game-engine/render/

Çıktıda yalnızca rasterleyiciler görünmeli (`paintTokens.setShadow`, `variants.ts`).
Gölge doğrudan atanmaz: `setShadow` DPR ile çarpar, çünkü gölge dönüşüm matrisini
yok sayar.

Her görünüm bir **anahtar** + **rasterleyici** çiftidir (`spriteCache.ts`,
`types.ts`). `key()` aynı görüntüyü veren her girdide aynı dizgiyi döndürmeli ve
içine `cell.id`, konum veya görüntüyü etkilemeyen `customData` **girmemeli** —
yanlış anahtar ya yanlış görüntü ya da sınırsız büyüyen önbellek demektir.
Animasyonlu süsler canlı hesaplanmaz, `PHASES = 12` faza örneklenir. Önbellekte
ayıklama/LRU yoktur (00-ilkeler §3.1); tema veya DPR değişince tamamen boşalır.

## Geçişler ve boşta animasyon

DOM'daki `transition`lar ve tek atımlık keyframe'ler canvas'ta şöyle karşılanır;
hiçbiri kare döngüsüne gölge/filtre sokmaz:

- **Çapraz geçiş** (`fades.ts`): buz dolu↔boş (200 ms), teleport etkin↔dinlenme
  (600 ms), oda kontrol edildi↔edilmedi (250 ms; opaklık ve çerçeve). Eski ve yeni
  hâlin sprite'ı zaten önbellekte; ara karelerde iki `drawImage` + `globalAlpha`.
  Süre ve `ease` DOM çizicilerinin `transition` değerlerinden alınır
  (`iceCellRenderer.tsx`, `teleportCellRenderer.tsx`, `GameBoard.tsx`).
- **Trambolin ezilmesi**: yalnızca yay ezilir; ezilme süresince gövde ve yay ayrı
  sprite'lar (`cells/trampoline.ts`), zamanlama `TRACKS.trampolineLaunch`.
- **Ölüm/çarpışma rengi ve parlaması** (`entities/effects.ts`, `variants.ts`):
  keyframe'in `filter` kısmı `TRACKS[...].layers` + durak başına `fx` ağırlığıdır;
  her katman bir sprite varyantı, zamanla değişen tek şey `globalAlpha`.
- **Tek "kirli tut" yeri** (`keepAlive.ts`): geçişi başlatan taraf bitiş damgasını
  yazar (sis geçişi dahil), `BoardCanvas` her çizimden sonra bakıp katmanı yeniden
  kirletir.
- **Boşta oyuncu** (`idle.ts`): göz kırpma ve neon nabzı ambient'in bütçesinde;
  `lite` kademede ve zafer sırasında hiçbir şey uyanmaz.

## Yeni bir hücre tipi eklerken — **iki yer**

Hücre görünümünün iki kaynağı var; ikisi de güncellenmezse yollar ayrışır.

1. **DOM**: `components/cells/` altına çizici + `CELL_RENDERERS` kaydı.
2. **Canvas**: `render/cells/<tip>.ts` içinde `SpritePainter` + `render/cells/index.ts`
   içindeki `CELL_SPRITES` kaydı (tam `Record`, eksik bırakılırsa derleyici hata
   verir). Süsü varsa ayrıca `CELL_AMBIENT_SPRITES`.

Renk ve ölçüler elden geldiğince `themes/themeConfig`'ten okunur, canvas koduna
sabit yazılmaz. DOM'daki bir değeri tahminle taşıma: kaynak dosyadaki değeri oku.
İki yolu yan yana görmek için `npm run dev` + `/dev-cell-compare`.

## Bayraklar

Üç seviye vardır: `dom` (Kalite), `hybrid` (Dengeli: tahta DOM, zafer animasyonu
`VictoryCanvas.tsx` ile canvas), `canvas` (Performans). Kullanıcı ayarı
(`graphics.renderer`) her zaman kazanır. Otomatik'te `boardRenderer.ts` şunu yapar:
cihaz kuralı (`classifyDevice`) başlangıç seviyesini verir, kasma dedektörünün
yazdığı üst sınır (`boardRendererAuto`: `'hybrid'` | `'canvas'`) onu yalnızca
AŞAĞI çeker.

Cihaz kuralı (her seviye olumlu kanıt ister):
- `dom`: masaüstü (ince işaretleyici, yerel değil), çekirdek > 4, RAM > 4, `lite` değil.
- `hybrid`: çekirdek > 4 ve `lite` değil; masaüstünde RAM bilinmiyorsa (Firefox/Safari)
  engel değil, telefon/yerel uygulamada RAM AÇIKÇA > 4 bildirilmeli.
- `canvas`: geri kalan her şey (zayıf, belirsiz).

Dedektör merdiveni (`jankMonitor.ts` + `useJankGuard.ts`): `dom`'da yalnızca zafer
penceresi kötüyse → `hybrid`; hareket/boşta penceresi de kötüyse → `canvas`.
`hybrid`'de zafer ölçülmez (canvas çiziyor), kötü hareket → `canvas`. Geçiş yalnızca
güvenli anda (hareket ve ölüm/zafer karesi dışında) uygulanır. Geliştirme
build'inde oyun ekranında DOM/CANVAS anahtarı görünür
(`components/play-screen/BoardRendererToggle.tsx`; üretimde gizli).
**Tahta görüntüsünü etkileyen her değişiklik iki yolda da denenir.** Konsoldan da yazılabilir:

```js
localStorage.setItem(`${localStorage.getItem('activeUserId') ?? 'anon'}:boardRenderer`, 'canvas'); location.reload();
```

Profiler (katman başına ortalama/p95 kare süresi, çizim/sn, sprite ve tuval belleği):

```js
localStorage.setItem(`${localStorage.getItem('activeUserId') ?? 'anon'}:boardProfiler`, '1'); location.reload();
```

## `dev-*` route kuralı

`src/app/dev-*` altındaki her sayfa bir **geliştirme yüzeyidir** ve üretim
build'lerine sızmamalıdır. Portal paketleyicisi (`scripts/portal/package-portal.mjs`)
beyaz liste kullandığı için onları zaten dışarıda bırakır; Capacitor ise `out/`
dizinini **olduğu gibi** kopyalar. Bu yüzden kural: her `dev-*` sayfası
`CURRENT_PLATFORM !== 'web'` iken `null` döner (bkz. `src/app/dev-cell-compare/page.tsx`).
Yeni bir `dev-*` route'u açarken bu kapıyı koy ve `npm run build:mobile` sonrası
`android/app/src/main/assets/public/<route>/index.html`'in boş kabuk olduğunu doğrula.
