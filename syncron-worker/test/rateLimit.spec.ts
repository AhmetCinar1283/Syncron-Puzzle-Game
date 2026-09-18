/**
 * DOSYA AMACI: Hız limiti karar noktalarının testleri — saf pencere matematiği,
 * kademe tablosunun tutarlılığı ve "kimlik + kova + maliyet" sözleşmesi.
 * bkz. .plans/yayin-hazirlik/03-rate-limit-ve-kotuye-kullanim.md §5
 */

import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { Hono } from 'hono';
import { describe, it, expect, beforeEach } from 'vitest';
import { rateLimit } from '../src/middleware/rateLimiter';
import type { AppContext } from '../src/types';
import {
  stepWindow,
  evaluateRateLimit,
  createMemoryRateLimitStore,
  resolveEndpointLimit,
  ENDPOINT_RATE_LIMITS,
  RATE_LIMIT_TIERS,
  type RateLimitStore,
} from '../src/services/rateLimit';

const T0 = 1_700_000_000_000;

// ─── Saf pencere ────────────────────────────────────────────────────────────

describe('stepWindow', () => {
  it('önceki durum yoksa taze pencere açar ve izin verir', () => {
    const r = stepWindow({ previous: undefined, now: T0, windowMs: 60_000, limit: 3, cost: 1 });
    expect(r.allowed).toBe(true);
    expect(r.state).toEqual({ count: 1, windowStart: T0 });
  });

  it('limit dolunca reddeder ve sayaç ARTMAZ (ceza yok)', () => {
    const prev = { count: 3, windowStart: T0 };
    const r = stepWindow({ previous: prev, now: T0 + 1_000, windowMs: 60_000, limit: 3, cost: 1 });
    expect(r.allowed).toBe(false);
    expect(r.state).toBe(prev);
  });

  it('reddedince kalan süreyi ms olarak verir', () => {
    const r = stepWindow({ previous: { count: 3, windowStart: T0 }, now: T0 + 15_000, windowMs: 60_000, limit: 3, cost: 1 });
    expect(r.retryAfterMs).toBe(45_000);
  });

  it('pencere dolduğunda sayaç sıfırlanır', () => {
    const r = stepWindow({ previous: { count: 99, windowStart: T0 }, now: T0 + 60_000, windowMs: 60_000, limit: 3, cost: 1 });
    expect(r.allowed).toBe(true);
    expect(r.state).toEqual({ count: 1, windowStart: T0 + 60_000 });
  });

  it('maliyet 1den büyük olabilir ve bütçeyi o kadar yer', () => {
    const r = stepWindow({ previous: { count: 1, windowStart: T0 }, now: T0, windowMs: 60_000, limit: 10, cost: 4 });
    expect(r.state.count).toBe(5);
  });

  it('kalan bütçeden pahalı bir istek reddedilir', () => {
    const r = stepWindow({ previous: { count: 8, windowStart: T0 }, now: T0, windowMs: 60_000, limit: 10, cost: 4 });
    expect(r.allowed).toBe(false);
  });

  it('bozuk maliyet (NaN) 1 kabul edilir', () => {
    const r = stepWindow({ previous: undefined, now: T0, windowMs: 60_000, limit: 3, cost: Number.NaN });
    expect(r.state.count).toBe(1);
  });

  it('bozuk kademe tanımı (limit 0) FAIL-OPEN davranır', () => {
    const r = stepWindow({ previous: { count: 999, windowStart: T0 }, now: T0, windowMs: 0, limit: 0, cost: 1 });
    expect(r.allowed).toBe(true);
  });
});

// ─── Kademe tablosu ─────────────────────────────────────────────────────────

describe('policy tablosu', () => {
  it('tablodaki her uç noktanın kademesi tanımlıdır ve kuralı vardır', () => {
    for (const [id, entry] of Object.entries(ENDPOINT_RATE_LIMITS)) {
      const rules = RATE_LIMIT_TIERS[entry.tier];
      expect(rules, `${id} kademesi yok`).toBeDefined();
      expect(rules.length, `${id} kuralsız`).toBeGreaterThan(0);
      expect(entry.cost).toBeGreaterThanOrEqual(1);
    }
  });

  it('görev dosyasındaki her uç nokta tabloda var (02 devri dahil)', () => {
    for (const id of [
      'complete-level', 'daily-complete',
      'rewards-prepare', 'rewards-claim', 'rewards-cancel', 'friends-request', 'badges-showcase',
      'game-telemetry', 'game-feedback', 'played-levels-sync',
      'create-ticket', 'internal-log',
      'admin-recovery-recompute', 'admin-level-delete', 'admin-level-restore',
    ]) {
      expect(resolveEndpointLimit(id), `${id} tabloda yok`).toBeDefined();
    }
  });

  it('bilinmeyen uç nokta undefined döner (uydurulmuş kademe yok)', () => {
    expect(resolveEndpointLimit('bilinmeyen-uc-nokta')).toBeUndefined();
  });

  it('mevcut kademeler değiştirilmedi: /internal/log 100 global + 20 uid, /create-ticket 2/dk', () => {
    expect(RATE_LIMIT_TIERS.internalLog).toEqual([
      { scope: 'global', limit: 100, windowMs: 60_000 },
      { scope: 'uid', limit: 20, windowMs: 60_000 },
    ]);
    expect(RATE_LIMIT_TIERS.support).toEqual([{ scope: 'uid', limit: 2, windowMs: 60_000 }]);
  });

  it('sıkı kademe, ölçülen en hızlı oyuncunun (9/dk) belirgin biçimde üstündedir', () => {
    const perMinute = RATE_LIMIT_TIERS.strict.find((r) => r.windowMs === 60_000);
    expect(perMinute?.limit ?? 0).toBeGreaterThanOrEqual(27); // 9/dk × 3
  });
});

// ─── Sözleşme: kimlik + kova + maliyet ──────────────────────────────────────

describe('evaluateRateLimit', () => {
  const run = (store: RateLimitStore, identity: string | null, now: number, endpoint = 'create-ticket') =>
    evaluateRateLimit(store, { endpoint, identity, now });

  it('normal oyun akışı takılmaz: sıkı kademede 30 ardışık tamamlama geçer', async () => {
    const store = createMemoryRateLimitStore();
    for (let i = 0; i < 30; i++) {
      const out = await evaluateRateLimit(store, { endpoint: 'complete-level', identity: 'u1', now: T0 + i * 1_500 });
      expect(out.allowed, `${i}. istek reddedildi`).toBe(true);
    }
  });

  it('31. istek aynı dakikada reddedilir ve Retry-After saniyesi verilir', async () => {
    const store = createMemoryRateLimitStore();
    for (let i = 0; i < 30; i++) {
      await evaluateRateLimit(store, { endpoint: 'complete-level', identity: 'u1', now: T0 });
    }
    const out = await evaluateRateLimit(store, { endpoint: 'complete-level', identity: 'u1', now: T0 + 10_000 });
    expect(out.allowed).toBe(false);
    expect(out.retryAfterSeconds).toBe(50);
    expect(out.exceededScope).toBe('uid');
  });

  it('Retry-After hiçbir zaman 0 olmaz (anında yeniden deneme daveti yok)', async () => {
    const store = createMemoryRateLimitStore();
    await run(store, 'u1', T0);
    await run(store, 'u1', T0);
    const out = await run(store, 'u1', T0 + 59_999);
    expect(out.allowed).toBe(false);
    expect(out.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });

  it('kovalar kimliğe göre ayrışır: bir oyuncunun aşımı diğerini etkilemez', async () => {
    const store = createMemoryRateLimitStore();
    await run(store, 'u1', T0);
    await run(store, 'u1', T0);
    expect((await run(store, 'u1', T0)).allowed).toBe(false);
    expect((await run(store, 'u2', T0)).allowed).toBe(true);
  });

  it('kovalar uç noktaya göre ayrışır: telemetri aşımı tamamlamayı kilitlemez', async () => {
    const store = createMemoryRateLimitStore();
    for (let i = 0; i < 125; i++) {
      await evaluateRateLimit(store, { endpoint: 'game-telemetry', identity: 'u1', now: T0 });
    }
    expect((await evaluateRateLimit(store, { endpoint: 'game-telemetry', identity: 'u1', now: T0 })).allowed).toBe(false);
    expect((await evaluateRateLimit(store, { endpoint: 'complete-level', identity: 'u1', now: T0 })).allowed).toBe(true);
  });

  it('pencere geçince yeniden izin verilir', async () => {
    const store = createMemoryRateLimitStore();
    await run(store, 'u1', T0);
    await run(store, 'u1', T0);
    expect((await run(store, 'u1', T0)).allowed).toBe(false);
    expect((await run(store, 'u1', T0 + 60_000)).allowed).toBe(true);
  });

  it('kimlik yoksa uid kuralları atlanır, global kural yine işler', async () => {
    const store = createMemoryRateLimitStore();
    // internal-log: 100 global + 20 uid. Kimliksiz 100 istek geçer, 101. patlar.
    for (let i = 0; i < 100; i++) {
      expect((await run(store, null, T0, 'internal-log')).allowed).toBe(true);
    }
    const out = await run(store, null, T0, 'internal-log');
    expect(out.allowed).toBe(false);
    expect(out.exceededScope).toBe('global');
  });

  it('tabloda olmayan uç nokta FAIL-OPEN (limitsiz) geçer', async () => {
    const store = createMemoryRateLimitStore();
    const out = await run(store, 'u1', T0, 'tabloda-yok');
    expect(out.allowed).toBe(true);
    expect(out.retryAfterSeconds).toBe(0);
  });

  it('maliyet çağrı yerinden geçersiz kılınabilir', async () => {
    const store = createMemoryRateLimitStore();
    const first = await evaluateRateLimit(store, { endpoint: 'create-ticket', identity: 'u1', now: T0, cost: 2 });
    expect(first.allowed).toBe(true);
    const second = await evaluateRateLimit(store, { endpoint: 'create-ticket', identity: 'u1', now: T0, cost: 1 });
    expect(second.allowed).toBe(false);
  });

  it('saatlik kural dakikalık kuralın üstünde ikinci bir tavan koyar', async () => {
    const store = createMemoryRateLimitStore();
    let allowed = 0;
    // 40 dakika boyunca her dakika 20 istek → 800 istek, saatlik tavan 600.
    for (let m = 0; m < 40; m++) {
      for (let i = 0; i < 20; i++) {
        const out = await evaluateRateLimit(store, { endpoint: 'complete-level', identity: 'u1', now: T0 + m * 60_000 });
        if (out.allowed) allowed++;
      }
    }
    expect(allowed).toBe(600);
  });
});

// ─── Middleware: HTTP davranışı (§3.4) ──────────────────────────────────────

describe('rateLimit middleware', () => {
  // Aşım kaydı audit_logs'a yazılır; tablo her testte hazır olmalı.
  beforeEach(async () => {
    await env.AUDIT_DB.prepare(
      `CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT NOT NULL PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), uid TEXT NOT NULL, action TEXT NOT NULL,
        category TEXT NOT NULL, metadata TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')))`,
    ).run();
    await env.AUDIT_DB.prepare('DELETE FROM audit_logs').run();
  });

  const buildApp = () => {
    const app = new Hono<AppContext>();
    app.post('/t', (c, next) => { c.set('uid', 'mw-user'); return next(); }, rateLimit('create-ticket'), (c) =>
      c.json({ success: true }),
    );
    return app;
  };

  const call = async (app: Hono<AppContext>) => {
    const ctx = createExecutionContext();
    const res = await app.fetch(new Request('http://x/t', { method: 'POST' }), env, ctx);
    await waitOnExecutionContext(ctx);
    return res;
  };

  it('limit içindeyken isteği geçirir, aşınca 429 + Retry-After döner', async () => {
    const app = buildApp();
    expect((await call(app)).status).toBe(200);
    expect((await call(app)).status).toBe(200);

    const blocked = await call(app);
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get('Retry-After'))).toBeGreaterThan(0);

    const body = await blocked.json<{ success: boolean; error: string }>();
    expect(body).toEqual({ success: false, error: 'RATE_LIMIT_EXCEEDED' });
  });

  it('429 gövdesi iç eşikleri SIZDIRMAZ', async () => {
    const app = buildApp();
    await call(app);
    await call(app);
    const raw = await (await call(app)).text();
    expect(raw).not.toMatch(/limit["\s]*:\s*\d/i);
    expect(raw).not.toContain('windowMs');
    expect(raw).not.toContain('remaining');
    expect(raw).not.toContain('60000');
  });

  it('aşım audit_logs tablosuna security kaydı yazar', async () => {
    const app = buildApp();
    await call(app);
    await call(app);
    await call(app);

    const rows = await env.AUDIT_DB.prepare(
      "SELECT action, category FROM audit_logs WHERE category = 'security'",
    ).all<{ action: string; category: string }>();
    expect(rows.results?.[0]?.action).toBe('security.rate_limit_exceeded');
  });
});
