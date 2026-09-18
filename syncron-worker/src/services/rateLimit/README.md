# `services/rateLimit` — Paylaşılan hız limiti

Worker'daki TEK hız limiti uygulaması. Daha önce aynı iş iki ayrı yerde
(`middleware/rateLimiter.ts` → `/internal/log`, `routes/tickets.ts` → kendi
`Map`'i) iki farklı şekilde yazılıydı; ikisi de buraya taşındı.

> Kaynak görev: `.plans/yayin-hazirlik/03-rate-limit-ve-kotuye-kullanim.md`

## Sözleşme

Limit, belirli bir uç noktaya değil üç şeye bağlıdır:

| Parça | Nereden gelir |
|---|---|
| **kimlik** | `identify(c)` — varsayılan `c.get('uid')` |
| **kova** | `policy.ts` tablosundaki uç nokta kimliği + kapsam (`uid` \| `global`) |
| **maliyet** | `policy.ts`'teki `cost` (çağrı yerinden geçersiz kılınabilir) |

Yeni bir uç noktayı korumak **konfigürasyon işidir**:

1. `lib/policy.ts` → `RateLimitEndpointId` birliğine kimlik, `ENDPOINT_RATE_LIMITS`
   tablosuna bir satır ekle.
2. Route'a `rateLimit('<kimlik>')` middleware'ini ekle.

Kod kopyalanmaz; `rateLimitService.ts` ve `middleware/rateLimiter.ts` içinde
hiçbir uç nokta adı geçmez.

## Dosyalar

| Dosya | İş |
|---|---|
| `lib/window.ts` | Saf pencere matematiği. Hiçbir şey bilmez, her şey parametredir. |
| `lib/policy.ts` | **Kademe tablosu (veri)**. Eşiklerin gerekçesi ve ölçümü burada yazar. |
| `store.ts` | `RateLimitStore` arayüzü + bellek içi uygulama. **Mekanizma sınırı.** |
| `rateLimitService.ts` | Kimlik + kova + maliyet → karar. Saf, test edilebilir. |
| `index.ts` | Tek public API. `lib/*` dışarıdan import edilmez. |

Kararın HTTP'ye çevrilmesi (`429`, `Retry-After`, güvenlik izi)
`src/middleware/rateLimiter.ts` içindedir ve incedir.

## Aşım davranışı

- `429` + `Retry-After: <saniye>` (asla 0).
- Gövde: `{ "success": false, "error": "RATE_LIMIT_EXCEEDED" }` — iç eşikler
  (limit, pencere, kalan hak) **sızmaz**.
- `audit_logs`'a `category: 'security'` / `action: 'security.rate_limit_exceeded'`
  kaydı yazılır (`services/securitySignals.ts`). Otomatik yasaklama **yoktur**.

## AÇIK KARAR — mekanizma (proje sahibine soruldu, cevap bekleniyor)

Bugünkü uygulama **bellek içidir** ve sayaç Worker isolate'ine bağlıdır.
Cloudflare aynı anda çok sayıda isolate çalıştırdığı ve isolate'leri geri
dönüştürdüğü için bu limit **kesin değildir**: kaba kötüye kullanımı ve döngüye
giren istemciyi keser, kararlı/dağıtık bir saldırıyı kesmez.

Kesinlik için **Cloudflare Rate Limiting binding**'i gerekir; bu `wrangler.jsonc`
içine binding eklemeyi ve panelden ayar yapmayı gerektirdiği için ajan tek başına
yapmaz (bkz. `00-ilkeler.md` §5). Karar geldiğinde yapılacak iş:

1. `store.ts` yanına `cloudflareRateLimitStore.ts` yaz (aynı `RateLimitStore` arayüzü).
2. `middleware/rateLimiter.ts` içindeki `sharedRateLimitStore` referansını `c.env`'den
   çözülen depoyla değiştir.

**Çağrı yerlerinin hiçbiri değişmez.** Kademe tablosu da değişmez.
