/**
 * DOSYA AMACI: CrazyGames SDK v3 script'ini enjekte eder ve `SDK.init()`'i
 * bekler. Sadece `crazyGamesProvider.init()` tarafından çağrılır; birden çok
 * çağrıda aynı promise paylaşılır (idempotent).
 */
import type { CrazyGamesSdk } from './crazyGamesSdkTypes';

const SDK_SCRIPT_URL = 'https://sdk.crazygames.com/crazygames-sdk-v3.js';

let sdkPromise: Promise<CrazyGamesSdk> | null = null;

function injectScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SDK_SCRIPT_URL}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = SDK_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('[crazygames] SDK script yüklenemedi.'));
    document.head.appendChild(script);
  });
}

export function loadCrazyGamesSdk(): Promise<CrazyGamesSdk> {
  if (!sdkPromise) {
    sdkPromise = injectScript()
      .then(async () => {
        const sdk = window.CrazyGames?.SDK;
        if (!sdk) throw new Error('[crazygames] window.CrazyGames.SDK bulunamadı.');
        await sdk.init();
        if (sdk.environment === 'disabled') {
          throw new Error('[crazygames] SDK "disabled" ortamında (CrazyGames domain\'i dışında).');
        }
        return sdk;
      })
      .catch((err) => {
        // Başarısız denemeyi tekrar denenebilir bırak — bir sonraki init() çağrısı yeniden dener.
        sdkPromise = null;
        throw err;
      });
  }
  return sdkPromise;
}
