/**
 * DOSYA AMACI: Bildirim (toast) sesleri için sentez tarifleri.
 */

import type { SynthRecipe } from '../../types';
import { tone } from '../helpers';

export const success: SynthRecipe = {
  duration: 0.3,
  build: (ctx) => {
    tone(ctx, { type: 'sine', freq: 660, dur: 0.12, gain: 0.4 });
    tone(ctx, { type: 'sine', freq: 990, start: 0.1, dur: 0.2, gain: 0.4 });
  },
};

export const error: SynthRecipe = {
  duration: 0.34,
  build: (ctx) => {
    tone(ctx, { type: 'triangle', freq: 330, dur: 0.14, gain: 0.4 });
    tone(ctx, { type: 'triangle', freq: 220, start: 0.12, dur: 0.22, gain: 0.4 });
  },
};

export const warning: SynthRecipe = {
  duration: 0.3,
  build: (ctx) => {
    tone(ctx, { type: 'triangle', freq: 520, dur: 0.1, gain: 0.35 });
    tone(ctx, { type: 'triangle', freq: 520, start: 0.14, dur: 0.14, gain: 0.35 });
  },
};

export const info: SynthRecipe = {
  duration: 0.24,
  build: (ctx) => {
    tone(ctx, { type: 'sine', freq: 780, dur: 0.22, gain: 0.35 });
  },
};

export const message: SynthRecipe = {
  duration: 0.24,
  build: (ctx) => {
    tone(ctx, { type: 'sine', freq: 880, dur: 0.08, gain: 0.3 });
    tone(ctx, { type: 'sine', freq: 1180, start: 0.09, dur: 0.14, gain: 0.3 });
  },
};
