import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import { addDays, isValidDate, puzzleNumber } from '../src/services/daily/dailyDate';
import {
  canEditScheduleDate, DAILY_POLICY, nextStreak, starsForMoves, visibleStreak, xpForOfficial,
} from '../src/services/daily/dailyPolicy';
import { validatePuzzle } from '../src/services/daily/puzzleValidation';
import { buildCalendarDays, getCalendarView, removePuzzle, savePuzzle, setScheduleDate } from '../src/services/daily/adminDaily';
import { dateHash, resolvePuzzleForDate } from '../src/services/daily/dailySchedule';
import { saveDailySettings } from '../src/services/daily/dailySettings';
import { completeDaily } from '../src/services/daily/completeDaily';
import { getDailyLeaderboard } from '../src/services/daily/dailyResults';
import { getArchiveView, getDailyPuzzleView } from '../src/services/daily/dailyView';
import { dailyLevelId, loadPublishedDailyLevel, parseDailyLevelId } from '../src/services/daily/dailyLevelSource';

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS daily_puzzles (
    id TEXT NOT NULL PRIMARY KEY, title TEXT NOT NULL, level_json TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1,
    solution TEXT NOT NULL, par INTEGER NOT NULL, par_source TEXT NOT NULL, source TEXT NOT NULL, status TEXT NOT NULL,
    in_pool INTEGER NOT NULL DEFAULT 0, difficulty INTEGER, created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`,
  `CREATE TABLE IF NOT EXISTS daily_schedule (
    date TEXT NOT NULL PRIMARY KEY, puzzle_id TEXT NOT NULL, assigned_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`,
  `CREATE TABLE IF NOT EXISTS daily_settings (
    key TEXT NOT NULL PRIMARY KEY, value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`,
  `CREATE TABLE IF NOT EXISTS daily_results (
    uid TEXT NOT NULL, date TEXT NOT NULL, puzzle_id TEXT NOT NULL, move_count INTEGER NOT NULL,
    time_spent INTEGER NOT NULL DEFAULT 0, stars INTEGER NOT NULL, hinted INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')), deleted_at TEXT, PRIMARY KEY (uid, date)
  )`,
  `CREATE TABLE IF NOT EXISTS daily_streaks (
    uid TEXT NOT NULL PRIMARY KEY, current INTEGER NOT NULL DEFAULT 0, best INTEGER NOT NULL DEFAULT 0, last_date TEXT,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`,
  `CREATE TABLE IF NOT EXISTS reward_grants (
    id TEXT NOT NULL PRIMARY KEY, uid TEXT NOT NULL, action TEXT NOT NULL, level_id TEXT, level_version INTEGER,
    input_key TEXT NOT NULL, status TEXT NOT NULL, via TEXT, platform TEXT, result_json TEXT, reason TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    delivered_at TEXT, cancelled_at TEXT, consumed_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS user_profiles (
    uid TEXT NOT NULL PRIMARY KEY, display_name TEXT NOT NULL, tag TEXT UNIQUE, showcase_badges TEXT, xp INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`,
];
const TABLES = ['daily_puzzles', 'daily_schedule', 'daily_settings', 'daily_results', 'daily_streaks', 'reward_grants', 'user_profiles'];

const db = () => env.AUDIT_DB;
const TODAY = '2026-10-10';
const NOW = new Date(`${TODAY}T12:00:00Z`);

/** 'r','r' ile çözülen 3x3 level. */
const LEVEL = {
  name: 'Test',
  width: 3,
  height: 3,
  edges: { top: 'wall', bottom: 'wall', left: 'wall', right: 'wall' },
  grid: [
    ['empty', 'empty', 'empty'],
    ['empty', 'empty', 'target_1'],
    ['empty', 'empty', 'empty'],
  ],
  initialObjects: [{ position: { row: 1, col: 0 }, mode: 'normal' }],
  initialBoxes: [],
};

async function createPuzzle(opts: { id?: string; status?: 'draft' | 'approved'; inPool?: boolean; assignDate?: string } = {}) {
  const result = await savePuzzle(db(), {
    id: undefined,
    title: 'Test',
    level: LEVEL,
    solution: ['r', 'r'],
    parSource: 'solver',
    source: 'designed',
    status: opts.status ?? 'approved',
    inPool: opts.inPool ?? false,
    difficulty: null,
    assignDate: opts.assignDate,
    adminUid: 'admin1',
  }, NOW);
  if (!result.ok) throw new Error(`save failed: ${result.error}`);
  return result.value.id;
}

beforeEach(async () => {
  for (const sql of SCHEMA) await db().prepare(sql).run();
  for (const table of TABLES) await db().prepare(`DELETE FROM ${table}`).run();
});

describe('daily date + policy (pure)', () => {
  it('validates dates and counts puzzle numbers from the epoch', () => {
    expect(isValidDate('2026-02-30')).toBe(false);
    expect(isValidDate('2026-02-28')).toBe(true);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(puzzleNumber(DAILY_POLICY.epochDate)).toBe(1);
    expect(puzzleNumber(addDays(DAILY_POLICY.epochDate, 141))).toBe(142);
  });

  it('computes stars from par and caps hinted runs at 2', () => {
    expect(starsForMoves(10, 10, false)).toBe(3);
    expect(starsForMoves(12, 10, false)).toBe(2);
    expect(starsForMoves(13, 10, false)).toBe(1);
    expect(starsForMoves(10, 10, true)).toBe(2);
    expect(xpForOfficial(false)).toBe(DAILY_POLICY.xpOfficial);
    expect(xpForOfficial(true)).toBe(DAILY_POLICY.xpOfficialHinted);
  });

  it('continues, keeps and resets streaks', () => {
    const s1 = nextStreak({ current: 0, best: 0, lastDate: null }, '2026-10-01', '2026-09-30');
    expect(s1).toEqual({ current: 1, best: 1, lastDate: '2026-10-01' });
    const s2 = nextStreak(s1, '2026-10-02', '2026-10-01');
    expect(s2.current).toBe(2);
    expect(nextStreak(s2, '2026-10-02', '2026-10-01')).toBe(s2);
    const s3 = nextStreak(s2, '2026-10-05', '2026-10-04');
    expect(s3).toEqual({ current: 1, best: 2, lastDate: '2026-10-05' });
    expect(visibleStreak(s2, '2026-10-03', '2026-10-02')).toBe(2);
    expect(visibleStreak(s2, '2026-10-04', '2026-10-03')).toBe(0);
  });

  it('locks past dates and today once results exist', () => {
    expect(canEditScheduleDate('2026-10-09', TODAY, 0)).toEqual({ ok: false, reason: 'date-in-past' });
    expect(canEditScheduleDate(TODAY, TODAY, 1)).toEqual({ ok: false, reason: 'date-has-results' });
    expect(canEditScheduleDate(TODAY, TODAY, 0)).toEqual({ ok: true });
    expect(canEditScheduleDate('2026-10-11', TODAY, 5)).toEqual({ ok: true });
  });

  it('marks gaps only for today and the future', () => {
    const days = buildCalendarDays('2026-10-09', 3, TODAY, []);
    expect(days.map((d) => d.isGap)).toEqual([false, true, true]);
    expect(days[0].locked).toBe(true);
  });

  it('parses daily level ids', () => {
    expect(parseDailyLevelId(dailyLevelId('abc'))).toBe('abc');
    expect(parseDailyLevelId('firestoreId')).toBeNull();
  });
});

describe('puzzle validation', () => {
  it('accepts a replayed solution and derives par', () => {
    const v = validatePuzzle(LEVEL, ['r', 'r']);
    expect(v.ok && v.par).toBe(2);
  });

  it('rejects unsolved solutions and malformed levels', () => {
    expect(validatePuzzle(LEVEL, ['r'])).toEqual({ ok: false, reason: 'invalid-solution' });
    expect(validatePuzzle({ foo: 1 }, ['r'])).toEqual({ ok: false, reason: 'invalid-level' });
  });
});

describe('admin calendar', () => {
  it('saves, assigns and refuses to edit published content', async () => {
    const id = await createPuzzle({ assignDate: TODAY });
    const edited = await savePuzzle(db(), {
      id, title: 'T', level: { ...LEVEL, name: 'changed' }, solution: ['r', 'r'], parSource: 'solver',
      source: 'designed', status: 'approved', inPool: false, difficulty: null, adminUid: 'admin1',
    }, NOW);
    expect(edited).toEqual({ ok: false, status: 409, error: 'puzzle-published' });
  });

  it('bumps the version when unpublished content changes', async () => {
    const id = await createPuzzle({ assignDate: '2026-10-20' });
    const edited = await savePuzzle(db(), {
      id, title: 'T', level: { ...LEVEL, name: 'changed' }, solution: ['r', 'r'], parSource: 'admin',
      source: 'generated', status: 'approved', inPool: true, difficulty: 2, adminUid: 'admin1',
    }, NOW);
    expect(edited.ok && edited.value.version).toBe(2);
  });

  it('does not schedule drafts or past dates, and locks today after results', async () => {
    const draft = await createPuzzle({ status: 'draft' });
    expect(await setScheduleDate(db(), '2026-10-12', draft, NOW)).toEqual({ ok: false, status: 400, error: 'puzzle-not-approved' });

    const id = await createPuzzle();
    expect(await setScheduleDate(db(), '2026-10-01', id, NOW)).toEqual({ ok: false, status: 409, error: 'date-in-past' });
    expect((await setScheduleDate(db(), TODAY, id, NOW)).ok).toBe(true);
    await completeDaily(db(), { uid: 'u1', date: TODAY, moves: ['r', 'r'], timeSpent: 5, hintsUsed: 0 }, NOW);
    expect(await setScheduleDate(db(), TODAY, null, NOW)).toEqual({ ok: false, status: 409, error: 'date-has-results' });
  });

  it('refuses to delete a scheduled puzzle', async () => {
    const id = await createPuzzle({ assignDate: '2026-10-15' });
    expect(await removePuzzle(db(), id)).toEqual({ ok: false, status: 409, error: 'puzzle-scheduled' });
  });

  it('reports upcoming gaps', async () => {
    await createPuzzle({ assignDate: TODAY });
    const view = await getCalendarView(db(), TODAY, 7, NOW);
    expect(view.upcomingGaps[0]).toBe('2026-10-11');
    expect(view.upcomingGaps).not.toContain(TODAY);
  });
});

describe('puzzle of the day', () => {
  it('fills an empty today from the pool and persists the choice', async () => {
    await createPuzzle({ inPool: true });
    await createPuzzle({ inPool: true });
    const first = await resolvePuzzleForDate(db(), TODAY, { today: TODAY, policy: 'pool' });
    const second = await resolvePuzzleForDate(db(), TODAY, { today: TODAY, policy: 'pool' });
    expect(first?.id).toBeDefined();
    expect(second?.id).toBe(first?.id);
    const row = await db().prepare('SELECT assigned_by FROM daily_schedule WHERE date = ?1').bind(TODAY).first<{ assigned_by: string }>();
    expect(row?.assigned_by).toBe('fallback');
  });

  it('shows nothing on an empty day when the policy is none, and never for past gaps or drafts', async () => {
    await createPuzzle({ inPool: true });
    await saveDailySettings(db(), { emptyDayPolicy: 'none' });
    expect((await getDailyPuzzleView(db(), undefined, TODAY, NOW))?.puzzle).toBeNull();
    expect(await resolvePuzzleForDate(db(), '2026-10-01', { today: TODAY, policy: 'pool' })).toBeNull();
    expect(dateHash('2026-10-10')).toBe(dateHash('2026-10-10'));
  });

  it('never resolves future dates for players and hides unpublished puzzles from hint loading', async () => {
    const id = await createPuzzle({ assignDate: '2026-10-11' });
    expect(await getDailyPuzzleView(db(), undefined, '2026-10-11', NOW)).toBeNull();
    expect(await loadPublishedDailyLevel(db(), id, NOW)).toBeNull();
    expect(await loadPublishedDailyLevel(db(), id, new Date('2026-10-11T01:00:00Z'))).not.toBeNull();
  });
});

describe('completeDaily', () => {
  it('records only the first completion of the day as official and grants XP once', async () => {
    await createPuzzle({ assignDate: TODAY });
    const a = await completeDaily(db(), { uid: 'u1', date: TODAY, moves: ['l', 'l', 'r', 'r'], timeSpent: 30, hintsUsed: 0 }, NOW);
    expect(a.ok && a.response.isOfficial).toBe(true);
    expect(a.ok && a.xpDelta).toBe(DAILY_POLICY.xpOfficial);
    expect(a.ok && a.response.stars).toBe(1);

    const b = await completeDaily(db(), { uid: 'u1', date: TODAY, moves: ['r', 'r'], timeSpent: 3, hintsUsed: 0 }, NOW);
    expect(b.ok && b.response.isOfficial).toBe(false);
    expect(b.ok && b.xpDelta).toBe(0);
    expect(b.ok && b.response.stars).toBe(3);
    expect(b.ok && b.response.officialResult?.moveCount).toBe(4);
    expect(b.ok && b.response.streak.current).toBe(1);
  });

  it('rejects invalid solutions, future dates and days without a puzzle', async () => {
    await createPuzzle({ assignDate: TODAY });
    expect(await completeDaily(db(), { uid: 'u1', date: TODAY, moves: ['r'], timeSpent: 1, hintsUsed: 0 }, NOW))
      .toEqual({ ok: false, status: 400, error: 'invalid-solution' });
    expect(await completeDaily(db(), { uid: 'u1', date: '2026-10-11', moves: ['r', 'r'], timeSpent: 1, hintsUsed: 0 }, NOW))
      .toEqual({ ok: false, status: 400, error: 'invalid-date' });
    expect(await completeDaily(db(), { uid: 'u1', date: '2026-10-05', moves: ['r', 'r'], timeSpent: 1, hintsUsed: 0 }, NOW))
      .toEqual({ ok: false, status: 404, error: 'no-puzzle' });
  });

  it('archive play is verified but affects neither results, streak nor XP', async () => {
    const id = await createPuzzle();
    await db().prepare(`INSERT INTO daily_schedule (date, puzzle_id, assigned_by) VALUES ('2026-10-08', ?1, 'admin')`).bind(id).run();
    const out = await completeDaily(db(), { uid: 'u1', date: '2026-10-08', moves: ['r', 'r'], timeSpent: 4, hintsUsed: 0 }, NOW);
    expect(out.ok && out.response.isArchive).toBe(true);
    expect(out.ok && out.xpDelta).toBe(0);
    const count = await db().prepare('SELECT COUNT(*) AS n FROM daily_results').first<{ n: number }>();
    expect(count?.n).toBe(0);
    const archive = await getArchiveView(db(), 'u1', 30, NOW);
    expect(archive.map((e) => e.date)).toEqual(['2026-10-08']);
  });

  it('marks server-recorded hints and ranks hinted results last', async () => {
    const id = await createPuzzle({ assignDate: TODAY });
    await db().prepare(
      `INSERT INTO reward_grants (id, uid, action, level_id, input_key, status) VALUES ('g1', 'u1', 'hint', ?1, '', 'delivered')`,
    ).bind(dailyLevelId(id)).run();

    const hinted = await completeDaily(db(), { uid: 'u1', date: TODAY, moves: ['r', 'r'], timeSpent: 1, hintsUsed: 0 }, NOW);
    expect(hinted.ok && hinted.response.hinted).toBe(true);
    expect(hinted.ok && hinted.response.stars).toBe(2);
    expect(hinted.ok && hinted.xpDelta).toBe(DAILY_POLICY.xpOfficialHinted);
    await completeDaily(db(), { uid: 'u2', date: TODAY, moves: ['l', 'r', 'r'], timeSpent: 50, hintsUsed: 0 }, NOW);

    const board = await getDailyLeaderboard(db(), TODAY, 10);
    expect(board.entries.map((e) => [e.uid, e.hinted])).toEqual([['u2', false], ['u1', true]]);
    const grant = await db().prepare(`SELECT consumed_at FROM reward_grants WHERE id = 'g1'`).first<{ consumed_at: string | null }>();
    expect(grant?.consumed_at).not.toBeNull();
  });

  it('continues the streak across consecutive days', async () => {
    const id = await createPuzzle();
    for (const date of ['2026-10-09', TODAY]) {
      await db().prepare(`INSERT INTO daily_schedule (date, puzzle_id, assigned_by) VALUES (?1, ?2, 'admin')`).bind(date, id).run();
    }
    await completeDaily(db(), { uid: 'u1', date: '2026-10-09', moves: ['r', 'r'], timeSpent: 1, hintsUsed: 0 }, new Date('2026-10-09T10:00:00Z'));
    const out = await completeDaily(db(), { uid: 'u1', date: TODAY, moves: ['r', 'r'], timeSpent: 1, hintsUsed: 0 }, NOW);
    expect(out.ok && out.response.streak).toEqual({ current: 2, best: 2 });
  });

  it('completes a half-finished earlier attempt (result stored, streak not) exactly once', async () => {
    const id = await createPuzzle({ assignDate: TODAY });
    // Önceki istek sonucu yazdı ama seri yazımından önce düştü (ipuçlu sonuç).
    await db().prepare(
      `INSERT INTO daily_results (uid, date, puzzle_id, move_count, time_spent, stars, hinted) VALUES ('u1', ?1, ?2, 2, 9, 2, 1)`,
    ).bind(TODAY, id).run();

    const retry = await completeDaily(db(), { uid: 'u1', date: TODAY, moves: ['r', 'r'], timeSpent: 1, hintsUsed: 0 }, NOW);
    expect(retry.ok && retry.response.isOfficial).toBe(true);
    expect(retry.ok && retry.xpDelta).toBe(DAILY_POLICY.xpOfficialHinted);
    expect(retry.ok && retry.response.streak.current).toBe(1);

    const again = await completeDaily(db(), { uid: 'u1', date: TODAY, moves: ['r', 'r'], timeSpent: 1, hintsUsed: 0 }, NOW);
    expect(again.ok && again.xpDelta).toBe(0);
    expect(again.ok && again.response.isOfficial).toBe(false);
  });

  it('clamps absurd client-reported time', async () => {
    await createPuzzle({ assignDate: TODAY });
    await completeDaily(db(), { uid: 'u1', date: TODAY, moves: ['r', 'r'], timeSpent: 1e12, hintsUsed: 0 }, NOW);
    const row = await db().prepare('SELECT time_spent FROM daily_results').first<{ time_spent: number }>();
    expect(row?.time_spent).toBe(DAILY_POLICY.maxTimeSpentSeconds);
  });
});
