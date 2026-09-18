/**
 * DOSYA AMACI: Hız limiti tablosu — KOD DEĞİL VERİ. Hangi uç noktanın hangi
 * kademeye ve hangi maliyete bağlı olduğu yalnızca burada yazar. Yeni uç nokta
 * eklemek = bu tabloya bir satır + route'a bir middleware satırı.
 * bkz. .plans/yayin-hazirlik/03-rate-limit-ve-kotuye-kullanim.md §3.3
 */

/** Bir kademenin tek bir kuralı. Bir kademe birden çok kural taşıyabilir (dk + saat). */
export interface RateLimitRule {
  /**
   * Sayacın kime ait olduğu.
   * `uid`  → kimlik başına (tek hesabın kötüye kullanımı).
   * `global` → tüm çağıranlar için tek sayaç (bütçe koruması).
   */
  scope: 'uid' | 'global';
  limit: number;
  windowMs: number;
}

export type RateLimitTierName =
  | 'strict'
  | 'moderate'
  | 'relaxed'
  | 'support'
  | 'internalLog'
  | 'adminSensitive';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/**
 * Kademeler.
 *
 * EŞİKLERİN GEREKÇESİ (varsayım değil, ölçüm — 2026-09-17, üretim D1):
 *   - `level_telemetry` tablosu BOŞ (0 satır) → görev dosyasının önerdiği kaynak
 *     kullanılamadı; onun yerine `played_levels.time_spent` ve `audit_logs`
 *     (`action='level.complete'`) dağılımına bakıldı.
 *   - `played_levels`: 45 satır, time_spent min 1 sn, medyan ~6 sn, maks 84 sn.
 *   - Gerçekte gözlenen EN HIZLI oyuncu: tek uid için **dakikada 9 tamamlama**
 *     (2026-09-11T10:41). İkinci en yoğun dakika 5.
 *   Yani 30/dk, ölçülen insan tavanının ~3.3 katı. Sabit pencere sınırındaki
 *   en kötü hâlde bile (60/dk) meşru oyuncunun altına inmiyor.
 *
 * SAATLİK EŞİKTE GÖREV DOSYASINDAN SAPMA: öneri 300/saat idi; 600/saat yapıldı.
 *   300/saat = sürekli 5/dk demektir ve bu, ölçülen 9/dk'lık tepe dakikanın
 *   ALTINDADIR. Bir saat boyunca tepe hızda oynayan (ya da uzun süre çevrimdışı
 *   kalıp senkron eden) meşru bir oyuncu 300'e takılabilirdi. 600/saat, tepe
 *   dakikanın 2 katı bir ortalamayı bir saat boyunca sürdürmeye izin verir;
 *   saldırgan için ise hâlâ sert bir tavandır (Firestore okuma bütçesi açısından
 *   saatte 600 istek önemsizdir).
 *
 * GLOBAL KOVA NEDEN YOK (`/internal/log` hariç)? Global sayaç, bir saldırganın
 *   tüm oyuncuları birden kilitlemesine (DoS amplifikasyonu) izin verir. Sayaç
 *   isolate başına olduğu için de zaten kesin değildir; kesinlik için Cloudflare
 *   Rate Limiting binding'i gerekir (bkz. README → "Açık karar"). `/internal/log`
 *   tek bir sunucu-sunucu çağıranı olduğu için orada global kova anlamlıdır ve
 *   mevcut davranış aynen korunmuştur.
 */
export const RATE_LIMIT_TIERS: Record<RateLimitTierName, readonly RateLimitRule[]> = {
  /** En pahalı uç noktalar: Firestore okuma + motor simülasyonu + D1 yazma. */
  strict: [
    { scope: 'uid', limit: 30, windowMs: MINUTE },
    { scope: 'uid', limit: 600, windowMs: HOUR },
  ],
  /** Ödül/sosyal: ucuz ama kötüye kullanımı doğrudan ilerleme/itibar etkiler. */
  moderate: [{ scope: 'uid', limit: 60, windowMs: MINUTE }],
  /** Yalnızca D1 yazan/okuyan, etkisi düşük uç noktalar. */
  relaxed: [{ scope: 'uid', limit: 120, windowMs: MINUTE }],
  /** Destek talebi — `tickets.ts` içindeki eski bağımsız limitin birebir karşılığı. */
  support: [{ scope: 'uid', limit: 2, windowMs: MINUTE }],
  /** Firebase Functions döngü koruması — eski `rateLimiter.ts` davranışı birebir. */
  internalLog: [
    { scope: 'global', limit: 100, windowMs: MINUTE },
    { scope: 'uid', limit: 20, windowMs: MINUTE },
  ],
  /**
   * Admin uç noktaları. Admin düşman değildir; buradaki amaç yanlışlıkla
   * döngüye giren bir script'in çok satırlı onarım/silme işlemlerini
   * tekrar tekrar çalıştırmasını engellemektir.
   */
  adminSensitive: [{ scope: 'uid', limit: 10, windowMs: MINUTE }],
} as const;

/**
 * Uç nokta kimliği → kademe + maliyet.
 *
 * Anahtar, HTTP yolu DEĞİL sabit bir kimliktir: yol değişirse (sürümleme,
 * yeniden adlandırma) sayaçlar ve audit kayıtları bozulmasın.
 */
export interface EndpointLimit {
  tier: RateLimitTierName;
  /**
   * İstek başına harcanan bütçe. 1 = normal. Aynı kademeyi paylaşan ama
   * belirgin biçimde daha pahalı olan bir uç nokta kademe çoğaltmadan
   * buradan ağırlıklandırılır.
   */
  cost: number;
}

export type RateLimitEndpointId =
  | 'complete-level'
  | 'daily-complete'
  | 'rewards-prepare'
  | 'rewards-claim'
  | 'rewards-cancel'
  | 'friends-request'
  | 'badges-showcase'
  | 'game-telemetry'
  | 'game-feedback'
  | 'played-levels-sync'
  | 'create-ticket'
  | 'internal-log'
  | 'admin-recovery-recompute'
  | 'admin-level-delete'
  | 'admin-level-restore';

export const ENDPOINT_RATE_LIMITS: Record<RateLimitEndpointId, EndpointLimit> = {
  'complete-level': { tier: 'strict', cost: 1 },
  'daily-complete': { tier: 'strict', cost: 1 },

  'rewards-prepare': { tier: 'moderate', cost: 1 },
  'rewards-claim': { tier: 'moderate', cost: 1 },
  'rewards-cancel': { tier: 'moderate', cost: 1 },
  'friends-request': { tier: 'moderate', cost: 1 },
  'badges-showcase': { tier: 'moderate', cost: 1 },

  'game-telemetry': { tier: 'relaxed', cost: 1 },
  'game-feedback': { tier: 'relaxed', cost: 1 },
  'played-levels-sync': { tier: 'relaxed', cost: 1 },

  'create-ticket': { tier: 'support', cost: 1 },
  'internal-log': { tier: 'internalLog', cost: 1 },

  // 02'den devir: çok satır etkileyen onarım/silme uç noktaları.
  'admin-recovery-recompute': { tier: 'adminSensitive', cost: 1 },
  'admin-level-delete': { tier: 'adminSensitive', cost: 1 },
  'admin-level-restore': { tier: 'adminSensitive', cost: 1 },
};

/**
 * Bir uç noktanın etkin kurallarını döndürür.
 *
 * Değer eksik gelirse? Tabloda olmayan bir kimlik istenirse `undefined` döner
 * ve çağıran fail-open davranır (bkz. `rateLimitService.ts`). Sessizce "en sıkı
 * kademe" uygulamak, tabloyu güncellemeyi unutan geliştiricinin hatasını
 * oyuncuya ödetmek olurdu.
 */
export function resolveEndpointLimit(id: string): { rules: readonly RateLimitRule[]; cost: number } | undefined {
  const entry = ENDPOINT_RATE_LIMITS[id as RateLimitEndpointId];
  if (!entry) return undefined;
  return { rules: RATE_LIMIT_TIERS[entry.tier], cost: entry.cost };
}
