/**
 * DOSYA AMACI: `gameDistributionProvider`'ın birim testleri — ödülün SADECE
 * `SDK_REWARDED_WATCH_COMPLETE` olayı geldiğinde verildiğini doğrular
 * (`showAd()` promise'i başarıyla çözülse bile tek başına yeterli değildir).
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { GdEvent, GdSdk } from './gdSdkTypes';

function makeFakeDocument(onAppend: () => void) {
  const scriptEl: any = {
    set id(_v: string) {},
    set src(_v: string) {},
    set async(_v: boolean) {},
    set onload(fn: () => void) { (scriptEl as any)._onload = fn; },
    set onerror(_fn: () => void) {},
  };
  return {
    getElementById: () => null,
    createElement: () => scriptEl,
    head: {
      appendChild: () => {
        onAppend();
        scriptEl._onload?.();
      },
    },
  };
}

async function setupModule(sdk: GdSdk) {
  vi.resetModules();
  const win: any = {};
  (globalThis as any).window = win;
  (globalThis as any).document = makeFakeDocument(() => {
    // SDK script "yüklendiğinde" gdsdk'yı global'e koy ve SDK_READY yayınla.
    win.gdsdk = sdk;
    win.GD_OPTIONS.onEvent({ name: 'SDK_READY' } satisfies GdEvent);
  });
  const mod = await import('./gameDistributionProvider');
  return { provider: mod.gameDistributionProvider, emit: (e: GdEvent) => win.GD_OPTIONS.onEvent(e) };
}

function fakeSdk(overrides: Partial<GdSdk> = {}): GdSdk {
  return {
    showAd: vi.fn(async () => {}),
    preloadAd: vi.fn(async () => {}),
    ...overrides,
  };
}

describe('gameDistributionProvider', () => {
  beforeEach(() => {
    delete (globalThis as any).window;
    delete (globalThis as any).document;
  });

  it('showRewarded: SDK_REWARDED_WATCH_COMPLETE gelmezse ödül verilmez (showAd başarılı olsa bile)', async () => {
    const sdk = fakeSdk({ showAd: vi.fn(async () => {}) });
    const { provider } = await setupModule(sdk);
    const result = await provider.showRewarded();
    expect(result).toEqual({ rewarded: false, reason: 'closed' });
  });

  it('showRewarded: SDK_REWARDED_WATCH_COMPLETE gelirse ödül verilir', async () => {
    // Olay, provider `await sdk.showAd('rewarded')`'ı beklerken (o çözülmeden
    // ÖNCE) gelmeli — bu yüzden mock, kendi içinden emit eder (closure ile
    // `emit`'e sonradan atanır; showAd yalnızca showRewarded() çağrıldığında
    // ve `emit` zaten atanmışken invoke edilir).
    let emit!: (e: GdEvent) => void;
    const sdk = fakeSdk({
      showAd: vi.fn(async () => {
        emit({ name: 'SDK_REWARDED_WATCH_COMPLETE' });
      }),
    });
    const setup = await setupModule(sdk);
    emit = setup.emit;
    const result = await setup.provider.showRewarded();
    expect(result).toEqual({ rewarded: true });
  });

  it('showAd reddederse reason:error döner', async () => {
    const sdk = fakeSdk({ showAd: vi.fn(async () => { throw new Error('boom'); }) });
    const { provider } = await setupModule(sdk);
    const result = await provider.showRewarded();
    expect(result).toEqual({ rewarded: false, reason: 'error' });
  });

  it('showInterstitial: showAd başarılıysa shown:true döner', async () => {
    const sdk = fakeSdk();
    const { provider } = await setupModule(sdk);
    const result = await provider.showInterstitial();
    expect(result).toEqual({ shown: true });
  });
});
