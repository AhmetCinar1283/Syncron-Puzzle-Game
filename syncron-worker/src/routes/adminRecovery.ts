/**
 * DOSYA AMACI: Türetilmiş tabloları kaynaktan yeniden kuran admin uç noktası
 * (ince katman; tüm karar mantığı `services/recovery` altındadır).
 *
 *   POST /admin/recovery/recompute — scope: 'user' | 'creator' | 'badges'
 *
 * Yalnızca `role === 'admin'`; moderatör erişemez. Her yazan çalıştırma
 * `audit_logs` tablosuna `admin.recovery_recompute` kaydı bırakır.
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import type { AppContext, Env } from '../types';
import { adminAuth } from '../middleware/adminAuth';
import { recomputeSchema } from '../schemas/recovery';
import { writeAuditLog } from '../services/auditLog';
import { getAdminAccessToken } from '../services/serviceAccount';
import { rateLimit } from '../middleware/rateLimiter';
import { trackSecurityEvent } from '../middleware/securityTrail';
import {
  createFirestoreLevelCreatorLookup,
  evaluateDestructiveGate,
  recomputeBadges,
  recomputeCreatorScores,
  recomputeUserScores,
} from '../services/recovery';

export const adminRecoveryRouter = new Hono<AppContext>();

adminRecoveryRouter.post('/admin/recovery/recompute', adminAuth, rateLimit('admin-recovery-recompute'), async (c) => {
  // Moderatör liderlik tablosunu yeniden yazamaz — yalnızca admin.
  if (c.get('role') !== 'admin') {
    return c.json({ success: false, error: 'Admin role required' }, 403);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: false, error: 'Invalid JSON' }, 400);
  }

  const parsed = recomputeSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ success: false, error: parsed.error.errors[0]?.message || 'Invalid request' }, 400);
  }
  const req = parsed.data;
  const db = c.env.AUDIT_DB;

  try {
    // ── Rozetler: EKLEMELİ ve idempotent (hiçbir satırın üstüne yazmaz) ──────
    // Bu yüzden iki adımlı onay kapısına tabi değildir; yalnızca `dryRun: false` ister.
    if (req.scope === 'badges') {
      const result = await recomputeBadges(c.env, req.period!, { dryRun: req.dryRun });
      if (!req.dryRun) {
        audit(c, { scope: 'badges', period: req.period, badgesAfter: result.badgesAfter });
      }
      return c.json({ success: true, scope: 'badges', result });
    }

    // ── Kullanıcı / yapımcı skorları: ÜSTÜNE YAZAR → onay kapısı ────────────
    const preview =
      req.scope === 'user'
        ? await recomputeUserScores(db, req.uid!, { dryRun: true })
        : await recomputeCreatorScores(db, await creatorLookup(c.env), { levelId: req.levelId ?? null, dryRun: true });

    if (req.dryRun) {
      return c.json({ success: true, scope: req.scope, dryRun: true, preview });
    }

    const gate = evaluateDestructiveGate({ affectedRows: preview.affectedRows, confirm: req.confirm });
    if (!gate.allowed) {
      return c.json(
        {
          success: false,
          error: gate.reason,
          affectedRows: gate.affectedRows,
          submitted: gate.submitted,
          preview,
        },
        409,
      );
    }

    const result =
      req.scope === 'user'
        ? await recomputeUserScores(db, req.uid!, { dryRun: false })
        : await recomputeCreatorScores(db, await creatorLookup(c.env), { levelId: req.levelId ?? null, dryRun: false });

    audit(c, {
      scope: req.scope,
      uid: req.uid ?? null,
      levelId: req.levelId ?? null,
      affectedRows: result.affectedRows,
    });

    return c.json({ success: true, scope: req.scope, dryRun: false, result });
  } catch (err) {
    console.error('[AdminRecovery] recompute failed:', err);
    return c.json({ success: false, error: 'Internal error' }, 500);
  }
});

/** Firestore sahiplik okuyucusunu kurar (kompozisyon kökü burasıdır). */
async function creatorLookup(env: Env) {
  const token = await getAdminAccessToken(env.GOOGLE_SERVICE_ACCOUNT);
  return createFirestoreLevelCreatorLookup(env.FIREBASE_PROJECT_ID, token);
}

/**
 * Yazan her çalıştırma iz bırakır; yazmayan (kuru) çalıştırma bırakmaz.
 * İki tabloya birden yazılır: `audit_logs` işletme kaydıdır (90 gün + R2 arşivi),
 * `security_events` yıkıcı işlem izidir (30 gün, arşivsiz) — bkz. yayin-hazirlik/05 §3.2.
 */
function audit(c: Context<AppContext>, metadata: Record<string, unknown>): void {
  c.executionCtx.waitUntil(
    writeAuditLog(c.env.AUDIT_DB, c.get('uid'), 'admin.recovery_recompute', 'admin', metadata).catch((err) =>
      console.error('[AuditLog] admin.recovery_recompute write failed:', err),
    ),
  );
  trackSecurityEvent(c, 'admin.destructive', { operation: 'recovery.recompute', ...metadata });
}
