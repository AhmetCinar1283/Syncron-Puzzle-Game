/**
 * DOSYA AMACI: Adli iz katmanının testleri — parmak izinin nereden okunduğu,
 * IP'nin ham DEĞİL tuzlu karma saklandığı, sekiz olay tipinin yazıldığı,
 * kişisel verinin `audit_logs`'a SIZMADIĞI ve 30 günlük temizlik.
 * bkz. .plans/yayin-hazirlik/05-loglama-ve-adli-iz.md §3.1, §3.2, §3.5
 */

import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import {
  SECURITY_EVENTS,
  SECURITY_EVENT_TYPES,
  collectsFingerprint,
  isSecurityEventType,
  hashIp,
  readClientIp,
  readUserAgent,
  buildFingerprint,
  recordSecurityEvent,
  querySecurityEventsByUid,
  deleteSecurityEventsOlderThan,
  IP_HASH_HEX_LENGTH,
  USER_AGENT_MAX_LENGTH,
  type SecurityEventType,
} from '../src/services/securityEvents';
import { writeAuditLog } from '../src/services/auditLog';
import {
  runSecurityEventRetention,
  SECURITY_EVENT_RETENTION_DAYS,
} from '../src/scheduled/securityEventRetention';
import worker from '../src/index';
import type { Env } from '../src/types';

const SECURITY_EVENTS_SCHEMA = `CREATE TABLE IF NOT EXISTS security_events (
  id TEXT NOT NULL PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  uid TEXT, event_type TEXT NOT NULL, endpoint TEXT NOT NULL,
  ip TEXT, user_agent TEXT, metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
)`;

const AUDIT_LOGS_SCHEMA = `CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT NOT NULL PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), uid TEXT NOT NULL, action TEXT NOT NULL,
  category TEXT NOT NULL, metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
)`;

const db = () => env.AUDIT_DB;
const SALT = 'test-salt-not-a-real-secret';
const RAW_IP = '203.0.113.42';

/** Worker'ın gördüğü başlıkları taklit eder. */
function headers(init: Record<string, string>): Headers {
  return new Headers(init);
}

function deps(headerInit: Record<string, string> = {}) {
  return { db: db(), headers: headers(headerInit), ipSalt: SALT };
}

/** Tuz sırrı tanımlanmamış üretim senaryosu. */
function depsWithoutSalt(headerInit: Record<string, string> = {}) {
  return { db: db(), headers: headers(headerInit), ipSalt: undefined };
}

async function allEvents() {
  const res = await db()
    .prepare('SELECT uid, event_type, endpoint, ip, user_agent, metadata, created_at FROM security_events ORDER BY rowid')
    .all<{ uid: string | null; event_type: string; endpoint: string; ip: string | null; user_agent: string | null; metadata: string; created_at: string }>();
  return res.results ?? [];
}

beforeAll(async () => {
  await db().prepare(SECURITY_EVENTS_SCHEMA).run();
  await db().prepare(AUDIT_LOGS_SCHEMA).run();
});

beforeEach(async () => {
  await db().prepare('DELETE FROM security_events').run();
  await db().prepare('DELETE FROM audit_logs').run();
});

// ─── Katalog (veri bütünlüğü) ────────────────────────────────────────────────

describe('güvenlik olay katalogu', () => {
  it('görev dosyasındaki sekiz olay tipinin tamamı tanımlı', () => {
    const expected: SecurityEventType[] = [
      'auth.failed',
      'auth.forbidden',
      'solution.invalid',
      'ban.blocked',
      'ratelimit.exceeded',
      'reconcile.rejected',
      'webhook.invalid_signature',
      'admin.destructive',
    ];
    expect(SECURITY_EVENT_TYPES.sort()).toEqual(expected.sort());
  });

  it('her olayın hassasiyet düzeyi, ciddiyeti ve amacı yazılı', () => {
    for (const type of SECURITY_EVENT_TYPES) {
      const def = SECURITY_EVENTS[type];
      expect(['fingerprint', 'identity-only']).toContain(def.sensitivity);
      expect(['info', 'warn', 'critical']).toContain(def.severity);
      expect(def.purpose.length).toBeGreaterThan(10);
    }
  });

  it("`admin.destructive` parmak izi TOPLAMAZ (çağıran zaten kimlikli)", () => {
    expect(collectsFingerprint('admin.destructive')).toBe(false);
  });

  it('katalogda olmayan tip reddedilir', () => {
    expect(isSecurityEventType('auth.failed')).toBe(true);
    expect(isSecurityEventType('auth.faild')).toBe(false);
    expect(isSecurityEventType('')).toBe(false);
  });
});

// ─── Parmak izi (saf) ────────────────────────────────────────────────────────

describe('istek parmak izi', () => {
  it('IP yalnızca CF-Connecting-IP başlığından okunur', () => {
    expect(readClientIp(headers({ 'CF-Connecting-IP': RAW_IP }))).toBe(RAW_IP);
  });

  it('X-Forwarded-For KULLANILMAZ (istemci uydurabilir)', () => {
    expect(readClientIp(headers({ 'X-Forwarded-For': '1.2.3.4' }))).toBeNull();
    expect(readClientIp(headers({ 'X-Forwarded-For': '1.2.3.4', 'CF-Connecting-IP': RAW_IP }))).toBe(RAW_IP);
  });

  it('User-Agent 256 karaktere kısaltılır', () => {
    const long = 'A'.repeat(1000);
    expect(readUserAgent(headers({ 'User-Agent': long }))).toHaveLength(USER_AGENT_MAX_LENGTH);
    expect(readUserAgent(headers({}))).toBeNull();
  });

  it('karma HAM IP değildir, sabit uzunluktadır ve tekrarlanabilir', async () => {
    const a = await hashIp(RAW_IP, SALT);
    const b = await hashIp(RAW_IP, SALT);
    expect(a).not.toBeNull();
    expect(a).toBe(b);
    expect(a).toHaveLength(IP_HASH_HEX_LENGTH);
    expect(a).not.toContain(RAW_IP);
    expect(a).not.toContain('203');
  });

  it('farklı IP farklı karma üretir (ilişkilendirme çalışır)', async () => {
    expect(await hashIp(RAW_IP, SALT)).not.toBe(await hashIp('198.51.100.7', SALT));
  });

  it('tuz değişirse karma değişir (tuz gerçekten karışıyor)', async () => {
    expect(await hashIp(RAW_IP, SALT)).not.toBe(await hashIp(RAW_IP, 'other-salt'));
  });

  it('TUZ YOKSA ham IP\'ye düşülmez, null döner', async () => {
    expect(await hashIp(RAW_IP, undefined)).toBeNull();
    expect(await hashIp(RAW_IP, '')).toBeNull();
    expect(await hashIp(RAW_IP, '   ')).toBeNull();
  });

  it('IP yoksa karma null olur ama UA yine toplanır', async () => {
    const fp = await buildFingerprint(headers({ 'User-Agent': 'UA/1.0' }), SALT);
    expect(fp.ip).toBeNull();
    expect(fp.userAgent).toBe('UA/1.0');
  });
});

// ─── Yazma ───────────────────────────────────────────────────────────────────

describe('recordSecurityEvent', () => {
  it('parmak izli olayda karma IP ve UA yazılır, ham IP yazılmaz', async () => {
    await recordSecurityEvent(deps({ 'CF-Connecting-IP': RAW_IP, 'User-Agent': 'UA/1.0' }), {
      type: 'auth.failed',
      endpoint: '/complete-level',
      uid: null,
      metadata: { reason: 'expired' },
    });

    const rows = await allEvents();
    expect(rows).toHaveLength(1);
    expect(rows[0].event_type).toBe('auth.failed');
    expect(rows[0].endpoint).toBe('/complete-level');
    expect(rows[0].uid).toBeNull();
    expect(rows[0].ip).toBe(await hashIp(RAW_IP, SALT));
    expect(rows[0].ip).not.toBe(RAW_IP);
    expect(rows[0].user_agent).toBe('UA/1.0');
    expect(JSON.parse(rows[0].metadata)).toEqual({ reason: 'expired' });
  });

  it("`identity-only` olayda IP/UA HİÇ yazılmaz (başlıklar dolu olsa bile)", async () => {
    await recordSecurityEvent(deps({ 'CF-Connecting-IP': RAW_IP, 'User-Agent': 'UA/1.0' }), {
      type: 'admin.destructive',
      endpoint: '/admin/levels/L1',
      uid: 'admin-1',
      metadata: { operation: 'level.delete' },
    });

    const rows = await allEvents();
    expect(rows[0].ip).toBeNull();
    expect(rows[0].user_agent).toBeNull();
    expect(rows[0].uid).toBe('admin-1');
  });

  it('sekiz olay tipinin tamamı yazılabiliyor', async () => {
    for (const type of SECURITY_EVENT_TYPES) {
      await recordSecurityEvent(deps({ 'CF-Connecting-IP': RAW_IP }), {
        type,
        endpoint: `/x/${type}`,
        uid: 'u1',
      });
    }
    const rows = await allEvents();
    expect(rows.map((r) => r.event_type).sort()).toEqual([...SECURITY_EVENT_TYPES].sort());
  });

  it('tuz yokken olay YİNE yazılır, yalnızca IP alanı boş kalır', async () => {
    await recordSecurityEvent(depsWithoutSalt({ 'CF-Connecting-IP': RAW_IP, 'User-Agent': 'UA/1.0' }), {
      type: 'ratelimit.exceeded',
      endpoint: '/complete-level',
      uid: 'u1',
    });
    const rows = await allEvents();
    expect(rows).toHaveLength(1);
    expect(rows[0].ip).toBeNull();
    expect(rows[0].user_agent).toBe('UA/1.0');
  });

  it('metadata verilmezse boş nesne yazılır (null patlatmaz)', async () => {
    await recordSecurityEvent(deps(), { type: 'ban.blocked', endpoint: '/daily/complete' });
    const rows = await allEvents();
    expect(rows[0].uid).toBeNull();
    expect(JSON.parse(rows[0].metadata)).toEqual({});
  });
});

// ─── Kişisel veri sınırı (§3.1 "kritik") ─────────────────────────────────────

describe('kişisel veri `audit_logs` tablosuna SIZMAZ', () => {
  it('audit_logs şemasında ip/user_agent kolonu yok', async () => {
    const res = await db().prepare('PRAGMA table_info(audit_logs)').all<{ name: string }>();
    const columns = (res.results ?? []).map((r) => r.name);
    expect(columns).not.toContain('ip');
    expect(columns).not.toContain('user_agent');
  });

  it('sıradan oyun eylemi (level.complete) hiçbir parmak izi taşımaz', async () => {
    await writeAuditLog(db(), 'u1', 'level.complete', 'game', { levelId: 'L1', stars: 3 });
    const res = await db().prepare('SELECT metadata FROM audit_logs').all<{ metadata: string }>();
    const blob = JSON.stringify(res.results ?? []);
    expect(blob).not.toContain(RAW_IP);
    expect(blob).not.toContain(await hashIp(RAW_IP, SALT));
    expect(blob.toLowerCase()).not.toContain('user_agent');
  });

  it('güvenlik olayı yazıldığında audit_logs tablosuna hiçbir satır eklenmez', async () => {
    await recordSecurityEvent(deps({ 'CF-Connecting-IP': RAW_IP, 'User-Agent': 'UA/1.0' }), {
      type: 'solution.invalid',
      endpoint: '/complete-level',
      uid: 'u1',
    });
    const count = await db().prepare('SELECT COUNT(*) AS n FROM audit_logs').first<{ n: number }>();
    expect(count?.n).toBe(0);
  });
});

// ─── Okuma ───────────────────────────────────────────────────────────────────

describe('querySecurityEventsByUid', () => {
  it('yalnızca istenen kullanıcının olaylarını, en yeniden eskiye döner', async () => {
    await db()
      .prepare("INSERT INTO security_events (uid, event_type, endpoint, created_at) VALUES ('u1','auth.failed','/a','2026-01-01T00:00:00.000Z')")
      .run();
    await db()
      .prepare("INSERT INTO security_events (uid, event_type, endpoint, created_at) VALUES ('u1','ban.blocked','/b','2026-02-01T00:00:00.000Z')")
      .run();
    await db()
      .prepare("INSERT INTO security_events (uid, event_type, endpoint, created_at) VALUES ('u2','auth.failed','/c','2026-03-01T00:00:00.000Z')")
      .run();

    const rows = await querySecurityEventsByUid(db(), 'u1');
    expect(rows.map((r) => r.eventType)).toEqual(['ban.blocked', 'auth.failed']);
    expect(rows.every((r) => r.uid === 'u1')).toBe(true);
  });

  it('limit ve offset uygulanır', async () => {
    for (let i = 0; i < 5; i++) {
      await recordSecurityEvent(deps(), { type: 'auth.failed', endpoint: `/p${i}`, uid: 'u1' });
    }
    expect(await querySecurityEventsByUid(db(), 'u1', 2, 0)).toHaveLength(2);
    expect(await querySecurityEventsByUid(db(), 'u1', 2, 4)).toHaveLength(1);
  });
});

// ─── Saklama süresi ──────────────────────────────────────────────────────────

describe('30 günlük temizlik', () => {
  const NOW = new Date('2026-06-01T00:00:00.000Z');
  const daysAgo = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

  async function seed() {
    for (const [label, iso] of [
      ['fresh', daysAgo(1)],
      ['edge-in', daysAgo(29)],
      ['old', daysAgo(31)],
      ['ancient', daysAgo(400)],
    ] as const) {
      await db()
        .prepare('INSERT INTO security_events (uid, event_type, endpoint, created_at) VALUES (?1, ?2, ?3, ?4)')
        .bind('u1', 'auth.failed', `/${label}`, iso)
        .run();
    }
  }

  it('beyan edilen saklama süresi 30 gündür', () => {
    expect(SECURITY_EVENT_RETENTION_DAYS).toBe(30);
  });

  it('30 günden eskiyi siler, yenisine dokunmaz', async () => {
    await seed();
    const deleted = await runSecurityEventRetention(env as unknown as Env, NOW);
    expect(deleted).toBe(2);

    const rows = await allEvents();
    expect(rows.map((r) => r.endpoint).sort()).toEqual(['/edge-in', '/fresh']);
  });

  it('silinecek satır yoksa sessizce biter', async () => {
    await db()
      .prepare('INSERT INTO security_events (uid, event_type, endpoint, created_at) VALUES (?1, ?2, ?3, ?4)')
      .bind('u1', 'auth.failed', '/fresh', daysAgo(2))
      .run();
    expect(await runSecurityEventRetention(env as unknown as Env, NOW)).toBe(0);
    expect(await allEvents()).toHaveLength(1);
  });

  it('R2 ARŞİVİNE DOKUNMAZ — kişisel veri soğuk depoya gitmez', async () => {
    await seed();
    // Her R2 çağrısında patlayan bir kova: temizlik R2'ye dokunursa test kırmızıya döner.
    const explodingBucket = new Proxy(
      {},
      {
        get() {
          throw new Error('security_events R2 arşivine yazılmamalı');
        },
      },
    ) as R2Bucket;

    const deleted = await runSecurityEventRetention(
      { ...(env as unknown as Env), syncron_audit_archive: explodingBucket },
      NOW,
    );
    expect(deleted).toBe(2);
  });

  it('doğrudan silici, kesim tarihinden eski satırları parti hâlinde siler', async () => {
    await seed();
    const n = await deleteSecurityEventsOlderThan(db(), daysAgo(30), 1);
    expect(n).toBe(1);
    expect(await allEvents()).toHaveLength(3);
  });
});

// ─── Çağrı yerleri (uçtan uca) ───────────────────────────────────────────────
//
// Sekiz olayın çağrı yerlerinden ağ/Firebase gerektirmeden ulaşılabilen ikisi
// burada gerçek `worker.fetch` ile doğrulanır; geri kalanı (ban.blocked,
// solution.invalid, ratelimit.exceeded, auth.forbidden, admin.destructive)
// geçerli bir Firebase ID token gerektirdiği için yazma yolu seviyesinde
// (yukarıdaki `recordSecurityEvent` blokları) test edilir.

describe('çağrı yerleri', () => {
  it('geçersiz token ile /complete-level → 401 + auth.failed izi (karma IP, ham IP DEĞİL)', async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      new Request('https://example.com/complete-level', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer definitely-not-a-valid-token',
          'CF-Connecting-IP': RAW_IP,
          'User-Agent': 'AttackerAgent/9.9',
          'Content-Type': 'application/json',
        },
        body: '{}',
      }) as Parameters<typeof worker.fetch>[0],
      env as unknown as Env,
      ctx,
    );
    await waitOnExecutionContext(ctx);

    expect(res.status).toBe(401);

    const rows = await allEvents();
    const authFailed = rows.filter((r) => r.event_type === 'auth.failed');
    expect(authFailed).toHaveLength(1);
    expect(authFailed[0].endpoint).toBe('/complete-level');
    expect(authFailed[0].uid).toBeNull();
    expect(authFailed[0].user_agent).toBe('AttackerAgent/9.9');
    expect(authFailed[0].ip).not.toBe(RAW_IP);
    expect(authFailed[0].ip).toHaveLength(IP_HASH_HEX_LENGTH);
  });

  it('geçersiz imzalı webhook → 401 + webhook.invalid_signature izi', async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      new Request('https://example.com/webhooks/lemonsqueezy', {
        method: 'POST',
        headers: { 'X-Signature': 'deadbeef', 'CF-Connecting-IP': RAW_IP, 'Content-Type': 'application/json' },
        body: '{"meta":{}}',
      }) as Parameters<typeof worker.fetch>[0],
      env as unknown as Env,
      ctx,
    );
    await waitOnExecutionContext(ctx);

    expect(res.status).toBe(401);

    const rows = (await allEvents()).filter((r) => r.event_type === 'webhook.invalid_signature');
    expect(rows).toHaveLength(1);
    expect(rows[0].uid).toBeNull();
    expect(rows[0].endpoint).toBe('/webhooks/lemonsqueezy');
    expect(rows[0].ip).toHaveLength(IP_HASH_HEX_LENGTH);
  });

  it('güvenlik izleri yazılırken audit_logs kişisel veri almaz', async () => {
    const ctx = createExecutionContext();
    await worker.fetch(
      new Request('https://example.com/complete-level', {
        method: 'POST',
        headers: { Authorization: 'Bearer nope', 'CF-Connecting-IP': RAW_IP, 'User-Agent': 'UA/1.0' },
        body: '{}',
      }) as Parameters<typeof worker.fetch>[0],
      env as unknown as Env,
      ctx,
    );
    await waitOnExecutionContext(ctx);

    const res = await db().prepare('SELECT uid, action, category, metadata FROM audit_logs').all();
    const blob = JSON.stringify(res.results ?? []);
    expect(blob).not.toContain(RAW_IP);
    expect(blob).not.toContain('UA/1.0');
  });
});
