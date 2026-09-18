/**
 * DOSYA AMACI: `services/rateLimit` modülünün tek public API'si.
 * Dışarıdan yalnızca buradan import edilir; iç dosyalar (lib/*) kapalıdır.
 */

export { evaluateRateLimit } from './rateLimitService';
export type { RateLimitRequest, RateLimitOutcome } from './rateLimitService';
export { createMemoryRateLimitStore, sharedRateLimitStore } from './store';
export { createCloudflareRateLimitStore, hasAnyRateLimiterBinding } from './cloudflareRateLimitStore';
export type { RateLimiterBindingSource } from './cloudflareRateLimitStore';
export { createLayeredRateLimitStore } from './layeredStore';
export { resolveRateLimitStore } from './resolveStore';
export { rateLimiterBindingName, RATE_LIMIT_BINDING_PREFIX, SUPPORTED_BINDING_PERIODS_SEC } from './lib/bindingName';
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
