/**
 * DOSYA AMACI: `features/rewarded-actions`'ın public API'si. Ödüllü aksiyon
 * kullanan feature'lar (play → ipucu, ileride level atlama) yalnızca buradan import eder.
 */
export { useRewardedAction, type UseRewardedActionResult, type RewardedActionSteps } from './hooks/useRewardedAction';
export { RewardedActionDialog } from './components/RewardedActionDialog';
export { declineMessageKey } from './lib/declineMessages';
