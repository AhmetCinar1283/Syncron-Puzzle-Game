/**
 * DOSYA AMACI: Hız limiti kararını HTTP'ye çeviren ince Hono ara yazılımı.
 * Karar `services/rateLimit`'te, eşikler `services/rateLimit/lib/policy.ts`'te;
 * burada yalnızca kimliğin çözülmesi, 429 yanıtı ve güvenlik izi vardır.
 * bkz. .plans/yayin-hazirlik/03-rate-limit-ve-kotuye-kullanim.md §3.2, §3.4
 */

import { createMiddleware } from 'hono/factory';
import type { Context } from 'hono';
import type { AppContext } from '../types';
import { evaluateRateLimit, resolveRateLimitStore, type RateLimitEndpointId } from '../services/rateLimit';
import { recordRateLimitExceeded } from '../services/securitySignals';
import { trackSecurityEvent } from './securityTrail';

export interface RateLimitMiddlewareOptions {
  /**
   * Kimliği bağlamdan çıkaran fonksiyon. Varsayılan: `c.get('uid')`.
   * `/internal/log` gibi kimliğin gövdeden geldiği yerler bunu geçersiz kılar.
   */
  identify?: (c: Context<AppContext>) => string | null;
}

/**
 * Bir uç noktayı `policy.ts` tablosundaki kimliğe bağlar.
 *
 * Alternatifi neydi ve neden reddettim? Middleware'e doğrudan sayı vermek
 *   (`rateLimit({ perMinute: 30 })`). Reddedildi: eşikler o zaman 10 route
 *   dosyasına dağılır, "hangi uç nokta hangi limitte?" sorusunun tek cevabı
 *   kalmaz ve gözden geçirmek imkânsızlaşır.
 * Yeni bir uç nokta eklenince bu dosya değişmek zorunda mı? HAYIR — bu dosyada
 *   hiçbir uç nokta adı geçmez; `RateLimitEndpointId` birliği tabloda büyür.
 * Mekanizma (bellek içi ön filtre + Cloudflare binding) burada SEÇİLMEZ;
 *   `services/rateLimit/resolveStore.ts` tek kompozisyon noktasıdır.
 * Değer eksik/null gelirse? Kimlik çözülemezse uid kapsamlı kurallar atlanır
 *   (bkz. `rateLimitService.ts`); depo patlarsa istek GEÇER (fail-open) —
 *   hız limitleyicinin kendisi kesinti sebebi olmamalıdır.
 */
export function rateLimit(
  endpoint: RateLimitEndpointId,
  options: RateLimitMiddlewareOptions = {},
) {
  const identify = options.identify ?? ((c: Context<AppContext>) => c.get('uid') ?? null);

  return createMiddleware<AppContext>(async (c, next) => {
    let outcome;
    try {
      outcome = await evaluateRateLimit(resolveRateLimitStore(c.env), {
        endpoint,
        identity: identify(c),
        now: Date.now(),
      });
    } catch (err) {
      console.error('[RateLimit] evaluation failed, allowing request:', err);
      return next();
    }

    if (outcome.allowed) return next();

    // Güvenlik izi — isteği bekletmez (§3.5; 05 numaralı görev genişletecek).
    const uid = identify(c);
    c.executionCtx.waitUntil(
      recordRateLimitExceeded(c.env.AUDIT_DB, uid, endpoint, outcome.exceededScope ?? 'uid').catch((err) =>
        console.error('[RateLimit] security audit write failed:', err),
      ),
    );

    // 05 §3.2 — adli iz: aşımın kaynağını (karma IP + UA) `security_events`'e yazar.
    trackSecurityEvent(c, 'ratelimit.exceeded', { endpointId: endpoint, scope: outcome.exceededScope ?? 'uid' }, uid);

    c.header('Retry-After', String(outcome.retryAfterSeconds));
    // Gövde iç eşikleri SIZDIRMAZ: ne limit, ne pencere, ne kalan hak yazar.
    return c.json({ success: false, error: 'RATE_LIMIT_EXCEEDED' }, 429);
  });
}
