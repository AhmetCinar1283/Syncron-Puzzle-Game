/**
 * DOSYA AMACI: Ödüllü aksiyonların sunucu akışı (aksiyondan bağımsız):
 *
 *   prepare → ödül SUNUCUDA hesaplanır ve saklanır, istemciye içerik GİTMEZ
 *   (istemci gerekiyorsa reklamı gösterir; başarısızsa cancel ile nedeni loglar)
 *   claim   → erişim hakkı sunucuda kontrol edilir, ancak o zaman içerik teslim edilir
 *
 * Her adım `reward_grants`'ta durum olarak, `audit_logs`'ta (category='reward')
 * olay olarak kaydedilir. Aynı kayıt yeniden claim edilirse aynı içerik tekrar
 * verilir: reklamı izleyip ağ hatası yaşayan oyuncu ödülünü kaybetmez.
 */

import type { Env } from '../../types';
import { writeAuditLog } from '../auditLog';
import { hasAdFreeEntitlement } from './entitlement';
import {
  countDeliveredFree,
  countGrantsSince,
  findReusableGrant,
  getOwnGrant,
  insertGrant,
  markCancelled,
  markDelivered,
  type RewardGrantRow,
  type RewardGrantVia,
} from './rewardGrants';
import type { RewardActionHandler } from './types';

/** Aynı girdi için hazırlanmış/teslim edilmiş kaydın yeniden kullanıldığı süre. */
const REUSE_WINDOW_MS = 6 * 60 * 60 * 1000;

export type PrepareOutcome =
  | { status: 'prepared'; requestId: string; freeRemaining: number }
  /** Bu girdi için ödül daha önce teslim edilmiş: yeniden reklam gerekmez. */
  | { status: 'delivered'; requestId: string; result: unknown }
  | { status: 'unavailable'; requestId: string; reason: string }
  | { status: 'rejected'; httpStatus: 400 | 404 | 429 | 500; error: string };

export type ClaimOutcome =
  | { status: 'delivered'; requestId: string; via: RewardGrantVia; result: unknown; redelivered: boolean }
  | { status: 'rejected'; httpStatus: 403 | 404 | 409; error: 'not-found' | 'not-claimable' | 'quota-exhausted' | 'not-entitled' };

export interface PrepareParams {
  uid: string;
  action: string;
  levelId: string | null;
  input: unknown;
  platform: string | null;
}

async function logEvent(env: Env, uid: string, event: string, metadata: Record<string, unknown>): Promise<void> {
  try {
    await writeAuditLog(env.AUDIT_DB, uid, event, 'reward', metadata);
  } catch (err) {
    // Asıl kayıt reward_grants'tadır; audit log yazılamaması akışı bozmaz.
    console.error(`[Rewards] audit log "${event}" failed:`, err);
  }
}

function parseResult(row: RewardGrantRow): unknown {
  try {
    return row.result_json ? JSON.parse(row.result_json) : null;
  } catch {
    return null;
  }
}

export async function prepareReward(
  env: Env,
  handler: RewardActionHandler<any>,
  params: PrepareParams,
): Promise<PrepareOutcome> {
  const { uid, action, levelId, platform } = params;
  const { rule } = handler;
  if (rule.requiresLevel && !levelId) return { status: 'rejected', httpStatus: 400, error: 'level-required' };

  const input = handler.parseInput(params.input);
  if (input === null) return { status: 'rejected', httpStatus: 400, error: 'invalid-input' };
  const inputKey = handler.inputKey(input);

  const resolved = await handler.resolve(env, { levelId, input });
  if (!resolved.ok) return { status: 'rejected', httpStatus: resolved.status, error: resolved.reason };
  const { levelVersion } = resolved;

  const db = env.AUDIT_DB;
  const reusable = await findReusableGrant(db, {
    uid,
    action,
    levelId,
    levelVersion,
    inputKey,
    sinceIso: new Date(Date.now() - REUSE_WINDOW_MS).toISOString(),
  });
  if (reusable) {
    await logEvent(env, uid, 'reward.reuse', { requestId: reusable.id, action, levelId, status: reusable.status });
    if (reusable.status === 'delivered') {
      return { status: 'delivered', requestId: reusable.id, result: parseResult(reusable) };
    }
    const used = await countDeliveredFree(db, uid, action, levelId);
    return { status: 'prepared', requestId: reusable.id, freeRemaining: Math.max(0, rule.freePerLevel - used) };
  }

  const now = Date.now();
  const [lastMinute, lastDay] = await Promise.all([
    countGrantsSince(db, uid, action, new Date(now - 60 * 1000).toISOString()),
    countGrantsSince(db, uid, action, new Date(now - 24 * 60 * 60 * 1000).toISOString()),
  ]);
  if (lastMinute >= rule.maxPerUidPerMinute || lastDay >= rule.maxPerUidPerDay) {
    await logEvent(env, uid, 'reward.rate_limited', { action, levelId, lastMinute, lastDay });
    return { status: 'rejected', httpStatus: 429, error: 'rate-limited' };
  }

  const computed = resolved.compute();
  if (!computed.ok && computed.kind === 'invalid') {
    await logEvent(env, uid, 'reward.invalid_input', { action, levelId, levelVersion, inputKey, reason: computed.reason });
    return { status: 'rejected', httpStatus: 400, error: computed.reason };
  }

  const requestId = crypto.randomUUID();
  if (!computed.ok) {
    await insertGrant(db, {
      id: requestId, uid, action, levelId, levelVersion, inputKey,
      status: 'unavailable', platform, resultJson: null, reason: computed.reason,
    });
    await logEvent(env, uid, 'reward.unavailable', { requestId, action, levelId, levelVersion, inputKey, reason: computed.reason });
    return { status: 'unavailable', requestId, reason: computed.reason };
  }

  const resultJson = JSON.stringify(computed.result);
  await insertGrant(db, {
    id: requestId, uid, action, levelId, levelVersion, inputKey,
    status: 'prepared', platform, resultJson, reason: null,
  });
  await logEvent(env, uid, 'reward.prepared', { requestId, action, levelId, levelVersion, inputKey, platform });

  const used = await countDeliveredFree(db, uid, action, levelId);
  return { status: 'prepared', requestId, freeRemaining: Math.max(0, rule.freePerLevel - used) };
}

export async function claimReward(
  env: Env,
  handler: RewardActionHandler<any>,
  params: { uid: string; requestId: string; via: RewardGrantVia },
): Promise<ClaimOutcome> {
  const { uid, requestId, via } = params;
  const db = env.AUDIT_DB;

  const row = await getOwnGrant(db, uid, requestId);
  if (!row) return { status: 'rejected', httpStatus: 404, error: 'not-found' };

  if (row.status === 'delivered') {
    await logEvent(env, uid, 'reward.redelivered', { requestId, action: row.action, levelId: row.level_id, via: row.via });
    return { status: 'delivered', requestId, via: row.via ?? via, result: parseResult(row), redelivered: true };
  }
  if (row.status === 'unavailable') return { status: 'rejected', httpStatus: 409, error: 'not-claimable' };

  // Erişim hakkı sunucuda: reklamsız beyanı sunucudaki hakla, ücretsiz yol level kotasıyla doğrulanır.
  // Reklam izlendiği bilgisi web SDK'larında sunucudan doğrulanamaz (bkz. raporlar/04-rapor.md).
  if (via === 'ad-free' && !(await hasAdFreeEntitlement(env, uid))) {
    await logEvent(env, uid, 'reward.claim_rejected', { requestId, action: row.action, levelId: row.level_id, via, error: 'not-entitled' });
    return { status: 'rejected', httpStatus: 403, error: 'not-entitled' };
  }

  const delivered = await markDelivered(db, { uid, id: requestId, via, freePerLevel: handler.rule.freePerLevel });
  if (!delivered) {
    // Ya eşzamanlı başka bir claim teslim etti ya da ücretsiz kota doldu.
    const fresh = await getOwnGrant(db, uid, requestId);
    if (fresh?.status === 'delivered') {
      return { status: 'delivered', requestId, via: fresh.via ?? via, result: parseResult(fresh), redelivered: true };
    }
    const error = via === 'free' ? 'quota-exhausted' : 'not-claimable';
    await logEvent(env, uid, 'reward.claim_rejected', { requestId, action: row.action, levelId: row.level_id, via, error });
    return { status: 'rejected', httpStatus: via === 'free' ? 403 : 409, error };
  }

  await logEvent(env, uid, 'reward.delivered', {
    requestId,
    action: row.action,
    levelId: row.level_id,
    levelVersion: row.level_version,
    via,
    platform: row.platform,
    inputKey: row.input_key,
    result: parseResult(row),
  });
  return { status: 'delivered', requestId, via, result: parseResult(row), redelivered: false };
}

export async function cancelReward(
  env: Env,
  params: { uid: string; requestId: string; reason: string },
): Promise<boolean> {
  const { uid, requestId, reason } = params;
  const changed = await markCancelled(env.AUDIT_DB, uid, requestId, reason);
  if (changed) await logEvent(env, uid, 'reward.cancelled', { requestId, reason });
  return changed;
}
