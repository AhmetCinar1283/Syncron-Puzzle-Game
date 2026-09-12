/**
 * DOSYA AMACI: `crazyGamesProvider`'ın birim testleri — sahte `window.CrazyGames`
 * ile hata kodu eşlemesi ve ödül/interstitial akışı. Gerçek script yüklemesi
 * yerine `document`/`window` sahte nesnelerle taklit edilir (jsdom yok, `node`
 * ortamında minimal stub yeterli).
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { CrazyGamesAdCallbacks, CrazyGamesSdk } from './crazyGamesSdkTypes';

function makeFakeDocument() {
  const listeners: Record<string, () => void> = {};
  const scriptEl: any = {
    set src(_v: string) {},
    set async(_v: boolean) {},
    set onload(fn: () => void) { listeners.onload = fn; },
    set onerror(fn: () => void) { listeners.onerror = fn; },
  };
  return {
    querySelector: () => null,
    createElement: () => scriptEl,
    head: { appendChild: () => { listeners.onload?.(); } },
  };
}

async function setupModule(sdk: CrazyGamesSdk | null, environment: CrazyGamesSdk['environment'] = 'local') {
  vi.resetModules();
  (globalThis as any).document = makeFakeDocument();
  (globalThis as any).window = {
    CrazyGames: sdk ? { SDK: { ...sdk, environment } } : undefined,
  };
  const { crazyGamesProvider } = await import('./crazyGamesProvider');
  return crazyGamesProvider;
}

function fakeSdk(overrides: Partial<CrazyGamesSdk> = {}): CrazyGamesSdk {
  return {
    init: vi.fn(async () => {}),
    environment: 'local',
    game: {
      loadingStart: vi.fn(),
      loadingStop: vi.fn(),
      gameplayStart: vi.fn(),
      gameplayStop: vi.fn(),
      happytime: vi.fn(),
    },
    ad: {
      requestAd: vi.fn(),
      hasAdblock: vi.fn(async () => false),
    },
    ...overrides,
  };
}

describe('crazyGamesProvider', () => {
  beforeEach(() => {
    delete (globalThis as any).window;
    delete (globalThis as any).document;
  });

  it('init() SDK.init() çağırır ve environment "disabled" ise reddeder', async () => {
    const sdk = fakeSdk();
    const provider = await setupModule(sdk, 'disabled');
    await expect(provider.init()).rejects.toThrow();
  });

  it('showInterstitial: adFinished → shown:true', async () => {
    const sdk = fakeSdk({
      ad: {
        requestAd: (_type, callbacks: CrazyGamesAdCallbacks) => callbacks.adFinished?.(),
        hasAdblock: vi.fn(async () => false),
      },
    });
    const provider = await setupModule(sdk);
    const result = await provider.showInterstitial();
    expect(result).toEqual({ shown: true });
  });

  it('showRewarded: adError(unfilled) → reason:no-fill', async () => {
    const sdk = fakeSdk({
      ad: {
        requestAd: (_type, callbacks: CrazyGamesAdCallbacks) => callbacks.adError?.({ code: 'unfilled' }),
        hasAdblock: vi.fn(async () => false),
      },
    });
    const provider = await setupModule(sdk);
    const result = await provider.showRewarded();
    expect(result).toEqual({ rewarded: false, reason: 'no-fill' });
  });

  it('showRewarded: adError(adblock) → reason:error', async () => {
    const sdk = fakeSdk({
      ad: {
        requestAd: (_type, callbacks: CrazyGamesAdCallbacks) => callbacks.adError?.({ code: 'adblock' }),
        hasAdblock: vi.fn(async () => false),
      },
    });
    const provider = await setupModule(sdk);
    const result = await provider.showRewarded();
    expect(result).toEqual({ rewarded: false, reason: 'error' });
  });

  it('showRewarded: adError(adCooldown) → reason:unsupported', async () => {
    const sdk = fakeSdk({
      ad: {
        requestAd: (_type, callbacks: CrazyGamesAdCallbacks) => callbacks.adError?.({ code: 'adCooldown' }),
        hasAdblock: vi.fn(async () => false),
      },
    });
    const provider = await setupModule(sdk);
    const result = await provider.showRewarded();
    expect(result).toEqual({ rewarded: false, reason: 'unsupported' });
  });
});
