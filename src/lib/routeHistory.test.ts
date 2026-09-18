import { beforeEach, describe, expect, it } from 'vitest';
import { __resetRouteHistory, getPreviousRoute, normalizePath, recordRouteVisit } from './routeHistory';
import { getRouteLabelKey, isKnownAppRoute } from './routeLabels';

describe('routeHistory - normalizePath', () => {
  it('trailing slash, query ve hash parçalarını temizler', () => {
    expect(normalizePath('/levels/')).toBe('/levels');
    expect(normalizePath('/editor?id=3')).toBe('/editor');
    expect(normalizePath('/editor#tools')).toBe('/editor');
    expect(normalizePath('')).toBe('/');
    expect(normalizePath(null)).toBe('/');
  });
});

describe('routeHistory - ziyaret geçmişi', () => {
  beforeEach(() => {
    __resetRouteHistory();
  });

  it('bir önceki farklı sayfayı döndürür', () => {
    recordRouteVisit('/levels');
    recordRouteVisit('/editor');
    expect(getPreviousRoute('/editor')).toBe('/levels');
  });

  it('aynı sayfanın tekrarlarını atlar', () => {
    recordRouteVisit('/admin/level-parts');
    recordRouteVisit('/editor');
    recordRouteVisit('/editor?id=7');
    expect(getPreviousRoute('/editor')).toBe('/admin/level-parts');
  });

  it('kayıt yoksa null döner', () => {
    expect(getPreviousRoute('/editor')).toBeNull();
    recordRouteVisit('/editor');
    expect(getPreviousRoute('/editor')).toBeNull();
  });
});

describe('routeLabels', () => {
  it('bilinen yollar için sayfa adı anahtarını verir', () => {
    expect(getRouteLabelKey('/levels')).toBe('nav.levels');
    expect(getRouteLabelKey('/admin/level-parts')).toBe('nav.level_parts');
    expect(getRouteLabelKey('/admin/whatever')).toBe('nav.admin');
    expect(getRouteLabelKey('/')).toBe('common.back_menu');
  });

  it('bilinmeyen yollar menüye düşer', () => {
    expect(getRouteLabelKey('/kvkk')).toBe('common.back_menu');
    expect(isKnownAppRoute('/kvkk')).toBe(false);
    expect(isKnownAppRoute('/levels')).toBe(true);
  });
});
