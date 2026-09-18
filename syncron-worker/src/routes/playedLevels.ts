/**
 * DOSYA AMACI: Bu dosya, kullanıcıların oynadığı seviye kayıtlarının senkronizasyonunu (delta sync) 
 * ve adminlerin seviye silme (veri tabanındaki ilişkili skorların temizlenmesiyle) işlemlerini yöneten API uç noktalarını tanımlar.
 */

/**
 * Routes for user-facing played-levels sync and admin-level deletion with cascade.
 *
 * GET  /played-levels              — delta sync (returns records + deleted IDs)
 * DELETE /admin/levels/:levelId    — admin: delete level + cascade all D1 data
 */

import { Hono } from 'hono';
import type { AppContext } from '../types';
import { firebaseAuth } from '../middleware/auth';
import { adminAuth } from '../middleware/adminAuth';
import { getPlayedLevelsSince, getDeletedLevelsSince } from '../services/playedLevels';
import {
  getLevelDeletionImpact,
  deleteLevelRecords,
  restoreLevelRecords,
  countLevelDeletionRows,
  buildLeaderboardRollbackStatements,
} from '../services/levelLifecycle';
import { evaluateDestructiveGate } from '../services/recovery';
import { getSkippedLevelsSince } from '../services/skipLevel/skippedLevels';
import { writeAuditLog } from '../services/auditLog';
import { getAdminAccessToken } from '../services/serviceAccount';
import { fsDelete } from '../services/firestore';
import { rateLimit } from '../middleware/rateLimiter';
import { trackSecurityEvent } from '../middleware/securityTrail';

export const playedLevelsRouter = new Hono<AppContext>();

// ─── GET /played-levels ───────────────────────────────────────────────────────
//
// Delta sync endpoint. Returns:
//   • records[]      — played_levels rows updated after `since` (or ALL if first sync)
//   • deletedLevelIds[] — level IDs deleted after `since` (tombstones for Dexie cleanup)
//   • skippedLevels[]  — ödüllü reklamla atlanan level'lar (skor taşımaz; bkz. services/skipLevel)
//   • serverTime     — ISO timestamp to use as the next `since` cursor
//
// Query param:
//   ?since=2026-06-16T10:00:00.000Z   (omit for full sync)
// Kullanıcının oynadığı seviyeleri ve silinen seviyeleri zaman damgası (delta sync) bazlı senkronize eder.
playedLevelsRouter.get('/played-levels', firebaseAuth, rateLimit('played-levels-sync'), async (c) => {
  const uid = c.get('uid');
  const sinceRaw = new URL(c.req.url).searchParams.get('since');

  // Validate `since` if provided
  let since: string | null = null;
  if (sinceRaw) {
    const d = new Date(sinceRaw);
    if (isNaN(d.getTime())) {
      return c.json({ success: false, error: 'Invalid since parameter' }, 400);
    }
    since = sinceRaw;
  }

  try {
    const [records, deletedLevelIds, skipped] = await Promise.all([
      getPlayedLevelsSince(c.env.AUDIT_DB, uid, since),
      getDeletedLevelsSince(c.env.AUDIT_DB, since),
      // Atlama kayıtları okunamazsa (ör. 0012 migration henüz uygulanmadı) ilerleme sync'i bozulmaz.
      getSkippedLevelsSince(c.env.AUDIT_DB, uid, since).catch((err) => {
        console.error('[PlayedLevels] skipped_levels read failed:', err);
        return [];
      }),
    ]);

    const serverTime = new Date().toISOString();

    return c.json({
      success: true,
      records: records.map((r) => ({
        levelId:     r.level_id,
        stars:       r.stars,
        score:       r.score,
        moveCount:   r.move_count,
        timeSpent:   r.time_spent,
        completedAt: r.completed_at,
        updatedAt:   r.updated_at,
      })),
      deletedLevelIds,
      skippedLevels: skipped.map((s) => ({
        levelId:   s.level_id,
        skippedAt: s.skipped_at,
        updatedAt: s.updated_at,
      })),
      serverTime,
    });
  } catch (err) {
    console.error('[PlayedLevels] GET /played-levels error:', err);
    return c.json({ success: false, error: 'Internal error' }, 500);
  }
});

// ─── DELETE /admin/levels/:levelId ───────────────────────────────────────────
//
// Admin-only: permanently deletes a level and cascades all related D1 data:
//
//   1. Read played_levels impact (who completed it, how many stars each earned)
//   2. Roll back user_period_scores (stars_gained -X, levels_done -1) for each affected user
//   3. Roll back creator_scores if the level had a createdBy field
//   4. Roll back user_world_records all_time count for the world record holder
//   5. Delete all played_levels rows for this level
//   6. Insert into deleted_levels (tombstone for client delta sync)
//   7. Delete the level from Firestore (levels/{levelId} + infos/solutions subcollection)
//   8. Write admin audit log
//
// İKİ ADIMLI ONAY (02 §3.1): `confirm` gövdesi yoksa hiçbir şey silinmez;
// uç nokta 409 ile etkilenecek satır sayısını döner. İkinci çağrı aynı sayıyı
// `{ "confirm": <n> }` olarak göndermek zorundadır. Sayı bu arada değiştiyse
// onay tutmaz ve işlem yeniden onaylanır.
//
// D1 tarafı artık MANTIKSAL silmedir (soft delete): satırlar `deleted_at` ile
// işaretlenir, POST /admin/levels/:levelId/restore ile geri getirilebilir.
// Firestore tarafındaki bölüm dokümanı silinmeye devam eder (bu görevin kapsamı
// D1'dir; Firestore yedeklemesi §4 gereği ayrı bir iştir).
// Seviyeyi siler ve ilgili tüm skor, rekor ve yapımcı verilerini geri alır.
playedLevelsRouter.delete('/admin/levels/:levelId', adminAuth, rateLimit('admin-level-delete'), async (c) => {
  if (c.get('role') !== 'admin') {
    return c.json({ success: false, error: 'Insufficient permissions' }, 403);
  }

  const levelId = c.req.param('levelId');
  const adminUid = c.get('uid');
  const db = c.env.AUDIT_DB;

  // Gövde isteğe bağlıdır: yoksa `confirm` yok sayılır ve önizleme dönülür.
  let confirm: number | null = null;
  try {
    const body: unknown = await c.req.json();
    if (body && typeof body === 'object' && typeof (body as { confirm?: unknown }).confirm === 'number') {
      confirm = (body as { confirm: number }).confirm;
    }
  } catch {
    confirm = null;
  }

  try {
    // ── Idempotency guard: already deleted? ──────────────────────────────────
    const alreadyDeleted = await db
      .prepare(`SELECT 1 FROM deleted_levels WHERE level_id = ?1`)
      .bind(levelId)
      .first();
    if (alreadyDeleted) {
      return c.json({ success: false, error: 'Level already deleted' }, 409);
    }

    // ── Onay kapısı: önce say, sonra onayla ─────────────────────────────────
    const affectedRows = await countLevelDeletionRows(db, levelId);
    const gate = evaluateDestructiveGate({ affectedRows, confirm });
    if (!gate.allowed) {
      return c.json(
        { success: false, error: gate.reason, levelId, affectedRows: gate.affectedRows, submitted: gate.submitted },
        409,
      );
    }

    // ── Step 1: Read impact BEFORE deletion ──────────────────────────────────
    const impact = await getLevelDeletionImpact(db, levelId);
    const { affectedUsers, worldRecordHolderUid } = impact;

    // ── Step 2: Read creator info from Firestore BEFORE deleting the doc ─────
    let createdBy: string | null = null;
    let adminToken: string;
    try {
      adminToken = await getAdminAccessToken(c.env.GOOGLE_SERVICE_ACCOUNT);
      const { fsGet, fromDoc } = await import('../services/firestore');
      const levelDoc = await fsGet(c.env.FIREBASE_PROJECT_ID, `levels/${levelId}`, adminToken);
      if (levelDoc) {
        const levelData = fromDoc(levelDoc);
        createdBy = typeof levelData.createdBy === 'string' ? levelData.createdBy : null;
      }
    } catch (e) {
      console.warn('[LevelDelete] Could not read level createdBy from Firestore:', e);
      adminToken = await getAdminAccessToken(c.env.GOOGLE_SERVICE_ACCOUNT);
    }

    // ── Step 3: Liderlik sayaci geri alma ifadeleri (services/levelLifecycle) ───
    const rollbackStatements = buildLeaderboardRollbackStatements(db, {
      affectedUsers,
      worldRecordHolderUid,
      createdBy,
    });

    // ── Step 4: Execute rollbacks + delete played_levels + insert tombstone ──
    if (rollbackStatements.length > 0) {
      await db.batch(rollbackStatements);
    }

    // This also inserts the deleted_levels tombstone in one batch
    await deleteLevelRecords(db, levelId);

    // ── Step 5: Delete from Firestore ────────────────────────────────────────
    try {
      // Delete the solutions subcollection doc first (child before parent)
      await fsDelete(
        c.env.FIREBASE_PROJECT_ID,
        `levels/${levelId}/infos/solutions`,
        adminToken!,
      );
    } catch {
      // Non-fatal if solutions doc doesn't exist
    }
    try {
      await fsDelete(c.env.FIREBASE_PROJECT_ID, `levels/${levelId}`, adminToken!);
    } catch (e) {
      console.warn('[LevelDelete] Firestore level doc delete failed (non-fatal):', e);
      // Non-fatal: D1 data is the canonical store. Firestore can be cleaned manually.
    }

    // ── Step 6: Audit log ────────────────────────────────────────────────────
    c.executionCtx.waitUntil(
      writeAuditLog(db, adminUid, 'admin.level_delete', 'admin', {
        levelId,
        affectedUserCount: affectedUsers.length,
        affectedRows,
        createdBy,
        worldRecordHolderUid,
        softDelete: true,
      }).catch((err) => console.error('[AuditLog] admin.level_delete write failed:', err)),
    );
    // 05 §3.2 — çok satır etkileyen admin işlemi güvenlik izine de düşer;
    // `audit_logs` "ne oldu"yu, `security_events` "yıkıcı ne oldu"yu tutar.
    trackSecurityEvent(c, 'admin.destructive', {
      operation: 'level.delete',
      levelId,
      affectedRows,
      affectedUserCount: affectedUsers.length,
    }, adminUid);

    return c.json({
      success: true,
      affectedUserCount: affectedUsers.length,
    });
  } catch (err) {
    console.error('[LevelDelete] Cascade delete error:', err);
    return c.json({ success: false, error: 'Internal error' }, 500);
  }
});

// ─── POST /admin/levels/:levelId/restore ─────────────────────────────────────
//
// Soft delete'in karşılığı. Mantıksal olarak silinmiş played_levels /
// skipped_levels satırlarını geri getirir ve tombstone'u kaldırır.
//
// Liderlik sayaçlarına DOKUNMAZ: geri yüklemeden sonra
// POST /admin/recovery/recompute (scope='user') çalıştırılmalıdır. Sayacı elle
// "geri artırmak" yerine kaynaktan yeniden hesaplamak idempotenttir.
// Bkz. docs/release/veri-kurtarma.md.
//
// Onay kapısına tabi DEĞİLDİR: veri ekler, hiçbir şeyi yok etmez.
playedLevelsRouter.post('/admin/levels/:levelId/restore', adminAuth, rateLimit('admin-level-restore'), async (c) => {
  if (c.get('role') !== 'admin') {
    return c.json({ success: false, error: 'Insufficient permissions' }, 403);
  }

  const levelId = c.req.param('levelId');
  const db = c.env.AUDIT_DB;

  try {
    const { restoredRows } = await restoreLevelRecords(db, levelId);

    c.executionCtx.waitUntil(
      writeAuditLog(db, c.get('uid'), 'admin.level_restore', 'admin', { levelId, restoredRows }).catch((err) =>
        console.error('[AuditLog] admin.level_restore write failed:', err),
      ),
    );
    trackSecurityEvent(c, 'admin.destructive', { operation: 'level.restore', levelId, affectedRows: restoredRows });

    // Firestore'daki bölüm dokümanı silme sırasında yok edilmişti; bu uç nokta
    // yalnızca D1 ilerlemesini kurtarır. Bölümün kendisi yeniden yüklenmelidir.
    return c.json({ success: true, levelId, restoredRows, firestoreLevelRestored: false });
  } catch (err) {
    console.error('[LevelRestore] restore failed:', err);
    return c.json({ success: false, error: 'Internal error' }, 500);
  }
});
