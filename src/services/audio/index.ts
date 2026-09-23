/**
 * DOSYA AMACI: `services/audio` modülünün tek public API'si. Uygulamanın her yeri
 * sese buradan erişir: `soundEngine.play('ui.tick')` ya da `useSoundManager()`.
 */

export { soundEngine, SoundEngine } from './soundEngine';
export { SOUNDS, SOUND_IDS } from './registry';
export { useSoundManager, useGameSound, useMenuSound } from './useSound';
export { useModalSound, useMountedModalSound } from './useModalSound';
export type { SoundId, SoundChannel } from './soundEngine';
export type { SoundDef, SoundSource, SynthRecipe } from './types';
