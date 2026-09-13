#!/usr/bin/env node
/**
 * DOSYA AMACI: Portal build ve paketleme sürecini tek komut altında toplar.
 * 
 * Kullanım:
 *   npm run build:portal crazygames
 *   npm run build:portal gd
 *   npm run build:portal gamedistribution
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '../..');

const arg = (process.argv[2] || '').toLowerCase().trim();

let platform = '';
if (arg === 'crazygame' || arg === 'crazygames' || arg === 'cg') {
  platform = 'crazygames';
} else if (arg === 'gd' || arg === 'gamedistribution' || arg === 'game-distribution') {
  platform = 'gamedistribution';
} else {
  console.error('✗ Geçersiz portal argümanı.');
  console.error('Kullanım: npm run build:portal <crazygames|gd>');
  process.exit(1);
}

console.log(`⚡ [1/2] ${platform.toUpperCase()} için Next.js build başlatılıyor...`);
const buildCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const buildResult = spawnSync(buildCmd, ['cross-env', `NEXT_PUBLIC_PLATFORM=${platform}`, 'next', 'build'], {
  stdio: 'inherit',
  cwd: ROOT,
  shell: true,
});

if (buildResult.status !== 0) {
  console.error(`✗ Next.js build başarısız oldu (kod: ${buildResult.status})`);
  process.exit(buildResult.status ?? 1);
}

console.log(`\n⚡ [2/2] ${platform.toUpperCase()} paketi ve .zip arşivi hazırlanıyor...`);
const packageScript = join(__dirname, 'package-portal.mjs');
const packageResult = spawnSync(process.execPath, [packageScript, platform], {
  stdio: 'inherit',
  cwd: ROOT,
});

if (packageResult.status !== 0) {
  console.error(`✗ Portal paketleme başarısız oldu (kod: ${packageResult.status})`);
  process.exit(packageResult.status ?? 1);
}

console.log(`\n🎉 ${platform.toUpperCase()} portal build'i başarıyla tamamlandı!`);
