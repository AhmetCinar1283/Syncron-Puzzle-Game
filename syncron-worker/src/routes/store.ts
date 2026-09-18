/**
 * DOSYA AMACI: Bu dosya, Lemon Squeezy ödeme/bağış platformundan gelen webhook bildirimlerini 
 * işleyerek bağışçı profillerini güncelleyen ve rozet kazandırıp log tutan API ucunu tanımlar.
 */

import { Hono } from 'hono';
import type { AppContext } from '../types';
import {
  verifyLsSignature,
  parseLsPayload,
  upsertDonorProfile,
  awardDonorBadge,
} from '../services/lemonSqueezy';
import { writeAuditLog } from '../services/auditLog';
import { trackSecurityEvent } from '../middleware/securityTrail';

export const storeRouter = new Hono<AppContext>();

/**
 * POST /webhooks/lemonsqueezy
 * Entry endpoint for Lemon Squeezy webhook integration.
 * Verified with HMAC-SHA256 signature checking.
 */
// Lemon Squeezy webhook isteklerinin imzasını doğrular, sipariş verilerini çözümler, bağışçı profillerini ve rozetlerini günceller.
storeRouter.post('/webhooks/lemonsqueezy', async (c) => {
  const signature = c.req.header('X-Signature') || '';
  const rawBody = await c.req.text();

  // 1. Verify HMAC signature using LS_WEBHOOK_SECRET immediately to prevent DoS/Poisoning
  const isSignatureValid = await verifyLsSignature(c.env.LS_WEBHOOK_SECRET, signature, rawBody);
  if (!isSignatureValid) {
    console.warn('[LSWebhook] Webhook signature verification failed.');
    // 05 §3.2 — sahte ödeme webhook'u: kimlik yoktur (uid = null), tek iz kaynaktır.
    trackSecurityEvent(c, 'webhook.invalid_signature', {
      provider: 'lemonsqueezy',
      signaturePresent: signature !== '',
      bodyBytes: rawBody.length,
    }, null);
    return c.json({ success: false, error: 'Invalid signature' }, 401);
  }

  let parsedPayload: any = null;

  // 2. Parse payload
  let eventName = 'unknown';
  let orderId: string | null = null;
  let customerId: string | null = null;
  let variantId: string | null = null;
  let productName: string | null = null;
  let amountCents = 0;
  let amountUsdCents = 0;
  let currency = 'USD';
  let email: string | null = null;
  let customerName: string | null = null;
  let uid: string | null = null;
  let donorAlias: string | null = null;
  let isAnonymous = false;

  try {
    parsedPayload = parseLsPayload(rawBody);
    eventName = parsedPayload.meta.event_name;
  } catch (err: any) {
    console.error('[LSWebhook] Failed to parse Lemon Squeezy payload:', err);
    return c.json({ success: false, error: 'Malformed payload' }, 400);
  }

  if (parsedPayload) {
    const dataObj = parsedPayload.data;
    const attributes = dataObj.attributes;

    orderId = String(dataObj.id);
    customerId = attributes?.customer_id ? String(attributes.customer_id) : null;
    variantId = attributes?.variant_id ? String(attributes.variant_id) : null;
    productName = attributes?.product_name || null;
    amountCents = attributes?.total || 0;
    amountUsdCents = attributes?.total_usd || amountCents;
    currency = attributes?.currency || 'USD';
    email = attributes?.user_email || null;
    customerName = attributes?.user_name || null;

    // Extract custom parameters sent via custom query parameters
    const customData = parsedPayload.meta?.custom_data;
    uid = customData?.uid || null;
    donorAlias = customData?.donor_alias || null;
    isAnonymous = customData?.is_anonymous === 'true';

    // Fallback if no alias is specified
    if (!donorAlias) {
      donorAlias = customerName || 'Destekçi';
    }
  }

  // If order amount is zero or negative (e.g. coupon, free trial, or test),
  // we do not process it or write it to D1 to avoid check constraint failures.
  if (amountCents <= 0) {
    console.log(`[LSWebhook] Ignoring zero-amount event for order ${orderId}`);
    return c.json({ success: true, message: 'Zero amount order ignored' });
  }

  // Idempotency key construction: event_name + resource_id (e.g. order_created-12345)
  const dbLsEventId = `${eventName}-${parsedPayload.data.id}`;

  const db = c.env.AUDIT_DB;
  const coinsEarned = amountUsdCents; // 1 cent USD equivalent = 1 SYNC

  // 3. Write event to store_events (signature is guaranteed to be valid here)
  try {
    await db
      .prepare(
        `INSERT OR IGNORE INTO store_events (
          ls_event_id, event_name, uid, ls_order_id, ls_customer_id, ls_variant_id,
          product_name, amount_cents, currency, customer_email, customer_name,
          donor_alias, raw_payload, sig_valid, error_info, coins_earned
        ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, 1, NULL, ?14)`
      )
      .bind(
        dbLsEventId,
        eventName,
        uid,
        orderId,
        customerId,
        variantId,
        productName,
        amountCents,
        currency,
        email,
        customerName,
        donorAlias,
        rawBody,
        coinsEarned
      )
      .run();
  } catch (dbErr) {
    console.error('[LSWebhook] Database write to store_events failed:', dbErr);
    return c.json({ success: false, error: 'Database write error' }, 500);
  }

  // 4. Handle order creation
  if (eventName === 'order_created' && amountCents > 0) {
    try {
      console.log(`[LSWebhook] Processing order_created for Order ID: ${orderId}, UID: ${uid}`);

      // Upsert donor profile and recalculate totals/tiers
      const { newTotal, previousTier, newTier, coinsBalance } = await upsertDonorProfile(db, {
        uid,
        displayName: donorAlias || 'Destekçi',
        amountCents,
        currency,
        amountUsdCents,
        isAnonymous,
        syncEarned: coinsEarned,
      });

      // If registered user, award badges based on the new tier reached and the starter badge
      if (uid) {
        // Award the basic coffee badge for any donation
        await awardDonorBadge(db, uid, 'starter');

        if (newTier) {
          await awardDonorBadge(db, uid, newTier);

          // Retroactively award lower tiers if needed
          if (newTier === 'gold') {
            await awardDonorBadge(db, uid, 'silver');
            await awardDonorBadge(db, uid, 'bronze');
          } else if (newTier === 'silver') {
            await awardDonorBadge(db, uid, 'bronze');
          }

          // Write audit log for badge promotion
          if (previousTier !== newTier) {
            c.executionCtx.waitUntil(
              writeAuditLog(db, uid, 'donation.badge_awarded', 'payment', {
                previousTier,
                newTier,
                totalCents: newTotal,
              }).catch((err) => console.error('[AuditLog] Donation badge log failed:', err))
            );
          }
        }
      }

      // Log successful donation
      if (uid) {
        c.executionCtx.waitUntil(
          writeAuditLog(db, uid, 'donation.received', 'payment', {
            orderId,
            amountCents,
            currency,
            amountUsdCents,
            productName,
            isAnonymous,
            coinsEarned,
            coinsBalance,
          }).catch((err) => console.error('[AuditLog] Donation log failed:', err))
        );
      }
    } catch (procErr) {
      console.error('[LSWebhook] Error processing order_created webhook:', procErr);
      return c.json({ success: false, error: 'Processing error' }, 500);
    }
  }

  return c.json({ success: true });
});
