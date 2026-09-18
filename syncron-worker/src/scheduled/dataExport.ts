/**
 * DOSYA AMACI: Haftalık soğuk dışa aktarım (Katman D). Kaynak D1 tablolarını
 * NDJSON olarak R2'ye KOPYALAR. D1'den hiçbir şey silmez, hiçbir şey değiştirmez.
 * bkz. .plans/yayin-hazirlik/02-veri-dayanikliligi.md §3.3
 *      docs/release/veri-kurtarma.md
 *
 * `logRetention.ts` ile aynı batch + hata desenini kullanır — ama o bir TAŞIMA,
 * bu bir KOPYALAMADIR. Aradaki tek fark, bu dosyada hiç DELETE olmamasıdır ve
 * bu fark bilinçlidir.
 */

import type { Env } from '../types';
import {
  EXPORT_TABLES,
  exportObjectKey,
  exportPruneCutoff,
  exportRunPrefix,
  isPrunablePrefix,
  toNdjson,
} from '../services/recovery/exportTables';

/** Tek R2 nesnesine yazılan azami satır. D1 tek sorgu çıktısını da sınırlar. */
const BATCH_SIZE = 2000;
/** Güvenlik freni: tek tabloda en fazla bu kadar parça (≈ 20M satır). */
const MAX_PARTS = 10_000;

export interface DataExportSummary {
  runDate: string;
  tables: Array<{ table: string; rows: number; parts: number; error?: string }>;
  prunedPrefixes: string[];
  ok: boolean;
}

/**
 * Tek bir tabloyu rowid sırasına göre sayfalayarak R2'ye yazar.
 *
 * Neden `rowid` ile sayfalama? Tabloların birincil anahtarları farklı
 * (bileşik, metin, otomatik). `rowid` hepsinde vardır, tekildir ve artandır —
 * yani tablo-agnostik ve kararlı bir imleçtir. OFFSET kullanılmaz: büyük
 * tablolarda hem yavaştır hem de araya yazma olursa satır atlar.
 *
 * Tablo adı SQL'e bağlanamaz; bu yüzden yalnızca `EXPORT_TABLES` allowlist'inden
 * gelen sabit değerler enterpole edilir (bkz. services/recovery/exportTables.ts).
 */
async function exportTable(
  env: Env,
  table: string,
  runDate: Date,
): Promise<{ rows: number; parts: number }> {
  let cursor = 0;
  let part = 0;
  let rows = 0;

  while (part < MAX_PARTS) {
    const result = await env.AUDIT_DB
      .prepare(`SELECT rowid AS _rowid, * FROM ${table} WHERE rowid > ?1 ORDER BY rowid LIMIT ?2`)
      .bind(cursor, BATCH_SIZE)
      .all<Record<string, unknown>>();

    const batch = result.results ?? [];
    if (batch.length === 0) break;

    const lastRowid = Number(batch[batch.length - 1]._rowid);
    const isOnlyPart = part === 0 && batch.length < BATCH_SIZE;
    const key = exportObjectKey(runDate, table, part, isOnlyPart);

    // `_rowid` yalnızca sayfalama imlecidir, veri değildir → dosyaya yazılmaz.
    const payload = toNdjson(batch.map(({ _rowid, ...rest }) => rest));

    // R2 yazımı başarısızsa DÖNGÜ KIRILIR ve hata yukarı taşınır: yarım kalmış
    // bir dışa aktarımı "tamam" saymak, olmayan bir yedeğe güvenmekten kötüdür.
    await env.syncron_audit_archive.put(key, payload, {
      httpMetadata: { contentType: 'application/x-ndjson' },
      customMetadata: {
        table,
        rowCount: String(batch.length),
        part: String(part),
        exportedAt: runDate.toISOString(),
      },
    });

    rows += batch.length;
    part += 1;
    cursor = Number.isFinite(lastRowid) ? lastRowid : cursor + BATCH_SIZE;

    if (batch.length < BATCH_SIZE) break;
  }

  return { rows, parts: part };
}

/**
 * Saklama penceresinin dışındaki eski dışa aktarım klasörlerini siler.
 *
 * Silinen şey D1 verisi DEĞİL, bu job'un kendi ürettiği kopyalardır. Görev
 * dosyası "en az 8 haftalık sürüm" istiyor; burada 12 hafta tutulur.
 * Tanınmayan önek (elle konmuş bir klasör vb.) asla silinmez.
 */
async function pruneOldExports(env: Env, now: Date): Promise<string[]> {
  const cutoff = exportPruneCutoff(now);
  const pruned: string[] = [];

  const listing = await env.syncron_audit_archive.list({ prefix: 'exports/', delimiter: '/' });
  for (const prefix of listing.delimitedPrefixes ?? []) {
    if (!isPrunablePrefix(prefix, cutoff)) continue;
    const objects = await env.syncron_audit_archive.list({ prefix });
    for (const obj of objects.objects ?? []) {
      await env.syncron_audit_archive.delete(obj.key);
    }
    pruned.push(prefix);
  }

  return pruned;
}

/**
 * Haftalık soğuk dışa aktarım. Bir tablo patlarsa diğerleri devam eder; özet
 * `ok: false` ile döner ve loglanır.
 */
export async function runDataExport(env: Env, now: Date = new Date()): Promise<DataExportSummary> {
  const runDate = now;
  const summary: DataExportSummary = {
    runDate: exportRunPrefix(runDate),
    tables: [],
    prunedPrefixes: [],
    ok: true,
  };

  console.log(`[DataExport] Starting. Prefix: ${summary.runDate}`);

  for (const table of EXPORT_TABLES) {
    try {
      const { rows, parts } = await exportTable(env, table, runDate);
      summary.tables.push({ table, rows, parts });
      console.log(`[DataExport] ${table}: ${rows} rows in ${parts} object(s)`);
    } catch (err) {
      summary.ok = false;
      const message = err instanceof Error ? err.message : String(err);
      summary.tables.push({ table, rows: 0, parts: 0, error: message });
      console.error(`[DataExport] ${table} export FAILED:`, err);
    }
  }

  try {
    summary.prunedPrefixes = await pruneOldExports(env, now);
    if (summary.prunedPrefixes.length > 0) {
      console.log(`[DataExport] Pruned old exports: ${summary.prunedPrefixes.join(', ')}`);
    }
  } catch (err) {
    // Budama başarısızlığı dışa aktarımı geçersiz kılmaz — fazladan yedek zararsızdır.
    console.error('[DataExport] Prune step failed (non-fatal):', err);
  }

  console.log(`[DataExport] Done. ok=${summary.ok}`);
  return summary;
}
