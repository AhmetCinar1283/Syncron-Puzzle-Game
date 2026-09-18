/**
 * DOSYA AMACI: Bir limit kuralını (limit + pencere) Cloudflare Rate Limiting
 * binding ADINA çeviren SAF eşleme. Hiçbir env, binding veya Worker API'si
 * bilmez; yalnızca sayı → ad üretir ve mümkün olmayan eşlemeye `undefined` der.
 * bkz. .plans/yayin-hazirlik/notlar.md §2
 */

/**
 * Cloudflare'in "simple" hız limiti binding'i pencere olarak YALNIZCA 10 veya
 * 60 saniyeyi kabul eder (bkz. wrangler config-schema: `ratelimits[].simple.period`
 * enum [10, 60]). Bu bir tercih değil, platform sınırıdır.
 */
export const SUPPORTED_BINDING_PERIODS_SEC = [10, 60] as const;

export type SupportedBindingPeriodSec = (typeof SUPPORTED_BINDING_PERIODS_SEC)[number];

/** Binding adlarının değişmez ön eki. `wrangler.jsonc` ile birebir aynı olmalıdır. */
export const RATE_LIMIT_BINDING_PREFIX = 'RL_';

/**
 * `{ limit, windowMs }` → binding adı (ör. 30/60sn → `RL_30_PER_60S`).
 *
 * Alternatifi neydi ve neden reddettim? Kod içinde "kademe adı → binding adı"
 *   sabit bir eşleme tablosu tutmak (`{ strict: 'RL_STRICT', ... }`). Reddedildi:
 *   o tablo `lib/policy.ts`'teki kademe tablosunun ikinci bir kopyası olurdu ve
 *   ikisi sessizce ayrışabilirdi. Ad doğrudan kuralın SAYILARINDAN türetilince
 *   tek gerçek kaynağı `policy.ts` olarak kalır.
 * Yeni bir kademe/uç nokta eklenince bu dosya değişmek zorunda mı? HAYIR.
 *   Yeni eşik `policy.ts`'e yazılır, `wrangler.jsonc`'a aynı ada sahip bir
 *   binding eklenir; burada tek satır değişmez. (Binding'in wrangler'a
 *   yazılması Cloudflare'in zorunlu kıldığı adımdır, kod bunu üretemez.)
 * Değer eksik/null gelirse? `limit` pozitif tam sayı değilse veya pencere 10/60
 *   saniyeye tam oturmuyorsa (ör. saatlik tavan) `undefined` döner. Çağıran bunu
 *   "bu kural binding ile ifade edilemez" diye okur ve o kuralı bellek içi
 *   katmana bırakır; UYDURULMUŞ bir binding adına ASLA düşülmez.
 */
export function rateLimiterBindingName(limit: number, windowMs: number): string | undefined {
  if (!Number.isFinite(limit) || !Number.isInteger(limit) || limit <= 0) return undefined;
  if (!Number.isFinite(windowMs) || windowMs <= 0) return undefined;

  const periodSec = windowMs / 1000;
  if (!isSupportedPeriod(periodSec)) return undefined;

  return `${RATE_LIMIT_BINDING_PREFIX}${limit}_PER_${periodSec}S`;
}

function isSupportedPeriod(periodSec: number): periodSec is SupportedBindingPeriodSec {
  return (SUPPORTED_BINDING_PERIODS_SEC as readonly number[]).includes(periodSec);
}
