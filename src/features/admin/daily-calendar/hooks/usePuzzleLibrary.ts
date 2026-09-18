'use client';

/**
 * DOSYA AMACI: Günlük bulmaca kütüphanesinin durumu: liste, onay/taslak, yedek
 * havuz bayrağı ve silme. Değişiklikten sonra `onChanged` ile takvim de yenilenir.
 */
import { useCallback, useEffect, useState } from 'react';
import {
  deletePuzzle, fetchPuzzles, setPuzzleFlags, type AdminPuzzleSummary, type DailyPuzzleStatus,
} from '@/services/api/adminDailyClient';
import { serverErrorKey } from '../lib/candidateFilters';

export function usePuzzleLibrary(enabled: boolean, onChanged: () => void) {
  const [puzzles, setPuzzles] = useState<AdminPuzzleSummary[]>([]);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    fetchPuzzles()
      .then((res) => { if (!cancelled) setPuzzles(res); })
      .catch((err) => { if (!cancelled) setErrorKey(serverErrorKey(err)); });
    return () => { cancelled = true; };
  }, [enabled, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const run = useCallback(async (id: string, action: () => Promise<unknown>) => {
    setBusyId(id);
    setErrorKey(null);
    try {
      await action();
      reload();
      onChanged();
    } catch (err) {
      setErrorKey(serverErrorKey(err));
    } finally {
      setBusyId(null);
    }
  }, [reload, onChanged]);

  const setStatus = useCallback((id: string, status: DailyPuzzleStatus) => run(id, () => setPuzzleFlags(id, { status })), [run]);
  const setInPool = useCallback((id: string, inPool: boolean) => run(id, () => setPuzzleFlags(id, { inPool })), [run]);
  const remove = useCallback((id: string) => run(id, () => deletePuzzle(id)), [run]);

  return { puzzles, errorKey, busyId, reload, setStatus, setInPool, remove };
}
