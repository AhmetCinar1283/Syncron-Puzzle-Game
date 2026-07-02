
/**
 * DOSYA AMACI: Bu dosya, Lemon Squeezy ödeme/bağış API entegrasyonu için webhook imzalarını (HMAC-SHA256) doğrular, 
 * ödeme verilerini çözümler ve bağışçı profil güncellemeleri ile rozet atamalarını yönetir.
 */

export interface LsWebhookPayload {
  meta: {
    event_name: string;
    custom_data?: {
      uid?: string;
      donor_alias?: string;
      is_anonymous?: string; // "true" or "false" as custom_data is string-only key-values
    };
  };
  data: {
    id: string;
    type: string;
    attributes: {
      order_number?: number;
      customer_id?: number;
      variant_id?: number;
      product_name?: string;
      total?: number; // amount in cents
      currency?: string;
      user_name?: string;
      user_email?: string;
      status?: string;
      [key: string]: any;
    };
  };
}

/**
 * Verifies the signature of a Lemon Squeezy webhook request using HMAC-SHA256.
 * Lemon Squeezy sends a hex digest signature in the X-Signature header.
 */
// Lemon Squeezy'den gelen webhook isteklerinin HMAC-SHA256 imzasını doğrular.
export async function verifyLsSignature(
  secret: string,
  signatureHex: string,
  body: string
): Promise<boolean> {
  if (!secret || !signatureHex || !body) return false;
  try {
    const encoder = new TextEncoder();
    const keyBytes = encoder.encode(secret);
    const msgBytes = encoder.encode(body);

    // Import the secret as an HMAC key
    const key = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    // Convert signatureHex (64 char hex) into Uint8Array
    const cleanSigHex = signatureHex.trim();
    if (cleanSigHex.length !== 64) return false;
    
    const sigBytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      sigBytes[i] = parseInt(cleanSigHex.substring(i * 2, i * 2 + 2), 16);
    }

    return await crypto.subtle.verify('HMAC', key, sigBytes, msgBytes);
  } catch (err) {
    console.error('[verifyLsSignature] Verification error:', err);
    return false;
  }
}

/**
 * Safely parses the raw Lemon Squeezy JSON payload.
 */
// Gelen webhook JSON verisini güvenli bir şekilde ayrıştırır ve zorunlu alanları doğrular.
export function parseLsPayload(raw: string): LsWebhookPayload {
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Payload must be a JSON object');
  }
  if (!parsed.meta || !parsed.meta.event_name) {
    throw new Error('Missing meta.event_name in payload');
  }
  if (!parsed.data || !parsed.data.id || !parsed.data.type) {
    throw new Error('Missing data details in payload');
  }
  return parsed as LsWebhookPayload;
}

/**
 * Inserts or updates the donor statistics in `donor_profiles`.
 * Returns the cumulative donation total and tier transition information.
 */
// D1 veritabanındaki bağışçı profilini (ve bağış tutarı toplamlarını, jeton bakiyesini vb.) atomik olarak günceller veya ekler.
export async function upsertDonorProfile(
  db: D1Database,
  data: {
    uid: string | null;
    displayName: string;
    amountCents: number;
    currency: string;
    amountUsdCents: number;
    isAnonymous: boolean;
    syncEarned: number;
  }
): Promise<{ newTotal: number; newTotalUsd: number; previousTier: 'bronze' | 'silver' | 'gold' | null; newTier: 'bronze' | 'silver' | 'gold' | null; coinsBalance: number; currency: string }> {
  // If uid is null, it's a one-off unregistered donation. We create a new profile with no uid.
  if (!data.uid) {
    const nameToStore = data.displayName.trim() || 'Anonim';
    const isAnonVal = data.isAnonymous ? 1 : 0;
    
    await db
      .prepare(
        `INSERT INTO donor_profiles (uid, display_name, total_donated_cents, is_anonymous, coins_balance, currency, total_donated_usd_cents)
         VALUES (NULL, ?1, ?2, ?3, ?4, ?5, ?6)`
      )
      .bind(nameToStore, data.amountCents, isAnonVal, data.syncEarned, data.currency, data.amountUsdCents)
      .run();

    return {
      newTotal: data.amountCents,
      newTotalUsd: data.amountUsdCents,
      previousTier: null,
      newTier: null,
      coinsBalance: data.syncEarned,
      currency: data.currency
    };
  }

  // Get the previous badge tier for registered users.
  // Note: Even if a concurrent request runs between this select and the upsert, the upsert below remains fully atomic.
  const existing = await db
    .prepare(`SELECT badge_tier FROM donor_profiles WHERE uid = ?1`)
    .bind(data.uid)
    .first<{ badge_tier: string | null }>();

  const previousTier = (existing?.badge_tier ?? null) as 'bronze' | 'silver' | 'gold' | null;

  // Determine initial tier (in case of a new profile insertion)
  let initialTier: 'bronze' | 'silver' | 'gold' | null = null;
  if (data.amountUsdCents >= 5000) {
    initialTier = 'gold';
  } else if (data.amountUsdCents >= 2000) {
    initialTier = 'silver';
  } else if (data.amountUsdCents >= 500) {
    initialTier = 'bronze';
  }

  const isAnonVal = data.isAnonymous ? 1 : 0;
  const nameToStore = data.isAnonymous ? 'Anonim' : (data.displayName.trim() || 'Destekçi');

  // Atomic SQLite UPSERT with RETURNING clause
  const result = await db
    .prepare(
      `INSERT INTO donor_profiles (uid, display_name, total_donated_cents, badge_tier, is_anonymous, coins_balance, currency, total_donated_usd_cents)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
       ON CONFLICT(uid) DO UPDATE SET
         total_donated_cents = donor_profiles.total_donated_cents + excluded.total_donated_cents,
         total_donated_usd_cents = donor_profiles.total_donated_usd_cents + excluded.total_donated_usd_cents,
         badge_tier = CASE 
           WHEN (donor_profiles.total_donated_usd_cents + excluded.total_donated_usd_cents) >= 5000 THEN 'gold'
           WHEN (donor_profiles.total_donated_usd_cents + excluded.total_donated_usd_cents) >= 2000 THEN 'silver'
           WHEN (donor_profiles.total_donated_usd_cents + excluded.total_donated_usd_cents) >= 500 THEN 'bronze'
           ELSE NULL
         END,
         display_name = excluded.display_name,
         is_anonymous = excluded.is_anonymous,
         coins_balance = donor_profiles.coins_balance + excluded.coins_balance,
         currency = excluded.currency,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       RETURNING total_donated_cents AS totalDonatedCents, total_donated_usd_cents AS totalDonatedUsdCents, badge_tier AS badgeTier, coins_balance AS coinsBalance, currency`
    )
    .bind(data.uid, nameToStore, data.amountCents, initialTier, isAnonVal, data.syncEarned, data.currency, data.amountUsdCents)
    .first<{ totalDonatedCents: number; totalDonatedUsdCents: number; badgeTier: string | null; coinsBalance: number; currency: string }>();

  if (!result) {
    throw new Error('Failed to upsert donor profile');
  }

  return {
    newTotal: result.totalDonatedCents,
    newTotalUsd: result.totalDonatedUsdCents,
    previousTier,
    newTier: result.badgeTier as 'bronze' | 'silver' | 'gold' | null,
    coinsBalance: result.coinsBalance,
    currency: result.currency
  };
}

/**
 * Awards a donation badge to a user in the `badges` table (idempotent).
 */
// Bağışçıya ulaştığı bağış seviyesine göre başarı rozeti (badge) tanımlar.
export async function awardDonorBadge(
  db: D1Database,
  uid: string,
  badgeTier: 'starter' | 'bronze' | 'silver' | 'gold'
): Promise<boolean> {
  const badgeType = `donor_${badgeTier}`;
  const periodId = 'lifetime';
  const rank = 1;

  try {
    await db
      .prepare(
        `INSERT OR IGNORE INTO badges (uid, badge_type, period_id, rank)
         VALUES (?1, ?2, ?3, ?4)`
      )
      .bind(uid, badgeType, periodId, rank)
      .run();
    return true;
  } catch (err) {
    console.error(`[awardDonorBadge] Failed to insert badge ${badgeType} for ${uid}:`, err);
    return false;
  }
}
