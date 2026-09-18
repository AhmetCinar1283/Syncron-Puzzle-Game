/**
 * DOSYA AMACI: `RateLimitStore` sözleşmesinin Cloudflare Rate Limiting binding'i
 * kullanan İKİNCİ uygulaması. Bellek içi uygulamanın aksine sayaç isolate'e değil
 * Cloudflare kenarına aittir; dağıtık bir saldırgan da aynı kovaya düşer.
 * bkz. .plans/yayin-hazirlik/notlar.md §2 · services/rateLimit/README.md
 */

import { RATE_LIMIT_BINDING_PREFIX, rateLimiterBindingName } from './lib/bindingName';
import type { RateLimitConsumeInput, RateLimitConsumeResult, RateLimitStore } from './store';

/**
 * Binding'lerin arandığı kap. Pratikte Worker `env`'idir; testte düz bir nesne.
 * `unknown` bilinçlidir: `env` içinde hız limitiyle ilgisi olmayan onlarca alan
 * var, hepsini burada tiplemek bu dosyayı env'in ikinci bir kopyası yapardı.
 */
export type RateLimiterBindingSource = Readonly<Record<string, unknown>>;

/** Cloudflare `RateLimit` binding'inin bu modülün ihtiyaç duyduğu tek yüzeyi. */
interface RateLimiterBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

/**
 * Bir env alanının gerçekten hız limiti binding'i olup olmadığını RUNTIME'da
 * doğrular. `as RateLimit` şeklinde gerekçesiz bir dönüşüm yapılmaz: yerel
 * geliştirmede aynı ada sahip bir string/undefined bulunabilir ve o zaman
 * `.limit is not a function` ile 500 dönerdik.
 */
function isRateLimiterBinding(value: unknown): value is RateLimiterBinding {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { limit?: unknown }).limit === 'function'
  );
}

/**
 * Maliyeti 1'den büyük bir isteğin binding'e kaç kez sayılabileceğinin tavanı.
 * Binding çağrı başına 1 birim sayar; `cost` birden büyükse aynı anahtar için
 * birden çok çağrı yapılır. Tavan, hatalı bir `cost` değerinin (ör. 10.000)
 * tek istekte binlerce alt çağrı doğurmasını engeller.
 */
const MAX_BINDING_CALLS_PER_REQUEST = 10;

/**
 * Binding tabanlı depo.
 *
 * Alternatifi neydi ve neden reddettim?
 *   (a) Bellek içi depoyu SİLİP yerine bunu koymak. Reddedildi: binding çağrısı
 *       her istekte kenara bir tur atar; döngüye girmiş tek bir istemciyi
 *       isolate belleğinde bedavaya kesmek varken bunu yapmak gereksiz.
 *       İkisi katmanlı kullanılır (bkz. `resolveStore.ts`).
 *   (b) Durable Object tabanlı kesin sayaç. Reddedildi: her korunan istek için
 *       bir DO çağrısı = korumaya çalıştığımız bütçeyi kendimiz harcamak.
 * Yeni bir kademe/uç nokta eklenince bu dosya değişmek zorunda mı? HAYIR —
 *   burada ne uç nokta adı ne eşik geçer; binding adı kuralın sayılarından
 *   `lib/bindingName.ts` ile türetilir.
 * Değer eksik/null gelirse?
 *   - Kurala karşılık gelen binding yoksa (yerel geliştirme, test, henüz
 *     deploy edilmemiş yapılandırma) istek GEÇER ve durum **bir kez** loglanır.
 *     Sessiz kalmaz; ama tek başına da kalmaz: önündeki bellek içi katman
 *     çalışmaya devam ettiği için sistem korumasız kalmaz.
 *   - Kural binding ile ifade edilemiyorsa (ör. saatlik pencere; Cloudflare
 *     yalnızca 10/60 sn kabul eder) yine geçer ve bir kez loglanır. Bu bir
 *     yapılandırma hatası değil, bilinen platform sınırıdır.
 *   - Binding çağrısı patlarsa hata YUTULMAZ, yukarı atılır: çağıran katman
 *     (middleware) zaten fail-open davranır ve olayı `console.error`'a yazar.
 */
export function createCloudflareRateLimitStore(source: RateLimiterBindingSource): RateLimitStore {
  /** Aynı eksikliğin her istekte loglanmaması için; isolate ömrü boyunca tutulur. */
  const reportedGaps = new Set<string>();

  function reportGapOnce(reason: string): void {
    if (reportedGaps.has(reason)) return;
    reportedGaps.add(reason);
    console.warn(`[RateLimit] ${reason} — yalnızca bellek içi (isolate başına) sayaç etkin.`);
  }

  return {
    async consume({ key, limit, windowMs, cost }: RateLimitConsumeInput): Promise<RateLimitConsumeResult> {
      const bindingName = rateLimiterBindingName(limit, windowMs);
      if (!bindingName) {
        reportGapOnce(`Kural binding ile ifade edilemiyor (limit=${limit}, pencere=${windowMs}ms)`);
        return ALLOWED;
      }

      const binding = source[bindingName];
      if (!isRateLimiterBinding(binding)) {
        reportGapOnce(`'${bindingName}' binding'i tanımlı değil`);
        return ALLOWED;
      }

      const calls = normalizeCallCount(cost);
      const outcomes = await Promise.all(
        Array.from({ length: calls }, () => binding.limit({ key })),
      );

      if (outcomes.every((o) => o.success)) return ALLOWED;

      // Binding kalan süreyi bildirmez; yalnızca `success` döner. Pencerenin
      // tamamını beklemek tek GÜVENLİ üst sınırdır — daha kısa bir değer
      // uydurmak istemciyi hâlâ kapalı olan bir kapıya geri gönderirdi.
      return { allowed: false, retryAfterMs: windowMs };
    },
  };
}

const ALLOWED: RateLimitConsumeResult = { allowed: true, retryAfterMs: 0 };

function normalizeCallCount(cost: number): number {
  if (!Number.isFinite(cost)) return 1;
  const calls = Math.max(1, Math.trunc(cost));
  return Math.min(calls, MAX_BINDING_CALLS_PER_REQUEST);
}

/**
 * Kapta HERHANGİ bir hız limiti binding'i var mı?
 *
 * Yalnızca operasyonel görünürlük içindir (bkz. `resolveStore.ts`): binding'in
 * hiç olmadığı ortamda (yerel geliştirme, test) durumun bir kez loglanmasını
 * sağlar. Karar üretmez; binding eksikse depo zaten kural bazında geçirir.
 */
export function hasAnyRateLimiterBinding(source: RateLimiterBindingSource): boolean {
  return Object.keys(source).some(
    (name) => name.startsWith(RATE_LIMIT_BINDING_PREFIX) && isRateLimiterBinding(source[name]),
  );
}
