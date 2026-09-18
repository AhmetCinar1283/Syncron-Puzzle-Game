#!/usr/bin/env node
/**
 * DOSYA AMACI: Soğuk dışa aktarımdan (R2 NDJSON) D1'e GERİ YÜKLEME aracı.
 * Bilinçli olarak elle çalıştırılır; hiçbir cron ya da uç nokta tetiklemez.
 *
 * Kullanım:
 *   node scripts/recovery/restore-export.mjs --file <yol.ndjson> --table <tablo>
 *   node scripts/recovery/restore-export.mjs --dir  <klasor>      --table <tablo>
 *
 * Varsayılan KURU ÇALIŞMADIR. Gerçekten yazmak için `--apply` gerekir.
 *
 * Güvenlik kuralları (hiçbiri bayrakla esnetilemez):
 *   1. Yalnızca `INSERT OR IGNORE` üretilir. Var olan bir satırın ÜSTÜNE ASLA
 *      yazılmaz. Yani araç yalnızca EKSİK satırı geri getirir.
 *      Alternatifi neydi ve neden reddettim? `INSERT OR REPLACE`. Reddedildi:
 *      eski bir yedekten geri yükleme, o yedekten sonra oynayan herkesin
 *      ilerlemesini sessizce geri sarardı — görev dosyası §1.1(b)'nin tam olarak
 *      kaçınmak istediği senaryo.
 *   2. Tablo adı allowlist'ten gelir (worker'daki EXPORT_TABLES ile aynı liste).
 *   3. Değerler SQL'e parametre olarak değil, kaçışlanmış literal olarak girer
 *      (wrangler d1 execute dosyadan SQL okur); tüm kaçışlama tek yerdedir.
 *   4. `--apply` verilse bile üretilen SQL dosyası diske yazılır ve yolu basılır;
 *      ne çalıştırıldığı sonradan denetlenebilir.
 *
 * Değer eksik/null gelirse: JSON'daki `null` SQL `NULL` olur; hiç olmayan alan
 * satırdan çıkarılır (kolon listesi satır başına hesaplanır) → şema varsayılanı
 * devreye girer.
 */

import { readFileSync, readdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

/** Worker'daki `src/services/recovery/exportTables.ts` ile AYNI liste olmalıdır. */
const ALLOWED_TABLES = [
  'played_levels', 'skipped_levels', 'deleted_levels', 'donor_profiles', 'store_events',
  'reward_grants', 'daily_results', 'daily_streaks', 'daily_puzzles', 'daily_schedule',
  'daily_settings', 'user_bans', 'user_profiles', 'friendships', 'audit_logs',
];

const DB_NAME = 'syncron-audit-logs';

function parseArgs(argv) {
  const args = { apply: false, remote: true };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--apply') args.apply = true;
    else if (a === '--dry-run') args.apply = false;
    else if (a === '--local') args.remote = false;
    else if (a === '--file') args.file = argv[++i];
    else if (a === '--dir') args.dir = argv[++i];
    else if (a === '--table') args.table = argv[++i];
    else if (a === '--out') args.out = argv[++i];
  }
  return args;
}

function fail(message) {
  console.error(`HATA: ${message}`);
  process.exit(1);
}

/** SQL literal kaçışlaması — tek yer, tek kural. */
function sqlLiteral(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL';
  if (typeof value === 'boolean') return value ? '1' : '0';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return `'${text.replace(/'/g, "''")}'`;
}

function collectFiles(args) {
  if (args.file) {
    if (!existsSync(args.file)) fail(`dosya yok: ${args.file}`);
    return [resolve(args.file)];
  }
  if (args.dir) {
    if (!existsSync(args.dir) || !statSync(args.dir).isDirectory()) fail(`klasor yok: ${args.dir}`);
    return readdirSync(args.dir)
      .filter((f) => f.startsWith(`${args.table}.`) && f.endsWith('.ndjson'))
      .sort()
      .map((f) => resolve(join(args.dir, f)));
  }
  return fail('--file ya da --dir verilmeli');
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.table) fail('--table verilmeli');
  if (!ALLOWED_TABLES.includes(args.table)) {
    fail(`bilinmeyen tablo '${args.table}'. Izin verilenler: ${ALLOWED_TABLES.join(', ')}`);
  }

  const files = collectFiles(args);
  if (files.length === 0) fail(`'${args.table}' icin NDJSON dosyasi bulunamadi`);

  const statements = [];
  let skipped = 0;

  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (trimmed === '') continue;
      let row;
      try {
        row = JSON.parse(trimmed);
      } catch {
        skipped += 1; // bozuk satır tüm geri yüklemeyi durdurmaz, sayılır
        continue;
      }
      if (typeof row !== 'object' || row === null || Array.isArray(row)) {
        skipped += 1;
        continue;
      }
      const columns = Object.keys(row);
      if (columns.length === 0) { skipped += 1; continue; }
      const values = columns.map((c) => sqlLiteral(row[c]));
      statements.push(
        `INSERT OR IGNORE INTO ${args.table} (${columns.join(', ')}) VALUES (${values.join(', ')});`,
      );
    }
  }

  const outPath = resolve(args.out ?? `restore-${args.table}.sql`);
  const header = [
    `-- Uretildi: ${new Date().toISOString()}`,
    `-- Tablo: ${args.table}`,
    `-- Kaynak: ${files.join(', ')}`,
    `-- Satir: ${statements.length} (atlanan bozuk satir: ${skipped})`,
    `-- SADECE INSERT OR IGNORE — var olan hicbir satirin ustune yazilmaz.`,
    '',
  ].join('\n');
  writeFileSync(outPath, `${header}${statements.join('\n')}\n`, 'utf8');

  console.log(`Tablo       : ${args.table}`);
  console.log(`Dosya       : ${files.length}`);
  console.log(`Satir       : ${statements.length}${skipped > 0 ? ` (atlanan: ${skipped})` : ''}`);
  console.log(`Uretilen SQL: ${outPath}`);

  if (!args.apply) {
    console.log('\nKURU CALISMA. Hicbir sey yazilmadi.');
    console.log('Uygulamak icin ayni komuta --apply ekleyin.');
    return;
  }

  const wranglerArgs = [
    'wrangler', 'd1', 'execute', DB_NAME,
    args.remote ? '--remote' : '--local',
    '--file', outPath,
  ];
  console.log(`\nUYGULANIYOR: npx ${wranglerArgs.join(' ')}`);
  execFileSync('npx', wranglerArgs, { stdio: 'inherit', cwd: resolve('syncron-worker') });
  console.log('Bitti. Simdi POST /admin/recovery/recompute calistirin (turetilmis tablolar).');
}

main();
