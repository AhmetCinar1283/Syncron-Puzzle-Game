import { LeaderboardEntry } from '@/services/api/leaderboardClient';

export type ShowcaseBadge = NonNullable<LeaderboardEntry['showcaseBadges']>[number];
