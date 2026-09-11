export const CATEGORIES = [
  { id: 'stars', labelKey: 'leaderboard.cat_stars', periods: ['daily', 'weekly', 'all_time'], color: '#00ff88', glow: 'rgba(0, 255, 136, 0.4)' },
  { id: 'levels', labelKey: 'leaderboard.cat_levels', periods: ['daily', 'weekly', 'all_time'], color: '#00c4ff', glow: 'rgba(0, 196, 255, 0.4)' },
  { id: 'records', labelKey: 'leaderboard.cat_records', periods: ['daily', 'weekly', 'all_time'], color: '#ffd700', glow: 'rgba(255, 215, 0, 0.4)' },
  { id: 'creators', labelKey: 'leaderboard.cat_creators', periods: ['monthly', 'all_time'], color: '#bf5fff', glow: 'rgba(191, 95, 255, 0.4)' },
  { id: 'friends', labelKey: 'leaderboard.cat_friends', periods: ['weekly'], color: '#ec4899', glow: 'rgba(236, 72, 153, 0.4)' },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]['id'];
export type PeriodId = 'daily' | 'weekly' | 'monthly' | 'all_time';
