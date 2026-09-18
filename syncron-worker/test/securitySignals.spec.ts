/**
 * DOSYA AMACI: Kötüye kullanım sinyallerinin testleri — eşik aşılmadan kayıt
 * yazılmadığı, aşılınca `category: 'security'` ile yazıldığı.
 * bkz. .plans/yayin-hazirlik/03-rate-limit-ve-kotuye-kullanim.md §3.5
 */

import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  recordRateLimitExceeded,
  recordVerifyMovesFailure,
  recordAuthFailure,
  SECURITY_SIGNAL_THRESHOLDS,
} from '../src/services/securitySignals';

const SCHEMA = `CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT NOT NULL PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), uid TEXT NOT NULL, action TEXT NOT NULL,
  category TEXT NOT NULL, metadata TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
)`;

interface Row {
  uid: string;
  action: string;
  category: string;
  metadata: string;
}

async function securityRows(): Promise<Row[]> {
  const res = await env.AUDIT_DB.prepare(
    "SELECT uid, action, category, metadata FROM audit_logs WHERE category = 'security' ORDER BY rowid",
  ).all<Row>();
  return res.results ?? [];
}

// Her testin kendi zaman ekseni olsun diye sayaç anahtarları uid ile ayrıştırılır;
// bellek içi sinyal sayacı modül kapsamındadır ve testler arasında sıfırlanmaz.
let seq = 0;
const freshUid = () => `sec-uid-${++seq}`;
const T0 = 1_700_000_000_000;

beforeEach(async () => {
  await env.AUDIT_DB.prepare(SCHEMA).run();
  await env.AUDIT_DB.prepare('DELETE FROM audit_logs').run();
});

describe('recordRateLimitExceeded', () => {
  it("aşımı category: 'security' ile yazar ve uç noktayı kaydeder", async () => {
    await recordRateLimitExceeded(env.AUDIT_DB, 'u1', 'complete-level', 'uid');
    const rows = await securityRows();
    expect(rows).toHaveLength(1);
    expect(rows[0].action).toBe('security.rate_limit_exceeded');
    expect(rows[0].uid).toBe('u1');
    expect(JSON.parse(rows[0].metadata)).toEqual({ endpoint: 'complete-level', scope: 'uid' });
  });

  it("kimlik yoksa 'unknown' uid ile yazılır (kayıt düşürülmez)", async () => {
    await recordRateLimitExceeded(env.AUDIT_DB, null, 'internal-log', 'global');
    const rows = await securityRows();
    expect(rows[0].uid).toBe('unknown');
  });
});

describe('recordVerifyMovesFailure', () => {
  it('eşiğin altındaki tek tük başarısızlık kayıt YAZMAZ', async () => {
    const uid = freshUid();
    for (let i = 0; i < SECURITY_SIGNAL_THRESHOLDS.verifyMovesFailuresPerMinute; i++) {
      const flagged = await recordVerifyMovesFailure(env.AUDIT_DB, uid, 'L1', T0);
      expect(flagged).toBe(false);
    }
    expect(await securityRows()).toHaveLength(0);
  });

  it('eşik aşılınca tek bir kayıt yazar', async () => {
    const uid = freshUid();
    for (let i = 0; i < SECURITY_SIGNAL_THRESHOLDS.verifyMovesFailuresPerMinute; i++) {
      await recordVerifyMovesFailure(env.AUDIT_DB, uid, 'L1', T0);
    }
    const flagged = await recordVerifyMovesFailure(env.AUDIT_DB, uid, 'L1', T0);
    expect(flagged).toBe(true);
    const rows = await securityRows();
    expect(rows).toHaveLength(1);
    expect(rows[0].action).toBe('security.verify_moves_failed');
    expect(JSON.parse(rows[0].metadata).levelId).toBe('L1');
  });

  it('bir oyuncunun eşiği diğerini etkilemez', async () => {
    const a = freshUid();
    const b = freshUid();
    for (let i = 0; i <= SECURITY_SIGNAL_THRESHOLDS.verifyMovesFailuresPerMinute; i++) {
      await recordVerifyMovesFailure(env.AUDIT_DB, a, 'L1', T0);
    }
    expect(await recordVerifyMovesFailure(env.AUDIT_DB, b, 'L1', T0)).toBe(false);
  });

  it('pencere geçince eşik sıfırlanır (kalıcı damga değil)', async () => {
    const uid = freshUid();
    for (let i = 0; i <= SECURITY_SIGNAL_THRESHOLDS.verifyMovesFailuresPerMinute; i++) {
      await recordVerifyMovesFailure(env.AUDIT_DB, uid, 'L1', T0);
    }
    expect(await recordVerifyMovesFailure(env.AUDIT_DB, uid, 'L1', T0 + 60_000)).toBe(false);
  });
});

describe('recordAuthFailure', () => {
  it('eşiğin altında yazmaz, global ani yükselişte yazar', async () => {
    // Global kova; bu testte kendi zaman penceresini kullanır.
    const now = T0 + 3_600_000 * (seq + 100);
    for (let i = 0; i < SECURITY_SIGNAL_THRESHOLDS.authFailuresPerMinute; i++) {
      expect(await recordAuthFailure(env.AUDIT_DB, now)).toBe(false);
    }
    expect(await recordAuthFailure(env.AUDIT_DB, now)).toBe(true);
    const rows = await securityRows();
    expect(rows).toHaveLength(1);
    expect(rows[0].action).toBe('security.auth_failure_spike');
    expect(rows[0].uid).toBe('unknown');
  });
});
