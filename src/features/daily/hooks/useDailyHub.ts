'use client';

/**
 * DOSYA AMACI: `/daily` ana ekranının verisi: bugünün bulmacası (+ kullanıcının
 * resmî sonucu), seri ve arşiv listesi. Oturum hazır olunca yüklenir; oturum
 * varsa istekler kimlikle gider (resmî sonuç/seri kullanıcıya özeldir).
 */
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchDailyArchive, fetchDailyPuzzle, fetchDailyStreak,
  type DailyArchiveEntry, type DailyPuzzleResponse, type DailyStreak,
} from '@/services/api/dailyClient';
import { DAILY_ARCHIVE_DAYS } from '../lib/dailyConfig';

export type HubStatus = 'loading' | 'ready' | 'error';

export function useDailyHub() {
  const { user, loading: authLoading } = useAuth();
  const uid = user?.uid;

  const [today, setToday] = useState<DailyPuzzleResponse | null>(null);
  const [streak, setStreak] = useState<DailyStreak | null>(null);
  const [archive, setArchive] = useState<DailyArchiveEntry[]>([]);
  const [status, setStatus] = useState<HubStatus>('loading');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    Promise.all([
      fetchDailyPuzzle(),
      uid ? fetchDailyStreak().catch(() => null) : Promise.resolve(null),
      fetchDailyArchive(DAILY_ARCHIVE_DAYS).catch(() => [] as DailyArchiveEntry[]),
    ])
      .then(([todayRes, streakRes, archiveRes]) => {
        if (cancelled) return;
        setToday(todayRes);
        setStreak(streakRes);
        setArchive(archiveRes);
        setStatus('ready');
      })
      .catch((err) => {
        console.warn('[Daily] hub load failed:', err);
        if (!cancelled) setStatus('error');
      });
    return () => { cancelled = true; };
  }, [authLoading, uid, reloadKey]);

  const reload = useCallback(() => {
    setStatus('loading');
    setReloadKey((k) => k + 1);
  }, []);

  return { today, streak, archive, status, reload };
}
