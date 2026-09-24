/**
 * DOSYA AMACI: Veri dayanıklılığı (02) karar noktalarının testleri —
 * onay kapısı, periyot sınırları, soft delete/diriltme ve türetilmiş tabloların
 * bozuk durumdan tutarlı duruma geçişi.
 */

import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { evaluateDestructiveGate } from '../src/services/recovery/confirmDestructive';
import { periodStartOf, isPeriodCovered, periodKeysFor } from '../src/services/recovery/lib/periods';
import { recomputeUserScores } from '../src/services/recovery/recomputeUserScores';
import { recomputeCreatorScores } from '../src/services/recovery/recomputeCreatorScores';
import { recomputeBadges } from '../src/services/recovery/recomputeBadges';
import { upsertPlayedLevel, getPlayedLevel, getPlayedLevelsSince } from '../src/services/playedLevels';
import { deleteLevelRecords, restoreLevelRecords, countLevelDeletionRows } from '../src/services/levelLifecycle';
import { RECOVERY_SCHEMA } from './recoverySchema';
import type { Env } from '../src/types';

const db = () => env.AUDIT_DB;
const testEnv = env as unknown as Env;

beforeAll(async () => {
  for (const stmt of RECOVERY_SCHEMA) await db().prepare(stmt).run();
});

beforeEach(async () => {
  for (const t of ['audit_logs', 'played_levels', 'deleted_levels', 'skipped_levels',
    'user_period_scores', 'creator_scores', 'user_world_records', 'badges', 'user_profiles']) {
    await db().prepare(`DELETE FROM ${t}`).run();
  }
});

// ─── Onay kapısı ──────────────────────────────────────────────────────────────

describe('evaluateDestructiveGate', () => {
  it('onay gelmediyse izin vermez ve etkilenecek satır sayısını döner', () => {
    expect(evaluateDestructiveGate({ affectedRows: 42 })).toEqual({
      allowed: false, reason: 'confirmation-required', affectedRows: 42, submitted: null,
    });
  });

  it('sayı tutmuyorsa reddeder (dünya bu arada değişmiş olabilir)', () => {
    const r = evaluateDestructiveGate({ affectedRows: 42, confirm: 41 });
    expect(r).toMatchObject({ allowed: false, reason: 'confirmation-mismatch', submitted: 41 });
  });

  it('sayı tutuyorsa izin verir', () => {
    expect(evaluateDestructiveGate({ affectedRows: 42, confirm: 42 })).toEqual({ allowed: true, affectedRows: 42 });
  });

  it('etkilenecek satır yoksa onay istemez (idempotent no-op)', () => {
    expect(evaluateDestructiveGate({ affectedRows: 0 })).toEqual({ allowed: true, affectedRows: 0 });
  });

  it('null/negatif/NaN girdide güvenli tarafa düşer', () => {
    expect(evaluateDestructiveGate({ affectedRows: Number.NaN }).allowed).toBe(true);
    expect(evaluateDestructiveGate({ affectedRows: 5, confirm: null }).allowed).toBe(false);
  });
});

// ─── Periyot sınırları ────────────────────────────────────────────────────────

describe('periodStartOf', () => {
  it('gün/ay/tüm-zamanlar başlangıcını çözer', () => {
    expect(periodStartOf('daily', '2026-06-07')).toBe('2026-06-07T00:00:00.000Z');
    expect(periodStartOf('monthly', '2026-06')).toBe('2026-06-01T00:00:00.000Z');
    expect(periodStartOf('all_time', 'all_time')).toBe('1970-01-01T00:00:00.000Z');
  });

  it('ISO haftasının pazartesisini çözer ve periodKeysFor ile tutarlıdır', () => {
    // 2026-06-07 bir pazar → ISO haftası pazartesi 2026-06-01'de başlar.
    const keys = periodKeysFor(new Date('2026-06-07T12:00:00.000Z'));
    const weekly = keys.find((k) => k.periodType === 'weekly')!;
    expect(periodStartOf('weekly', weekly.periodId)).toBe(weekly.startIso);
    expect(new Date(weekly.startIso).getUTCDay()).toBe(1);
  });

  it('bozuk değerde null döner (o satıra DOKUNULMAZ)', () => {
    expect(periodStartOf('weekly', '2026-W99')).toBeNull();
    expect(periodStartOf('daily', 'gecersiz')).toBeNull();
    expect(periodStartOf('yok', 'yok')).toBeNull();
    expect(isPeriodCovered(null, '2026-01-01T00:00:00.000Z')).toBe(false);
  });
});

// ─── Soft delete / diriltme ───────────────────────────────────────────────────

describe('soft delete', () => {
  const play = (uid: string, levelId: string, stars: 1 | 2 | 3) =>
    upsertPlayedLevel(db(), { uid, levelId, stars, score: stars, moveCount: 10, timeSpent: 5 });

  it('silme satırı yok etmez, yalnızca gizler', async () => {
    await play('u1', 'L1', 3);
    expect(await countLevelDeletionRows(db(), 'L1')).toBe(1);

    await deleteLevelRecords(db(), 'L1');

    expect(await getPlayedLevel(db(), 'u1', 'L1')).toBeNull();
    expect(await getPlayedLevelsSince(db(), 'u1', null)).toEqual([]);
    const raw = await db().prepare(`SELECT deleted_at FROM played_levels WHERE uid='u1' AND level_id='L1'`)
      .first<{ deleted_at: string | null }>();
    expect(raw?.deleted_at).toBeTruthy(); // satır DİSKTE duruyor
    expect(await countLevelDeletionRows(db(), 'L1')).toBe(0); // ikinci silme etkisiz
  });

  it('geri getirme kaydı ve tombstone durumunu eski hâline döndürür', async () => {
    await play('u1', 'L1', 3);
    await deleteLevelRecords(db(), 'L1');

    const { restoredRows } = await restoreLevelRecords(db(), 'L1');
    expect(restoredRows).toBe(1);
    expect((await getPlayedLevel(db(), 'u1', 'L1'))?.stars).toBe(3);
    const tomb = await db().prepare(`SELECT COUNT(*) AS n FROM deleted_levels`).first<{ n: number }>();
    expect(tomb?.n).toBe(0);
  });

  it('silinmiş kaydın üstüne yeniden oynanırsa kayıt DİRİLİR ve ilk tamamlama sayılır', async () => {
    await play('u1', 'L1', 3);
    await deleteLevelRecords(db(), 'L1');

    // Daha kötü bir sonuç: eski 3 yıldız geri gelmemeli (geri alınmış puan sızmamalı).
    const result = await play('u1', 'L1', 1);
    expect(result.wasFirstCompletion).toBe(true);
    const row = await getPlayedLevel(db(), 'u1', 'L1');
    expect(row?.stars).toBe(1);
  });
});

// ─── recomputeUserScores ──────────────────────────────────────────────────────

/** Kanıt ufkunu (global en eski audit kaydı) geçmişe çeker → periyotlar kapsanır. */
async function seedCoverageHorizon(atIso = '2026-01-01T00:00:00.000Z') {
  await db()
    .prepare(`INSERT INTO audit_logs (uid, action, category, metadata, created_at)
              VALUES ('system', 'account.create', 'account', '{}', ?1)`)
    .bind(atIso)
    .run();
}

async function seedCompletion(uid: string, levelId: string, stars: number, atIso: string, isFirst = true) {
  await db()
    .prepare(`INSERT INTO played_levels (uid, level_id, stars, score, move_count, completed_at, updated_at)
              VALUES (?1, ?2, ?3, ?3, 10, ?4, ?4)
              ON CONFLICT (uid, level_id) DO UPDATE SET stars = excluded.stars, score = excluded.score`)
    .bind(uid, levelId, stars, atIso)
    .run();
  await db()
    .prepare(`INSERT INTO audit_logs (uid, action, category, metadata, created_at)
              VALUES (?1, 'level.complete', 'game', ?2, ?3)`)
    .bind(uid, JSON.stringify({ levelId, stars, scoreDelta: stars, isFirst }), atIso)
    .run();
}

describe('recomputeUserScores', () => {
  it('bozuk all_time satırını kaynaktan düzeltir ve idempotenttir', async () => {
    await seedCompletion('u1', 'L1', 3, '2026-06-01T10:00:00.000Z');
    await seedCompletion('u1', 'L2', 2, '2026-06-02T10:00:00.000Z');
    await db().prepare(`INSERT INTO user_period_scores (uid, period_type, period_id, stars_gained, levels_done)
                        VALUES ('u1','all_time','all_time', 999, 999)`).run();

    const dry = await recomputeUserScores(db(), 'u1', { dryRun: true });
    expect(dry.affectedRows).toBeGreaterThan(0);
    const stillWrong = await db().prepare(
      `SELECT stars_gained FROM user_period_scores WHERE uid='u1' AND period_type='all_time'`,
    ).first<{ stars_gained: number }>();
    expect(stillWrong?.stars_gained).toBe(999); // kuru çalışma yazmaz

    await recomputeUserScores(db(), 'u1', { dryRun: false });
    const fixed = await db().prepare(
      `SELECT stars_gained, levels_done FROM user_period_scores WHERE uid='u1' AND period_type='all_time'`,
    ).first<{ stars_gained: number; levels_done: number }>();
    expect(fixed).toEqual({ stars_gained: 5, levels_done: 2 });

    const second = await recomputeUserScores(db(), 'u1', { dryRun: false });
    expect(second.affectedRows).toBe(0); // idempotent
  });

  it('periyodik skorları audit kanıtından kurar', async () => {
    await seedCoverageHorizon();
    await seedCompletion('u1', 'L1', 3, '2026-06-01T10:00:00.000Z');
    await seedCompletion('u1', 'L2', 2, '2026-06-02T10:00:00.000Z');
    await recomputeUserScores(db(), 'u1', { dryRun: false });

    const monthly = await db().prepare(
      `SELECT stars_gained, levels_done FROM user_period_scores
       WHERE uid='u1' AND period_type='monthly' AND period_id='2026-06'`,
    ).first<{ stars_gained: number; levels_done: number }>();
    expect(monthly).toEqual({ stars_gained: 5, levels_done: 2 });
  });

  it('kanıt penceresinin DIŞINDAKİ eski periyoda dokunmaz (onarım aracı imha aracı olmaz)', async () => {
    await seedCoverageHorizon();
    await seedCompletion('u1', 'L1', 3, '2026-06-01T10:00:00.000Z');
    // Arşivlenmiş bir döneme ait, kanıtı kalmamış satır:
    await db().prepare(`INSERT INTO user_period_scores (uid, period_type, period_id, stars_gained, levels_done)
                        VALUES ('u1','monthly','2024-01', 120, 40)`).run();

    const result = await recomputeUserScores(db(), 'u1', { dryRun: false });
    expect(result.untouched).toContainEqual({ periodType: 'monthly', periodId: '2024-01', reason: 'out-of-coverage' });

    const old = await db().prepare(
      `SELECT stars_gained FROM user_period_scores WHERE uid='u1' AND period_id='2024-01'`,
    ).first<{ stars_gained: number }>();
    expect(old?.stars_gained).toBe(120); // olduğu gibi duruyor
  });

  it('silinmiş bölümün tamamlaması sayılmaz', async () => {
    await seedCompletion('u1', 'L1', 3, '2026-06-01T10:00:00.000Z');
    await seedCompletion('u1', 'L2', 2, '2026-06-02T10:00:00.000Z');
    await deleteLevelRecords(db(), 'L2');

    await recomputeUserScores(db(), 'u1', { dryRun: false });
    const allTime = await db().prepare(
      `SELECT stars_gained, levels_done FROM user_period_scores WHERE uid='u1' AND period_type='all_time'`,
    ).first<{ stars_gained: number; levels_done: number }>();
    expect(allTime).toEqual({ stars_gained: 3, levels_done: 1 });
  });

  it('hiç audit kaydı yoksa yalnızca all_time onarılır', async () => {
    await db().prepare(`INSERT INTO played_levels (uid, level_id, stars, score, move_count)
                        VALUES ('u2','L9',3,3,10)`).run();
    const result = await recomputeUserScores(db(), 'u2', { dryRun: false });
    expect(result.coverageStart).toBeNull();
    expect(result.changes.map((c) => c.periodType)).toEqual(['all_time']);
  });
});

// ─── recomputeCreatorScores ───────────────────────────────────────────────────

describe('recomputeCreatorScores', () => {
  const lookup = (map: Record<string, string | null>) => async () => map;

  it('bozuk yapımcı skorunu düzeltir, self-play saymaz', async () => {
    await seedCompletion('p1', 'L1', 3, '2026-06-01T10:00:00.000Z');
    await seedCompletion('p2', 'L1', 2, '2026-06-02T10:00:00.000Z');
    await seedCompletion('creator', 'L1', 3, '2026-06-03T10:00:00.000Z'); // kendi bölümü
    await db().prepare(`INSERT INTO creator_scores (uid, period_type, period_id, plays_gained, stars_gained)
                        VALUES ('creator','all_time','all_time', 77, 77)`).run();

    await recomputeCreatorScores(db(), lookup({ L1: 'creator' }), { dryRun: false });

    const row = await db().prepare(
      `SELECT plays_gained, stars_gained FROM creator_scores WHERE uid='creator' AND period_type='all_time'`,
    ).first<{ plays_gained: number; stars_gained: number }>();
    expect(row).toEqual({ plays_gained: 2, stars_gained: 5 });
  });

  it('sahibi çözülemeyen bölümü raporlar ve saymaz', async () => {
    await seedCompletion('p1', 'L1', 3, '2026-06-01T10:00:00.000Z');
    const result = await recomputeCreatorScores(db(), lookup({ L1: null }), { dryRun: true });
    expect(result.unresolvedLevels).toEqual(['L1']);
    expect(result.changes).toEqual([]);
  });

  it('kuru çalışma yazmaz ve ikinci gerçek çalıştırma etkisizdir', async () => {
    await seedCompletion('p1', 'L1', 3, '2026-06-01T10:00:00.000Z');
    const dry = await recomputeCreatorScores(db(), lookup({ L1: 'creator' }), { dryRun: true });
    expect(dry.affectedRows).toBeGreaterThan(0);
    const none = await db().prepare(`SELECT COUNT(*) AS n FROM creator_scores`).first<{ n: number }>();
    expect(none?.n).toBe(0);

    await recomputeCreatorScores(db(), lookup({ L1: 'creator' }), { dryRun: false });
    const again = await recomputeCreatorScores(db(), lookup({ L1: 'creator' }), { dryRun: false });
    expect(again.affectedRows).toBe(0);
  });
});

// ─── recomputeBadges ──────────────────────────────────────────────────────────

describe('recomputeBadges', () => {
  it('geçmiş bir haftanın rozetlerini yeniden dağıtır ve tekrarında çoğaltmaz', async () => {
    await db().prepare(`INSERT INTO user_profiles (uid, display_name) VALUES ('u1','Ada')`).run();
    await db().prepare(`INSERT INTO user_period_scores (uid, period_type, period_id, stars_gained, levels_done)
                        VALUES ('u1','weekly','2026-W23', 30, 10)`).run();

    const dry = await recomputeBadges(testEnv, { type: 'weekly', periodId: '2026-W23' }, { dryRun: true });
    expect(dry.badgesAfter).toBe(0); // kuru çalışma dağıtmaz

    const run = await recomputeBadges(testEnv, { type: 'weekly', periodId: '2026-W23' }, { dryRun: false });
    expect(run.badgesAfter).toBeGreaterThan(0);

    const again = await recomputeBadges(testEnv, { type: 'weekly', periodId: '2026-W23' }, { dryRun: false });
    expect(again.badgesAfter).toBe(run.badgesAfter); // idempotent
  });

  it('bozuk periodId ile çalışmayı reddeder', async () => {
    await expect(
      recomputeBadges(testEnv, { type: 'weekly', periodId: 'W-yok' }, { dryRun: false }),
    ).rejects.toThrow();
  });
});
