import type { EmoteName } from '@/game-engine/mascot/emotes';

/** Seçili seviyenin maskotun tepkisini belirleyen durumu. */
export interface LevelMoodState {
  isLocked: boolean;
  isCompleted: boolean;
  isSkipped: boolean;
  /** Sıradaki oynanacak seviye. */
  isCurrent: boolean;
  stars: number;
}

const MOODS = {
  locked: ['nervous', 'sad', 'confused'],
  skipped: ['confused', 'wink'],
  current: ['wink', 'happy', 'surprised'],
  perfect: ['love', 'celebrate', 'happy'],
  done: ['happy', 'wink'],
  idle: ['happy', 'blink'],
} as const satisfies Record<string, readonly EmoteName[]>;

/** Seçilen seviyeye uygun sakin bir ifade seçer; `rand` [0,1) döndürür (test için enjekte). */
export function pickLevelMood(state: LevelMoodState, rand: () => number): EmoteName {
  const pool: readonly EmoteName[] = state.isLocked
    ? MOODS.locked
    : state.isSkipped
      ? MOODS.skipped
      : state.isCurrent
        ? MOODS.current
        : state.isCompleted
          ? state.stars >= 3 ? MOODS.perfect : MOODS.done
          : MOODS.idle;
  return pool[Math.floor(rand() * pool.length)];
}

/** Maskot, kullanıcı seçimi bıraktıktan bu kadar sonra tepki verir (ms). */
export const MOOD_SETTLE_MS = 700;
/** İki tepki arası en az bekleme (ms) ve her seçimde tepki verme olasılığı — bunaltmasın. */
export const MOOD_COOLDOWN_MS = 4500;
export const MOOD_CHANCE = 0.6;

/** Maskotun seviye düğümüne göre duracağı yer: düğümün merkeze bakan yanı (taşmaz). */
export function companionAnchor(xPercent: number, yPx: number, nodeSize: number, mascotSize: number) {
  const side = xPercent < 50 ? 1 : -1;
  const offset = nodeSize / 2 + 8 + mascotSize / 2;
  return { x: `calc(${xPercent}% + ${side * offset}px)`, y: yPx };
}
