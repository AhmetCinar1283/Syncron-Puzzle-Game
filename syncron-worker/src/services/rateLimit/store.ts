/**
 * DOSYA AMACI: Hız limiti sayaçlarının MEKANİZMA SINIRI. Çağrı yerleri yalnızca
 * `RateLimitStore` arayüzünü görür; bellek içi sayaç bugünkü uygulamadır,
 * Cloudflare Rate Limiting binding'i yarın ikinci bir uygulama olabilir.
 * bkz. .plans/yayin-hazirlik/03-rate-limit-ve-kotuye-kullanim.md §3.1–§3.2
 */

import { stepWindow, type WindowState } from './lib/window';

export interface RateLimitConsumeInput {
  /** Kova anahtarı: `<uçNokta>:<kapsam>:<kimlik>`. Çağıran üretir, store yorumlamaz. */
  key: string;
  limit: number;
  windowMs: number;
  cost: number;
  now: number;
}

export interface RateLimitConsumeResult {
  allowed: boolean;
  retryAfterMs: number;
}

/**
 * Sayaç deposu.
 *
 * Alternatifi neydi ve neden reddettim? Doğrudan D1 tabanlı sayaç. Reddedildi:
 *   görev dosyası §3.1'in de dediği gibi her istekte bir D1 yazması, korumaya
 *   çalıştığımız bütçeyi saldırganın yerine bizim harcamamız olurdu.
 * Yeni bir kaynak/mekanizma eklenince bu dosya değişmek zorunda mı? Hayır —
 *   yeni mekanizma bu arayüzü uygulayan ayrı bir dosya olur, bu dosya durur.
 * Değer eksik/null gelirse? `stepWindow` fail-open davranır (bkz. window.ts).
 */
export interface RateLimitStore {
  consume(input: RateLimitConsumeInput): Promise<RateLimitConsumeResult>;
}

const CLEANUP_INTERVAL_MS = 5 * 60_000;

/**
 * Bellek içi (isolate başına) sayaç deposu.
 *
 * SINIRI AÇIKÇA YAZIYORUM: Cloudflare aynı anda birden çok isolate çalıştırır ve
 * isolate'leri geri dönüştürür. Bu yüzden buradaki limit KESİN DEĞİLDİR; kaba
 * kötüye kullanımı ve döngüye giren istemciyi keser, kararlı ve dağıtık bir
 * saldırıyı kesmez. Kesinlik gerekiyorsa mekanizma kararı (README → "Açık karar")
 * verilmeli ve bu arayüzün ikinci bir uygulaması yazılmalıdır.
 */
export function createMemoryRateLimitStore(): RateLimitStore {
  /**
   * Her kaydın kendi `windowMs`'i saklanır. Temizlik yaparken KAYDIN KENDİ
   * penceresine bakılır; aksi hâlde o an işlenen isteğin penceresiyle (ör. 1 dk)
   * çok daha uzun pencereli kayıtlar (ör. 1 saatlik tavan) yanlışlıkla silinir
   * ve saatlik limit hiç devreye girmezdi.
   */
  const windows = new Map<string, { state: WindowState; windowMs: number }>();
  let lastCleanup = 0;

  function prune(now: number): void {
    if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
    lastCleanup = now;
    for (const [key, entry] of windows) {
      if (now - entry.state.windowStart > entry.windowMs * 2) windows.delete(key);
    }
  }

  return {
    async consume({ key, limit, windowMs, cost, now }: RateLimitConsumeInput): Promise<RateLimitConsumeResult> {
      prune(now);
      const step = stepWindow({ previous: windows.get(key)?.state, now, windowMs, limit, cost });
      windows.set(key, { state: step.state, windowMs });
      return { allowed: step.allowed, retryAfterMs: step.retryAfterMs };
    },
  };
}

/**
 * Worker isolate'i ömrü boyunca paylaşılan tekil depo.
 * Modül kapsamındadır: `tickets.ts` ve `internalLog.ts`'in eskiden ayrı ayrı
 * tuttuğu iki Map'in yerini alır.
 */
export const sharedRateLimitStore: RateLimitStore = createMemoryRateLimitStore();
