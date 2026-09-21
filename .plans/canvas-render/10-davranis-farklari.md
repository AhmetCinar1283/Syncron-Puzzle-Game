# 10 — Davranış Farkları: Kaybolan Geri Bildirimler ve Geçişler

> Bağlayıcı: `.plans/canvas-render/00-ilkeler.md`. Önce `raporlar/08-rapor.md` §7.5
> ve (çalıştırıldıysa) `raporlar/09-rapor.md` oku.
> **Model: opus.** Boşta durma kuralı ile canlılık arasındaki gerilim burada
> çözülüyor; yanlış çözüm ya karakteri "ölü" bırakır ya da ısınma sorununu geri getirir.

**İsteğe bağlı faz.** Proje sahibi bu farkları kendisi temizleyebilir; o durumda
bu dosya atlanır. 09 ile sıra bağımlılığı yok.

08-rapor §7.5'teki 34 farktan 27'si kabul edildi. Kalan altısı gözle görülen
**davranış** kaybı — yaklaşıklık değil. Bu faz yalnızca onları kapatır.

---

## 1. Okuyacağın dosyalar

| Dosya | Neden |
|---|---|
| `00-ilkeler.md`, `raporlar/05-rapor.md`, `raporlar/07-rapor.md`, `raporlar/08-rapor.md` | Sözleşme; 05 varlık hareketinin, 07 sis geçişinin nasıl kurulduğunu anlatıyor |
| `src/game-engine/render/BoardCanvas.tsx` | Katmanların kirletildiği tek yer |
| `src/game-engine/render/motion.ts`, `entityMotion.ts` | `TRACKS` / `sampleTrack` — tek atımlık animasyonların mevcut yorumlayıcısı |
| `src/game-engine/render/entities.ts` (veya `entities/`) | Oyuncu sprite'ı ve göz kırpma fazı |
| `src/game-engine/render/cells/activity.ts` | Geçici hâl takipçisi — §2.3'te genişletilecek |
| `render/cells/` altında buz, teleport, trambolin dosyaları | #3, #7, #9 |
| `render/overlays/` altında oda çerçevesini çizen dosya | #12 |
| `src/game-engine/components/physicsWrapper.tsx` | #19 ve #21'in DOM kaynağı |
| `src/game-engine/components/effects/animationStyles.ts` | Keyframe değerleri — tahmin etme, buradan oku |

---

## 2. Yapılacaklar

### 2.1 #19 — Boşta oyuncu göz kırpar, neon halka nabız atar

**Sorun.** 00-ilkeler §2.2 gereği `actors` katmanı boştayken çizilmiyor; bu yüzden
göz kırpma ve neon ters mod halkası donuyor. Karakter "ölü" görünüyor.

**Karar.** Boştaki oyuncu animasyonu **ambient bütçesine** girer, `actors`
bütçesine değil:

- `ambient` katmanı bir kare çizdiğinde, ekranda boşta-animasyonlu bir oyuncu
  varsa `BoardCanvas` **`actors`'ı da kirletir**. Böylece boştaki oyuncu ambient'in
  20fps kadansıyla ve ambient'in açık/kapalı durumuyla **otomatik** hizalanır.
- Yeni bir zamanlayıcı, yeni bir kısma mekanizması **kurma**. Tek değişiklik
  `BoardCanvas`'taki ambient geri çağrısında bir koşul.
- Göz kırpma ayrık bir olay (açık/kapalı). Kırpma anları arasında `actors`'ı
  kirletmek gereksizse, yalnızca geçiş karelerinde kirlet — ama bunu yalnızca
  basit kalıyorsa yap; karmaşıklaşıyorsa 20fps yeter.

**Korunacak vaat:** `lite` kademede (`ambientMode === 'off'`) ve zafer
koreografisi sırasında boşta **sıfır çizim** devam eder. Bunu bir testle kilitle.
Isınma sorununun cevabı bu satır.

### 2.2 #21 — Ölüm ve çarpışmada renk ve parlama

`physicsWrapper.tsx`'teki ölüm/çarpışma animasyonlarının renk ve parlama
katmanları canvas'ta yok. Taşı:

- Renk değişimi → oyuncu sprite'ının **renkli varyantı** (anahtara eklenir) veya
  `globalCompositeOperation = 'source-atop'` ile tek renk örtü — hangisi kaynağa
  daha sadıksa. Gerekçeyi rapora yaz.
- Parlama → **sprite varyantı** (00-ilkeler §2.1: kare döngüsünde `shadowBlur`
  yok, rasterizasyonda `setShadow`). Parlamanın yoğunluğu zamanla değişiyorsa
  varyantın `globalAlpha`'sı değişir, sprite yeniden rasterize edilmez.
- Zamanlama Faz 05'in `TRACKS` yorumlayıcısıyla — yeni bir easing yazma.

### 2.3 #9 — Trambolin ezilmesi

`trampoline-spring-active` tek atımlık bir keyframe. Faz 05'in `sampleTrack`'i
tam olarak bunu yapıyor. Trambolin sprite'ı ezilmeyi `scale` ile blit sırasında
alır; ezilme süresince ilgili katman §2.4'teki mekanizmayla uyanık kalır.

### 2.4 #3, #7, #12 — Ani geçişler yumuşar

| # | Nerede | DOM süresi |
|---|---|---|
| 3 | Buz dolu ↔ boş | 200 ms |
| 7 | Teleport etkin ↔ dinlenme | 600 ms |
| 12 | Oda kontrol edildi ↔ edilmedi (opaklık + kenar gölgesi) | 250 ms |

Çözüm: iki sprite hâli arasında **`globalAlpha` ile çapraz geçiş**; sprite
yeniden rasterize edilmez. Süre ve easing `animationStyles.ts`'teki `transition`
değerlerinden okunur.

**Mekanizma icat etme.** Faz 07 sis geçişi için `static` katmanını 300ms kirli
tutmanın yolunu zaten kurdu (07-rapor). Aynısını kullan ve genelleştir: "şu
katman şu ana kadar kirli kalsın" diyen tek bir yer. `activity.ts`'in geçici hâl
takipçisi geçişin başladığı anı zaten biliyor.

00-ilkeler §3.4'te "`drawStaticLayer` daima `false`" yazıyor. Bu faz bunu
**geçiş sürdüğü sürece `true`** olacak şekilde değiştiriyor — sis geçişi fiilen
bunu zaten yapıyor olabilir. 00-ilkeler §3.4'ü buna göre güncelle.

---

## 3. Kapsam dışı

- 08-rapor §7.5'teki kabul edilmiş 27 fark.
- §7.1'deki hiç bağlanmamış süsler (proje sahibi: kalsın).
- §7.2'deki DOM tuhaflıkları (proje sahibi: kalsın).
- DOM çizicilerinde herhangi bir değişiklik.

---

## 4. Kabul kriterleri

- [ ] Boşta oyuncu `full` kademede göz kırpıyor ve neon halka nabız atıyor.
- [ ] `lite` kademede ve zafer sırasında boşta RAF planlanmıyor — **test kilitliyor**.
- [ ] Ölüm ve çarpışmada renk ve parlama DOM'dakiyle aynı.
- [ ] Trambolin ezilmesi oynuyor.
- [ ] Buz, teleport ve oda geçişleri DOM'daki sürelerle yumuşak.
- [ ] Geçiş mekanizması tek yerde; sis geçişiyle aynı yolu kullanıyor.
- [ ] `grep -rn "shadowBlur\|ctx\.filter" src/game-engine/render/` çıktısı yalnızca
      rasterleyicilerde.
- [ ] 00-ilkeler §3.4 güncellendi; §6 kontrolleri yeşil.
- [ ] `08-rapor.md` §7.5'teki #3, #7, #9, #12, #19, #21 "düzeltildi" olarak işaretlendi.
- [ ] `raporlar/10-rapor.md` yazıldı.

---

## 5. Elle kontrol (proje sahibi)

- Bir bölüm aç ve bekle: karakter göz kırpıyor mu?
- Aynı şeyi `lite` kademede yap (`setMotionTierOverride('lite')`) ve 30 saniye
  Performance kaydı al: çizelge hâlâ boş mu?
- Bir oyuncuyu öldür, bir trambolinden zıpla, bir odanın kontrolünü değiştir.
