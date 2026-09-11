/**
 * DOSYA AMACI: Bölüm arası reklam sıklığı politikasının saf (side-effect'siz)
 * karar mantığı. Hiçbir sağlayıcı, React ya da zaman kaynağı bilmez — `now`
 * dışarıdan verilir, bu yüzden birim testleri deterministiktir.
 */
import { DEFAULT_FREQUENCY_POLICY, type FrequencyPolicyConfig } from './policyConfig';

export interface FrequencyPolicyState {
  /** Oyuncunun toplam tamamladığı level sayısı (ilk 5 level kuralı için). */
  totalCompleted: number;
  /** Son gösterilen reklamdan (veya oyun başından) beri tamamlanan level sayısı. */
  levelsSinceLastAd: number;
  /** Son reklamın gösterildiği an (epoch ms); hiç gösterilmediyse `null`. */
  lastAdAtMs: number | null;
}

export const INITIAL_FREQUENCY_POLICY_STATE: FrequencyPolicyState = {
  totalCompleted: 0,
  levelsSinceLastAd: 0,
  lastAdAtMs: null,
};

export interface InterstitialContext {
  /** Kullanıcının reklamsız hakkı var mı (bkz. entitlement.ts). */
  adFree: boolean;
  /** Bu geçiş bir hata/başarısız doğrulama sonrasında mı gerçekleşiyor. */
  afterError?: boolean;
  /** Bu geçiş bir "yeniden başlatma" sonrasında mı gerçekleşiyor. */
  afterRestart?: boolean;
}

export type InterstitialSkipReason =
  | 'ad-free'
  | 'after-error'
  | 'after-restart'
  | 'below-min-completed-levels'
  | 'levels-since-last-ad'
  | 'min-seconds-between-ads';

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
  if (ctx.afterError) return { show: false, reason: 'after-error' };
  if (ctx.afterRestart) return { show: false, reason: 'after-restart' };
  if (state.totalCompleted < config.minCompletedLevels) {
    return { show: false, reason: 'below-min-completed-levels' };
  }
  if (state.levelsSinceLastAd < config.levelsBetweenAds) {
    return { show: false, reason: 'levels-since-last-ad' };
  }
  if (state.lastAdAtMs !== null) {
    const secondsSinceLastAd = (nowMs - state.lastAdAtMs) / 1000;
    if (secondsSinceLastAd < config.minSecondsBetweenAds) {
      return { show: false, reason: 'min-seconds-between-ads' };
    }
  }
  return { show: true };
}

/** Bir level tamamlandığında sayaçları ilerletir. Reklam kararından bağımsız çağrılır. */
export function onLevelCompleted(state: FrequencyPolicyState): FrequencyPolicyState {
  return {
    ...state,
    totalCompleted: state.totalCompleted + 1,
    levelsSinceLastAd: state.levelsSinceLastAd + 1,
  };
}

/** Bir reklam (bölüm arası veya ödüllü) gösterildiğinde sıklık sayaçlarını sıfırlar. */
export function onAdShown(state: FrequencyPolicyState, nowMs: number): FrequencyPolicyState {
  return {
    ...state,
    levelsSinceLastAd: 0,
    lastAdAtMs: nowMs,
  };
}
