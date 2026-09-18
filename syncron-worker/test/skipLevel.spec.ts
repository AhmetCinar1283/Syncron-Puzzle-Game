import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Env } from '../src/types';
import type { RewardActionHandler } from '../src/services/rewards/types';
import { claimReward, prepareReward } from '../src/services/rewards/rewardService';
import { skipLevelAction } from '../src/services/skipLevel/skipLevelAction';
import {
  evaluateSkip,
  lastLevelIdInOrder,
  orderContainsLevel,
  SKIP_LEVEL_POLICY,
} from '../src/services/skipLevel/skipLevelPolicy';
import {
  countOpenSkips,
  getSkippedLevelsSince,
  insertSkippedLevel,
  isLevelSkipped,
} from '../src/services/skipLevel/skippedLevels';
import { deleteLevelRecords } from '../src/services/levelLifecycle';

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
  `CREATE TABLE IF NOT EXISTS played_levels (
    uid TEXT NOT NULL, level_id TEXT NOT NULL, stars INTEGER NOT NULL, score INTEGER NOT NULL DEFAULT 0,
    move_count INTEGER NOT NULL, time_spent INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    deleted_at TEXT,
    PRIMARY KEY (uid, level_id)
  )`,
  `CREATE TABLE IF NOT EXISTS deleted_levels (
    level_id TEXT NOT NULL PRIMARY KEY, deleted_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`,
  `CREATE TABLE IF NOT EXISTS skipped_levels (
    uid TEXT NOT NULL, level_id TEXT NOT NULL, level_version INTEGER, grant_id TEXT NOT NULL,
    skipped_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    deleted_at TEXT,
    PRIMARY KEY (uid, level_id)
  )`,
];

const testEnv = env as unknown as Env;
const db = () => env.AUDIT_DB;

/** Firestore'a gitmeyen atlama aksiyonu: kural + teslim kancası gerçek, resolve sahte. */
const skipWithoutFirestore: RewardActionHandler<{ partId: string }> = {
  ...skipLevelAction,
  resolve: async () => ({ ok: true, levelVersion: 2, compute: () => ({ ok: true, result: { levelId: 'L1' } }) }),
};

async function preparedSkip(uid = 'u1', levelId = 'L1'): Promise<string> {
  const outcome = await prepareReward(testEnv, skipWithoutFirestore, {
    uid, action: 'skip-level', levelId, input: { partId: 'P1' }, platform: 'android',
  });
  if (outcome.status !== 'prepared') throw new Error(`expected prepared, got ${outcome.status}`);
  return outcome.requestId;
}

beforeEach(async () => {
  for (const sql of SCHEMA) await db().prepare(sql).run();
  for (const table of ['reward_grants', 'audit_logs', 'played_levels', 'deleted_levels', 'skipped_levels']) {
    await db().prepare(`DELETE FROM ${table}`).run();
  }
});

describe('evaluateSkip', () => {
  const base = { isChapterEnd: false, alreadyCompleted: false, alreadySkipped: false, openSkips: 0 };

  it('allows an ordinary unsolved level', () => {
    expect(evaluateSkip(base)).toEqual({ ok: true });
  });

  it('rejects a level the player has already solved', () => {
    expect(evaluateSkip({ ...base, alreadyCompleted: true })).toMatchObject({ ok: false, reason: 'already-completed' });
  });

  it('rejects the chapter end unless the policy allows it', () => {
    expect(evaluateSkip({ ...base, isChapterEnd: true })).toMatchObject({ ok: false, reason: 'chapter-end' });
    expect(evaluateSkip({ ...base, isChapterEnd: true }, { ...SKIP_LEVEL_POLICY, allowChapterEnd: true }))
      .toEqual({ ok: true });
  });

  it('enforces the open-skip limit, but not for a level that is already skipped', () => {
    const atLimit = { ...base, openSkips: SKIP_LEVEL_POLICY.maxOpenSkips };
    expect(evaluateSkip(atLimit)).toMatchObject({ ok: false, status: 409, reason: 'skip-limit' });
    expect(evaluateSkip({ ...atLimit, alreadySkipped: true })).toEqual({ ok: true });
  });
});

describe('part order helpers', () => {
  const order = {
    a: { id: 'A', position: 2 },
    b: { id: 'B', position: 0 },
    c: { id: 'C', position: 1 },
  };

  it('finds the last level by position', () => {
    expect(lastLevelIdInOrder(order)).toBe('A');
    expect(lastLevelIdInOrder({})).toBeNull();
    expect(lastLevelIdInOrder({ x: 'X', y: 'Y' })).toBe('Y');
  });

  it('checks membership for object and legacy string entries', () => {
    expect(orderContainsLevel(order, 'C')).toBe(true);
    expect(orderContainsLevel(order, 'Z')).toBe(false);
    expect(orderContainsLevel({ x: 'X' }, 'X')).toBe(true);
  });
});

describe('skipped_levels store', () => {
  it('counts only skips that are not solved yet', async () => {
    await insertSkippedLevel(db(), { uid: 'u1', levelId: 'L1', levelVersion: 1, grantId: 'g1' });
    await insertSkippedLevel(db(), { uid: 'u1', levelId: 'L2', levelVersion: 1, grantId: 'g2' });
    await insertSkippedLevel(db(), { uid: 'u2', levelId: 'L1', levelVersion: 1, grantId: 'g3' });
    expect(await countOpenSkips(db(), 'u1')).toBe(2);

    await db().prepare(`INSERT INTO played_levels (uid, level_id, stars, move_count) VALUES ('u1', 'L1', 3, 5)`).run();
    expect(await countOpenSkips(db(), 'u1')).toBe(1);
    expect(await isLevelSkipped(db(), 'u1', 'L1')).toBe(true);
  });

  it('is idempotent and syncs per user', async () => {
    await insertSkippedLevel(db(), { uid: 'u1', levelId: 'L1', levelVersion: 1, grantId: 'g1' });
    await insertSkippedLevel(db(), { uid: 'u1', levelId: 'L1', levelVersion: 1, grantId: 'g-again' });
    const rows = await getSkippedLevelsSince(db(), 'u1', null);
    expect(rows.map((r) => r.level_id)).toEqual(['L1']);
    expect(await getSkippedLevelsSince(db(), 'u2', null)).toEqual([]);
    expect(await getSkippedLevelsSince(db(), 'u1', '2999-01-01T00:00:00.000Z')).toEqual([]);
  });

  it('is removed by the admin level deletion cascade', async () => {
    await insertSkippedLevel(db(), { uid: 'u1', levelId: 'L1', levelVersion: 1, grantId: 'g1' });
    await deleteLevelRecords(db(), 'L1');
    expect(await isLevelSkipped(db(), 'u1', 'L1')).toBe(false);
  });
});

describe('skip-level reward flow', () => {
  it('has no free path and is enabled', () => {
    expect(skipLevelAction.rule.enabled).toBe(true);
    expect(skipLevelAction.rule.freePerLevel).toBe(0);
  });

  it('writes the skip only on delivery and never touches played_levels', async () => {
    const requestId = await preparedSkip();
    expect(await isLevelSkipped(db(), 'u1', 'L1')).toBe(false);

    const claimed = await claimReward(testEnv, skipWithoutFirestore, { uid: 'u1', requestId, via: 'ad' });
    expect(claimed).toMatchObject({ status: 'delivered', result: { levelId: 'L1' } });
    expect(await isLevelSkipped(db(), 'u1', 'L1')).toBe(true);

    const row = await db().prepare('SELECT level_version, grant_id FROM skipped_levels').first<{ level_version: number; grant_id: string }>();
    expect(row).toEqual({ level_version: 2, grant_id: requestId });
    const played = await db().prepare('SELECT COUNT(*) AS n FROM played_levels').first<{ n: number }>();
    expect(played?.n).toBe(0);
  });

  it('rejects the free path (no quota)', async () => {
    const requestId = await preparedSkip();
    const claimed = await claimReward(testEnv, skipWithoutFirestore, { uid: 'u1', requestId, via: 'free' });
    expect(claimed).toMatchObject({ status: 'rejected', error: 'quota-exhausted' });
    expect(await isLevelSkipped(db(), 'u1', 'L1')).toBe(false);
  });

  it('repairs a missing skip row on redelivery', async () => {
    const requestId = await preparedSkip();
    await claimReward(testEnv, skipWithoutFirestore, { uid: 'u1', requestId, via: 'ad' });
    await db().prepare('DELETE FROM skipped_levels').run();

    const again = await claimReward(testEnv, skipWithoutFirestore, { uid: 'u1', requestId, via: 'ad' });
    expect(again).toMatchObject({ status: 'delivered', redelivered: true });
    expect(await isLevelSkipped(db(), 'u1', 'L1')).toBe(true);
  });

  it('logs and rejects when the action rule refuses the level', async () => {
    const refusing: RewardActionHandler<{ partId: string }> = {
      ...skipLevelAction,
      resolve: async () => ({ ok: false, status: 409, reason: 'skip-limit' }),
    };
    const outcome = await prepareReward(testEnv, refusing, {
      uid: 'u1', action: 'skip-level', levelId: 'L1', input: { partId: 'P1' }, platform: 'android',
    });
    expect(outcome).toEqual({ status: 'rejected', httpStatus: 409, error: 'skip-limit' });
    const actions = await db().prepare('SELECT action FROM audit_logs').all<{ action: string }>();
    expect(actions.results.map((r) => r.action)).toEqual(['reward.not_allowed']);
  });
});
