/**
 * DOSYA AMACI: Günlük bulmacanın kural sabitleri ve saf kuralları: par'a göre
 * yıldız, seri güncelleme, XP miktarı ve takvim düzenleme kilidi.
 */

import type { StarCount } from '../../types';
import { capStarsForHint } from '../hintScoring';

export const DAILY_POLICY = {
  /** Bulmaca #1'in tarihi (UTC). Paylaşım numarası buna göre hesaplanır. */
  epochDate: '2026-09-15',
  /** Resmî ilk tamamlamada verilen XP (yalnızca XP — totalScore/yıldız liderliği etkilenmez). */
  xpOfficial: 50,
  /** İpucu kullanılmış resmî tamamlamada verilen XP. */
  xpOfficialHinted: 25,
  /** 2★ eşiği: par × bu oran (aşağı yuvarlanır). Kampanyadaki computeStars ile aynı oran. */
  twoStarRatio: 1.2,
  /** Oyuncuya gösterilen arşivin en fazla kaç gün geriye gideceği. */
  archiveMaxDays: 365,
  /** Günlük liderlikte bir istekte dönen en fazla satır. */
  leaderboardMaxLimit: 100,
  /** Admin takviminin bir istekte en fazla kaç gün göstereceği. */
  calendarMaxDays: 90,
  /**
   * Resmî sonuçta saklanan süre üst sınırı (saniye). Süre istemci bildirimidir ve
   * yalnızca eşit hamlede sıralamayı belirler; aşırı değerler kırpılır.
   */
  maxTimeSpentSeconds: 86_400,
} as const;

export type EmptyDayPolicy = 'pool' | 'none';
export const EMPTY_DAY_POLICIES: readonly EmptyDayPolicy[] = ['pool', 'none'];
export const DEFAULT_EMPTY_DAY_POLICY: EmptyDayPolicy = 'pool';

/** Par'a göre yıldız; ipucu kullanıldıysa en fazla 2. */
export function starsForMoves(moves: number, par: number, hinted: boolean): StarCount {
  let stars: StarCount = 1;
  if (moves <= par) stars = 3;
  else if (moves <= Math.floor(par * DAILY_POLICY.twoStarRatio)) stars = 2;
  return capStarsForHint(stars, hinted);
}

export function xpForOfficial(hinted: boolean): number {
  return hinted ? DAILY_POLICY.xpOfficialHinted : DAILY_POLICY.xpOfficial;
}

export interface StreakState {
  current: number;
  best: number;
  lastDate: string | null;
}

/**
 * Resmî tamamlamadan sonraki seri. `yesterday` çağıran tarafından verilir (saf kalsın).
 * Aynı gün ikinci kez çağrılırsa değişmez (idempotent).
 */
export function nextStreak(prev: StreakState, date: string, yesterday: string): StreakState {
  if (prev.lastDate === date) return prev;
  const current = prev.lastDate === yesterday ? prev.current + 1 : 1;
  return { current, best: Math.max(prev.best, current), lastDate: date };
}

/** Oyuncuya gösterilen seri: son tamamlama dünden eskiyse seri kırılmıştır. */
export function visibleStreak(state: StreakState, today: string, yesterday: string): number {
  return state.lastDate === today || state.lastDate === yesterday ? state.current : 0;
}

export type ScheduleEditCheck = { ok: true } | { ok: false; reason: 'date-in-past' | 'date-has-results' };

/**
 * Takvim kilidi: geçmiş gün değiştirilemez; bugünün ataması yalnızca henüz resmî
 * sonuç yoksa değişebilir (oyuncular arasında adaleti korur).
 */
export function canEditScheduleDate(date: string, today: string, resultsForDate: number): ScheduleEditCheck {
  if (date < today) return { ok: false, reason: 'date-in-past' };
  if (date === today && resultsForDate > 0) return { ok: false, reason: 'date-has-results' };
  return { ok: true };
}
