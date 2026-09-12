/**
 * DOSYA AMACI: GameDistribution SDK script'ini enjekte eder, `GD_OPTIONS`'ı
 * (gameId + olay dinleyicisi) build zamanı env değişkeninden kurar ve
 * `SDK_READY` olayını bekler. Aynı zamanda basit bir olay yayıcı sağlar —
 * `gameDistributionProvider` `SDK_REWARDED_WATCH_COMPLETE`'i buradan dinler.
 */
import type { GdEvent, GdEventName, GdSdk } from './gdSdkTypes';

const SDK_SCRIPT_URL = 'https://html5.api.gamedistribution.com/main.min.js';
// GD panelinden alınan gerçek ID henüz yoksa SDK'nın kendi test ID'siyle
// (sahte reklamlar) çalışır — build kırılmaz, sadece reklamlar test modunda kalır.
const GD_TEST_GAME_ID = '00000000-0000-0000-0000-000000000000';

type Listener = (event: GdEvent) => void;
const listeners = new Set<Listener>();

export function onGdEvent(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function waitForEvent(name: GdEventName, timeoutMs = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      unsubscribe();
      reject(new Error(`[gamedistribution] "${name}" olayı zaman aşımına uğradı.`));
    }, timeoutMs);
    const unsubscribe = onGdEvent((event) => {
      if (event.name === name) {
        clearTimeout(timer);
        unsubscribe();
        resolve();
      }
    });
  });
}

function injectScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById('gamedistribution-jssdk')) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = 'gamedistribution-jssdk';
    script.src = SDK_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('[gamedistribution] SDK script yüklenemedi.'));
    document.head.appendChild(script);
  });
}

let sdkPromise: Promise<GdSdk> | null = null;

export function loadGdSdk(): Promise<GdSdk> {
  if (!sdkPromise) {
    const gameId = process.env.NEXT_PUBLIC_GD_GAME_ID;
    if (!gameId) {
      console.warn('[gamedistribution] NEXT_PUBLIC_GD_GAME_ID ayarlanmamış, SDK test ID\'siyle çalışacak.');
    }
    window.GD_OPTIONS = {
      gameId: gameId || GD_TEST_GAME_ID,
      onEvent: (event) => listeners.forEach((listener) => listener(event)),
    };

    const readyPromise = waitForEvent('SDK_READY');
    sdkPromise = injectScript()
      .then(() => readyPromise)
      .then(() => {
        if (!window.gdsdk) throw new Error('[gamedistribution] window.gdsdk bulunamadı.');
        return window.gdsdk;
      })
      .catch((err) => {
        sdkPromise = null;
        throw err;
      });
  }
  return sdkPromise;
}
