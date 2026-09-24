/**
 * DOSYA AMACI: Ödüllü aksiyon akışının tek uygulayıcısı (aksiyondan bağımsız):
 *
 *   erişim kararı → prepare (sunucu ödülü hazırlar, içerik gelmez)
 *     → (gerekiyorsa) ödüllü reklam; başarısızsa cancel ile nedeni sunucuya bildir
 *     → claim (sunucu hakkı doğrular, içeriği teslim eder; geçici hatada 1 tekrar)
 *
 * Ödülün NE olduğunu çağıranın verdiği prepare/claim belirler. Reklam, sunucu
 * ödülü hazırlayabildiğini söylemeden gösterilmez. Asla throw etmez (00 §4).
 */
import { CURRENT_PLATFORM } from '../platform';
import { getCapabilities } from '../capabilities';
import { isAdFree } from '../entitlement';
import { adService } from '../adService';
import { resolveAvailability } from './accessPolicy';
import { getFreeUsed, incrementFreeUsed, setFreeUsed } from './freeQuota';
import { REWARDED_ACTIONS, type RewardedActionId } from './rewardedActionsConfig';
import type {
  RewardClaimResult,
  RewardGrantVia,
  RewardPrepareResult,
  RewardedActionOutcome,
  RewardedAvailability,
  RewardedDeclineReason,
} from './types';
import type { AdUnavailableReason } from '../types';

export interface RunRewardedActionParams<T> {
  actionId: RewardedActionId;
  /** Ücretsiz kotanın sayıldığı kapsam (ör. `levelId`). */
  scopeKey: string;
  /** Sunucuya ödülü hazırlatır (ör. ipucunu hesaplat). İçerik dönmez. */
  prepare: () => Promise<RewardPrepareResult<T>>;
  /** Ödül hak edildikten SONRA içeriği teslim alır. */
  claim: (requestId: string, via: RewardGrantVia) => Promise<RewardClaimResult<T>>;
  /** Reklam başarısız olduğunda sunucuya nedeni bildirir (kanıt kaydı; sonucu beklenmez). */
  cancel?: (requestId: string, reason: AdUnavailableReason) => Promise<void>;
}

const CLAIM_ATTEMPTS = 2;

let running = false;

export function getRewardedAvailability(actionId: RewardedActionId, scopeKey: string): RewardedAvailability {
  return resolveAvailability(REWARDED_ACTIONS[actionId], {
    adFree: isAdFree(),
    rewardedAdsSupported: getCapabilities(CURRENT_PLATFORM).rewardedAds,
    freeUsed: getFreeUsed(actionId, scopeKey),
  });
}

/** Sunucunun bildirdiği kalan hakkı yerel sayaca yansıtır. */
function syncFreeQuota(actionId: RewardedActionId, scopeKey: string, freeRemaining: number | undefined): void {
  if (freeRemaining === undefined) return;
  const mode = REWARDED_ACTIONS[actionId].rewardedAdsUnavailable;
  if (mode.kind !== 'free-limited') return;
  setFreeUsed(actionId, scopeKey, mode.perScope - freeRemaining);
}

async function claimWithRetry<T>(
  claim: RunRewardedActionParams<T>['claim'],
  requestId: string,
  via: RewardGrantVia,
): Promise<RewardClaimResult<T>> {
  let last: RewardClaimResult<T> = { ok: false };
  for (let attempt = 0; attempt < CLAIM_ATTEMPTS; attempt++) {
    try {
      last = await claim(requestId, via);
      // Kesin ret (ör. kota) tekrar denenmez.
      if (last.ok || last.reason) return last;
    } catch (err) {
      console.warn('[monetization] Ödül teslimi başarısız:', err);
    }
  }
  return last;
}

function decline<T>(reason: RewardedDeclineReason): RewardedActionOutcome<T> {
  return { status: 'declined', reason };
}

export async function runRewardedAction<T>({
  actionId,
  scopeKey,
  prepare,
  claim,
  cancel,
}: RunRewardedActionParams<T>): Promise<RewardedActionOutcome<T>> {
  // Aynı anda iki ödüllü akış (çift tıklama, iki ayrı buton) açılmaz.
  if (running) return decline('busy');
  running = true;
  try {
    const initial = getRewardedAvailability(actionId, scopeKey);
    if (initial.kind === 'blocked') return decline(initial.reason);

    let prepared: RewardPrepareResult<T>;
    try {
      prepared = await prepare();
    } catch (err) {
      console.warn('[monetization] Ödül hazırlanamadı:', err);
      return decline('claim-failed');
    }
    if (!prepared.ok) return decline(prepared.reason);
    if (prepared.alreadyDelivered !== undefined) {
      return { status: 'granted', via: 'reused', payload: prepared.alreadyDelivered };
    }

    syncFreeQuota(actionId, scopeKey, prepared.freeRemaining);
    const availability = getRewardedAvailability(actionId, scopeKey);
    if (availability.kind === 'blocked') return decline(availability.reason);

    let via: RewardGrantVia;
    if (availability.kind === 'ad') {
      const ad = await adService.showRewarded();
      if (ad.rewarded) {
        via = 'ad';
      } else if (ad.reason === 'ads-disabled') {
        // Portal reklamları bu aşamada kapattı (CrazyGames Basic Launch): oyuncu
        // cezalandırılmaz, ödül reklamsız verilir. Reklamlar açılınca akış kendiliğinden 'ad'a döner.
        via = 'ads-disabled';
      } else {
        const reason = ad.reason ?? 'closed';
        cancel?.(prepared.requestId, reason).catch(() => undefined);
        return decline(reason);
      }
    } else {
      via = availability.via;
    }

    const claimed = await claimWithRetry(claim, prepared.requestId, via);
    if (!claimed.ok) {
      if (claimed.reason === 'quota-exhausted') syncFreeQuota(actionId, scopeKey, 0);
      return decline(claimed.reason ?? 'claim-failed');
    }

    // Yerel kopya: sunucu kotayı zaten uyguladı.
    if (availability.kind === 'free' && availability.remaining !== null) {
      incrementFreeUsed(actionId, scopeKey);
    }
    return { status: 'granted', via, payload: claimed.payload };
  } finally {
    running = false;
  }
}
