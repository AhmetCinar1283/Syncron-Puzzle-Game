#!/usr/bin/env node
/**
 * DOSYA AMACI: `next build` çıktısını (`out/`) bir portal build'ine indirger:
 * yalnızca `index.html`, `_next/`, `sounds/` ve favicon'u alır (admin/editör
 * HTML'leri, ads.txt, sitemap, robots, üçüncü parti sw.js dışarıda kalır),
 * mutlak yol/boyut/dosya sayısı doğrular ve `dist-portals/<platform>.zip`
 * üretir. Kullanım: `node scripts/portal/package-portal.mjs crazygames`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, cpSync, rmSync, statSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { zipSync } from 'fflate';
import { validatePortalPackage, findAbsoluteReferences } from './portalLimits.mjs';

const PLATFORM = process.argv[2];
if (PLATFORM !== 'crazygames' && PLATFORM !== 'gamedistribution') {
  console.error('Kullanım: node scripts/portal/package-portal.mjs <crazygames|gamedistribution>');
  process.exit(1);
}

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, 'out');
const PORTAL_DIR = join(ROOT, `out-${PLATFORM}`);
const DIST_DIR = join(ROOT, 'dist-portals');
const ZIP_PATH = join(DIST_DIR, `${PLATFORM}.zip`);

// Portala giren tek şeyler — geri kalan her şey (admin/editor HTML'leri, ads.txt,
// sitemap.xml, robots.txt, sw.js — üçüncü parti reklam service worker'ı, RSC .txt
// payload'ları) kasıtlı olarak dışarıda kalır (bkz. 02-portal-buildleri.md §1).
const INCLUDE = ['index.html', '_next', 'sounds', 'favicon.ico', 'icon.ico'];

function main() {
  if (!existsSync(OUT_DIR)) {
    console.error(`out/ bulunamadı. Önce: NEXT_PUBLIC_PLATFORM=${PLATFORM} next build`);
    process.exit(1);
  }

  rmSync(PORTAL_DIR, { recursive: true, force: true });
  mkdirSync(PORTAL_DIR, { recursive: true });

  for (const name of INCLUDE) {
    const src = join(OUT_DIR, name);
    if (!existsSync(src)) continue;
    cpSync(src, join(PORTAL_DIR, name), { recursive: true });
  }

  const html = readFileSync(join(PORTAL_DIR, 'index.html'), 'utf-8');
  const absoluteRefs = findAbsoluteReferences(html);
  if (absoluteRefs.length > 0) {
    console.error(`✗ index.html içinde mutlak yol referansı bulundu: ${absoluteRefs.slice(0, 5).join(', ')}`);
    process.exit(1);
  }

  const files = listFiles(PORTAL_DIR).map((abs) => ({
    path: relative(PORTAL_DIR, abs).split('\\').join('/'),
    bytes: statSync(abs).size,
  }));

  const result = validatePortalPackage(files);
  for (const w of result.warnings) console.warn(`⚠ ${w}`);
  if (!result.ok) {
    for (const e of result.errors) console.error(`✗ ${e}`);
    process.exit(1);
  }

  mkdirSync(DIST_DIR, { recursive: true });
  const zipInput = {};
  for (const f of files) {
    zipInput[f.path] = readFileSync(join(PORTAL_DIR, f.path));
  }
  const zipped = zipSync(zipInput, { level: 9 });
  writeFileSync(ZIP_PATH, zipped);

  console.log(`✓ ${PLATFORM}: ${files.length} dosya, ${(result.totalBytes / 1024 / 1024).toFixed(2)}MB → ${relative(ROOT, ZIP_PATH)}`);
}

function listFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full) : [full];
  });
}

main();
