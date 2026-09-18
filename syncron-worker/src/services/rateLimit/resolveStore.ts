/**
 * DOSYA AMACI: Hız limiti KOMPOZİSYON NOKTASI — hangi mekanizmaların hangi
 * sırayla katmanlanacağı YALNIZCA burada yazar. Çağrı yerleri (route'lar,
 * middleware) mekanizmayı hiç bilmez, tek bir `RateLimitStore` görür.
 * bkz. .plans/yayin-hazirlik/notlar.md §2 · 00-mimari-ilkeler.md §3
 */

import { createCloudflareRateLimitStore, hasAnyRateLimiterBinding } from './cloudflareRateLimitStore';
import { createLayeredRateLimitStore } from './layeredStore';
import { sharedRateLimitStore } from './store';
import type { RateLimitStore } from './store';

/**
 * Çözülen depolar env nesnesi başına önbelleklenir. Her istekte yeni bir
 * katman zinciri kurmak, binding yokluğu uyarısının her istekte tekrar
 * basılmasına ve gereksiz nesne çöpüne yol açardı. `WeakMap`: env yaşadığı
 * sürece yaşar, isolate geri dönüştürülünce kendiliğinden gider.
 */
const cache = new WeakMap<object, RateLimitStore>();

/**
 * Worker `env`'inden etkin hız limiti deposunu üretir.
 *
 * SIRA (kasıtlı): [1] bellek içi (isolate başına) → [2] Cloudflare binding.
 *   Bellek içi katman ÖNDE çünkü ucuzdur: döngüye girmiş tek bir istemciyi
 *   kenara hiç çıkmadan, isolate belleğinde keser. Arkadaki binding ise
 *   PAYLAŞILAN gerçeği söyler: dağıtık bir saldırgan isolate'ler arasına
 *   dağılsa bile aynı kovaya düşer. Eşikler aynı tablodan (`lib/policy.ts`)
 *   geldiği için ön filtre hiçbir zaman arkadakinden DAHA GEVŞEK davranamaz;
 *   iki katman aynı eşiği iki farklı kapsamda uygular.
 *
 * Alternatifi neydi ve neden reddettim?
 *   (a) Bellek içi katmanı tamamen kaldırıp yalnız binding kullanmak.
 *       Reddedildi: her istekte bir kenar turu ödemek, en ucuz vakayı
 *       (tekrar eden tek istemci) en pahalı yoldan çözmek olurdu.
 *   (b) Binding'i öne almak. Reddedildi: ön filtrenin tanımı gereği ucuz olanı
 *       önce denemektir; tersi sıralamada ön filtre hiçbir şey kazandırmaz.
 *   (c) Sıralamayı `middleware/rateLimiter.ts` içinde kurmak. Reddedildi:
 *       mekanizma bilgisi HTTP katmanına sızardı; ikinci bir çağıran çıktığında
 *       (cron, internal route) sıralama kopyalanmak zorunda kalırdı.
 * Yeni bir uç nokta/kademe eklenince bu dosya değişmek zorunda mı? HAYIR —
 *   burada ne uç nokta adı ne eşik geçer. Yeni bir MEKANİZMA eklenirse değişir;
 *   zaten tek değişmesi gereken yer burasıdır.
 * Değer eksik/null gelirse? Binding hiç yoksa (yerel `wrangler dev`, vitest,
 *   binding'siz deploy) sistem korumasız KALMAZ: bellek içi katman aynen
 *   çalışır, durum bir kez `console.warn` ile loglanır ve sessizce geçilmez.
 */
export function resolveRateLimitStore(env: unknown): RateLimitStore {
  if (typeof env !== 'object' || env === null) {
    // Env yoksa yapılacak tek makul şey ön filtreyle devam etmektir.
    return sharedRateLimitStore;
  }

  const cached = cache.get(env);
  if (cached) return cached;

  const source = env as Readonly<Record<string, unknown>>;
  if (!hasAnyRateLimiterBinding(source)) {
    console.warn(
      '[RateLimit] Cloudflare Rate Limiting binding bulunamadı; limit YALNIZCA isolate ' +
        'başına bellek sayacıyla uygulanıyor (yerel geliştirme/test için beklenen durum, ' +
        'üretimde wrangler.jsonc `ratelimits` bölümü kontrol edilmeli).',
    );
  }

  const store = createLayeredRateLimitStore([
    sharedRateLimitStore,
    createCloudflareRateLimitStore(source),
  ]);
  cache.set(env, store);
  return store;
}
