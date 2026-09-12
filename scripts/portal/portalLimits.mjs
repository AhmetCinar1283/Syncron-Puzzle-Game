/**
 * DOSYA AMACI: Portal build doğrulama kurallarının saf, test edilebilir hâli.
 * `package-portal.mjs` bunu dosya sistemi üzerinde çalıştırır;
 * `portalLimits.test.ts` aynı fonksiyonu sahte bir dosya listesiyle test eder.
 * Kaynak: CrazyGames teknik gereksinimleri (docs.crazygames.com/requirements/technical).
 */

export const PORTAL_LIMITS = {
  /** Toplam paket boyutu (bayt) — CrazyGames sınırı: 250MB. */
  maxTotalBytes: 250 * 1024 * 1024,
  /** Dosya sayısı — CrazyGames sınırı: 1500. */
  maxFileCount: 1500,
  /** Bu sınırın üzeri "ilk yükleme" için uyarı verir (mobil vitrin: 20MB, genel: 50MB). */
  warnInitialBytes: 50 * 1024 * 1024,
};

/**
 * @param {{ path: string; bytes: number }[]} files
 * @returns {{ ok: boolean; errors: string[]; warnings: string[]; totalBytes: number }}
 */
export function validatePortalPackage(files) {
  const errors = [];
  const warnings = [];

  const totalBytes = files.reduce((sum, f) => sum + f.bytes, 0);

  if (files.length > PORTAL_LIMITS.maxFileCount) {
    errors.push(`Dosya sayısı ${files.length}, sınır ${PORTAL_LIMITS.maxFileCount}.`);
  }
  if (totalBytes > PORTAL_LIMITS.maxTotalBytes) {
    errors.push(`Toplam boyut ${(totalBytes / 1024 / 1024).toFixed(1)}MB, sınır ${PORTAL_LIMITS.maxTotalBytes / 1024 / 1024}MB.`);
  }
  if (totalBytes > PORTAL_LIMITS.warnInitialBytes) {
    warnings.push(`Toplam boyut ${(totalBytes / 1024 / 1024).toFixed(1)}MB — mobil vitrin için önerilen 20MB, genel eşik 50MB üstünde.`);
  }

  for (const f of files) {
    if (/^\/|^[a-zA-Z]:\\/.test(f.path)) {
      errors.push(`Mutlak yol tespit edildi: ${f.path}`);
    }
  }

  return { ok: errors.length === 0, errors, warnings, totalBytes };
}

/**
 * `index.html` içeriğinde kalmış mutlak asset yollarını arar (`src="/_next/...`
 * gibi) — bunlar gerçekten 404 verir. `<link rel="icon" href="/...">` gibi
 * favicon referansları bilerek dışarıda bırakılır: iframe'de zaten görünmez,
 * sessizce 404 verse de oynanışı etkilemez (asset/script `src=` referanslarının
 * aksine).
 */
export function findAbsoluteReferences(html) {
  const matches = html.match(/\ssrc="\/(?!\/)/g) ?? [];
  return matches;
}
