/**
 * DOSYA AMACI: Bu dosya, sadece Firebase Functions'ın (sunucular arası) denetim günlüklerini (audit logs) 
 * D1 veritabanına yazmak için çağırdığı güvenli iç loglama (internal logging) API ucunu tanımlar.
 */

/**
 * POST /internal/log
 *
 * Internal endpoint called exclusively by Firebase Functions to write audit
 * log entries into D1. Not exposed to end-users.
 *
 * Security layers:
 *   1. hmacAuth middleware — HMAC-SHA256 signature + timestamp replay protection
 *   2. rateLimit          — paylaşılan middleware; eşikler policy.ts'te
 *                           ('internalLog' kademesi: 100/dk global + 20/dk uid)
 *   3. Zod validation     — strict schema for every incoming payload
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import type { AppContext } from '../types';
import { hmacAuth } from '../middleware/hmacAuth';
import { rateLimit } from '../middleware/rateLimiter';
import { writeAuditLog } from '../services/auditLog';
import type { AuditCategory, AuditAction } from '../services/auditLog';
import { getAdminAccessToken, isValidServiceAccount } from '../services/serviceAccount';
import { fsGet, fromDoc } from '../services/firestore';
import { upsertUserProfile } from '../services/profiles';

// ─── Validation schema ────────────────────────────────────────────────────────

const AUDIT_CATEGORIES = ['game', 'support', 'account', 'payment', 'admin'] as const;

const internalLogSchema = z.object({
  uid:      z.string().min(1).max(128),
  action:   z.string().min(1).max(64),
  category: z.enum(AUDIT_CATEGORIES),
  metadata: z.record(z.unknown()).default({}),
});

// ─── Router ───────────────────────────────────────────────────────────────────

export const internalLogRouter = new Hono<AppContext>();

// Firebase Functions'tan gelen imzalı log verilerini doğrular, hız limitini kontrol eder ve D1 veritabanına kaydeder.
/**
 * Kimlik bu uç noktada bağlamda değil GÖVDEDEDİR (çağıran Firebase Functions'tır,
 * kayıt ettiği uid başkasınındır). Bu yüzden `identify` geçersiz kılınır.
 * Gövde henüz Zod'dan geçmemiştir; bu yüzden tip güvenli ve savunmacı okunur.
 * Değer eksik/bozuksa null döner → yalnızca global kural işler (bkz. rateLimitService.ts).
 */
function internalLogIdentity(c: Context<AppContext>): string | null {
  const body = c.get('parsedBody');
  if (typeof body !== 'object' || body === null) return null;
  const uid = (body as { uid?: unknown }).uid;
  return typeof uid === 'string' && uid.length > 0 ? uid : null;
}

internalLogRouter.post('/internal/log', hmacAuth, rateLimit('internal-log', { identify: internalLogIdentity }), async (c) => {
  // Body was already parsed and stored by hmacAuth middleware
  const rawBody = c.get('parsedBody');

  // 1. Validate payload
  const validation = internalLogSchema.safeParse(rawBody);
  if (!validation.success) {
    const error = validation.error.errors[0]?.message ?? 'Invalid payload';
    console.warn('[InternalLog] Validation failed:', error);
    return c.json({ success: false, error }, 400);
  }

  const { uid, action, category, metadata } = validation.data;

  // 2. Write to D1 (fire-and-forget pattern via waitUntil not needed here
  //    because this endpoint IS the async side — the caller already used
  //    fire-and-forget from Firebase Functions)
  try {
    await writeAuditLog(
      c.env.AUDIT_DB,
      uid,
      action as AuditAction,
      category as AuditCategory,
      metadata as Record<string, unknown>,
    );
  } catch (err) {
    console.error('[InternalLog] D1 write failed:', err);
    return c.json({ success: false, error: 'Failed to write log' }, 500);
  }

  // 3. Background Sync: If this is a profile creation/update/tag-change log, sync cache from Firestore
  if (
    category === 'account' &&
    (action === 'account.create' || action === 'account.upgrade' || action === 'account.tag_change') &&
    isValidServiceAccount(c.env.GOOGLE_SERVICE_ACCOUNT)
  ) {
    c.executionCtx.waitUntil(
      (async () => {
        try {
          const adminToken = await getAdminAccessToken(c.env.GOOGLE_SERVICE_ACCOUNT);
          const projectId = c.env.FIREBASE_PROJECT_ID;
          const userDoc = await fsGet(projectId, `users/${uid}`, adminToken);
          if (userDoc) {
            const userData = fromDoc(userDoc);
            const displayName = typeof userData.displayName === 'string' ? userData.displayName : 'Player';
            const tag = typeof userData.tag === 'string' ? userData.tag : null;
            const xp = typeof userData.xp === 'number' ? userData.xp : null;
            let showcaseBadges: any[] = [];
            if (Array.isArray(userData.showcaseBadges)) {
              showcaseBadges = userData.showcaseBadges;
            }
            const jsonBadges = JSON.stringify(showcaseBadges);

            await upsertUserProfile(c.env.AUDIT_DB, uid, displayName, tag, showcaseBadges, xp);
          }
        } catch (syncErr) {
          console.error('[InternalLog] Background profile sync failed:', syncErr);
        }
      })()
    );
  }

  return c.json({ success: true });
});
