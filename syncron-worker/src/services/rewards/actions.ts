/**
 * DOSYA AMACI: Sunucudaki ödüllü aksiyonların TEK kayıt yeri. Yeni bir aksiyon
 * buraya bir satır ve bir `RewardActionHandler` ekler (ipucu: 04, level atlama: 05).
 */

import { hintAction } from '../hint/hintAction';
import { skipLevelAction } from '../skipLevel/skipLevelAction';
import type { RewardActionHandler } from './types';

export const REWARD_ACTIONS = {
  hint: hintAction,
  'skip-level': skipLevelAction,
} satisfies Record<string, RewardActionHandler<any>>;

export type RewardActionId = keyof typeof REWARD_ACTIONS;

export const REWARD_ACTION_IDS = Object.keys(REWARD_ACTIONS) as [RewardActionId, ...RewardActionId[]];
