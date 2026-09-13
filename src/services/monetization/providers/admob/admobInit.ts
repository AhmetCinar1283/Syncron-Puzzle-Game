/**
 * DOSYA AMACI: AdMob SDK'sını idempotent şekilde başlatır: önce UMP rıza akışı,
 * ardından `AdMob.initialize()`. Birden çok çağrıda aynı promise paylaşılır;
 * başarısız bir deneme temizlenir ki sonraki çağrı yeniden denesin.
 */
import { AdMob, MaxAdContentRating } from '@capacitor-community/admob';
import { ADMOB_CONFIG } from './admobConfig';
import { runConsentFlow } from './admobConsent';

let initPromise: Promise<void> | null = null;

export function initAdMob(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      // Rıza, ilk reklam isteğinden ÖNCE çözülmeli (Google şartı).
      await runConsentFlow();
      await AdMob.initialize({
        testingDevices: ADMOB_CONFIG.testDeviceIds,
        initializeForTesting: ADMOB_CONFIG.testDeviceIds.length > 0,
        // Bulmaca oyunu; içerik her yaşa uygun ama çocuklara YÖNELİK değil.
        maxAdContentRating: MaxAdContentRating.General,
      });
    })().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}
