/**
 * DOSYA AMACI: Birden çok `RateLimitStore`'u TEK bir store gibi davranan
 * katmanlı bir zincire dizer. Hangi katmanların hangi sırayla dizildiğini
 * bilmez — onu `resolveStore.ts` söyler.
 * bkz. .plans/yayin-hazirlik/notlar.md §2
 */

import type { RateLimitConsumeInput, RateLimitConsumeResult, RateLimitStore } from './store';

/**
 * Katmanları sırayla dener; İLK reddeden kazanır ve sonrakiler hiç çağrılmaz.
 *
 * Alternatifi neydi ve neden reddettim? Katmanları paralel çağırıp sonuçları
 *   birleştirmek. Reddedildi: ucuz ön filtrenin bütün anlamı, zaten
 *   reddedilecek bir istek için pahalı katmana (kenar turu) HİÇ gitmemektir.
 *   Paralel çağrı bu kazancı sıfırlardı.
 * Yeni bir mekanizma (KV, Durable Object, başka bir binding) eklenince bu dosya
 *   değişmek zorunda mı? HAYIR — yeni mekanizma `RateLimitStore` uygulayan ayrı
 *   bir dosya olur ve yalnızca `resolveStore.ts`'teki diziye girer.
 * Değer eksik/null gelirse? Dizi boşsa hiçbir katman yok demektir ve istek
 *   geçer (fail-open). Bir katmanın ATTIĞI hata yutulmaz: hız limitinin
 *   kendisi kesinti sebebi olmamalı diye fail-open kararı tek yerde,
 *   `middleware/rateLimiter.ts` içinde verilir; burada gizlenirse o karar iki
 *   yere dağılır ve arıza görünmez olurdu.
 */
export function createLayeredRateLimitStore(layers: readonly RateLimitStore[]): RateLimitStore {
  return {
    async consume(input: RateLimitConsumeInput): Promise<RateLimitConsumeResult> {
      for (const layer of layers) {
        const result = await layer.consume(input);
        if (!result.allowed) return result;
      }
      return { allowed: true, retryAfterMs: 0 };
    },
  };
}
