/**
 * DOSYA AMACI: `detectPlatformLanguage` akışının testleri — kaynak yok / hata /
 * zaman aşımı / desteklenmeyen dil durumlarında "en" fallback'i ve gerçek
 * CrazyGames kaynağının sahte SDK ile uçtan uca çalışması.
 */
/* eslint-disable @typescript-eslint/no-explicit-any -- window/document sahte nesneleri */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlatformLocaleSource } from './types';

const loadLocaleSourceFor = vi.fn();
vi.mock('./registry', () => ({ loadLocaleSourceFor: (p: string) => loadLocaleSourceFor(p) }));

async function load() {
  return import('./detectPlatformLanguage');
}

function sourceReturning(locale: string | null): Promise<PlatformLocaleSource> {
  return Promise.resolve({ getLocale: async () => locale });
}

describe('detectPlatformLanguage', () => {
  beforeEach(() => {
    loadLocaleSourceFor.mockReset();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('kaynağı olmayan platformda "en" döner ve hasLocaleSource false', async () => {
    loadLocaleSourceFor.mockReturnValue(null);
    const { detectPlatformLanguage, hasLocaleSource } = await load();
    expect(hasLocaleSource('web')).toBe(false);
    expect(await detectPlatformLanguage('web')).toBe('en');
  });

  it('desteklenen dili döner (tr-TR → tr)', async () => {
    loadLocaleSourceFor.mockReturnValue(sourceReturning('tr-TR'));
    const { detectPlatformLanguage } = await load();
    expect(await detectPlatformLanguage('crazygames')).toBe('tr');
  });

  it('desteklenmeyen dilde "en" döner', async () => {
    loadLocaleSourceFor.mockReturnValue(sourceReturning('ja-JP'));
    const { detectPlatformLanguage } = await load();
    expect(await detectPlatformLanguage('crazygames')).toBe('en');
  });

  it('locale null ise "en" döner', async () => {
    loadLocaleSourceFor.mockReturnValue(sourceReturning(null));
    const { detectPlatformLanguage } = await load();
    expect(await detectPlatformLanguage('crazygames')).toBe('en');
  });

  it('kaynak hata fırlatırsa throw etmez, "en" döner', async () => {
    loadLocaleSourceFor.mockReturnValue(
      Promise.resolve({ getLocale: async () => { throw new Error('sdk yok'); } }),
    );
    const { detectPlatformLanguage } = await load();
    expect(await detectPlatformLanguage('crazygames')).toBe('en');
  });

  it('kaynak yüklenemezse (import hatası) "en" döner', async () => {
    loadLocaleSourceFor.mockReturnValue(Promise.reject(new Error('chunk yüklenemedi')));
    const { detectPlatformLanguage } = await load();
    expect(await detectPlatformLanguage('crazygames')).toBe('en');
  });

  it('SDK asılırsa zaman aşımında "en" döner', async () => {
    loadLocaleSourceFor.mockReturnValue(
      Promise.resolve({ getLocale: () => new Promise<string>(() => {}) }),
    );
    const { detectPlatformLanguage } = await load();
    expect(await detectPlatformLanguage('crazygames', 20)).toBe('en');
  });
});

describe('crazyGamesLocaleSource', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock('./registry');
    const listeners: Record<string, () => void> = {};
    const scriptEl: any = {
      set src(_v: string) {},
      set async(_v: boolean) {},
      set onload(fn: () => void) { listeners.onload = fn; },
      set onerror(fn: () => void) { listeners.onerror = fn; },
    };
    (globalThis as any).document = {
      querySelector: () => null,
      createElement: () => scriptEl,
      head: { appendChild: () => { listeners.onload?.(); } },
    };
  });
  afterEach(() => {
    delete (globalThis as any).window;
    delete (globalThis as any).document;
  });

  function setSdk(user: unknown) {
    (globalThis as any).window = {
      CrazyGames: { SDK: { init: async () => {}, environment: 'crazygames', user } },
    };
  }

  it('SDK\'nın user.systemInfo.locale değerini okur', async () => {
    setSdk({ systemInfo: { locale: 'pt-BR' } });
    const { crazyGamesLocaleSource } = await import('./sources/crazyGamesLocale');
    expect(await crazyGamesLocaleSource.getLocale()).toBe('pt-BR');
  });

  it('SDK user bilgisi vermezse null döner', async () => {
    setSdk(undefined);
    const { crazyGamesLocaleSource } = await import('./sources/crazyGamesLocale');
    expect(await crazyGamesLocaleSource.getLocale()).toBeNull();
  });
});

describe('registry (gerçek)', () => {
  it('yalnızca crazygames için kaynak tanımlar', async () => {
    vi.resetModules();
    vi.doUnmock('./registry');
    const { loadLocaleSourceFor: real } = await import('./registry');
    expect(real('web')).toBeNull();
    expect(real('android')).toBeNull();
    expect(real('electron')).toBeNull();
    expect(real('gamedistribution')).toBeNull();
    expect(real('mock')).toBeNull();
    expect(real('crazygames')).not.toBeNull();
  });
});
