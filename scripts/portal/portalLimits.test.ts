/**
 * DOSYA AMACI: `portalLimits.ts`'in birim testleri — dosya sayısı/boyut sınırı
 * ve mutlak asset yolu tespiti.
 */
import { describe, expect, it } from 'vitest';
import { validatePortalPackage, findAbsoluteReferences, PORTAL_LIMITS } from './portalLimits.mjs';

describe('validatePortalPackage', () => {
  it('sınırlar içindeyse ok döner', () => {
    const result = validatePortalPackage([
      { path: 'index.html', bytes: 1000 },
      { path: '_next/static/chunk.js', bytes: 2000 },
    ]);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('dosya sayısı sınırını aşınca hata verir', () => {
    const files = Array.from({ length: PORTAL_LIMITS.maxFileCount + 1 }, (_, i) => ({
      path: `f${i}.js`,
      bytes: 10,
    }));
    const result = validatePortalPackage(files);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('Dosya sayısı'))).toBe(true);
  });

  it('toplam boyut sınırını aşınca hata verir', () => {
    const result = validatePortalPackage([{ path: 'big.bin', bytes: PORTAL_LIMITS.maxTotalBytes + 1 }]);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('Toplam boyut'))).toBe(true);
  });

  it('50MB üstünde uyarı verir ama başarısız saymaz', () => {
    const result = validatePortalPackage([{ path: 'big.bin', bytes: PORTAL_LIMITS.warnInitialBytes + 1 }]);
    expect(result.ok).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('mutlak yol tespit ederse hata verir', () => {
    const result = validatePortalPackage([{ path: '/absolute/path.js', bytes: 10 }]);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes('Mutlak yol'))).toBe(true);
  });
});

describe('findAbsoluteReferences', () => {
  it('mutlak src referansını bulur', () => {
    const refs = findAbsoluteReferences('<script src="/_next/static/chunk.js"></script>');
    expect(refs.length).toBe(1);
  });

  it('göreli src referansını görmezden gelir', () => {
    const refs = findAbsoluteReferences('<script src="./_next/static/chunk.js"></script>');
    expect(refs.length).toBe(0);
  });

  it('favicon href referansını görmezden gelir (cosmetic, oynanışı etkilemez)', () => {
    const refs = findAbsoluteReferences('<link rel="icon" href="/icon.ico">');
    expect(refs.length).toBe(0);
  });

  it('protokole göreli //cdn.example.com referansını yanlış pozitif saymaz', () => {
    const refs = findAbsoluteReferences('<script src="//cdn.example.com/x.js"></script>');
    expect(refs.length).toBe(0);
  });
});
