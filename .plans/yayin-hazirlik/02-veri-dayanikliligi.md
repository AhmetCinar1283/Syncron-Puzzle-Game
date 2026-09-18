# 02 — Veri Dayanıklılığı: Koruma ve Onarım

> Bu görev `.plans/yayin-hazirlik/00-ilkeler.md` ve `.plans/monetization/00-mimari-ilkeler.md`
> ilkelerine uyar. Belirsizlik anında proje sahibine sor.

---

## 1. Sorun ve Çerçeve

### 1.1 Bu görev "yedek al, geri yükle" görevi DEĞİLDİR

İlk refleks "D1'i yedekleyelim, bozulursa geri yükleriz" olur. Bu mimaride bu yaklaşım
büyük ölçüde **yanlış araçtır**. Gerekçeler:

**a) Cloudflare D1 zaten noktasal geri dönüş (Time Travel) sağlıyor.** Son ~30 güne kadar
herhangi bir ana dönülebiliyor, kod yazmadan. Kendi snapshot job'unu yazmak bunun büyük
kısmını tekrar etmektir. *(Plan/limit ayrıntısı Cloudflare panelinden teyit edilmeli.)*

**b) Canlı bir oyunda tam geri yükleme kullanılamayan bir araçtır.** 6 saat önceki duruma
dönmek, o 6 saatte ilerleyen **her oyuncunun** ilerlemesini siler. Tek bir sorunu binlerce
sorun üreterek çözmüş olursun. Pratikte o düğmeye asla basılamaz.

**c) Tabloların çoğu zaten türetilmiş veridir.** Türetilmiş veriye yedek değil, **yeniden
hesaplama** gerekir.

### 1.2 Tabloların sınıflandırılması

D1'de 21 tablo var. Hepsi eşit değerde değildir:

**Kaynak (source of truth) — kaybı telafi edilemez:**

| Tablo | İçerik |
|---|---|
| `played_levels` | Oyuncu ilerlemesi — taç mücevher |
| `donor_profiles`, `store_events` | Para; en hassası |
| `reward_grants` | Ödüllü aksiyon hakları |
| `daily_results`, `daily_streaks` | Günlük bulmaca sonuçları ve seriler |
| `skipped_levels` | Atlanan bölümler (kilit açma kuralına girer) |
| `user_bans` | Yasaklar |
| `daily_puzzles`, `daily_schedule`, `daily_settings` | Elle üretilmiş içerik ve takvim |
| `audit_logs` | Yasal/adli iz |
| `friendships` | Sosyal graf |
| `user_profiles` | Görünen ad / tag eşlemesi |

**Türetilmiş — yeniden hesaplanabilir:**

| Tablo | Kaynağı |
|---|---|
| `user_period_scores` | `played_levels` + `audit_logs` |
| `creator_scores` | `played_levels` + seviye sahipliği |
| `user_world_records` | `levels/*/infos` çözümleri |
| `badges` | Dönemsel skorlar + bağış olayları |
| `level_telemetry`, `level_feedback` | Analitik; kaybı acı verir ama oyunu bozmaz |

**Sonuç: koruma çabası kaynak tablolara yoğunlaşır, türetilmişler için yeniden hesaplama
job'u yazılır.**

### 1.3 Kullanılmayan en büyük fırsat: istemci zaten veriyi tutuyor

`src/services/sync/playedLevels.ts` **tek yönlüdür**: D1 → Dexie (IndexedDB). Her oyuncunun
cihazında kendi `played_levels` kaydının tam kopyası durur — ama sunucuya geri itecek hiçbir
yol yoktur.

Yani sunucu ilerleme verisi kaybederse, veri aslında **oyuncuların cihazlarında sapasağlam
durur** ve şu an bundan yararlanılamaz. Bu mimaride snapshot geri yüklemesinden çok daha iyi
bir onarım mekanizmasıdır: tek tek kullanıcıyı, kimseyi geri sarmadan iyileştirir.

Dikkat: bu kanal aynı zamanda bir **saldırı yüzeyidir**. İstemci "benim 3 yıldızım vardı" diye
uydurabilir. Bu yüzden §3.4'teki kurallar bağlayıcıdır.

---

## 2. Hedef

Katmanlı bir savunma. Geri yükleme en son ve en az kullanılan katmandır.

| Katman | Ne yapar | Ne zaman devreye girer |
|---|---|---|
| A — Önleme | Yıkıcı işlemi zorlaştırır (soft delete, audit, onay) | Her zaman |
| B — Yeniden hesaplama | Türetilmiş tabloları kaynaktan yeniden kurar | Tutarsızlık fark edilince |
| C — İstemci uzlaştırma | Tek kullanıcının kayıp ilerlemesini cihazından onarır | Bireysel kayıp |
| D — Soğuk dışa aktarım | Platform dışı hayatta kalma + 30 gün üstü geçmiş | Felaket / yasal inceleme |
| E — Time Travel | Tüm veritabanı felaketi | Neredeyse hiç |

---

## 3. Yapılacaklar

### 3.1 Katman A — Önleme

- Kaynak tablolarda **hard delete kaldırılır**, yerine `deleted_at` ile soft delete gelir.
  `played_levels`, `donor_profiles`, `daily_results`, `skipped_levels` öncelikli.
  (`deleted_levels` tombstone tablosu zaten var — desenini incele, tekrar icat etme.)
- Çok satır silen/güncelleyen her admin uç noktası: `audit_logs` tablosuna `admin.*` kaydı
  yazar, etkilenecek satır sayısını **önce** döner ve ikinci bir onay parametresi ister.
- Migration disiplini: 00-ilkeler §2.5 — eklemeli şema, kolon silme yok.

### 3.2 Katman B — Yeniden hesaplama

`syncron-worker/src/services/recovery/` altında, türetilmiş tabloları kaynaktan yeniden kuran
saf ve **idempotent** fonksiyonlar:

- `recomputeUserScores(uid)` — `played_levels` tablosundan `user_period_scores`.
- `recomputeCreatorScores(levelId?)`.
- `recomputeBadges(period)` — mevcut `scheduled/badgeDistribution.ts` mantığını yeniden
  kullan, kopyalama.

Admin uç noktası: `POST /admin/recovery/recompute` — `adminAuth` arkasında, `role === 'admin'`
şartıyla (moderatör yapamaz), kapsam parametresi alır, audit log yazar.

Her fonksiyon test alır: bozuk bir türetilmiş tablo kurgulanır, çalıştırılır, kaynakla
tutarlı hâle geldiği doğrulanır.

### 3.3 Katman D — Soğuk dışa aktarım

`syncron-worker/src/scheduled/dataExport.ts` — haftalık cron, **yalnızca kaynak tablolar**:

- R2'ye NDJSON, anahtar düzeni: `exports/YYYY-MM-DD/<tablo>.ndjson`.
- `logRetention.ts` dosyasının batch + hata deseni yeniden kullanılır — **ama bu bir
  kopyalamadır, taşıma değildir. D1'den hiçbir şey silinmez.**
- R2 yazımı başarısızsa döngü kırılır ve hata loglanır.
- Saklama: en az 8 haftalık sürüm tutulur.
- `wrangler.jsonc` dosyasına yeni cron eklenir; `index.ts` içindeki `scheduled` dallanmasına eklenir.

Karşılığı olan geri yükleme **scripti** (worker uç noktası değil): `scripts/recovery/` altında,
bir NDJSON dışa aktarımını okuyup D1'e yazan, `--dry-run` varsayılanlı, tablo bazlı çalışan
bir araç. Bilinçli olarak elle çalıştırılır; otomatik tetiklenmez.

### 3.4 Katman C — İstemci uzlaştırma (en dikkatli kısım)

`played_levels` senkronizasyonuna **yükleme yönü** eklenir: cihaz, sunucuda olmayan yerel
kayıtlarını bildirebilir.

**Bağlayıcı güvenlik kuralları — hiçbiri esnetilmez:**

1. İstemcinin bildirdiği hiçbir şey **doğrudan yazılmaz**. Bildirim yalnızca bir *iddiadır*.
2. İddia yalnızca sunucuda o kullanıcı için **kayıt yoksa** değerlendirilir. Mevcut kaydın
   üstüne yazılmaz, yıldızı yükseltmez.
3. Yıldız/skor **hamle dizisinden yeniden doğrulanır**. Hamleler yoksa iddia kabul edilmez.
   Mevcut `services/gameVerify.ts` içindeki `verifyMoves` yeniden kullanılır.
4. Doğrulanamayan iddia sessizce düşürülür ve `audit_logs` tablosuna yazılır (03'teki kötüye
   kullanım sinyallerine girdi olur).
5. Bu uç nokta 03'teki hız limitinin **en sıkı** kademesine tabidir.
6. Çakışma politikası: sunucu her zaman kazanır.

Bu, `syncPlayedLevelsFromWorker` fonksiyonunun mevcut "sunucu yetkili kaynaktır" ilkesini
**bozmaz**; yalnızca sunucunun hiç bilmediği kaydı kurtarma yolu açar.

**Kural 3 nedeniyle bir ön koşul var:** Dexie'deki `StoredPlayedLevel` şu an `moveCount`
tutuyor ama hamle dizisini tutmuyor. Yerel olarak hamle dizisi saklanmıyorsa bu katman
*doğrulanabilir* biçimde kurulamaz. Önce bunu kodda doğrula. Saklanmıyorsa **proje sahibine
sor**: ya Dexie şemasına son çözümün hamle dizisi eklenir (yeni sürüm + migration), ya da bu
katman kapsam dışına alınır. Kendi başına karar verme.

### 3.5 Katman E — Time Travel runbook'u

Kod yok, `docs/release/veri-kurtarma.md` var:

- Hangi arıza hangi katmanla çözülür — karar tablosu.
- Time Travel komutları ve **maliyeti** ("şu andan geriye dönmek şu kadar oyuncunun
  ilerlemesini siler" uyarısıyla).
- Yeniden hesaplama uç noktasının kullanımı.
- Dışa aktarımdan geri yükleme scriptinin kullanımı.
- **Tatbikat notu:** bu yollar en az bir kez, gerçek bir olay olmadan denenmelidir.
  Denenmemiş kurtarma yolu, kurtarma yolu değildir.

---

## 4. Kapsam Dışı

- Firestore tarafı yedekleme (`users`, `levels`) — ayrı iş, rapora not düşülür.
- `level_telemetry` / `level_feedback` için özel koruma — türetilmiş/analitik sayılır.
- Hız limitleri — **03 numaralı görevin işi**. Bu görev yalnızca 3.4'ün limite tabi
  olduğunu belirtir.
- IP/User-Agent loglaması — **05 numaralı görevin işi**.

---

## 5. Kabul Kriterleri

- [ ] Kaynak tablolarda hard delete kalmadı; soft delete ve tombstone deseni uygulandı.
- [ ] `recomputeUserScores`, `recomputeCreatorScores`, `recomputeBadges` yazıldı, idempotent
      ve testli (bozuk durumdan tutarlı duruma geçiş doğrulandı).
- [ ] `POST /admin/recovery/recompute` yalnızca `role === 'admin'` ile erişilebilir, audit log yazar.
- [ ] `dataExport.ts` haftalık cron olarak eklendi, D1'den **hiçbir şey silmiyor**, R2'ye yazıyor.
- [ ] `scripts/recovery/` geri yükleme aracı yazıldı, varsayılanı `--dry-run`.
- [ ] Katman C ya güvenlik kurallarına tam uyarak uygulandı ya da §3.4 gereği proje sahibinin
      kararıyla kapsam dışına alındı ve bu rapora yazıldı.
- [ ] Katman C uygulandıysa: uydurma iddianın reddedildiğini gösteren test var.
- [ ] `docs/release/veri-kurtarma.md` yazıldı, karar tablosu içeriyor.
- [ ] `00-ilkeler.md` §2.1 tablosundaki yedi kontrol yeşil.
- [ ] `.plans/yayin-hazirlik/raporlar/02-rapor.md` yazıldı.

---

## 6. Elle Kontrol (Proje Sahibi)

- Cloudflare panelinden Time Travel'ın planında gerçekten açık olduğunu ve saklama süresini doğrula.
- R2'de `exports/` altında ilk dışa aktarımın oluştuğunu gör.
- Test hesabıyla: bir bölümü bitir, D1'den o satırı elle sil, uygulamayı aç — Katman C
  uygulandıysa ilerleme geri gelmeli.
- Yeniden hesaplama uç noktasını test hesabında çalıştır, liderlik tablosunun bozulmadığını gör.
