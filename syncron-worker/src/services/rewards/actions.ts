/**
 * DOSYA AMACI: Sunucudaki ödüllü aksiyonların TEK kayıt yeri. 05 (level atlama)
 * buraya bir satır ve bir `RewardActionHandler` ekler.
 */

import { hintAction } from '../hint/hintAction';
import type { RewardActionHandler } from './types';

export const REWARD_ACTIONS = {
  hint: hintAction,
} satisfies Record<string, RewardActionHandler<any>>;

export type RewardActionId = keyof typeof REWARD_ACTIONS;

export const REWARD_ACTION_IDS = Object.keys(REWARD_ACTIONS) as [RewardActionId, ...RewardActionId[]];
