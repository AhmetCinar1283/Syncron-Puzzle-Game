# `services/securityEvents` — Adli iz katmanı

Güvenlik olaylarını (`kim, ne zaman, nereden, ne yaptı`) `security_events` tablosuna yazar.
`audit_logs`'tan **ayrı** bir tablodur; ayrı saklama süresi ve ayrı silme yolu vardır.

Kaynak plan: `.plans/yayin-hazirlik/05-loglama-ve-adli-iz.md`

## Neden `audit_logs` değil?

| | `audit_logs` | `security_events` |
|---|---|---|
| Ne tutar | işletme kaydı (bölüm bitti, bilet açıldı) | güvenlik olayı (token reddedildi, limit aşıldı) |
| Kişisel veri | **yok** — IP/UA hiç yazılmaz | karma IP + kısaltılmış UA |
| Saklama | 90 gün, sonra **R2'ye arşivlenir** | **30 gün, sonra SİLİNİR** — arşivlenmez |
| Temizlik | `scheduled/logRetention.ts` | `scheduled/securityEventRetention.ts` |

Kişisel veri R2'ye taşınmadığı için 30 günlük saklama vaadi gerçekten tutulur.
Bu ayrım KVKK savunmasının temelidir; iki tabloyu birleştirme.

## Dosyalar

| Dosya | Ne |
|---|---|
| `lib/eventCatalog.ts` | **VERİ.** Olay tipi → hassasiyet + ciddiyet + amaç. Yeni olay tipi eklemek = buraya bir satır. |
| `lib/fingerprint.ts` | **SAF.** `CF-Connecting-IP` okuma, tuzlu SHA-256 karma, UA kısaltma. D1 ve Hono bilmez. |
| `securityEventStore.ts` | **IO.** Tek D1 erişim katmanı. Tüm sorgular `.bind()` ile parametreli. |
| `recordSecurityEvent.ts` | **KARAR.** Katalogdaki hassasiyete bakar, parmak izi gerekiyorsa üretir, satırı yazar. Hiçbir olay adı geçmez. |
| `index.ts` | Tek public API. Modül dışından `lib/*` import **edilmez**. |

Hono köprüsü bu modülde **değildir**: `src/middleware/securityTrail.ts` →
`trackSecurityEvent(c, type, metadata)`. Çağrı yerleri yalnızca onu görür.

## Yeni olay tipi eklemek

1. `lib/eventCatalog.ts`'e bir satır (tip, `sensitivity`, `severity`, `purpose`).
2. Çağrı yerinde `trackSecurityEvent(c, '<yeni.tip>', { ... })`.

Başka hiçbir dosya değişmez. `sensitivity: 'fingerprint'` seçersen **IP/UA toplarsın** —
bunun `/privacy` ve `/kvkk` metinleriyle tutarlı olduğundan emin ol
(`.plans/yayin-hazirlik/00-ilkeler.md` §2.4).

## Kişisel veri kuralları (pazarlık konusu değil)

- IP **ham saklanmaz**. Tuzlanmış SHA-256'nın ilk 128 biti yazılır.
- Tuz bir Worker sırrıdır: `wrangler secret put SECURITY_IP_SALT`.
  **Tuz yoksa IP alanı `NULL` kalır** — ham IP'ye asla düşülmez.
- IP/UA **yalnızca** `sensitivity: 'fingerprint'` olan olaylara eklenir.
  Sıradan oyun eylemleri (`level.complete`) hiçbir parmak izi taşımaz.
- Saklama süresi `scheduled/securityEventRetention.ts` içindeki
  `SECURITY_EVENT_RETENTION_DAYS` sabitidir ve aydınlatma metinlerinde
  **beyan edilmiştir**. Değiştiren, metinleri de değiştirmek zorundadır.

## Okuma

`GET /admin/users/:uid/security-events` — yalnızca `role === 'admin'`.
Moderatör 403 alır: moderatör destek/içerik rolüdür, kişisel veriye erişimi iş gereği değildir.
