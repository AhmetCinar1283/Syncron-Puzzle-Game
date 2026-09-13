/**
 * DOSYA AMACI: `game-engine/hint` modülünün public API'si (yalnızca gösterim;
 * ipucu hesaplaması sunucudadır).
 */
export type { ActiveHint, HintMoveCode, ServerHint } from './types';
export { startHint, advanceOnMove, advanceOnUndo, advanceOnRestart } from './hintProgress';
export { getHintTargets, type HintTarget } from './hintTargets';
