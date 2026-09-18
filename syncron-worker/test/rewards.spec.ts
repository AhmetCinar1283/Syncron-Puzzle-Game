import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import type { Env } from '../src/types';
import type { RewardActionHandler } from '../src/services/rewards/types';
import { cancelReward, claimReward, prepareReward } from '../src/services/rewards/rewardService';
import { getOwnGrant, listOpenGrantIds } from '../src/services/rewards/rewardGrants';
import { resolveHintUsage, capStarsForHint, personalBestMoveCount, finalizeHintUsage } from '../src/services/hintScoring';
import { claimRewardSchema, prepareRewardSchema } from '../src/schemas/rewards';

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS reward_grants (
    id TEXT NOT NULL PRIMARY KEY, uid TEXT NOT NULL, action TEXT NOT NULL, level_id TEXT, level_version INTEGER,
    input_key TEXT NOT NULL, status TEXT NOT NULL, via TEXT, platform TEXT, result_json TEXT, reason TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    delivered_at TEXT, cancelled_at TEXT, consumed_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT NOT NULL PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), uid TEXT NOT NULL, action TEXT NOT NULL,
    category TEXT NOT NULL, metadata TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`,
];

const testEnv = env as unknown as Env;
let computeCalls = 0;

/** Firestore'a gitmeyen sahte aksiyon: girdi `{ k }`, sonuç `{ answer: k }`. */
const fakeAction: RewardActionHandler<{ k: string }> = {
  rule: { enabled: true, requiresLevel: true, freePerLevel: 1, maxPerUidPerDay: 50, maxPerUidPerMinute: 3 },
  parseInput: (raw) => (raw && typeof (raw as { k?: unknown }).k === 'string' ? (raw as { k: string }) : null),
  inputKey: (input) => input.k,
  resolve: async (_env, { input }) => ({
    ok: true,
    levelVersion: 1,
    compute: () => {
      computeCalls++;
      if (input.k === 'bad') return { ok: false, kind: 'invalid', reason: 'bad-input' };
      if (input.k === 'none') return { ok: false, kind: 'unavailable', reason: 'solver-budget' };
      return { ok: true, result: { answer: input.k } };
    },
  }),
};

const prepare = (k: string, uid = 'u1', levelId = 'L1') =>
  prepareReward(testEnv, fakeAction, { uid, action: 'hint', levelId, input: { k }, platform: 'web' });

async function preparedId(k: string, uid = 'u1'): Promise<string> {
  const outcome = await prepare(k, uid);
  if (outcome.status !== 'prepared') throw new Error(`expected prepared, got ${outcome.status}`);
  return outcome.requestId;
}

async function auditActions(): Promise<string[]> {
  const rows = await env.AUDIT_DB.prepare('SELECT action FROM audit_logs ORDER BY created_at, rowid').all<{ action: string }>();
  return rows.results.map((r) => r.action);
}

beforeEach(async () => {
  for (const sql of SCHEMA) await env.AUDIT_DB.prepare(sql).run();
  await env.AUDIT_DB.prepare('DELETE FROM reward_grants').run();
  await env.AUDIT_DB.prepare('DELETE FROM audit_logs').run();
  computeCalls = 0;
});

describe('disabled actions', () => {
  const disabledAction: RewardActionHandler<{ k: string }> = {
    ...fakeAction,
    rule: { ...fakeAction.rule, enabled: false },
  };

  it('rejects prepare without computing or storing anything, and logs the attempt', async () => {
    const outcome = await prepareReward(testEnv, disabledAction, {
      uid: 'u1', action: 'hint', levelId: 'L1', input: { k: 'a' }, platform: 'web',
    });
    expect(outcome).toEqual({ status: 'rejected', httpStatus: 403, error: 'action-disabled' });
    expect(computeCalls).toBe(0);
    const rows = await env.AUDIT_DB.prepare('SELECT COUNT(*) AS n FROM reward_grants').first<{ n: number }>();
    expect(rows?.n).toBe(0);
    expect(await auditActions()).toEqual(['reward.action_disabled']);
  });

  it('refuses to deliver grants prepared before the action was disabled', async () => {
    const requestId = await preparedId('a');
    await claimReward(testEnv, fakeAction, { uid: 'u1', requestId, via: 'ad' });
    const outcome = await claimReward(testEnv, disabledAction, { uid: 'u1', requestId, via: 'ad' });
    expect(outcome).toEqual({ status: 'rejected', httpStatus: 403, error: 'action-disabled' });
  });

  it('keeps the server hint action disabled', async () => {
    const { REWARD_ACTIONS } = await import('../src/services/rewards/actions');
    expect(REWARD_ACTIONS.hint.rule.enabled).toBe(false);
  });
});

describe('reward flow', () => {
  it('prepare never returns the content; claim delivers it and both steps are logged', async () => {
    const prepared = await prepare('a');
    expect(prepared).toEqual({ status: 'prepared', requestId: expect.any(String), freeRemaining: 1 });
    expect(JSON.stringify(prepared)).not.toContain('answer');

    const requestId = (prepared as { requestId: string }).requestId;
    const claimed = await claimReward(testEnv, fakeAction, { uid: 'u1', requestId, via: 'ad' });
    expect(claimed).toEqual({ status: 'delivered', requestId, via: 'ad', result: { answer: 'a' }, redelivered: false });
    expect(await auditActions()).toEqual(['reward.prepared', 'reward.delivered']);
  });

  it('reuses the computation for the same input and never charges twice for it', async () => {
    const requestId = await preparedId('a');
    expect(await prepare('a')).toMatchObject({ status: 'prepared', requestId });
    expect(computeCalls).toBe(1);

    await claimReward(testEnv, fakeAction, { uid: 'u1', requestId, via: 'ad' });
    // Aynı durum için ipucu zaten verildi: yeniden reklam gerekmez, içerik doğrudan döner.
    expect(await prepare('a')).toEqual({ status: 'delivered', requestId, result: { answer: 'a' } });
  });

  it('redelivers the same content when a claim is retried', async () => {
    const requestId = await preparedId('a');
    await claimReward(testEnv, fakeAction, { uid: 'u1', requestId, via: 'ad' });
    const retry = await claimReward(testEnv, fakeAction, { uid: 'u1', requestId, via: 'ad' });
    expect(retry).toMatchObject({ status: 'delivered', result: { answer: 'a' }, redelivered: true });
  });

  it('another user cannot claim, see or cancel a grant', async () => {
    const requestId = await preparedId('a');
    expect(await claimReward(testEnv, fakeAction, { uid: 'u2', requestId, via: 'ad' })).toMatchObject({ error: 'not-found' });
    expect(await cancelReward(testEnv, { uid: 'u2', requestId, reason: 'closed' })).toBe(false);
    expect(await getOwnGrant(env.AUDIT_DB, 'u2', requestId)).toBeNull();
  });

  it('enforces the per-level free quota on the server', async () => {
    const first = await preparedId('a');
    expect(await claimReward(testEnv, fakeAction, { uid: 'u1', requestId: first, via: 'free' })).toMatchObject({ status: 'delivered' });

    const second = await prepare('b');
    expect(second).toMatchObject({ status: 'prepared', freeRemaining: 0 });
    const secondId = (second as { requestId: string }).requestId;
    expect(await claimReward(testEnv, fakeAction, { uid: 'u1', requestId: secondId, via: 'free' })).toMatchObject({ error: 'quota-exhausted' });
    // Kota ücretsiz yolu kapatır; reklamla alınabilir.
    expect(await claimReward(testEnv, fakeAction, { uid: 'u1', requestId: secondId, via: 'ad' })).toMatchObject({ status: 'delivered' });
  });

  it('rejects an ad-free claim without a server-side entitlement', async () => {
    const requestId = await preparedId('a');
    expect(await claimReward(testEnv, fakeAction, { uid: 'u1', requestId, via: 'ad-free' })).toMatchObject({ error: 'not-entitled' });
  });

  it('logs an unavailable result and does not allow claiming it', async () => {
    const outcome = await prepare('none');
    expect(outcome).toMatchObject({ status: 'unavailable', reason: 'solver-budget' });
    const requestId = (outcome as { requestId: string }).requestId;
    expect(await claimReward(testEnv, fakeAction, { uid: 'u1', requestId, via: 'ad' })).toMatchObject({ error: 'not-claimable' });
    expect(await auditActions()).toEqual(['reward.unavailable']);
  });

  it('rejects invalid input without creating a grant', async () => {
    expect(await prepare('bad')).toMatchObject({ status: 'rejected', httpStatus: 400 });
    const count = await env.AUDIT_DB.prepare('SELECT COUNT(*) AS n FROM reward_grants').first<{ n: number }>();
    expect(count?.n).toBe(0);
  });

  it('rate-limits new computations per minute', async () => {
    await preparedId('a');
    await preparedId('b');
    await preparedId('c');
    expect(await prepare('d')).toMatchObject({ status: 'rejected', httpStatus: 429 });
  });

  it('keeps a cancelled grant claimable so a failed ad can be retried', async () => {
    const requestId = await preparedId('a');
    expect(await cancelReward(testEnv, { uid: 'u1', requestId, reason: 'no-fill' })).toBe(true);
    expect(await getOwnGrant(env.AUDIT_DB, 'u1', requestId)).toMatchObject({ status: 'cancelled', reason: 'no-fill' });
    expect(await claimReward(testEnv, fakeAction, { uid: 'u1', requestId, via: 'ad' })).toMatchObject({ status: 'delivered' });
    expect(await auditActions()).toEqual(['reward.prepared', 'reward.cancelled', 'reward.delivered']);
  });
});

describe('hint scoring', () => {
  it('only delivered hints mark a completion as hinted', async () => {
    const requestId = await preparedId('a');
    expect((await resolveHintUsage(env.AUDIT_DB, 'u1', 'L1', 0)).hinted).toBe(false);
    await claimReward(testEnv, fakeAction, { uid: 'u1', requestId, via: 'ad' });
    // İstemci "ipucu kullanmadım" dese bile sunucu kaydı geçerlidir.
    expect((await resolveHintUsage(env.AUDIT_DB, 'u1', 'L1', 0)).hinted).toBe(true);
    expect((await resolveHintUsage(env.AUDIT_DB, 'u1', 'L2', 1)).hinted).toBe(true);
  });

  it('consumes only the grants that were read', async () => {
    const first = await preparedId('a');
    await claimReward(testEnv, fakeAction, { uid: 'u1', requestId: first, via: 'ad' });
    const usage = await resolveHintUsage(env.AUDIT_DB, 'u1', 'L1', 0);

    const second = await preparedId('b');
    await claimReward(testEnv, fakeAction, { uid: 'u1', requestId: second, via: 'ad' });
    await finalizeHintUsage(env.AUDIT_DB, 'u1', usage);
    expect(await listOpenGrantIds(env.AUDIT_DB, 'u1', 'hint', 'L1')).toEqual([second]);
  });

  it('caps stars at 2 and never improves the personal best', () => {
    expect(capStarsForHint(3, true)).toBe(2);
    expect(capStarsForHint(3, false)).toBe(3);
    expect(personalBestMoveCount(5, 9, true)).toBe(9);
    expect(personalBestMoveCount(5, 9, false)).toBe(5);
    expect(personalBestMoveCount(5, null, true)).toBe(5);
  });
});

describe('reward schemas', () => {
  it('validates action ids and request ids', () => {
    expect(prepareRewardSchema.safeParse({ action: 'hint', levelId: 'L1', input: { moves: [] } }).success).toBe(true);
    expect(prepareRewardSchema.safeParse({ action: 'coins', levelId: 'L1', input: {} }).success).toBe(false);
    expect(claimRewardSchema.safeParse({ requestId: crypto.randomUUID(), via: 'ad' }).success).toBe(true);
    expect(claimRewardSchema.safeParse({ requestId: 'not-a-uuid', via: 'ad' }).success).toBe(false);
  });
});
