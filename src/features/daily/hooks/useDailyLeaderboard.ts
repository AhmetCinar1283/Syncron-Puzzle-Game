'use client';

/**
 * DOSYA AMACI: Bir günün liderlik tablosunu (+ kullanıcının kendi sırasını) yükler.
 */
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { fetchDailyLeaderboard, type DailyLeaderboardResponse } from '@/services/api/dailyClient';
import { DAILY_LEADERBOARD_LIMIT } from '../lib/dailyConfig';

export function useDailyLeaderboard(date: string | null) {
  const { user, loading: authLoading } = useAuth();
  const uid = user?.uid;
  const [data, setData] = useState<DailyLeaderboardResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!date || authLoading) return;
    let cancelled = false;
    fetchDailyLeaderboard(date, DAILY_LEADERBOARD_LIMIT)
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setFailed(false);
      })
      .catch((err) => {
        console.warn('[Daily] leaderboard load failed:', err);
        if (!cancelled) setFailed(true);
      });
    return () => { cancelled = true; };
  }, [date, authLoading, uid, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  const loading = !!date && !failed && (data === null || data.date !== date);

  return { data: data?.date === date ? data : null, loading, failed, currentUid: uid ?? null, reload };
}
