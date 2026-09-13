/**
 * DOSYA AMACI: AdMob UMP (User Messaging Platform) rıza akışını yürütür.
 * GDPR/KVKK gereği AB/İngiltere ve düzenlenmiş ABD eyaletlerindeki kullanıcıya
 * ilk açılışta rıza formu gösterir; rıza alınmadıysa reklamlar
 * KİŞİSELLEŞTİRİLMEMİŞ (npa) olarak istenir. Rıza formu gösterilemese bile
 * akış asla throw etmez — oyun kilitlenmez (bkz. 00-mimari-ilkeler.md §4).
 */
import {
  AdMob,
  AdmobConsentDebugGeography,
  AdmobConsentStatus,
} from '@capacitor-community/admob';
import type { AdmobConsentInfo } from '@capacitor-community/admob';
import { ADMOB_CONFIG } from './admobConfig';

export interface ConsentOutcome {
  /** Reklam isteği yapılabilir mi (UMP'nin `canRequestAds` yanıtı). */
  canRequestAds: boolean;
  /** true ise reklamlar kişiselleştirilmemiş (npa) istenir. */
  nonPersonalized: boolean;
  /** Kullanıcıya "reklam tercihleri" girişi sunulmalı mı (Google şartı). */
  privacyOptionsRequired: boolean;
}

/** Rıza bilinmiyorsa en korumacı varsayım: reklam iste ama kişiselleştirme. */
const FALLBACK_OUTCOME: ConsentOutcome = {
  canRequestAds: true,
  nonPersonalized: true,
  privacyOptionsRequired: false,
};

let lastOutcome: ConsentOutcome = FALLBACK_OUTCOME;

/**
 * Debug/test kimlikleriyle çalışırken formu her zaman görebilmek için coğrafyayı
 * AEA olarak zorlar. Gerçek kimliklerde asla devreye girmez.
 */
function debugGeography(): AdmobConsentDebugGeography | undefined {
  return ADMOB_CONFIG.usingTestIds ? AdmobConsentDebugGeography.EEA : undefined;
}

/**
 * Not: `@capacitor-community/admob@8` `PrivacyOptionsRequirementStatus` enum'unu
 * paket kökünden dışa AÇMIYOR (kendi barrel dosyasının eksiği). Derin dosya
 * yoluna bağımlı kalmamak için değer string olarak karşılaştırılıyor.
 */
const PRIVACY_OPTIONS_REQUIRED = 'REQUIRED';

function toOutcome(info: AdmobConsentInfo): ConsentOutcome {
  return {
    canRequestAds: info.canRequestAds,
    // Yalnızca rıza AÇIKÇA alındıysa kişiselleştirilmiş reklam istenir.
    nonPersonalized: info.status !== AdmobConsentStatus.OBTAINED,
    privacyOptionsRequired: String(info.privacyOptionsRequirementStatus) === PRIVACY_OPTIONS_REQUIRED,
  };
}

/**
 * Rıza durumunu sorgular ve gerekiyorsa formu gösterir.
 * `admobInit` tarafından `AdMob.initialize()`'dan ÖNCE bir kez çağrılır.
 */
export async function runConsentFlow(): Promise<ConsentOutcome> {
  try {
    const info = await AdMob.requestConsentInfo({
      debugGeography: debugGeography(),
      testDeviceIdentifiers: ADMOB_CONFIG.testDeviceIds,
    });

    if (info.status === AdmobConsentStatus.REQUIRED && info.isConsentFormAvailable) {
      const afterForm = await AdMob.showConsentForm();
      lastOutcome = toOutcome(afterForm);
      return lastOutcome;
    }

    lastOutcome = toOutcome(info);
    return lastOutcome;
  } catch (err) {
    console.warn('[admob] Rıza akışı tamamlanamadı, kişiselleştirilmemiş reklamlara düşülüyor:', err);
    lastOutcome = FALLBACK_OUTCOME;
    return lastOutcome;
  }
}

/** Son bilinen rıza sonucu — reklam isteklerinin `npa` bayrağı buradan gelir. */
export function getConsentOutcome(): ConsentOutcome {
  return lastOutcome;
}

/**
 * Kullanıcının rıza tercihini sonradan değiştirmesi için Google'ın gizlilik
 * seçenekleri formunu açar (gizlilik sayfasındaki buton bunu çağırır).
 * Başarılıysa güncel rıza durumunu yeniden okur.
 */
export async function openPrivacyOptionsForm(): Promise<boolean> {
  try {
    await AdMob.showPrivacyOptionsForm();
    const info = await AdMob.requestConsentInfo({
      debugGeography: debugGeography(),
      testDeviceIdentifiers: ADMOB_CONFIG.testDeviceIds,
    });
    lastOutcome = toOutcome(info);
    return true;
  } catch (err) {
    console.warn('[admob] Gizlilik seçenekleri formu açılamadı:', err);
    return false;
  }
}
