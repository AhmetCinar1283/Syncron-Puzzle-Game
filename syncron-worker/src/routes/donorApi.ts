/**
 * DOSYA AMACI: Bu dosya, projeyi destekleyen bağışçıların (donors) profil bilgilerini ve 
 * en çok bağış yapanlar listesini (top donors) gizlilik kurallarına uygun şekilde sunan API uç noktalarını tanımlar.
 */

import { Hono } from 'hono';
import type { AppContext } from '../types';
import { optionalFirebaseAuth } from '../middleware/auth';

export const donorApiRouter = new Hono<AppContext>();

/**
 * GET /donors/top
 * Retrieve top donors sorted by contribution volume (cents).
 * Limits to top 50. Masked by database checks where isAnonymous replaces names with 'Anonim' and hides UID.
 */
// En çok bağış yapan ilk 50 destekçiyi listeler; gizli bağışçıların isimlerini maskeler.
donorApiRouter.get('/donors/top', async (c) => {
  const db = c.env.AUDIT_DB;
  try {
    const { results } = await db
      .prepare(
        `SELECT 
           CASE WHEN is_anonymous = 1 THEN NULL ELSE uid END AS uid,
           CASE WHEN is_anonymous = 1 THEN 'Anonim' ELSE display_name END AS displayName,
           total_donated_cents AS totalDonatedCents,
           currency,
           badge_tier AS badgeTier,
           is_anonymous AS isAnonymous,
           coins_balance AS coinsBalance
         FROM donor_profiles
         ORDER BY total_donated_usd_cents DESC
         LIMIT 50`
      )
      .all<any>();

    return c.json({
      success: true,
      donors: results ?? [],
    });
  } catch (err) {
    console.error('[DonorAPI] Failed to query top donors list:', err);
    return c.json({ success: false, error: 'Database query failure' }, 500);
  }
});

/**
 * GET /donors/:uid
 * Retrieve a specific donor profile.
 * Secured with optionalFirebaseAuth. If the profile is anonymous, only the profile owner can see the full details.
 */
// Belirtilen destekçinin profil detaylarını getirir; gizlilik koruması içerir.
donorApiRouter.get('/donors/:uid', optionalFirebaseAuth, async (c) => {
  const uid = c.req.param('uid');
  if (!uid || uid.length > 128) {
    return c.json({ success: false, error: 'Invalid UID parameter' }, 400);
  }

  const db = c.env.AUDIT_DB;
  const loggedInUid = c.get('uid');

  try {
    const profile = await db
      .prepare(
        `SELECT uid, display_name AS displayName, total_donated_cents AS totalDonatedCents, currency, badge_tier AS badgeTier, is_anonymous AS isAnonymous, coins_balance AS coinsBalance
         FROM donor_profiles
         WHERE uid = ?1`
      )
      .bind(uid)
      .first<any>();

    if (!profile) {
      return c.json({
        success: true,
        profile: {
          uid,
          displayName: 'Destekçi',
          totalDonatedCents: 0,
          currency: 'USD',
          badgeTier: null,
          isAnonymous: false,
          coinsBalance: 0,
        },
      });
    }

    // Privacy Guard: If the profile is anonymous, only return the details if the requester is the owner (loggedInUid === uid)
    if (profile.isAnonymous === 1 && loggedInUid !== uid) {
      return c.json({
        success: true,
        profile: {
          uid,
          displayName: 'Anonim',
          totalDonatedCents: 0,
          currency: 'USD',
          badgeTier: null,
          isAnonymous: true,
          coinsBalance: 0,
        },
      });
    }

    return c.json({
      success: true,
      profile,
    });
  } catch (err) {
    console.error(`[DonorAPI] Failed to fetch donor profile for UID ${uid}:`, err);
    return c.json({ success: false, error: 'Database retrieval failure' }, 500);
  }
});
