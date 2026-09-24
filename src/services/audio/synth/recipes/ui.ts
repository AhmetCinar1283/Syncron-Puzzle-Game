/**
 * DOSYA AMACI: Arayüz sesleri (hover/d-pad, sayfa geçişi, onay, modal...) için sentez tarifleri.
 * Sesi beğenmezseniz yalnızca bu dosyadaki sayıları değiştirmeniz yeterli.
 */

import type { SynthRecipe } from '../../types';
import { tone } from '../helpers';

/** Sade, sakin hover/d-pad tık sesi. */
export const tick: SynthRecipe = {
  duration: 0.06,
  build: (ctx) => {
    tone(ctx, { type: 'sine', freq: 1500, freqEnd: 1100, dur: 0.05, gain: 0.35, attack: 0.002 });
  },
};

/** Tick'e benzer ama iki notalı, hafif yükselen sayfa geçişi sesi. */
export const navigate: SynthRecipe = {
  duration: 0.16,
  build: (ctx) => {
    tone(ctx, { type: 'sine', freq: 700, dur: 0.06, gain: 0.32 });
    tone(ctx, { type: 'sine', freq: 1050, start: 0.06, dur: 0.09, gain: 0.32 });
  },
};

export const confirm: SynthRecipe = {
  duration: 0.12,
  build: (ctx) => {
    tone(ctx, { type: 'triangle', freq: 660, dur: 0.05, gain: 0.35 });
    tone(ctx, { type: 'triangle', freq: 880, start: 0.05, dur: 0.07, gain: 0.35 });
  },
};

export const back: SynthRecipe = {
  duration: 0.12,
  build: (ctx) => {
    tone(ctx, { type: 'triangle', freq: 880, dur: 0.05, gain: 0.3 });
    tone(ctx, { type: 'triangle', freq: 560, start: 0.05, dur: 0.07, gain: 0.3 });
  },
};

/** Kilitli ya da geçersiz eylem. */
export const denied: SynthRecipe = {
  duration: 0.18,
  build: (ctx) => {
    tone(ctx, { type: 'square', freq: 220, dur: 0.07, gain: 0.18 });
    tone(ctx, { type: 'square', freq: 180, start: 0.08, dur: 0.09, gain: 0.18 });
  },
};

export const toggleOn: SynthRecipe = {
  duration: 0.1,
  build: (ctx) => {
    tone(ctx, { type: 'sine', freq: 600, freqEnd: 900, dur: 0.08, gain: 0.4 });
  },
};

export const toggleOff: SynthRecipe = {
  duration: 0.1,
  build: (ctx) => {
    tone(ctx, { type: 'sine', freq: 900, freqEnd: 600, dur: 0.08, gain: 0.4 });
  },
};

/** Ses slider'ı sürüklenirken önizleme tıkı. */
export const slider: SynthRecipe = {
  duration: 0.04,
  build: (ctx) => {
    tone(ctx, { type: 'sine', freq: 1200, dur: 0.03, gain: 0.3, attack: 0.002 });
  },
};

export const modalOpen: SynthRecipe = {
  duration: 0.16,
  build: (ctx) => {
    tone(ctx, { type: 'sine', freq: 420, freqEnd: 760, dur: 0.14, gain: 0.3, attack: 0.01 });
  },
};

export const modalClose: SynthRecipe = {
  duration: 0.14,
  build: (ctx) => {
    tone(ctx, { type: 'sine', freq: 700, freqEnd: 380, dur: 0.12, gain: 0.3, attack: 0.008 });
  },
};

/** Tema seçildiğinde çalan akıcı, enerjik, oyun hissi veren 3-tonlu yükselen melodi. */
export const themeSelect: SynthRecipe = {
  duration: 0.24,
  build: (ctx) => {
    tone(ctx, { type: 'sine', freq: 523.25, dur: 0.08, gain: 0.3, attack: 0.004 });
    tone(ctx, { type: 'triangle', freq: 659.25, start: 0.06, dur: 0.09, gain: 0.32, attack: 0.004 });
    tone(ctx, { type: 'sine', freq: 783.99, start: 0.12, dur: 0.12, gain: 0.35, attack: 0.004 });
  },
};

