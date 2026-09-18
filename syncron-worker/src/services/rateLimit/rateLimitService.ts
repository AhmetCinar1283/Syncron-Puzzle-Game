/**
 * DOSYA AMACI: "Kimlik + kova + maliyet" sözleşmesini karara çeviren tek fonksiyon.
 * HTTP bilmez, Hono bilmez; yalnızca bir `RateLimitStore` ve limit tablosu kullanır.
 * bkz. .plans/yayin-hazirlik/03-rate-limit-ve-kotuye-kullanim.md §3.2
 */

import { resolveEndpointLimit } from './lib/policy';
import type { RateLimitStore } from './store';

export interface RateLimitRequest {
  /** `policy.ts` tablosundaki uç nokta kimliği. */
  endpoint: string;
  /**
   * İsteği yapan kimlik. Normalde Firebase uid. Kimlik çözülemiyorsa `null`
   * gönderilir; bu durumda uid kapsamlı kurallar atlanır (bkz. aşağıdaki not).
   */
  identity: string | null;
  now: number;
  /** Tablodaki varsayılan maliyeti geçersiz kılar (ör. toplu istek). */
  cost?: number;
}

export interface RateLimitOutcome {
  allowed: boolean;
  /** `Retry-After` başlığı için saniye. İzin verildiyse 0. */
  retryAfterSeconds: number;
  /** Aşım hangi kapsamda oldu — yalnızca iç loglama/audit için. İstemciye SIZMAZ. */
  exceededScope: 'uid' | 'global' | null;
}

/**
 * Bir isteğin limit içinde olup olmadığına karar verir.
 *
 * Alternatifi neydi ve neden reddettim? Her route'un kendi sayaç Map'ini tutması
 *   (bugünkü `tickets.ts` + `rateLimiter.ts` ikilisi). Reddedildi: aynı iş iki
 *   yerde iki farklı şekilde yazılıyordu, eşikler tek yerden görülemiyordu ve
 *   üçüncü bir uç nokta korunmak istediğinde kod kopyalanıyordu.
 * Yeni bir uç nokta eklenince bu dosya değişmek zorunda mı? HAYIR — yalnızca
 *   `policy.ts` tablosuna bir satır eklenir. Bu dosyada uç nokta adı geçmez.
 * Değer eksik/null gelirse?
 *   - `endpoint` tabloda yoksa → izin verilir (fail-open). Gerekçe: tabloyu
 *     güncellemeyi unutmak geliştiricinin hatasıdır; bedelini oyuncu ödememeli.
 *     Bu durum çağıran tarafta `console.warn` ile görünür kalır.
 *   - `identity` null ise → uid kapsamlı kurallar ATLANIR, global kurallar
 *     uygulanır. Kimliği olmayan birine rastgele bir kova uydurmak (ör. 'anon')
 *     tüm anonim trafiği tek kovaya koyup meşru oyuncuları birbirine kilitlerdi.
 *     Bu yüzden korunan uç noktaların hepsi zaten kimlik doğrulaması ister.
 */
export async function evaluateRateLimit(
  store: RateLimitStore,
  req: RateLimitRequest,
): Promise<RateLimitOutcome> {
  const policy = resolveEndpointLimit(req.endpoint);
  if (!policy) {
    return { allowed: true, retryAfterSeconds: 0, exceededScope: null };
  }

  const cost = req.cost ?? policy.cost;

  // Kurallar sırayla harcanır. İkinci kural (ör. saatlik) reddederse birinci
  // kural (dakikalık) bu isteği zaten saymış olur — kasıtlı: tek etkisi limitin
  // marjinal olarak daha muhafazakâr olmasıdır, hiçbir isteğe fazladan izin vermez.
  for (const rule of policy.rules) {
    if (rule.scope === 'uid' && !req.identity) continue;

    const subject = rule.scope === 'uid' ? req.identity : 'global';
    const key = `${req.endpoint}:${rule.scope}:${subject}:${rule.windowMs}`;

    const result = await store.consume({
      key,
      limit: rule.limit,
      windowMs: rule.windowMs,
      cost,
      now: req.now,
    });

    if (!result.allowed) {
      return {
        allowed: false,
        // En az 1 sn: 0 döndürmek istemciyi anında yeniden denemeye davet eder.
        retryAfterSeconds: Math.max(1, Math.ceil(result.retryAfterMs / 1000)),
        exceededScope: rule.scope,
      };
    }
  }

  return { allowed: true, retryAfterSeconds: 0, exceededScope: null };
}
