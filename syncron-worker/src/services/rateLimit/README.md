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

## Mekanizma — iki katman (KARAR VERİLDİ, uygulandı)

Sayaç iki katmanda tutulur ve sıralama **tek bir yerde**, `resolveStore.ts` içinde
kurulur. Çağrı yerleri ve kademe tablosu bunu bilmez.

| Sıra | Katman | Dosya | Kapsam | Neden |
|---|---|---|---|---|
| 1 | Bellek içi ön filtre | `store.ts` | isolate başına | Ucuz. Döngüye girmiş istemciyi kenara hiç çıkmadan keser. |
| 2 | Cloudflare Rate Limiting binding | `cloudflareRateLimitStore.ts` | hesap/kenar geneli | Paylaşılan gerçek. Dağıtık saldırgan da aynı kovaya düşer. |

İlk reddeden kazanır; ön filtre reddederse binding **hiç çağrılmaz**
(`layeredStore.ts`).

### Binding adı nereden gelir?

Binding adı kuralın **sayılarından** türetilir (`lib/bindingName.ts`):
`RL_<limit>_PER_<saniye>S` → ör. 30/dk = `RL_30_PER_60S`. Böylece kod içinde
"kademe → binding" diye ikinci bir tablo tutulmaz; tek gerçek kaynak
`lib/policy.ts` olarak kalır.

Yeni bir eşik eklemek: `lib/policy.ts`'e satır + `wrangler.jsonc` → `ratelimits`
listesine aynı adla binding. **Kodda tek satır değişmez.**

### Platform sınırı — saatlik tavan binding'e giremez

Cloudflare'in "simple" hız limiti binding'i `period` olarak yalnızca **10 veya 60
saniye** kabul eder. Bu yüzden `strict` kademesinin ikinci tavanı (600/saat)
binding ile ifade **edilemez** ve bellek içi katmanda kalır (yani saatlik tavan
hâlâ isolate başınadır). Dakikalık tavan (30/dk) paylaşılan sayaçla uygulandığı
için asıl koruma oradadır.

### Binding yoksa ne olur?

Yerel `wrangler dev`, vitest ve binding'siz bir deploy'da sistem **korumasız
kalmaz**: bellek içi katman aynen çalışır, durum isolate başına **bir kez**
`console.warn` ile loglanır (sessizce geçilmez).
