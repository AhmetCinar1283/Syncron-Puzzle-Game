/**
 * DOSYA AMACI: Bölüm arası reklam sıklığı politikasının saf (side-effect'siz)
 * karar mantığı. Hiçbir sağlayıcı, React ya da zaman kaynağı bilmez — `now`
 * dışarıdan verilir, bu yüzden birim testleri deterministiktir.
 *
 * Model: level bitişi BAŞARILI (kazanma) ya da BAŞARISIZ (restart/ölüm) olması
 * fark etmeksizin TEK bir sayaca işler. Reklam, iki eşikten HANGİSİ önce
 * dolarsa o anda gösterilir (VEYA): yeterince level bitti MI, yoksa yeterince
 * SÜRE mi geçti. Eşikler misafir/kayıtlı kullanıcıya göre değişir
 * (bkz. `policyConfig.ts`).
 */
import { DEFAULT_FREQUENCY_POLICY, type FrequencyPolicyConfig } from './policyConfig';

export interface FrequencyPolicyState {
  /** Son reklamdan (veya oturum başından) beri biten level sayısı — başarı/başarısızlık ayrımsız. */
  finishesSinceLastAd: number;
  /** Son reklamın gösterildiği an (epoch ms); hiç gösterilmediyse `null`. */
  lastAdAtMs: number | null;
}

export const INITIAL_FREQUENCY_POLICY_STATE: FrequencyPolicyState = {
  finishesSinceLastAd: 0,
  lastAdAtMs: null,
};

export interface InterstitialContext {
  /** Kullanıcının reklamsız hakkı var mı (bkz. entitlement.ts). */
  adFree: boolean;
  /** Hesap oluşturmuş (anonim olmayan) kullanıcı mı — hangi eşik tablosunun kullanılacağını belirler. */
  isRegisteredUser: boolean;
}

export type InterstitialSkipReason = 'ad-free' | 'below-thresholds';

export type InterstitialDecision =
  | { show: true }
  | { show: false; reason: InterstitialSkipReason };

/** Verilen durum ve bağlamda bölüm arası reklamın gösterilip gösterilmeyeceğine karar verir. */
export function evaluateInterstitial(
  state: FrequencyPolicyState,
  ctx: InterstitialContext,
  nowMs: number,
  config: FrequencyPolicyConfig = DEFAULT_FREQUENCY_POLICY,
): InterstitialDecision {
  if (ctx.adFree) return { show: false, reason: 'ad-free' };

  const tier = ctx.isRegisteredUser ? config.registered : config.guest;

  const enoughFinishes = state.finishesSinceLastAd >= tier.minFinishes;
  // Hiç reklam gösterilmediyse (oturum başı) süre koşulu henüz anlamsızdır —
  // ilk reklam yalnızca "level bitişi" eşiğiyle tetiklenir.
  const enoughTime =
    state.lastAdAtMs !== null &&
    (nowMs - state.lastAdAtMs) / 1000 >= tier.minSecondsBetweenAds;

  if (enoughFinishes || enoughTime) return { show: true };
  return { show: false, reason: 'below-thresholds' };
}

/**
 * Bir level bittiğinde (kazanma VEYA restart/ölüm — fark etmez) sayacı
 * ilerletir. Reklam kararından ÖNCE, her zaman çağrılır.
 */
export function onLevelFinished(state: FrequencyPolicyState): FrequencyPolicyState {
  return {
    ...state,
    finishesSinceLastAd: state.finishesSinceLastAd + 1,
  };
}

/**
 * Bir reklam (bölüm arası VEYA ödüllü — ikisi de) gösterildiğinde sıklık
 * sayaçlarını sıfırlar; sıradaki eşik bu andan itibaren yeniden sayılır.
 */
export function onAdShown(state: FrequencyPolicyState, nowMs: number): FrequencyPolicyState {
  return {
    ...state,
    finishesSinceLastAd: 0,
    lastAdAtMs: nowMs,
  };
}
