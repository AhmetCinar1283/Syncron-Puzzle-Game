/**
 * DOSYA AMACI: Haftalık soğuk dışa aktarımın (Katman D) testleri. En kritik
 * iddia: dışa aktarım D1'den HİÇBİR ŞEY silmez.
 */

import { env } from 'cloudflare:test';
import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { runDataExport } from '../src/scheduled/dataExport';
import {
  EXPORT_TABLES,
  exportObjectKey,
  exportPrefixDate,
  exportPruneCutoff,
  isExportTable,
  isPrunablePrefix,
  toNdjson,
} from '../src/services/recovery/exportTables';
import { RECOVERY_SCHEMA, EXPORT_EXTRA_SCHEMA, ALL_TABLES } from './recoverySchema';
import type { Env } from '../src/types';

const db = () => env.AUDIT_DB;
const testEnv = env as unknown as Env;
const bucket = () => testEnv.syncron_audit_archive;

beforeAll(async () => {
  for (const stmt of [...RECOVERY_SCHEMA, ...EXPORT_EXTRA_SCHEMA]) await db().prepare(stmt).run();
});

// NOT: Gerçek R2 üzerinde nesne SİLMEK, vitest-pool-workers'ın izole depolama
// çerçevesini Windows'ta bozuyor (EBUSY / "Isolated storage failed"). Bu bir test
// aracı sorunudur. Bu yüzden silme içeren tek yol (budama) aşağıdaki BELLEK İÇİ
// R2 taklidiyle test edilir; geri kalan testler gerçek R2 binding'ini kullanır
// (yalnızca put/get/list).
beforeEach(async () => {
  for (const t of ALL_TABLES) await db().prepare(`DELETE FROM ${t}`).run();
});

/**
 * Bellek içi R2 taklidi — yalnızca `runDataExport`'un kullandığı dört işlem.
 * `as unknown as R2Bucket`: R2Bucket arayüzünün tamamını uygulamak bu testin
 * konusu değil; eksik üyeye dokunulursa test zaten patlar.
 */
function fakeBucket() {
  const store = new Map<string, string>();
  const api = {
    async put(key: string, value: string) { store.set(key, value); },
    async get(key: string) {
      const v = store.get(key);
      return v === undefined ? null : { text: async () => v };
    },
    async delete(key: string) { store.delete(key); },
    async list({ prefix = '', delimiter }: { prefix?: string; delimiter?: string } = {}) {
      const keys = [...store.keys()].filter((k) => k.startsWith(prefix));
      if (!delimiter) return { objects: keys.map((key) => ({ key })), delimitedPrefixes: [] };
      const prefixes = new Set<string>();
      for (const key of keys) {
        const idx = key.indexOf(delimiter, prefix.length);
        if (idx >= 0) prefixes.add(key.slice(0, idx + delimiter.length));
      }
      return { objects: [], delimitedPrefixes: [...prefixes] };
    },
  };
  return { store, bucket: api as unknown as R2Bucket };
}

// ─── Saf yardımcılar ──────────────────────────────────────────────────────────

describe('exportTables helpers', () => {
  it('yalnızca allowlist tablolarını kabul eder (SQL enterpolasyonunun tek savunması)', () => {
    expect(isExportTable('played_levels')).toBe(true);
    expect(isExportTable('user_period_scores')).toBe(false); // türetilmiş → dışarıda
    expect(isExportTable("played_levels; DROP TABLE x--")).toBe(false);
  });

  it('tek parçada görev dosyasındaki anahtar düzenini korur', () => {
    const d = new Date('2026-09-19T02:00:00.000Z');
    expect(exportObjectKey(d, 'played_levels', 0, true)).toBe('exports/2026-09-19/played_levels.ndjson');
    expect(exportObjectKey(d, 'played_levels', 3, false)).toBe('exports/2026-09-19/played_levels.part-0003.ndjson');
  });

  it('NDJSON satır başına bir nesne üretir', () => {
    expect(toNdjson([{ a: 1 }, { a: 2 }])).toBe('{"a":1}\n{"a":2}');
    expect(toNdjson([])).toBe('');
  });

  it('tanınmayan öneki ASLA silinebilir saymaz', () => {
    expect(exportPrefixDate('exports/2026-01-01/')).toBe('2026-01-01');
    expect(exportPrefixDate('exports/elle-konan-klasor/')).toBeNull();
    expect(isPrunablePrefix('exports/elle-konan-klasor/', '2026-09-01')).toBe(false);
    expect(isPrunablePrefix('exports/2026-01-01/', '2026-09-01')).toBe(true);
    expect(isPrunablePrefix('exports/2026-09-30/', '2026-09-01')).toBe(false);
  });

  it('budama eşiği en az 8 haftadan daha geriyi işaret eder', () => {
    const now = new Date('2026-09-19T00:00:00.000Z');
    const cutoff = exportPruneCutoff(now);
    const weeksBack = (now.getTime() - Date.parse(`${cutoff}T00:00:00.000Z`)) / (7 * 24 * 3600 * 1000);
    expect(weeksBack).toBeGreaterThanOrEqual(8);
  });
});

// ─── Dışa aktarım ─────────────────────────────────────────────────────────────

describe('runDataExport', () => {
  it('kaynak tabloları R2\'ye yazar ve D1\'den hiçbir şey silmez', async () => {
    await db().prepare(`INSERT INTO played_levels (uid, level_id, stars, score, move_count) VALUES ('u1','L1',3,3,10)`).run();
    await db().prepare(`INSERT INTO played_levels (uid, level_id, stars, score, move_count) VALUES ('u2','L1',2,2,20)`).run();
    await db().prepare(`INSERT INTO user_profiles (uid, display_name) VALUES ('u1','Ada')`).run();
    // Türetilmiş tablo: dışa aktarılmamalı.
    await db().prepare(`INSERT INTO user_period_scores (uid, period_type, period_id, stars_gained) VALUES ('u1','all_time','all_time',5)`).run();

    const now = new Date('2026-09-19T02:00:00.000Z');
    const summary = await runDataExport(testEnv, now);
    expect(summary.ok).toBe(true);

    // D1 dokunulmadı
    const rows = await db().prepare(`SELECT COUNT(*) AS n FROM played_levels`).first<{ n: number }>();
    expect(rows?.n).toBe(2);
    const derived = await db().prepare(`SELECT COUNT(*) AS n FROM user_period_scores`).first<{ n: number }>();
    expect(derived?.n).toBe(1);

    // R2'de dosya var ve içeriği doğru
    const obj = await bucket().get('exports/2026-09-19/played_levels.ndjson');
    expect(obj).not.toBeNull();
    const lines = (await obj!.text()).split('\n').map((l) => JSON.parse(l));
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatchObject({ uid: 'u1', level_id: 'L1', stars: 3 });
    expect(lines[0]._rowid).toBeUndefined(); // sayfalama imleci veriye sızmaz

    // Türetilmiş tablo dosyası hiç yok
    expect(await bucket().get('exports/2026-09-19/user_period_scores.ndjson')).toBeNull();
  });

  it('boş tablo için dosya üretmez ama çalışmayı bozmaz', async () => {
    const summary = await runDataExport(testEnv, new Date('2026-09-19T02:00:00.000Z'));
    expect(summary.ok).toBe(true);
    expect(summary.tables.map((t) => t.table).sort()).toEqual([...EXPORT_TABLES].sort());
    expect(summary.tables.every((t) => t.rows === 0 && t.parts === 0)).toBe(true);
    const listing = await bucket().list({ prefix: 'exports/' });
    expect(listing.objects).toHaveLength(0);
  });

  it('mantıksal olarak silinmiş satırları da dışa aktarır (yedeğin anlamı budur)', async () => {
    await db().prepare(
      `INSERT INTO played_levels (uid, level_id, stars, score, move_count, deleted_at)
       VALUES ('u1','L1',3,3,10,'2026-09-01T00:00:00.000Z')`,
    ).run();

    await runDataExport(testEnv, new Date('2026-09-19T02:00:00.000Z'));
    const obj = await bucket().get('exports/2026-09-19/played_levels.ndjson');
    const row = JSON.parse((await obj!.text()).trim());
    expect(row.deleted_at).toBe('2026-09-01T00:00:00.000Z');
  });

  it('saklama penceresinin dışındaki eski dışa aktarımları budar, yenilerine dokunmaz', async () => {
    const { store, bucket: fake } = fakeBucket();
    store.set('exports/2020-01-01/played_levels.ndjson', '{}');
    store.set('exports/2026-09-12/played_levels.ndjson', '{}');
    store.set('exports/elle-konan-klasor/notlar.txt', 'dokunma');

    const summary = await runDataExport(
      { ...testEnv, syncron_audit_archive: fake },
      new Date('2026-09-19T02:00:00.000Z'),
    );

    expect(summary.prunedPrefixes).toEqual(['exports/2020-01-01/']);
    expect(store.has('exports/2020-01-01/played_levels.ndjson')).toBe(false);
    expect(store.has('exports/2026-09-12/played_levels.ndjson')).toBe(true);
    expect(store.has('exports/elle-konan-klasor/notlar.txt')).toBe(true); // tanınmayan önek korunur
  });
});
