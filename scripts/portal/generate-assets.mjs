#!/usr/bin/env node
/**
 * DOSYA AMACI: HTML şablonları üzerinden CrazyGames ve GameDistribution
 * için görsel varlıkları (ikonlar ve kapak görselleri) Electron/Chromium
 * ile otomatik olarak üretir ve `docs/portals/assets/` altına yerleştirir.
 * 
 * Kullanım: node scripts/portal/generate-assets.mjs
 * Veya: npm run generate:assets
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '../..');

const electronCli = join(ROOT, 'node_modules/electron/cli.js');
const runnerScript = join(__dirname, 'generate-assets-runner.cjs');

console.log('⚡ Başlatılıyor: Portal görsel varlık üretimi...');
const result = spawnSync(process.execPath, [electronCli, runnerScript], {
  stdio: 'inherit',
  cwd: ROOT,
});

if (result.status !== 0) {
  console.error('✗ Görsel üretimi hata ile sonlandı.');
  process.exit(result.status ?? 1);
}
