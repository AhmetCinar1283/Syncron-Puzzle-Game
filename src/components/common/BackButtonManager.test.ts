import { beforeEach, describe, expect, it } from 'vitest';
import { normalizePath, getHierarchicalBackRoute, getEditorBackRoute } from './BackButtonManager';
import { __resetRouteHistory, recordRouteVisit } from '@/lib/routeHistory';

describe('BackButtonManager - normalizePath', () => {
  it('trailing slash barındıran yolları temizler', () => {
    expect(normalizePath('/play/')).toBe('/play');
    expect(normalizePath('/levels/')).toBe('/levels');
    expect(normalizePath('/admin/users/')).toBe('/admin/users');
  });

  it('slash barındırmayan normal yolları olduğu gibi korur', () => {
    expect(normalizePath('/play')).toBe('/play');
    expect(normalizePath('/levels')).toBe('/levels');
  });

  it('search parametrelerini yoldan ayıklar', () => {
    expect(normalizePath('/play?id=1&source=preset')).toBe('/play');
    expect(normalizePath('/play/?id=2')).toBe('/play');
  });

  it('kök dizin ve boş değerleri doğru ele alır', () => {
    expect(normalizePath('/')).toBe('/');
    expect(normalizePath('///')).toBe('/');
    expect(normalizePath('')).toBe('/');
    expect(normalizePath(null)).toBe('/');
    expect(normalizePath(undefined)).toBe('/');
  });
});

describe('BackButtonManager - getHierarchicalBackRoute', () => {
  it('/play her zaman /levels rotasına dönmelidir', () => {
    expect(getHierarchicalBackRoute('/play')).toBe('/levels');
    expect(getHierarchicalBackRoute('/play/')).toBe('/levels');
    expect(getHierarchicalBackRoute('/play?id=5')).toBe('/levels');
  });

  it('ana menü sayfaları kök dizine (/) dönmelidir', () => {
    expect(getHierarchicalBackRoute('/levels')).toBe('/');
    expect(getHierarchicalBackRoute('/levels/')).toBe('/');
    expect(getHierarchicalBackRoute('/profile')).toBe('/');
    expect(getHierarchicalBackRoute('/friends')).toBe('/');
    expect(getHierarchicalBackRoute('/controls')).toBe('/');
    expect(getHierarchicalBackRoute('/admin')).toBe('/');
    expect(getHierarchicalBackRoute('/leaderboard')).toBe('/');
  });

  it('admin alt sayfaları /admin rotasına dönmelidir', () => {
    expect(getHierarchicalBackRoute('/admin/users')).toBe('/admin');
    expect(getHierarchicalBackRoute('/admin/reports/')).toBe('/admin');
  });

  it('kök dizin için hiyerarşik yönlendirme null olmalıdır (çıkış/varsayılan)', () => {
    expect(getHierarchicalBackRoute('/')).toBeNull();
  });
});

describe('BackButtonManager - editör geri hedefi', () => {
  beforeEach(() => {
    __resetRouteHistory();
  });

  it('kayıt yoksa ana menüye düşer', () => {
    expect(getEditorBackRoute()).toBe('/');
    expect(getHierarchicalBackRoute('/editor')).toBe('/');
  });

  it('editöre gelinen sayfaya döner', () => {
    recordRouteVisit('/admin/level-parts');
    recordRouteVisit('/editor');
    expect(getEditorBackRoute()).toBe('/admin/level-parts');
    expect(getHierarchicalBackRoute('/editor')).toBe('/admin/level-parts');
  });

  it('uygulama dışı/bilinmeyen yolları hedef olarak kabul etmez', () => {
    recordRouteVisit('/kvkk');
    recordRouteVisit('/editor');
    expect(getEditorBackRoute()).toBe('/');
  });
});
