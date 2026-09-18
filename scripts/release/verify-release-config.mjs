#!/usr/bin/env node
/**
 * DOSYA AMACI: Yayın kimliği doğrulama KAPISI. `release:*` script'leri build'den
 * ÖNCE bunu çağırır; eksik ya da test kimliği bulursa `process.exit(1)` ile
 * durdurur. Tüm karar mantığı `lib/` altındaki saf modüllerdedir — bu dosya
 * yalnızca dosya okur, sonucu basar ve çıkış kodu üretir.
 *
 * Kullanım:  node scripts/release/verify-release-config.mjs <platform>
 * Örnek:     node scripts/release/verify-release-config.mjs android
 *
 * TASARIM NOTLARI
 * - Alternatif neydi? Doğrulamayı çalışma zamanına (admobConfig.ts) hata
 *   fırlatacak şekilde koymak. Reddedildi: geliştirme akışını bozardı
 *   (görev §2 hedef 2) ve hatayı ancak oyuncu cihazında gösterirdi. Kapı
 *   build'den önce, geliştiricinin makinesinde konuşur.
 * - Yeni platform eklenince bu dosya değişir mi? Hayır; platform listesi
 *   `lib/releaseConfigRules.mjs` verisinden gelir.
 * - Değer eksik/null gelirse? `.env.local` hiç yoksa da `android/local.properties`
 *   hiç yoksa da script ÇÖKMEZ; boş sözlükle devam eder ve her zorunlu kimlik
 *   "tanımlı değil" hatası verir. Sessiz geçiş yoktur.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDotEnv, parseJavaProperties } from './lib/parseConfigFiles.mjs';
import { evaluateReleaseConfig } from './lib/evaluateReleaseConfig.mjs';
import { KNOWN_RELEASE_PLATFORMS } from './lib/releaseConfigRules.mjs';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Dosya yoksa/okunamazsa boş string — kapı bu yüzden çökmez, hata raporlar. */
function readTextOrEmpty(absolutePath) {
  try {
    return readFileSync(absolutePath, 'utf8');
  } catch {
    return '';
  }
}

/**
 * Next.js'in `.env` öncelik sırası (sondaki kazanır, `process.env` hepsinden
 * üstündür). Yayın build'i `NODE_ENV=production` ile koşar.
 */
const ENV_FILES_IN_PRECEDENCE_ORDER = [
  '.env',
  '.env.production',
  '.env.local',
  '.env.production.local',
];

function loadEnv() {
  /** @type {Record<string, string|undefined>} */
  const merged = {};
  for (const file of ENV_FILES_IN_PRECEDENCE_ORDER) {
    Object.assign(merged, parseDotEnv(readTextOrEmpty(path.join(projectRoot, file))));
  }
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) merged[key] = value;
  }
  return merged;
}

function loadAndroidLocalProperties() {
  return parseJavaProperties(readTextOrEmpty(path.join(projectRoot, 'android', 'local.properties')));
}

function main() {
  const platform = (process.argv[2] ?? '').trim();
  if (!platform) {
    console.error(
      `[release] Platform belirtilmedi.\n  Kullanım: node scripts/release/verify-release-config.mjs <${KNOWN_RELEASE_PLATFORMS.join('|')}>`,
    );
    process.exit(1);
  }

  const report = evaluateReleaseConfig({
    platform,
    env: loadEnv(),
    androidLocalProperties: loadAndroidLocalProperties(),
  });

  console.log(`[release] Yayın kimliği doğrulaması — platform: ${report.platform}`);
  console.log(`[release] Kontrol edilen anahtar sayısı: ${report.checkedKeys.length}`);

  if (report.ok) {
    console.log('[release] ✓ Tüm yayın kimlikleri tanımlı ve hiçbiri test kimliği değil.');
    console.log('[release] Kontrol listesi: docs/release/yayin-kontrol-listesi.md');
    return;
  }

  console.error(`\n[release] ✗ Yayın build'i DURDURULDU — ${report.issues.length} sorun:\n`);
  for (const issue of report.issues) {
    console.error(`  • ${issue.message}`);
    console.error(`    → ${issue.hint}\n`);
  }
  console.error(
    '[release] Gerçek kimlikler depoya GİRMEZ; .env.local ve android/local.properties\n' +
      '          dosyalarına yaz (ikisi de gitignore\'ludur). Ayrıntı:\n' +
      '          docs/release/yayin-kontrol-listesi.md\n' +
      '[release] Geliştirme için test kimlikleriyle çalışmaya devam etmek istiyorsan\n' +
      '          bu kapıyı değil, mevcut `npm run build:*` script\'lerini kullan.',
  );
  process.exit(1);
}

main();
