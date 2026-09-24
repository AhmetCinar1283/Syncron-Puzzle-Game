import type { EmoteName } from '@/game-engine/mascot/emotes';

/** Bir sahnedeki adım: `at` ms'de `emote` başlar; `stop` verilirse o ifade kesilir. */
export interface SceneStep {
  at: number;
  emote?: EmoteName;
  stop?: EmoteName;
}

export interface HeroScene {
  id: string;
  steps: SceneStep[];
  /** Sahnenin bittiği an (son ifadenin sönmesi için pay dâhil). */
  duration: number;
}

/**
 * Play hücresindeki maskotun mini senaryoları. Süreler `mascot/emotes.ts`
 * sürelerine göre boşluklu: ifadeler birbirine binmez, arka arkaya spam olmaz.
 */
export const HERO_SCENES: HeroScene[] = [
  {
    id: 'hello',
    steps: [{ at: 0, emote: 'wink' }, { at: 1500, emote: 'happy' }],
    duration: 3000,
  },
  {
    id: 'startled-then-relieved',
    steps: [{ at: 0, emote: 'surprised' }, { at: 1400, emote: 'confused' }, { at: 3000, emote: 'happy' }],
    duration: 4500,
  },
  {
    id: 'crush',
    steps: [{ at: 0, emote: 'love' }, { at: 1800, emote: 'wink' }],
    duration: 3200,
  },
  {
    id: 'nap',
    steps: [
      { at: 0, emote: 'sleepy' },
      { at: 3800, stop: 'sleepy' },
      { at: 3900, emote: 'surprised' },
      { at: 5300, emote: 'happy' },
    ],
    duration: 6800,
  },
  {
    id: 'clumsy',
    steps: [{ at: 0, emote: 'nervous' }, { at: 1800, emote: 'ouch' }, { at: 3000, emote: 'dizzy' }, { at: 5200, emote: 'happy' }],
    duration: 6500,
  },
  {
    id: 'cheer',
    steps: [{ at: 0, emote: 'happy' }, { at: 1500, emote: 'celebrate' }],
    duration: 3600,
  },
];

/** Ara sıra tek başına oynayan ifadeler. */
export const HERO_SINGLES: EmoteName[] = ['happy', 'wink', 'love', 'surprised', 'blink'];

const SINGLE_CHANCE = 0.25;

export type HeroPick =
  | { kind: 'scene'; scene: HeroScene }
  | { kind: 'single'; emote: EmoteName; duration: number };

/**
 * Sıradaki gösteriyi seçer. Aynı sahne art arda gelmez; `rand` [0,1) döndürür (test için enjekte).
 */
export function pickHeroShow(rand: () => number, lastId: string | null): HeroPick {
  if (rand() < SINGLE_CHANCE) {
    const emote = HERO_SINGLES[Math.floor(rand() * HERO_SINGLES.length)];
    return { kind: 'single', emote, duration: 1400 };
  }
  const pool = HERO_SCENES.filter(s => s.id !== lastId);
  return { kind: 'scene', scene: pool[Math.floor(rand() * pool.length)] };
}
