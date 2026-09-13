/**
 * DOSYA AMACI: Ödüllü aksiyon uçlarının istemcisi (aksiyondan bağımsız):
 * `POST /rewards/prepare` → `/rewards/claim`, reklam başarısızsa `/rewards/cancel`.
 * Ödülün içeriği (ör. ipucu) yalnızca `claim` yanıtında gelir. Asla throw etmez.
 */

import type {
  AdUnavailableReason,
  RewardClaimResult,
  RewardGrantVia,
  RewardPrepareResult,
  RewardedDeclineReason,
} from '@/services/monetization';
import { CURRENT_PLATFORM } from '@/services/monetization';
import { workerFetch } from './workerClient';

const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL;

export type RewardActionId = 'hint';

/** Worker yapılandırılmış mı — değilse ödül hazırlanamaz (ipucu sunucuda hesaplanır). */
export function isRewardServerConfigured(): boolean {
  return !!WORKER_URL;
}

/** Oturum yoksa (JIT anonim giriş sessizce başarısız olmuşsa) bir kez daha dene. */
async function ensureSession(): Promise<void> {
  const { auth } = await import('@/services/firebase/config');
  if (!auth.currentUser) {
    const { signInAnonymously } = await import('firebase/auth');
    await signInAnonymously(auth);
  }
}

/** Sunucu hata kodu → kullanıcıya gösterilecek ret nedeni. Bilinmeyen → geçici hata (`undefined`). */
function declineFromError(err: unknown): RewardedDeclineReason | undefined {
  const message = err instanceof Error ? err.message : '';
  switch (message) {
    case 'quota-exhausted':
      return 'quota-exhausted';
    case 'rate-limited':
      return 'rate-limited';
    case 'not-entitled':
    case 'not-claimable':
    case 'not-found':
    case 'Account suspended':
      return 'claim-failed';
    default:
      return undefined;
  }
}

type PrepareResponse =
  | { success: true; status: 'prepared'; requestId: string; freeRemaining: number }
  | { success: true; status: 'delivered'; requestId: string; result: unknown }
  | { success: true; status: 'unavailable'; requestId: string; reason: string };

export async function prepareReward<T>(
  action: RewardActionId,
  levelId: string | null,
  input: unknown,
): Promise<RewardPrepareResult<T>> {
  if (!WORKER_URL) return { ok: false, reason: 'disabled' };
  try {
    await ensureSession();
    const res = await workerFetch<PrepareResponse>('/rewards/prepare', {
      method: 'POST',
      body: { action, levelId, input, platform: CURRENT_PLATFORM },
      requireAuth: true,
    });
    if (res.status === 'unavailable') return { ok: false, reason: 'unavailable' };
    if (res.status === 'delivered') return { ok: true, requestId: res.requestId, alreadyDelivered: res.result as T };
    return { ok: true, requestId: res.requestId, freeRemaining: res.freeRemaining };
  } catch (err) {
    console.warn('[Rewards] prepare başarısız:', err);
    return { ok: false, reason: declineFromError(err) ?? 'claim-failed' };
  }
}

export async function claimReward<T>(requestId: string, via: RewardGrantVia): Promise<RewardClaimResult<T>> {
  try {
    await ensureSession();
    const res = await workerFetch<{ success: boolean; result: unknown }>('/rewards/claim', {
      method: 'POST',
      body: { requestId, via },
      requireAuth: true,
    });
    return res.success ? { ok: true, payload: res.result as T } : { ok: false };
  } catch (err) {
    console.warn('[Rewards] claim başarısız:', err);
    return { ok: false, reason: declineFromError(err) };
  }
}

export async function cancelReward(requestId: string, reason: AdUnavailableReason): Promise<void> {
  try {
    await workerFetch('/rewards/cancel', { method: 'POST', body: { requestId, reason }, requireAuth: true });
  } catch (err) {
    console.warn('[Rewards] cancel bildirimi başarısız:', err);
  }
}
