# Cloudflare Worker (Senkronizasyon ve API Servisi)

Bu dizin, uygulamanın Cloudflare Worker üzerinde koşan Hono tabanlı API uç noktalarını ve zamanlanmış arka plan görevlerini (cron jobs) barındırır. Cloudflare D1 veritabanı (SQL) ve R2 soğuk depolama alanlarını yönetir.

## Klasör Yapısı ve Dosyaların Mantığı

```
syncron-worker/
├── src/
│   ├── index.ts        # Uygulama giriş noktası, Hono rotaları ve zamanlanmış (cron) görevler.
│   ├── types.ts        # Ortak veri tipleri, çevresel değişken şemaları ve kısıtlar.
│   ├── routes/         # HTTP API rotalarını yöneten dosyalar.
│   │   ├── adminApi.ts     # Admin/Moderatör işlemleri (kullanıcı detayı, loglar, banlama).
│   │   ├── game.ts         # Seviye bitirme ve çözüm doğrulama (/complete-level).
│   │   ├── friends.ts      # Arkadaşlık istekleri, engelleme ve arama.
│   │   ├── store.ts        # Lemon Squeezy webhook entegrasyonu (bağış işleme).
│   │   ├── playedLevels.ts # Seviye ilerleme senkronizasyonu ve seviye silme.
│   │   ├── rewards.ts      # Ödüllü aksiyonlar: /rewards/prepare → /rewards/claim (+ /rewards/cancel).
│   │   └── ...
│   ├── services/       # Veritabanı ve dış API işlemlerini gerçekleştiren iş mantığı katmanı.
│   │   ├── auditLog.ts     # D1 veritabanına denetim logu yazma ve okuma işlemleri.
│   │   ├── auth.ts         # Firebase ID token (JWT) doğrulaması.
│   │   ├── gameVerify.ts   # Hamle replay simülatörü ile çözüm doğrulama.
│   │   ├── leaderboard.ts  # Skorların periyotlara göre artırılması/hesaplanması.
│   │   ├── rewards/        # Aksiyondan bağımsız ödül altyapısı: akış (rewardService), D1 (rewardGrants), kayıt (actions), reklamsız hak (entitlement).
│   │   ├── hint/           # Sunucu ipucu motoru: hamle geçmişini oynatma (replay), çözme (computeHint), bütçe, aksiyon handler'ı.
│   │   ├── hintScoring.ts  # İpucu kullanılan çözümün skor kuralı (yıldız ≤2, rekorlara sayılmaz).
│   │   └── ...
│   ├── scheduled/      # Zamanlanmış görevlerin (Cron) kodları.
│   │   ├── anonymousCleanup.ts  # İnaktif ve eski anonim kullanıcı verilerini D1'den siler.
│   │   ├── badgeDistribution.ts # Liderlik tablosunda ilk 3'e giren oyunculara rozet dağıtır.
│   │   └── logRetention.ts      # 90 günden eski logları R2'ye arşivleyip D1'den siler.
│   └── middleware/     # API isteklerini filtreleyen ara yazılımlar (Auth, Rate Limiting vb.).
└── wrangler.jsonc      # Cloudflare Worker, D1 ve R2 kaynaklarının yapılandırmaları.
```

## Ana Mimari ve Akışlar

1. **İlerleme ve Skor Yönetimi (`/complete-level`):**
   * Kullanıcı bir seviyeyi bitirdiğinde hamlelerini sunucuya gönderir.
   * `gameVerify.ts` içindeki oyun motoru simülatörü çözümü doğrular. Çözüm geçerliyse D1 veritabanındaki `played_levels` tablosu güncellenir.
   * `leaderboard.ts` servisi kullanıcının günlük, haftalık ve aylık liderlik tablosu skorlarını atomik olarak artırır.
   * **İpucu bütünlüğü:** `/complete-level` o level için teslim edilmiş ve henüz uygulanmamış ipucu görürse (ya da istemci `hintsUsed>0` beyan ederse) yıldızı 2 ile sınırlar, çözümü en iyi çözümler listesine/rozetlerine ve kişisel en iyi hamle sayısına saymaz, ardından kayıtları kapatır (bkz. `docs/scoring.md` → Hints).

2. **Ödüllü Aksiyonlar ve Sunucu İpucu Motoru (`/rewards/*`):**
   * İpucu **yalnızca sunucuda** hesaplanır. İstemci durum değil hamle geçmişini (`u/d/l/r/s`) gönderir; worker level'ı Firestore'dan yükleyip hamleleri oynatır ve çözer (`services/hint`).
   * `POST /rewards/prepare`: sonuç hesaplanıp `reward_grants`'a yazılır, istemciye **içerik dönmez**. `POST /rewards/claim`: erişim hakkı (level başına ücretsiz kota, reklamsız hak) sunucuda doğrulanır, içerik ancak o zaman döner; yeniden claim aynı içeriği tekrar verir. `POST /rewards/cancel`: reklam başarısızlığı loglanır.
   * Her adım `audit_logs`'a (`category='reward'`) yazılır ve 90 gün sonra R2'ye arşivlenir — "reklam izledim, ödül gelmedi" itirazlarının kanıtı.
   * CPU: ipucu durum sayısıyla sınırlı bütçe kullanır (`services/hint/hintBudget.ts`); Workers Paid planı gerekir.

3. **Zamanlanmış Görevler (Cron Triggers):**
   * **Badge Distribution:** Her pazartesi ve ayın 1'inde liderlik tablolarının kazananlarına rozetler dağıtılır.
   * **Log Retention:** Haftalık olarak eski loglar R2'de NDJSON formatına yedeklenip D1'den temizlenerek veritabanı boyutu korunur.
   * **Anonymous Cleanup:** Günlük olarak süresi dolmuş inaktif anonim kullanıcılar temizlenir.

3. **Güvenlik Katmanları:**
   * JWT tabanlı kimlik doğrulama doğrudan Worker üzerinde RS256 algoritmalarıyla saniyeler içinde çözümlenir (Firebase REST API'sine istek atmaz).
   * Firebase Functions ile sunucular arası haberleşme HMAC-SHA256 imzası (`hmacAuth.ts`) ile korunur.
   * Bellek içi hız sınırlandırma (`rateLimiter.ts`) ile suistimal veya döngüsel istek hataları engellenir.
