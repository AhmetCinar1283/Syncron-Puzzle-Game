/**
 * DOSYA AMACI: `services/rateLimit` modülünün tek public API'si.
 * Dışarıdan yalnızca buradan import edilir; iç dosyalar (lib/*) kapalıdır.
 */

export { evaluateRateLimit } from './rateLimitService';
export type { RateLimitRequest, RateLimitOutcome } from './rateLimitService';
export { createMemoryRateLimitStore, sharedRateLimitStore } from './store';
export type { RateLimitStore, RateLimitConsumeInput, RateLimitConsumeResult } from './store';
export {
  RATE_LIMIT_TIERS,
  ENDPOINT_RATE_LIMITS,
  resolveEndpointLimit,
} from './lib/policy';
export type {
  RateLimitRule,
  RateLimitTierName,
  RateLimitEndpointId,
  EndpointLimit,
} from './lib/policy';
export { stepWindow } from './lib/window';
export type { WindowState, WindowStep, WindowStepInput } from './lib/window';
