/**
 * DOSYA AMACI: `POST /game/telemetry` → D1 veri yolunun uçtan uca çalıştığını ve
 * yazma başarısız olursa bunun GÖRÜNÜR bir denetim kaydı bıraktığını doğrular.
 *
 * Bu dosyanın var olma sebebi: `level_telemetry` üretimde tamamen boştu ve
 * kopukluk hiçbir yerde iz bırakmadığı için aylarca fark edilmedi.
 */

import { env, createExecutionContext } from 'cloudflare:test';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import worker from '../src/index';
import {
  classifyTelemetryWriteError,
  errorText,
  shouldRaiseAlarm,
} from '../src/services/levelTelemetry/lib/writeOutcome';
import { recordLevelTelemetry } from '../src/services/levelTelemetry/recordTelemetry';
import type { LevelTelemetryParams } from '../src/services/telemetry';

// Şema, ÜRETİMDEKİ migration dosyalarının kendisinden kurulur. Kod, migration'ların
// yaratmadığı bir kolona yazmaya kalkarsa bu dosya kırmızıya döner.
import migration0010 from '../migrations/0010_level_telemetry.sql?raw';
import migration0011 from '../migrations/0011_reward_grants.sql?raw';

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

vi.mock('../src/services/auth', () => ({
  verifyIdToken: vi.fn(async (token: string) => {
    if (token === 'valid-token-user-1') return { uid: 'user-1' };
    throw new Error('Invalid token');
  }),
}));

const AUDIT_LOGS_SCHEMA = `CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT NOT NULL PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  uid TEXT NOT NULL, action TEXT NOT NULL, category TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
)`;

const db = () => env.AUDIT_DB;

/** SQL dosyasını yorum satırlarından arındırıp tek tek ifadelere böler. */
function statements(sql: string): string[] {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** `level_telemetry`'yi gerçek migration dosyalarından kurar (0010 + 0011'in ALTER'ı). */
async function applyTelemetryMigrations(): Promise<void> {
  for (const stmt of statements(migration0010)) {
    await db().prepare(stmt).run();
  }
  const alter = statements(migration0011).find((s) => /ALTER TABLE level_telemetry/i.test(s));
  if (!alter) throw new Error('0011 içindeki level_telemetry ALTER ifadesi bulunamadı');
  await db().prepare(alter).run();
}

const VALID_BODY = {
  id: 'session-1',
  levelId: 'level-abc',
  version: 3,
  outcome: 'win',
  timeSpent: 42,
  restarts: 1,
  deaths: 2,
  movesCount: 17,
  hintsUsed: 1,
};

function telemetryRequest(body: Record<string, unknown>, token = 'valid-token-user-1'): Request {
  return new IncomingRequest('http://localhost/game/telemetry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
}

async function post(body: Record<string, unknown>): Promise<Response> {
  const ctx = createExecutionContext();
  return worker.fetch(telemetryRequest(body), env, ctx);
}

async function failureLogs(): Promise<{ uid: string; metadata: string }[]> {
  const res = await db()
    .prepare(`SELECT uid, metadata FROM audit_logs WHERE action = 'telemetry.write_failed'`)
    .all<{ uid: string; metadata: string }>();
  return res.results;
}

beforeEach(async () => {
  await db().prepare('DROP TABLE IF EXISTS level_telemetry').run();
  await applyTelemetryMigrations();
  await db().prepare(AUDIT_LOGS_SCHEMA).run();
  await db().prepare('DELETE FROM audit_logs').run();
});

describe('classifyTelemetryWriteError (saf)', () => {
  it('eksik tablo/kolonu şema hatası sayar', () => {
    expect(classifyTelemetryWriteError(new Error('D1_ERROR: no such table: level_telemetry')))
      .toBe('schema_missing');
    expect(classifyTelemetryWriteError(new Error('D1_ERROR: no such column: hints_used')))
      .toBe('schema_missing');
    expect(classifyTelemetryWriteError(new Error('table level_telemetry has no column named hints_used')))
      .toBe('schema_missing');
  });

  it('birincil anahtar çakışmasını tekrar sayar', () => {
    expect(
      classifyTelemetryWriteError(new Error('D1_ERROR: UNIQUE constraint failed: level_telemetry.id')),
    ).toBe('duplicate');
  });

  it('tanımadığını unknown sayar', () => {
    expect(classifyTelemetryWriteError(new Error('network blip'))).toBe('unknown');
    expect(classifyTelemetryWriteError('plain string')).toBe('unknown');
    expect(classifyTelemetryWriteError({ weird: true })).toBe('unknown');
  });

  it('yalnızca duplicate alarm üretmez', () => {
    expect(shouldRaiseAlarm('duplicate')).toBe(false);
    expect(shouldRaiseAlarm('schema_missing')).toBe(true);
    expect(shouldRaiseAlarm('unknown')).toBe(true);
  });

  it('Error olmayan hatalardan da metin çıkarır', () => {
    expect(errorText(new Error('boom'))).toBe('boom');
    expect(errorText('boom')).toBe('boom');
    expect(errorText({ a: 1 })).toBe('{"a":1}');
  });
});

describe('POST /game/telemetry — uçtan uca veri yolu', () => {
  it('geçerli isteği D1 level_telemetry tablosuna YAZAR', async () => {
    const res = await post(VALID_BODY);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });

    const row = await db()
      .prepare('SELECT * FROM level_telemetry WHERE id = ?1')
      .bind('session-1')
      .first<Record<string, unknown>>();

    expect(row).not.toBeNull();
    expect(row).toMatchObject({
      uid: 'user-1',
      level_id: 'level-abc',
      version: 3,
      outcome: 'win',
      time_spent: 42,
      restarts: 1,
      deaths: 2,
      moves_count: 17,
      hints_used: 1,
    });
  });

  it('başarılı yazma hiçbir alarm kaydı bırakmaz', async () => {
    await post(VALID_BODY);
    expect(await failureLogs()).toHaveLength(0);
  });

  it('kimlik doğrulaması olmadan yazmaz', async () => {
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      new IncomingRequest('http://localhost/game/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(VALID_BODY),
      }),
      env,
      ctx,
    );
    expect(res.status).toBe(401);
    const count = await db().prepare('SELECT COUNT(*) AS c FROM level_telemetry').first<{ c: number }>();
    expect(count?.c).toBe(0);
  });

  it('aynı oturum ikinci kez gönderilirse idempotenttir (200, tek satır, alarm yok)', async () => {
    expect((await post(VALID_BODY)).status).toBe(200);
    const second = await post({ ...VALID_BODY, timeSpent: 99 });

    expect(second.status).toBe(200);
    const count = await db().prepare('SELECT COUNT(*) AS c FROM level_telemetry').first<{ c: number }>();
    expect(count?.c).toBe(1);
    expect(await failureLogs()).toHaveLength(0);
  });
});

describe('sessiz kopukluk artık imkânsız', () => {
  // BU TEST BUGÜNKÜ BOZUK HÂLİ YAKALAR: tablo yokken eski kod 500 dönüp hatayı
  // yalnızca console.error'a yazıyordu — hiçbir kalıcı iz kalmıyordu.
  it("tablo yokken 500 döner VE audit_logs'a görünür bir kayıt bırakır", async () => {
    await db().prepare('DROP TABLE IF EXISTS level_telemetry').run();

    const res = await post(VALID_BODY);
    expect(res.status).toBe(500);

    const logs = await failureLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].uid).toBe('user-1');

    const metadata = JSON.parse(logs[0].metadata) as Record<string, unknown>;
    expect(metadata.failure).toBe('schema_missing');
    expect(metadata.levelId).toBe('level-abc');
    expect(metadata.outcome).toBe('win');
    expect(String(metadata.message)).toMatch(/no such table/i);
  });

  it('yazma hiçbir satır değiştirmezse bu da başarısızlıktır', async () => {
    const params: LevelTelemetryParams = {
      id: 'session-x', uid: 'user-1', levelId: 'L1', version: 1, outcome: 'quit',
      timeSpent: 1, restarts: 0, deaths: 0, movesCount: 0, hintsUsed: 0,
    };
    // `changes === 0` döndüren bir D1: hata fırlatmaz ama hiçbir şey yazmaz.
    const silentDb = {
      prepare: () => ({
        bind: () => ({ run: async () => ({ meta: { changes: 0 } }) }),
      }),
    } as unknown as D1Database;

    const result = await recordLevelTelemetry(silentDb, params);
    expect(result.status).toBe('failed');
    if (result.status === 'failed') expect(result.failure).toBe('unknown');
  });

  it('denetim kaydı da yazılamazsa çağıran yine de başarısızlığı öğrenir', async () => {
    await db().prepare('DROP TABLE IF EXISTS level_telemetry').run();
    await db().prepare('DROP TABLE IF EXISTS audit_logs').run();

    const res = await post(VALID_BODY);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ success: false, error: 'Failed to save telemetry' });
  });
});
