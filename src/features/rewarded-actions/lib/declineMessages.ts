/**
 * DOSYA AMACI: Ödül verilmeme nedenini kullanıcıya gösterilecek nazik mesajın
 * i18n anahtarına çevirir. Kullanıcının kendi vazgeçmesi mesaj gerektirmez.
 */
import type { RewardedDeclineReason } from '@/services/monetization';

const MESSAGE_KEYS: Record<RewardedDeclineReason, string | null> = {
  'quota-exhausted': 'rewarded.decline_quota',
  disabled: 'rewarded.decline_disabled',
  busy: 'rewarded.decline_busy',
  'claim-failed': 'rewarded.decline_claim_failed',
  unavailable: 'rewarded.decline_unavailable',
  'rate-limited': 'rewarded.decline_rate_limited',
  'limit-reached': 'rewarded.decline_limit',
  'not-allowed': 'rewarded.decline_not_allowed',
  'no-fill': 'rewarded.decline_no_fill',
  closed: 'rewarded.decline_closed',
  error: 'rewarded.decline_error',
  timeout: 'rewarded.decline_error',
  unsupported: 'rewarded.decline_error',
};

export function declineMessageKey(reason: RewardedDeclineReason): string | null {
  return MESSAGE_KEYS[reason];
}
