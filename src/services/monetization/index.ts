/**
 * DOSYA AMACI: `services/monetization`'ın public API'si. Dış tüketiciler (React
 * context/hook katmanı, features) yalnızca bu dosyadan import eder.
 */
export type {
  AdEvent,
  AdEventListener,
  AdProvider,
  AdUnavailableReason,
  InterstitialResult,
  PlatformId,
  RewardedResult,
} from './types';
export { CURRENT_PLATFORM } from './platform';
export { getCapabilities, type PlatformCapabilities } from './capabilities';
export { adService, type InterstitialRequestContext } from './adService';
export { setAdFreeSource, isAdFree, type AdFreeSource } from './entitlement';
export { DEFAULT_FREQUENCY_POLICY, type FrequencyPolicyConfig } from './policy/policyConfig';
export type { FrequencyPolicyState } from './policy/frequencyPolicy';
