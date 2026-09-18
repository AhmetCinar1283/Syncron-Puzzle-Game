/**
 * DOSYA AMACI: Tek bir kayan pencere (fixed-window sayaç) adımının SAF hesabı.
 * Ne Hono, ne D1, ne Date.now() bilir — her şey parametreyle gelir, sonuç
 * yeni durum + karar olarak döner. Depolama katmanı bunu sarar.
 * bkz. .plans/yayin-hazirlik/03-rate-limit-ve-kotuye-kullanim.md §3.2
 */

/** Bir kovanın disk/bellek üzerindeki tüm durumu. Serileştirilebilir olmalıdır. */
export interface WindowState {
  /** Bu pencerede şu ana kadar harcanan maliyet toplamı. */
  count: number;
  /** Pencerenin başladığı epoch ms. */
  windowStart: number;
}

export interface WindowStep {
  allowed: boolean;
  /** Karardan SONRAKİ durum. Reddedilen istek sayacı artırmaz (ceza yok). */
  state: WindowState;
  /** Reddedildiyse pencerenin bitmesine kalan ms; izin verildiyse 0. */
  retryAfterMs: number;
}

export interface WindowStepInput {
  previous: WindowState | undefined;
  now: number;
  windowMs: number;
  limit: number;
  /** Bu isteğin ağırlığı. Pahalı uç noktalar 1'den büyük maliyet taşıyabilir. */
  cost: number;
}

/**
 * Pencereyi bir adım ilerletir.
 *
 * Alternatifi neydi ve neden reddettim? Gerçek "sliding log" (her isteğin zaman
 *   damgasını dizide tutmak — `tickets.ts`'in eski yaptığı). Reddedildi: istek
 *   başına O(n) bellek ve GC baskısı yaratır, Worker isolate'inde bedava değil.
 *   Sabit pencere en kötü ihtimalle pencere sınırında 2x patlamaya izin verir;
 *   30/dk için bu 60/dk demektir ve ölçülen insan tavanının (9/dk) hâlâ çok
 *   üstünde kaldığı için kabul edilebilir bir takas.
 * Yeni bir uç nokta/kademe eklenince bu dosya değişmek zorunda mı? Hayır —
 *   fonksiyon kovanın kim olduğunu, hangi route'a ait olduğunu bilmez.
 * Değer eksik/null gelirse? `previous` yoksa taze pencere açılır. `windowMs`
 *   veya `limit` sayı değilse/0 ise istek REDDEDİLMEZ (fail-open): hız limiti
 *   bir güvenlik kilidi değil bütçe koruyucusudur; bozuk konfigürasyon yüzünden
 *   meşru oyuncuyu kilitlemek, korumasız kalmaktan daha pahalıdır.
 */
export function stepWindow(input: WindowStepInput): WindowStep {
  const { previous, now, windowMs, limit } = input;
  const cost = Number.isFinite(input.cost) ? Math.max(1, Math.trunc(input.cost)) : 1;

  if (!Number.isFinite(windowMs) || windowMs <= 0 || !Number.isFinite(limit) || limit <= 0) {
    // Bozuk kademe tanımı → fail-open (yukarıdaki doc-comment).
    return { allowed: true, state: { count: cost, windowStart: now }, retryAfterMs: 0 };
  }

  const expired = !previous || now - previous.windowStart >= windowMs;
  if (expired) {
    return { allowed: true, state: { count: cost, windowStart: now }, retryAfterMs: 0 };
  }

  if (previous.count + cost > limit) {
    const retryAfterMs = Math.max(0, previous.windowStart + windowMs - now);
    return { allowed: false, state: previous, retryAfterMs };
  }

  return {
    allowed: true,
    state: { count: previous.count + cost, windowStart: previous.windowStart },
    retryAfterMs: 0,
  };
}
