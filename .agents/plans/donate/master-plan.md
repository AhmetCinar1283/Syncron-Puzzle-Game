# Lemon Squeezy Bağış & Satış Sistemi — Güncellenmiş Plan

## Genel Bakış

Know & Conquer oyununa Lemon Squeezy üzerinden **bağış + satış** sistemi eklenir.  
Webhook'lar Cloudflare Worker tarafından doğrulanır, mevcut **`AUDIT_DB`** D1 veritabanına yeni tablolar eklenerek kaydedilir.  
Bağış rozet sistemi mevcut `badges` tablosuyla **tam entegre** çalışır.  
Capacitor (mobil) şu an kapsam dışı — RevenueCat ayrı planlanacak.

---

## User Review Required

> [!IMPORTANT]
> Lemon Squeezy Dashboard'dan alınacak değerler (`wrangler secret put` ile kaydedilir, asla kaynak kodda olmaz):
> - `LS_WEBHOOK_SECRET` → Webhook Signing Secret
> - `LS_API_KEY` → API Key (ileride store yönetimi için)

> [!NOTE]
> Mevcut `AUDIT_DB` veritabanına yeni tablolar eklenecek — **yeni D1 database oluşturmaya gerek yok.**  
> `wrangler.jsonc`'e dokunulmaz. Sadece yeni bir migration SQL dosyası eklenir.

> [!NOTE]
> Webhook URL'ini Lemon Squeezy Dashboard → Settings → Webhooks'a kaydedin:  
> `https://syncron-worker.workers.dev/webhooks/lemonsqueezy`  
> Events: `order_created` (şimdilik yeterli)

---

## Para Birimi Tasarımı

**Lemon Squeezy, ödeme anında kullanıcının yerel para birimini otomatik gösterir.**  
Bizim tarafımızda tek para birimi tanımlaması yeterli: **USD**.

| Hızlı Seçim | USD | Lemon Squeezy'nin gösterdiği (otomatik) |
|---|---|---|
| Küçük | $1 | ~₺32, ~€0.92, ~£0.79 vb. |
| Orta | $2 | ~₺64 vb. |
| İyi | $5 | ~₺160 vb. |
| Harika | $10 | ~₺320 vb. |
| Özel | Serbest giriş | Kullanıcı dolar cinsinden girer |

Lemon Squeezy'de **tek bir "bağış" ürünü** oluşturulur, fiyat **custom (Pay What You Want)** olarak ayarlanır.  
Böylece hem hızlı seçimler ($1/$2/$5/$10) hem de özel miktar desteklenir.

---

## Bağış Rozet Sistemi

Mevcut `badges` tablosu kullanılır (`AUDIT_DB`'deki). Rozet kademeleri **kümülatif** toplam bağış üzerinden hesaplanır.

| Rozet ID | `badge_type` | Eşik | Açıklama |
|---|---|---|---|
| 🥉 Destekçi | `donor_bronze` | ≥ $5 (500 cent) | İlk bağış dostu |
| 🥈 Koruyucu | `donor_silver` | ≥ $20 (2000 cent) | Oyunu yaşatan |
| 🥇 Kahraman | `donor_gold` | ≥ $50 (5000 cent) | Efsane destekçi |

**Rozet mantığı:**
- Webhook her geldiğinde `donor_profiles.total_donated_cents` güncellenir
- Yeni toplam bir eşiği geçerse `badges` tablosuna `INSERT OR IGNORE` ile rozet yazılır (`period_id = 'lifetime'`)
- `INSERT OR IGNORE` sayesinde idempotent — rozet ikinci kez eklenmez
- `rank = 1` sabit (bu rozetlerde sıralama yoktur)
- Rozet verildiğinde `audit_logs`'a `'donation.badge_awarded'` yazılır

---

## Gizlilik & Tablo Tasarımı

### İki tablo stratejisi

**`store_events`** → Tam kayıt, **sadece admin erişebilir** (KVKK/GDPR uyumu)
- Email, müşteri adı, LS customer ID, ham payload — tümü burada

**`donor_profiles`** → Genel profil, **ileride public leaderboard için** (minimum veri)
- Sadece: `uid`, `display_name`, `total_donated_cents`, `badge_tier`, `is_anonymous`, `created_at/updated_at`
- Email yok, müşteri detayı yok
- Anonim bağışçılarda `display_name = 'Anonim'`, uid kaydedilmez

Bu ayrım:
- Gelecekte "Bağışçılar Sayfası" yapılabilir → sadece `donor_profiles` kullanılır
- Privacy: tam veri `store_events`'te kilitli, herkese açık sayfa sadece takma adı gösterir

---

## Proposed Changes

### 1. Mevcut D1'e Yeni Tablolar — `AUDIT_DB`

#### [NEW] `migrations/0006_store.sql`

Mevcut `syncron-audit-logs` veritabanına eklenir (`AUDIT_DB` binding'i zaten tanımlı).

```sql
-- ─── store_events: Tam kayıt tablosu (admin-only) ────────────────────────────
CREATE TABLE IF NOT EXISTS store_events (
  id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  ls_event_id      TEXT UNIQUE NOT NULL,
  event_name       TEXT NOT NULL CHECK (length(event_name) BETWEEN 1 AND 64),
  uid              TEXT,                        -- Firebase UID (NULL = anonim)
  ls_order_id      TEXT,
  ls_customer_id   TEXT,
  ls_variant_id    TEXT,
  product_name     TEXT,
  amount_cents     INTEGER NOT NULL CHECK (amount_cents > 0),
  currency         TEXT NOT NULL DEFAULT 'USD' CHECK (length(currency) = 3),
  customer_email   TEXT,
  customer_name    TEXT,
  donor_alias      TEXT,                        -- checkout'ta girilen takma ad
  raw_payload      TEXT NOT NULL,              -- ham JSON — veri kaybı önlemi
  sig_valid        INTEGER NOT NULL DEFAULT 1, -- 0 = doğrulama başarısız (ama kaydedildi)
  error_info       TEXT,
  created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_store_uid ON store_events(uid, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_event ON store_events(event_name, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_store_ls_event ON store_events(ls_event_id);

-- ─── donor_profiles: Genel profil tablosu (minimum veri) ─────────────────────
-- Kümülatif bağış toplamı ve rozet kademesi burada tutulur.
-- Anonim bağışçılarda uid NULL, display_name 'Anonim'
CREATE TABLE IF NOT EXISTS donor_profiles (
  id                   TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  uid                  TEXT UNIQUE,             -- NULL = anonim (birden fazla satır olabilir)
  display_name         TEXT NOT NULL DEFAULT 'Anonim'
                            CHECK (length(display_name) BETWEEN 1 AND 50),
  total_donated_cents  INTEGER NOT NULL DEFAULT 0 CHECK (total_donated_cents >= 0),
  badge_tier           TEXT CHECK (badge_tier IN (NULL, 'bronze', 'silver', 'gold')),
  is_anonymous         INTEGER NOT NULL DEFAULT 0 CHECK (is_anonymous IN (0, 1)),
  created_at           TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at           TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Leaderboard sorgusu: en çok bağış yapanlar
CREATE INDEX IF NOT EXISTS idx_donor_total
  ON donor_profiles(total_donated_cents DESC);
-- uid ile profil arama (Firebase kullanıcısı tekrar bağış yaptığında UPSERT için)
CREATE INDEX IF NOT EXISTS idx_donor_uid
  ON donor_profiles(uid);
```

---

### 2. Cloudflare Worker — `syncron-worker`

#### [MODIFY] `wrangler.jsonc`

`wrangler.jsonc`'e **dokunulmaz.** `AUDIT_DB` zaten tanımlı, yeni binding gerekmez.  
Sadece secret comment satırları eklenir:

```jsonc
// Secrets (set via CLI, never in this file):
//   wrangler secret put LS_WEBHOOK_SECRET
//   wrangler secret put LS_API_KEY
```

#### [MODIFY] `src/types.ts`

`AUDIT_DB` kullanılır. Sadece LS secret'ları eklenir:

```typescript
// Env interface'ine eklenir:
LS_WEBHOOK_SECRET: string;
LS_API_KEY: string;
```

#### [NEW] `src/services/lemonSqueezy.ts`

Sorumlulukları:
1. **`verifyLsSignature(secret, signature, body)`** → HMAC-SHA256 doğrulama
2. **`parseLsOrderPayload(raw)`** → `order_created` payload'ını typed nesneye çevirir
3. **`upsertDonorProfile(db, {uid, displayName, amountCents, isAnonymous})`**
   - `db` = `c.env.AUDIT_DB` (mevcut binding)
   - `uid` varsa: `INSERT OR REPLACE` + toplam güncelle
   - Anonim: her bağış ayrı satır (uid NULL)
   - Dönüş: `{ newTotal, previousTier, newTier }`
4. **`awardDonorBadge(db, uid, badgeTier)`**
   - `db` = `c.env.AUDIT_DB` (mevcut `badges` tablosu aynı DB'de!)
   - `badges` tablosuna `INSERT OR IGNORE`
   - `badge_type`: `'donor_bronze'` / `'donor_silver'` / `'donor_gold'`
   - `period_id`: `'lifetime'` (kümülatif — periyot yok)
   - `rank`: `1`

#### [NEW] `src/routes/store.ts`

**`POST /webhooks/lemonsqueezy`** — CORS middleware **uygulanmaz**

```
Webhook akışı:
1. Ham body text olarak okunur (JSON parse öncesi)
2. X-Signature doğrulanır (HMAC-SHA256)
   → BAŞARISIZ: sig_valid=0, error_info ile store_events'e yaz, 200 dön*
3. event_name parse edilir
   → 'order_created' dışı: store_events'e log, 200 dön
4. order_created işlenir:
   a. custom_data.uid (opsiyonel), donor_alias, amount_cents extract edilir
   b. AUDIT_DB.store_events INSERT OR IGNORE (ls_event_id idempotency)
   c. uid varsa: upsertDonorProfile(AUDIT_DB) → rozet kontrolü → AUDIT_DB.badges
   d. uid varsa: AUDIT_DB.audit_logs'a 'payment.success' + 'donation.badge_awarded'
   (Tüm tablolar aynı AUDIT_DB'de — tek bağlantı, tek binding)
5. 200 OK dön
```

*Lemon Squeezy başarısız webhook'ları retry eder. 200 dönmezseniz spam alırsınız. Ama veriyi yine de kaydediyoruz.

#### [NEW] `src/routes/donorApi.ts`

```typescript
// GET /donors/top — anonim olmayan, en yüksek bağışçılar (public)
// GET /donors/:uid — uid'e göre bağışçı profili (public)
```

Bu endpoint'ler `AUDIT_DB.donor_profiles` tablosunu okur — `store_events`'e dokunmaz.

#### [MODIFY] `src/index.ts`

```typescript
import { storeRouter } from './routes/store';
import { donorApiRouter } from './routes/donorApi';
app.route('/', storeRouter);
app.route('/', donorApiRouter);
```

#### [MODIFY] `src/services/auditLog.ts`

```typescript
// AuditAction'a eklenir:
| 'donation.received'
| 'donation.badge_awarded'
```

---

### 3. Next.js Frontend — `app/donate/`

#### [NEW] `app/donate/page.tsx`

- Glassmorphism tasarım, oyun temasıyla uyumlu
- Hızlı seçim butonları: **$1 / $2 / $5 / $10**
- Özel miktar input (min $1, USD)
- Bağışçı adı input (opsiyonel — boş bırakılırsa "Anonim")
- "Bağış Yap" butonu → LS Checkout URL:
  ```
  https://[store].lemonsqueezy.com/buy/[variant_id]
    ?custom[uid]=[firebase_uid_or_empty]
    &custom[donor_alias]=[alias]
    &checkout[custom_price]=[cents]
    &checkout[email]=[email_if_logged_in]
  ```
- Para birimi gösterimi: "$X USD" — LS kendi tarafında kullanıcıya yerel para birimini gösterir

#### [NEW] `app/donate/DonateClient.tsx`

Client component:
- Firebase auth hook ile uid/email alır (yoksa anonim mod)
- Checkout URL'ini oluşturur
- Kullanıcının mevcut bağış rozetini gösterir (varsa)

---

## Güvenlik Özeti

| Katman | Yöntem |
|--------|--------|
| Webhook doğrulama | HMAC-SHA256 (X-Signature header, LS Signing Secret) |
| İmza başarısız ama veri korunur | `sig_valid=0` + `raw_payload` ile D1'e yazılır |
| Tekrar replay önlemi | `ls_event_id` UNIQUE index → `INSERT OR IGNORE` |
| Rozet duplicate önlemi | `badges` tablosunda `(uid, badge_type, period_id)` UNIQUE |
| SQL injection | Tüm sorgular `.bind()` ile parameterize |
| Gizlilik | `store_events` admin-only, `donor_profiles` minimum veri |
| Secret yönetimi | `wrangler secret put` — asla kaynak kodda değil |
| CORS bypass | Webhook endpoint'i CORS middleware'i atlar |

---

## Ilerideki Genişleme (Şimdi Yapmıyoruz)

- `/donate-wall` veya `/supporters` sayfası → `GET /donors/top` endpoint'i hazır
- Satış sistemi → aynı webhook endpoint, `event_name = 'order_created'` + farklı `ls_variant_id`
- RevenueCat (Capacitor/mobil) → tamamen bağımsız, ayrı plan

---

## Uygulama Sırası

```
1. 0006_store.sql migration dosyası oluştur (AUDIT_DB'ye yeni tablolar)
2. wrangler.jsonc sadece secret comment'ler eklenir (binding değişikliği YOK)
3. src/types.ts güncelle (LS_WEBHOOK_SECRET, LS_API_KEY — STORE_DB YOK)
4. src/services/lemonSqueezy.ts oluştur
5. src/routes/store.ts oluştur
6. src/routes/donorApi.ts oluştur
7. src/services/auditLog.ts güncelle (yeni AuditAction'lar)
8. src/index.ts güncelle (router'ları ekle)
9. app/donate/ sayfası oluştur
10. LS Dashboard → Webhooks → URL kaydet
11. wrangler secret put LS_WEBHOOK_SECRET
12. wrangler secret put LS_API_KEY
```
