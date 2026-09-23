/**
 * DOSYA AMACI: Oyun içi basit efektlerin sentez tarifleri.
 */

import type { SynthRecipe } from '../../types';
import { tone } from '../helpers';

/** Duvara/engele çarpma: kısa, mat, alçalan tok vuruş. */
export const bump: SynthRecipe = {
  duration: 0.12,
  build: (ctx) => {
    tone(ctx, { type: 'sine', freq: 160, freqEnd: 70, dur: 0.1, gain: 0.55, attack: 0.002 });
  },
};

/** Yay gibi zıplama: hızlı yükselip yavaşça düşen pitch süpürmesi. */
export const boing: SynthRecipe = {
  duration: 0.35,
  build: (ctx) => {
    tone(ctx, { type: 'sine', freq: 180, freqEnd: 520, dur: 0.12, gain: 0.5, attack: 0.005 });
    tone(ctx, { type: 'sine', freq: 520, freqEnd: 240, start: 0.1, dur: 0.24, gain: 0.45 });
  },
};
