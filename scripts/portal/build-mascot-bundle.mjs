#!/usr/bin/env node
/**
 * DOSYA AMACI: Maskot çizicisini (`src/game-engine/embed/mascotEmbed.ts`) portal
 * şablonlarının kullanacağı TEK bir IIFE dosyasına paketler:
 * `docs/portals/assets/templates/mascot.bundle.js` (global: `Mascot`).
 * Şablonlar oyundaki çiziciyle birebir aynı kodu kullanır — kopya yok.
 *
 * Kullanım: node scripts/portal/build-mascot-bundle.mjs  (generate:assets otomatik çağırır)
 */
import { rolldown } from 'rolldown';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = join(ROOT, 'docs/portals/assets/templates/mascot.bundle.js');

const bundle = await rolldown({
  input: join(ROOT, 'src/game-engine/embed/mascotEmbed.ts'),
  resolve: { alias: { '@': join(ROOT, 'src') } },
  platform: 'browser',
  logLevel: 'warn',
});
await bundle.write({ file: OUT, format: 'iife', name: 'Mascot', minify: true });
await bundle.close();
console.log('✓ Maskot paketi:', OUT);
