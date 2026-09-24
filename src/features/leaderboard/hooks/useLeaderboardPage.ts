'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/contexts/LanguageContext';
import { useAuthContext } from '@/contexts/AuthContext';
import { useGamepad } from '@/hooks/useGamepad';
import { useLeaderboard } from './useLeaderboard';
import { LeaderboardEntry } from '@/services/api/leaderboardClient';
import { CATEGORIES, CategoryId, PeriodId } from '../lib/constants';
import { ShowcaseBadge } from '../lib/types';

export type StandingSection =
  | { status: 'unauthenticated' }
  | { status: 'loading' }
  | { status: 'no_score' }
  | { status: 'ranked'; entries: LeaderboardEntry[] };

export function useLeaderboardPage() {
  const t = useT();
  const router = useRouter();
  const { user, isAnonymous } = useAuthContext();

  const [catIndex, setCatIndex] = useState(0);
  const [periodIndex, setPeriodIndex] = useState(0);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  const activeCategory = CATEGORIES[catIndex];
  const activePeriod = activeCategory.periods[Math.min(periodIndex, activeCategory.periods.length - 1)] as PeriodId;

  // Kategori değişince periyot indeksi taşabilir. Bu düzeltme render sırasında
  // yapılır (React'in "prop/state değişince state'i ayarla" örüntüsü): koşul kendi
  // kendini kapattığı için döngü oluşmaz ve kullanıcı geçersiz indeksle çizilmiş
  // bir kare görmez. Efektte yapılması fazladan bir render turu demekti.
  if (periodIndex > activeCategory.periods.length - 1) {
    setPeriodIndex(0);
  }

  // Main leaderboard query (Top 50)
  const isFriendsCategory = activeCategory.id === 'friends';

  // Call hook only for valid API categories
  const apiCategory = isFriendsCategory ? 'stars' : activeCategory.id;
  const apiPeriod = isFriendsCategory ? 'weekly' : activePeriod;

  const { data, loading, error, refresh } = useLeaderboard(
    apiCategory as Exclude<CategoryId, 'friends'>,
    apiPeriod,
    { friendsOnly: isFriendsCategory }
  );

  // Anonim oyuncu listelerde görünmez ama kendi sırasını görebilir: around_me yanıtı
  // onun satırını yalnızca kendi yanıtına ekler.
  const shouldFetchAroundMe = !!user && !isFriendsCategory;
  const { data: aroundMeData, loading: aroundMeLoading } = useLeaderboard(
    apiCategory as Exclude<CategoryId, 'friends'>,
    apiPeriod,
    { aroundMe: shouldFetchAroundMe }
  );

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        router.push('/');
      } else if (e.key === 'ArrowLeft') {
        setCatIndex((prev) => (prev - 1 + CATEGORIES.length) % CATEGORIES.length);
      } else if (e.key === 'ArrowRight') {
        setCatIndex((prev) => (prev + 1) % CATEGORIES.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const currentPeriods = CATEGORIES[catIndex].periods;
        setPeriodIndex((prev) => (prev - 1 + currentPeriods.length) % currentPeriods.length);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const currentPeriods = CATEGORIES[catIndex].periods;
        setPeriodIndex((prev) => (prev + 1) % currentPeriods.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [catIndex, router]);

  // Gamepad controls
  useGamepad({
    onMove: (dir) => {
      if (dir === 'left') {
        setCatIndex((prev) => (prev - 1 + CATEGORIES.length) % CATEGORIES.length);
      } else if (dir === 'right') {
        setCatIndex((prev) => (prev + 1) % CATEGORIES.length);
      } else if (dir === 'up') {
        const currentPeriods = CATEGORIES[catIndex].periods;
        setPeriodIndex((prev) => (prev - 1 + currentPeriods.length) % currentPeriods.length);
      } else if (dir === 'down') {
        const currentPeriods = CATEGORIES[catIndex].periods;
        setPeriodIndex((prev) => (prev + 1) % currentPeriods.length);
      }
    },
    onMenu: () => {
      router.push('/');
    },
    onConfirm: () => {
      refresh();
    }
  });

  // Split entries into Podium (1, 2, 3) and List (4+)
  const entries = data?.entries ?? [];
  const podiumEntries = useMemo(() => {
    const top3 = entries.slice(0, 3);
    const sorted = [
      top3[1] || null, // 2nd place on left
      top3[0] || null, // 1st place in middle
      top3[2] || null  // 3rd place on right
    ];
    return sorted;
  }, [entries]);

  const listEntries = useMemo(() => {
    return entries.slice(3);
  }, [entries]);

  // Format score based on category
  const formatScore = useCallback((val: number, cat: CategoryId) => {
    switch (cat) {
      case 'stars':
        return t('leaderboard.value_stars', { n: val });
      case 'levels':
        return t('leaderboard.value_levels', { n: val });
      case 'records':
        return t('leaderboard.value_records', { n: val });
      case 'creators':
        return t('leaderboard.value_creators', { n: val });
      default:
        return String(val);
    }
  }, [t]);

  // Standing calculation (+/- 2 around user)
  const standingSection: StandingSection = useMemo(() => {
    if (!user) {
      return { status: 'unauthenticated' };
    }

    if (loading || (shouldFetchAroundMe && aroundMeLoading)) {
      return { status: 'loading' };
    }

    const myRank = data?.myRank ?? null;
    const myValue = data?.myValue ?? null;

    if (myRank === null || myValue === 0) {
      return { status: 'no_score' };
    }

    // Get from aroundMeData
    const aroundEntries = aroundMeData?.entries ?? [];
    const myIndex = aroundEntries.findIndex(e => e.uid === user.uid);
    if (myIndex === -1) {
      // Fallback: search in normal entries
      const normalIndex = entries.findIndex(e => e.uid === user.uid);
      if (normalIndex !== -1) {
        const slice = entries.slice(Math.max(0, normalIndex - 2), normalIndex + 3);
        return { status: 'ranked', entries: slice };
      }
      return { status: 'no_score' };
    }

    // Slice +/- 2 around the user
    const slice = aroundEntries.slice(Math.max(0, myIndex - 2), myIndex + 3);
    return { status: 'ranked', entries: slice };
  }, [user, loading, shouldFetchAroundMe, aroundMeLoading, data, aroundMeData, entries]);

  const handlePlayClick = useCallback(() => {
    router.push('/levels');
  }, [router]);

  const handleUserClick = useCallback((
    uid: string,
    name: string | null,
    tag: string | null,
    showcase: ShowcaseBadge[] = [],
    value: number
  ) => {
    const nameParam = name || 'Player';
    const tagParam = tag ? `&tag=${tag}` : '';
    const scoreParam = `&score=${value}&scoreCat=${activeCategory.id}`;
    const showcaseIds = showcase.map((b) => b.id || (b as { badgeId?: string }).badgeId).filter(Boolean).join(',');
    const showcaseParam = showcaseIds ? `&showcase=${showcaseIds}` : '';
    router.push(`/profile?uid=${uid}&name=${encodeURIComponent(nameParam)}${tagParam}${showcaseParam}${scoreParam}`);
  }, [router, activeCategory.id]);

  return {
    t,
    router,
    user,
    isAnonymous,
    catIndex,
    setCatIndex,
    periodIndex,
    setPeriodIndex,
    authModalOpen,
    setAuthModalOpen,
    activeCategory,
    activePeriod,
    isFriendsCategory,
    data,
    loading,
    error,
    refresh,
    aroundMeLoading,
    entries,
    podiumEntries,
    listEntries,
    formatScore,
    standingSection,
    handlePlayClick,
    handleUserClick,
  };
}
