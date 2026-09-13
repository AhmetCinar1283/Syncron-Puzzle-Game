/**
 * DOSYA AMACI: Ödüllü aksiyon uçları (`/rewards/prepare|claim|cancel`) için Zod şemaları.
 * Aksiyona özgü girdi (ör. ipucunun hamle geçmişi) ilgili handler'da doğrulanır.
 */

import { z } from 'zod';
import { REWARD_ACTION_IDS } from '../services/rewards/actions';
import { REWARD_GRANT_VIAS } from '../services/rewards/rewardGrants';

export const prepareRewardSchema = z.object({
  action: z.enum(REWARD_ACTION_IDS, { required_error: 'Invalid action' }),
  levelId: z.string().min(1).max(128).nullable().default(null),
  input: z.unknown(),
  /** İstemcinin platformu — yalnızca kanıt/analiz amaçlı saklanır, karar vermez. */
  platform: z.string().max(32).nullable().default(null),
});

export const claimRewardSchema = z.object({
  requestId: z.string({ required_error: 'Missing requestId' }).uuid(),
  via: z.enum(REWARD_GRANT_VIAS, { required_error: 'Invalid via' }),
});

export const cancelRewardSchema = z.object({
  requestId: z.string({ required_error: 'Missing requestId' }).uuid(),
  /** İstemcinin bildirdiği neden (ör. reklam no-fill / kapatıldı). */
  reason: z.enum(['no-fill', 'closed', 'error', 'timeout', 'unsupported']),
});
