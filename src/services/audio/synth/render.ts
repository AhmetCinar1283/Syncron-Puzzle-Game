/**
 * DOSYA AMACI: Bir `SynthRecipe`'i `OfflineAudioContext` ile bir kez
 * `AudioBuffer`'a render eder; böylece sentezlenen sesler dosya seslerle aynı
 * düşük gecikmeli yoldan çalar.
 */

import type { SynthRecipe } from '../types';

export async function renderSynth(recipe: SynthRecipe, sampleRate: number): Promise<AudioBuffer> {
  const Offline: typeof OfflineAudioContext | undefined =
    typeof window !== 'undefined'
      ? (window as unknown as { OfflineAudioContext?: typeof OfflineAudioContext; webkitOfflineAudioContext?: typeof OfflineAudioContext })
          .OfflineAudioContext ??
        (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext
      : undefined;
  if (!Offline) throw new Error('OfflineAudioContext yok');

  const length = Math.max(1, Math.ceil(recipe.duration * sampleRate));
  const ctx = new Offline(1, length, sampleRate);
  recipe.build(ctx);
  return ctx.startRendering();
}
