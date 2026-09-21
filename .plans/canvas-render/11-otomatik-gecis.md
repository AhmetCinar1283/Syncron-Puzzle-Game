# 11 — Otomatik Geçiş ve Kullanıcı Ayarı

> Bağlayıcı: `.plans/canvas-render/00-ilkeler.md`. Önce `raporlar/09-rapor.md` oku.
> **Model: opus.** Kasma tespiti yanlış kurulursa ya hiç tetiklenmez ya da güçlü
> cihazları boşuna canvas'a atar; eşik ve yanlış alarm kararı burada veriliyor.

Faz 09, çiziciyi açılışta cihaz gücüne göre seçti; belirsizlikte canvas. Geriye tek
bir açık kaldı: **güçlü görünen ama DOM'da kasan cihaz** (8 çekirdek, zayıf GPU;
`motionTier.ts` başlığındaki uyarı). Bu faz onu oyun sırasında yakalar ve
kullanıcıya kalıcı bir seçim verir.

---

## 1. Kararlar (proje sahibi) — tartışma, uygula

1. **Otomatik geçiş tek yönlü: DOM → canvas.** Canvas → DOM otomatik geçiş **yok**.
   Gerekçe: canvas'ın kare süresi DOM'un bu cihazda akıp akmayacağını söylemez; DOM'a
   geçmek kasmayı geri getirme riski taşır; iki yönlü geçiş salınım üretir.
   Kasmama garantisi görüntü sadakatinden önce gelir.
2. **Kullanıcının elle seçimi her zaman kazanır.** Kullanıcı DOM seçtiyse otomatik
   geçiş o cihazda **hiç çalışmaz**.
3. **Kontrol ayarlar ekranına taşınır:** `Otomatik` (varsayılan) / `DOM` / `Canvas`.
   Oyun ekranının sağ üstündeki DOM/CANVAS düğmesi oyuncuya dönük değil, geliştirme
   aracı olarak kalır (Faz 09 §2.5).

---

## 2. Okuyacağın dosyalar

| Dosya | Neden |
|---|---|
| `00-ilkeler.md`, `raporlar/09-rapor.md` | Sözleşme ve devir |
| `src/game-engine/render/boardRenderer.ts` | Seçim mantığı — §3.3 |
| `src/game-engine/render/profiler.ts` | Kare süresi toplama deseni — yeniden kullan, kopyalama |
| `src/game-engine/components/play-screen/BoardArea.tsx` | İki yolun ayrıldığı yer; geçiş burada olur |
| `src/game-engine/components/GameBoard.tsx` | DOM yolunda "hareket bitti" ve zafer anlarının sinyali |
| `src/lib/motionTier.ts` | Ayar deseni (anahtar + override) |
| Ayarlar ekranı | `grep -rln "setMotionTierOverride\|MOTION_TIER_KEY" src/features src/app` ile bul; birden fazla aday çıkarsa **sor** |

---

## 3. Yapılacaklar

### 3.1 Kasma dedektörü — `render/jankMonitor.ts`

Yalnızca **DOM modunda**, yalnızca **Otomatik** ayarında ve yalnızca oyun ekranı
açıkken çalışır. Canvas modunda hiç kurulmaz.

Ölçüm: `requestAnimationFrame` zaman damgaları arasındaki farklar. DOM modunda CSS
animasyonları zaten sürekli kare ürettiği için ek bir RAF döngüsünün maliyeti ihmal
edilebilir — ama **yalnızca örnekleme pencerelerinde** çalıştır, sürekli değil.

Örnekleme pencereleri (asıl kasma buralarda):

- oyuncu hareketi başladığında → hareket bitene kadar,
- zafer koreografisi boyunca,
- seviye açıldıktan **1 saniye sonra** başlayan 3 saniyelik boşta pencere.

Hariç tutulacaklar (yanlış alarm kaynakları):

- `document.visibilityState !== 'visible'` olduğu süre,
- seviye/sahne değişiminden sonraki ilk 1 saniye (yükleme, GC),
- tek bir 100ms+ kare (GC, bildirim) — tek kare karar vermez.

**Karar kuralı** (başlangıç değerleri; gerekçesiyle rapora yaz, ayarlanabilir sabit):

- Bir pencere "kötü" sayılır: ≥ 30 kare örneklenmiş **ve** karelerin ≥ %20'si
  25 ms'yi aşıyor.
- **Art arda iki kötü pencere** → geçiş kararı. Tek pencere geçişi tetiklemez.

Saf karar fonksiyonunu (`kare süreleri → kötü mü`) ayrı dışa aktar ve test et:
60fps akış, 30fps sabit akış, tek GC sıçraması, arka plana alınma.

### 3.2 Geçişin kendisi

- Karar verildiği an **geçme**; bir sonraki güvenli ana ertele: oyuncu hareketi
  bittiğinde veya zafer koreografisi bittikten sonraki seviye geçişinde. Hareket
  ortasında geçiş, kare oynatma durumunu (`useFilmPlayback`) sıfırlayıp sıçrama
  üretir.
- İki yol aynı oyun durumunu okuduğu için geçiş anında durum kaybı olmaz; bunu
  doğrula.
- Geçiş sessizdir: bildirim, diyalog yok. (İstersen tek satırlık bir toast'ı
  rapora öner, ekleme.)

### 3.3 Kalıcılık ve öncelik

Otomatik kararı **ayrı bir anahtarda** tut, kullanıcının seçimini ezme:

| Anahtar | Yazan | Değer |
|---|---|---|
| `boardRenderer` | kullanıcı (ayarlar) | `'dom'` / `'canvas'` / yok (= Otomatik) |
| `boardRendererAuto` | dedektör | `'canvas'` / yok |

`detectBoardRenderer()` sırası (Faz 09 §2.4'ün başına bir adım eklenir):

1. `boardRenderer` yazılıysa o.
2. `boardRendererAuto === 'canvas'` ise `'canvas'`.
3. Faz 09 §2.4'teki cihaz kuralı.

Dedektör bir kez `'canvas'` yazdıktan sonra o cihazda bir daha çalışmaz. Kullanıcı
ayarı `Otomatik`'e geri alırsa `boardRendererAuto` **silinir** — kullanıcıya
"yeniden dene" imkânı.

### 3.4 Ayarlar ekranı

Üç seçenek: **Otomatik** (varsayılan) · **Kalite (DOM)** · **Performans (Canvas)**.
Etiket dili ayarlar ekranının mevcut diliyle uyumlu olmalı; mevcut çeviri
sistemini kullan, sabit metin yazma. Değişiklik bir sonraki seviyede değil,
**hemen** uygulanır (§3.2'deki güvenli an kuralıyla).

---

## 4. Kapsam dışı

- Canvas → DOM otomatik geçiş (§1.1).
- `motionTier` eşiklerini değiştirmek.
- Kullanıcıya kasma tespiti hakkında görünür bildirim.

---

## 5. Kabul kriterleri

- [ ] Dedektör yalnızca DOM + Otomatik + oyun ekranında çalışıyor; canvas modunda
      kurulmuyor.
- [ ] Karar fonksiyonu test ediliyor: 60fps → kötü değil; sürekli 30fps → kötü;
      tek GC sıçraması → kötü değil; görünmez sekme → sayılmıyor.
- [ ] Art arda iki kötü pencere geçişi tetikliyor; geçiş hareket ortasında değil,
      güvenli anda oluyor.
- [ ] Kullanıcı DOM seçtiyse dedektör hiç çalışmıyor.
- [ ] `Otomatik`'e dönmek `boardRendererAuto`'yu siliyor.
- [ ] Ayarlar ekranında üç seçenek; seçim anında uygulanıyor.
- [ ] 00-ilkeler §6 kontrolleri yeşil; `raporlar/11-rapor.md` yazıldı.

---

## 6. Elle kontrol (proje sahibi)

- Masaüstü Chrome DevTools → Performance → **CPU throttling 6x**, DOM + Otomatik ile
  bir bölüm oyna: birkaç hamle içinde canvas'a geçiyor mu? Geçiş anında sıçrama var mı?
- Throttling kapalıyken aynı şeyi yap: **geçmemeli**.
- Ayarlardan DOM seç, throttling açıkken oyna: geçmemeli.
