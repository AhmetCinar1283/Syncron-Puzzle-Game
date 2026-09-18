import { env, createExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import worker from '../src/index';
import { verifyIdToken } from '../src/services/auth';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

// Mock Auth
vi.mock('../src/services/auth', () => {
  return {
    verifyIdToken: vi.fn(async (token: string) => {
      if (token === 'valid-token-user-1') {
        return { uid: 'user-1' };
      }
      if (token === 'valid-token-user-2') {
        return { uid: 'user-2' };
      }
      throw new Error('Invalid token');
    }),
  };
});

async function signPayload(secret: string, body: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyBytes = encoder.encode(secret);
  const msgBytes = encoder.encode(body);
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuffer = await crypto.subtle.sign('HMAC', key, msgBytes);
  const sigBytes = new Uint8Array(sigBuffer);
  return Array.from(sigBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS store_events (
    id               TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    ls_event_id      TEXT UNIQUE NOT NULL CHECK (length(ls_event_id) BETWEEN 1 AND 128),
    event_name       TEXT NOT NULL CHECK (length(event_name) BETWEEN 1 AND 64),
    uid              TEXT CHECK (uid IS NULL OR length(uid) BETWEEN 1 AND 128),
    ls_order_id      TEXT CHECK (ls_order_id IS NULL OR length(ls_order_id) BETWEEN 1 AND 128),
    ls_customer_id   TEXT CHECK (ls_customer_id IS NULL OR length(ls_customer_id) BETWEEN 1 AND 128),
    ls_variant_id    TEXT CHECK (ls_variant_id IS NULL OR length(ls_variant_id) BETWEEN 1 AND 128),
    product_name     TEXT CHECK (product_name IS NULL OR length(product_name) BETWEEN 1 AND 255),
    amount_cents     INTEGER NOT NULL CHECK (amount_cents > 0),
    currency         TEXT NOT NULL DEFAULT 'USD' CHECK (length(currency) = 3),
    customer_email   TEXT CHECK (customer_email IS NULL OR length(customer_email) BETWEEN 3 AND 255),
    customer_name    TEXT CHECK (customer_name IS NULL OR length(customer_name) BETWEEN 1 AND 255),
    donor_alias      TEXT CHECK (donor_alias IS NULL OR length(donor_alias) BETWEEN 1 AND 100),
    raw_payload      TEXT NOT NULL,
    sig_valid        INTEGER NOT NULL DEFAULT 1 CHECK (sig_valid IN (0, 1)),
    error_info       TEXT,
    coins_earned     INTEGER NOT NULL DEFAULT 0 CHECK (coins_earned >= 0),
    created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`,
  `CREATE TABLE IF NOT EXISTS donor_profiles (
    id                      TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    uid                     TEXT UNIQUE CHECK (uid IS NULL OR length(uid) BETWEEN 1 AND 128),
    display_name            TEXT NOT NULL DEFAULT 'Anonim' CHECK (length(display_name) BETWEEN 1 AND 50),
    total_donated_cents     INTEGER NOT NULL DEFAULT 0 CHECK (total_donated_cents >= 0),
    badge_tier              TEXT CHECK (badge_tier IS NULL OR badge_tier IN ('bronze', 'silver', 'gold')),
    is_anonymous            INTEGER NOT NULL DEFAULT 0 CHECK (is_anonymous IN (0, 1)),
    coins_balance           INTEGER NOT NULL DEFAULT 0 CHECK (coins_balance >= 0),
    currency                TEXT NOT NULL DEFAULT 'USD' CHECK (length(currency) = 3),
    total_donated_usd_cents INTEGER NOT NULL DEFAULT 0 CHECK (total_donated_usd_cents >= 0),
    created_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    updated_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    deleted_at              TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS badges (
    id         TEXT    NOT NULL PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    uid        TEXT    NOT NULL CHECK (length(uid) BETWEEN 1 AND 128),
    badge_type TEXT    NOT NULL CHECK (length(badge_type) BETWEEN 1 AND 64),
    period_id  TEXT    NOT NULL CHECK (length(period_id) BETWEEN 1 AND 20),
    rank       INTEGER NOT NULL CHECK (rank BETWEEN 1 AND 10),
    awarded_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id         TEXT    NOT NULL PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    uid        TEXT    NOT NULL,
    action     TEXT    NOT NULL,
    category   TEXT    NOT NULL,
    metadata   TEXT    NOT NULL DEFAULT '{}',
    created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  )`
];

describe('Donor & Webhook API Endpoints', () => {
  const db = env.AUDIT_DB;
  const webhookSecret = 'test-webhook-secret';

  beforeAll(async () => {
    // Configure webhook secret on env
    env.LS_WEBHOOK_SECRET = webhookSecret;

    for (const stmt of SCHEMA_STATEMENTS) {
      await db.prepare(stmt).run();
    }
  });

  beforeEach(async () => {
    await db.prepare('DELETE FROM store_events').run();
    await db.prepare('DELETE FROM donor_profiles').run();
    await db.prepare('DELETE FROM badges').run();
    await db.prepare('DELETE FROM audit_logs').run();
  });

  describe('POST /webhooks/lemonsqueezy', () => {
    const makePayload = (orderId: string, cents: number, uid: string | null, isAnon = 'false') => JSON.stringify({
      meta: {
        event_name: 'order_created',
        custom_data: {
          uid,
          donor_alias: 'Test Donor',
          is_anonymous: isAnon
        }
      },
      data: {
        id: orderId,
        type: 'orders',
        attributes: {
          total: cents,
          currency: 'USD',
          product_name: 'Donation Product',
          user_email: 'test@example.com',
          user_name: 'Test Customer'
        }
      }
    });

    it('rejects unauthenticated request with 401 and does NOT write to database', async () => {
      const ctx = createExecutionContext();
      const body = makePayload('order-1', 1000, 'user-1');
      const req = new IncomingRequest('http://localhost/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signature': 'invalid-signature'
        },
        body
      });

      const res = await worker.fetch(req, env, ctx);
      expect(res.status).toBe(401);

      // Verify no records in store_events
      const count = await db.prepare('SELECT COUNT(*) as cnt FROM store_events').first<{ cnt: number }>();
      expect(count?.cnt).toBe(0);
    });

    it('gracefully ignores zero-amount order, returns 200, and does NOT write to database', async () => {
      const ctx = createExecutionContext();
      const body = makePayload('order-zero', 0, 'user-1');
      const signature = await signPayload(webhookSecret, body);
      const req = new IncomingRequest('http://localhost/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signature': signature
        },
        body
      });

      const res = await worker.fetch(req, env, ctx);
      expect(res.status).toBe(200);

      const json = await res.json<any>();
      expect(json.success).toBe(true);

      // Verify no records in store_events
      const count = await db.prepare('SELECT COUNT(*) as cnt FROM store_events').first<{ cnt: number }>();
      expect(count?.cnt).toBe(0);
    });

    it('successfully processes valid webhook, awards coins/badges, and stores audit logs', async () => {
      const ctx = createExecutionContext();
      // $10.00 donation = 1000 cents
      const body = makePayload('order-1', 1000, 'user-1');
      const signature = await signPayload(webhookSecret, body);
      const req = new IncomingRequest('http://localhost/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Signature': signature
        },
        body
      });

      const res = await worker.fetch(req, env, ctx);
      expect(res.status).toBe(200);

      // Verify store_events has the event
      const event = await db.prepare('SELECT * FROM store_events WHERE ls_order_id = ?1').bind('order-1').first<any>();
      expect(event).toBeDefined();
      expect(event.amount_cents).toBe(1000);
      expect(event.sig_valid).toBe(1);

      // Verify donor_profiles is populated correctly
      const profile = await db.prepare('SELECT * FROM donor_profiles WHERE uid = ?1').bind('user-1').first<any>();
      expect(profile).toBeDefined();
      expect(profile.total_donated_cents).toBe(1000);
      expect(profile.badge_tier).toBe('bronze'); // >= 500 cents
      expect(profile.coins_balance).toBe(1000);

      // Verify badges awarded (starter + bronze)
      const badges = await db.prepare('SELECT * FROM badges WHERE uid = ?1 ORDER BY badge_type ASC').bind('user-1').all<any>();
      expect(badges.results.length).toBe(2);
      expect(badges.results[0].badge_type).toBe('donor_bronze');
      expect(badges.results[1].badge_type).toBe('donor_starter');
    });

    it('supports multiple sequential donations atomically without race conditions', async () => {
      const ctx = createExecutionContext();
      // First donation: $10.00 (1000 cents)
      const body1 = makePayload('order-1', 1000, 'user-1');
      const signature1 = await signPayload(webhookSecret, body1);
      const req1 = new IncomingRequest('http://localhost/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Signature': signature1 },
        body: body1
      });
      await worker.fetch(req1, env, ctx);

      // Second donation: $15.00 (1500 cents) -> cumulative total should be $25.00 (2500 cents) -> Silver tier
      const body2 = makePayload('order-2', 1500, 'user-1');
      const signature2 = await signPayload(webhookSecret, body2);
      const req2 = new IncomingRequest('http://localhost/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Signature': signature2 },
        body: body2
      });
      await worker.fetch(req2, env, ctx);

      const profile = await db.prepare('SELECT * FROM donor_profiles WHERE uid = ?1').bind('user-1').first<any>();
      expect(profile.total_donated_cents).toBe(2500);
      expect(profile.badge_tier).toBe('silver');
      expect(profile.coins_balance).toBe(2500);
    });
  });

  describe('GET /donors/top', () => {
    beforeEach(async () => {
      // Seed some donor profiles (one anonymous, one public)
      await db.prepare(`
        INSERT INTO donor_profiles (uid, display_name, total_donated_cents, badge_tier, is_anonymous, coins_balance, total_donated_usd_cents)
        VALUES 
          ('user-public', 'John Supporter', 3000, 'silver', 0, 3000, 3000),
          ('user-anon', 'Alice Secret', 5000, 'gold', 1, 5000, 5000)
      `).run();
    });

    it('returns top donors, hiding UIDs and names of anonymous donors', async () => {
      const ctx = createExecutionContext();
      const req = new IncomingRequest('http://localhost/donors/top');
      const res = await worker.fetch(req, env, ctx);
      expect(res.status).toBe(200);

      const json = await res.json<any>();
      expect(json.success).toBe(true);
      expect(json.donors.length).toBe(2);

      // First donor should be the gold anonymous one
      expect(json.donors[0].isAnonymous).toBe(1);
      expect(json.donors[0].displayName).toBe('Anonim');
      expect(json.donors[0].uid).toBeNull(); // UID must be hidden!

      // Second donor should be the public one
      expect(json.donors[1].isAnonymous).toBe(0);
      expect(json.donors[1].displayName).toBe('John Supporter');
      expect(json.donors[1].uid).toBe('user-public');
    });
  });

  describe('GET /donors/:uid', () => {
    beforeEach(async () => {
      await db.prepare(`
        INSERT INTO donor_profiles (uid, display_name, total_donated_cents, badge_tier, is_anonymous, coins_balance, total_donated_usd_cents)
        VALUES 
          ('user-public', 'John Supporter', 3000, 'silver', 0, 3000, 3000),
          ('user-anon', 'Alice Secret', 5000, 'gold', 1, 5000, 5000)
      `).run();
    });

    it('allows public query of non-anonymous profiles without credentials', async () => {
      const ctx = createExecutionContext();
      const req = new IncomingRequest('http://localhost/donors/user-public');
      const res = await worker.fetch(req, env, ctx);
      expect(res.status).toBe(200);

      const json = await res.json<any>();
      expect(json.success).toBe(true);
      expect(json.profile.displayName).toBe('John Supporter');
      expect(json.profile.totalDonatedCents).toBe(3000);
    });

    it('returns full details to the owner of an anonymous profile when authenticated', async () => {
      const ctx = createExecutionContext();
      const req = new IncomingRequest('http://localhost/donors/user-anon', {
        headers: {
          Authorization: 'Bearer valid-token-user-2'
        }
      });
      
      vi.mocked(verifyIdToken).mockResolvedValueOnce({ uid: 'user-anon' });

      const res = await worker.fetch(req, env, ctx);
      expect(res.status).toBe(200);

      const json = await res.json<any>();
      expect(json.success).toBe(true);
      expect(json.profile.displayName).toBe('Alice Secret');
      expect(json.profile.totalDonatedCents).toBe(5000); // Owner can see the data
    });

    it('masks and hides details of anonymous profile when queried by another user', async () => {
      const ctx = createExecutionContext();
      const req = new IncomingRequest('http://localhost/donors/user-anon', {
        headers: {
          Authorization: 'Bearer valid-token-user-1'
        }
      });

      const res = await worker.fetch(req, env, ctx);
      expect(res.status).toBe(200);

      const json = await res.json<any>();
      expect(json.success).toBe(true);
      expect(json.profile.displayName).toBe('Anonim');
      expect(json.profile.totalDonatedCents).toBe(0); // Masked!
      expect(json.profile.coinsBalance).toBe(0); // Masked!
    });
  });
});
