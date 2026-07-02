# Seviye Analitiği ve Geri Bildirim Sistemi Geliştirici Raporu

Bu rapor, oyundaki seviyelerin kalitesini, zorluk derecelerini ve yarıda bırakılma (drop-off) oranlarını ölçmek amacıyla hayata geçirilen **Telemetry** ve **Geri Bildirim (Feedback)** sistemlerinin teknik detaylarını içerir. Admin panelinde bu verileri çekip görselleştirirken veya veritabanı sorgularını yazarken bu dokümanı referans alabilirsiniz.

---

## 1. Genel Mimari ve Veri Akışı

Sistem, istemci tarafındaki oyun döngüsünden ham deneme verilerini toplar ve Cloudflare D1 (SQLite) üzerinde depolar. 

```
[İstemci Oyun Ekranı] 
   │
   ├── (Oyun Sonu/Menü/Sekme Kapatma) ──> POST /game/telemetry ──> [CF Worker D1 (level_telemetry)]
   │
   └── (Gönüllü Anket Yanıtı) ─────────> POST /game/feedback  ──> [CF Worker D1 (level_feedback)]
```

Her seviyenin güncel içeriği değiştiğinde istatistiklerin sıfırlanabilmesi ve eski verilerin yeni sürümlerle karışmaması için tüm veriler **Seviye Sürüm Numarası (version)** ile ilişkilendirilmiştir.

---

## 2. Veri Şemaları

### A. Firestore Seviye Şeması (`levels/{levelId}`)
Seviye dokümanlarına `version` alanı eklenmiştir.
* **Yeni Bölüm Eklendiğinde:** `version` alanı `1` olarak ilklendirilir.
* **Mevcut Bölüm Güncellendiğinde:** `version` alanı atomik olarak `increment(1)` ile artırılır.
* **Senkronizasyon:** `sync.ts` istemci tarafındaki Dexie önbelleğine (IndexedDB) `version: data.version ?? 1` alanını aktarır.

### B. Cloudflare D1 SQL Tabloları (SQLite)
`syncron-worker` D1 veritabanı üzerinde aşağıdaki iki tablo oluşturulmuştur:

#### 1. `level_telemetry` (Ham Oyun Denemeleri)
Oyuncuların her seviyeyi oynama girişimlerini (seans) tutar.
* **Tablo Yapısı:**
  ```sql
  CREATE TABLE level_telemetry (
    id           TEXT NOT NULL PRIMARY KEY,   -- İstemci tarafından üretilen UUID
    uid          TEXT NOT NULL,               -- Oyuncu Firebase UID'si
    level_id     TEXT NOT NULL,               -- Seviye Firestore ID'si
    version      INTEGER NOT NULL,            -- Oynanan seviyenin versiyonu
    outcome      TEXT NOT NULL,               -- Sonuç: 'win' | 'restart' | 'quit'
    time_spent   INTEGER NOT NULL,            -- Saniye cinsinden harcanan toplam süre
    restarts     INTEGER NOT NULL DEFAULT 0,  -- Seans boyunca yapılan manuel restart sayısı
    deaths       INTEGER NOT NULL DEFAULT 0,  -- Hata/Game Over sonrası gerçekleşen ölüm sayısı
    moves_count  INTEGER NOT NULL DEFAULT 0,  -- Kazanan denemedeki toplam hamle sayısı (quit için 0)
    created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
  ```

#### 2. `level_feedback` (Kullanıcı Değerlendirmeleri)
Oyunu başarıyla bitiren kullanıcıların isteğe bağlı anket yanıtlarını depolar.
* **Tablo Yapısı:**
  ```sql
  CREATE TABLE level_feedback (
    id           TEXT NOT NULL PRIMARY KEY,   -- Benzersiz UUID
    uid          TEXT NOT NULL,               -- Oyuncu Firebase UID'si
    level_id     TEXT NOT NULL,               -- Seviye Firestore ID'si
    version      INTEGER NOT NULL,            -- Oy verilen seviyenin versiyonu
    difficulty   TEXT NOT NULL,               -- Bildirilen zorluk: 'easy' | 'normal' | 'hard'
    liked        INTEGER NOT NULL,            -- 1 = Beğendi, 0 = Beğenmedi
    created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    UNIQUE(uid, level_id, version)            -- Kullanıcı başına sürüm bazında tek oy limiti
  );
  ```

---

## 3. Cloudflare Worker API Endpoint Detayları

Tüm telemetry ve feedback API istekleri geçerli bir Firebase kimlik doğrulama token'ı (`Authorization: Bearer <Token>`) gerektirir.

### A. Telemetry Raporlama
* **Endpoint:** `POST /game/telemetry`
* **İstek Gövdesi (JSON Schema / Zod):**
  ```json
  {
    "id": "string (UUID)",
    "levelId": "string",
    "version": 1,
    "outcome": "win" | "restart" | "quit",
    "timeSpent": 25,
    "restarts": 2,
    "deaths": 1,
    "movesCount": 18
  }
  ```

### B. Geri Bildirim (Anket) Raporlama
* **Endpoint:** `POST /game/feedback`
* **İstek Gövdesi (JSON Schema / Zod):**
  ```json
  {
    "levelId": "string",
    "version": 1,
    "difficulty": "easy" | "normal" | "hard",
    "liked": 1 | 0
  }
  ```

---

## 4. İstemci Mantığı ve Telemetry Kuralları

İstemci tarafında oyun deneme seansının durumunu doğru tutmak ve çökme/kapatma durumlarını yakalamak için aşağıdaki kurallar uygulanır:

1. **Deneme Seansı Başlangıcı:**
   * `/play` sayfasında seviye yüklendiğinde, istemci `localStorage` üzerinde `active_level_session` anahtarında bir kayıt oluşturur:
     ```json
     {
       "id": "uuid-v4",
       "levelId": "firestore-id",
       "version": 1,
       "startTime": 1719255600000,
       "restarts": 0,
       "deaths": 0,
       "lastActiveTime": 1719255610000
     }
     ```
2. **Aktif Takip ve Güncelleme:**
   * Oyuncu her hamle yaptığında, `lastActiveTime` güncellenerek kayıt taze tutulur.
   * Oyuncu Game Over ekranında yeniden başlattığında `deaths` değeri `1` artırılır.
   * Oyuncu oyun devam ederken manuel olarak yeniden başlattığında `restarts` değeri `1` artırılır.
3. **Seans Sonlanması:**
   * Oyuncu menüye dönerse (`quit`), telemetri anında sunucuya raporlanır ve yerel önbellek silinir.
   * Oyuncu kazanırsa (`win`), `/complete-level` API doğrulamasının ardından `win` telemetrisi raporlanır ve yerel önbellek silinir.
4. **Crash / Rage-Quit Algılama (Offline Telemetry Recovery):**
   * Eğer tarayıcı sekmesi kapatılırsa veya uygulama çökerse, yerel önbellekteki session açık kalır.
   * Uygulama bir sonraki kez açıldığında (`useFirestoreSync` hook'u tetiklendiğinde), `active_level_session` kontrol edilir. Son işlem zamanından (`lastActiveTime`) bu yana **5 dakikadan fazla** süre geçtiyse, sistem otomatik olarak bu seansı `outcome: 'quit'` (rage-quit/yarıda bırakma) olarak Worker'a postalar ve yerel kaydı temizler.

---

## 5. Admin Paneli Görselleştirme ve SQL Sorgu Örnekleri

Admin panelinizde seviye kalitelerini raporlamak ve grafikler çizdirmek için D1 veritabanı üzerinde aşağıdaki SQL sorgularını kullanabilirsiniz.

### A. Seviye Bazlı Genel Metrik Raporu (Sürüm Filtreli)
Her seviyenin güncel sürümündeki geçilme, pes edilme, ortalama ölüm oranlarını hesaplar:
```sql
SELECT 
  level_id,
  version,
  COUNT(CASE WHEN outcome = 'win' THEN 1 END) as total_wins,
  COUNT(CASE WHEN outcome = 'quit' THEN 1 END) as total_quits,
  SUM(restarts) as total_manual_restarts,
  SUM(deaths) as total_deaths,
  AVG(CASE WHEN outcome = 'win' THEN time_spent END) as avg_solve_time_sec,
  -- Drop-off Oranı (Pes etme / Toplam girişim)
  (CAST(COUNT(CASE WHEN outcome = 'quit' THEN 1 END) AS REAL) / COUNT(*)) * 100 as drop_off_percentage
FROM level_telemetry
GROUP BY level_id, version
ORDER BY drop_off_percentage DESC;
```

### B. Seviye Beğeni ve Zorluk Dağılım Raporu
Kullanıcılardan gelen geri bildirimleri derler:
```sql
SELECT 
  level_id,
  version,
  -- Beğeni yüzdesi
  (CAST(SUM(liked) AS REAL) / COUNT(*)) * 100 as like_ratio_percentage,
  -- Zorluk oyları dağılımı
  COUNT(CASE WHEN difficulty = 'easy' THEN 1 END) as votes_easy,
  COUNT(CASE WHEN difficulty = 'normal' THEN 1 END) as votes_normal,
  COUNT(CASE WHEN difficulty = 'hard' THEN 1 END) as votes_hard,
  COUNT(*) as total_feedback_votes
FROM level_feedback
GROUP BY level_id, version
ORDER BY like_ratio_percentage ASC;
```

---

## 6. Hata Ayıklama ve Doğrulama
Kodlarda değişiklik yaparken veya entegrasyonu test ederken aşağıdaki komutları kullanabilirsiniz:
* **Worker Tip Kontrolü (Hata Ayıklama):**
  `cd syncron-worker && npm install && npx tsc --noEmit`
* **Local SQLite D1 Test Migrasyonu:**
  `npx wrangler d1 migrations apply AUDIT_DB --local`
