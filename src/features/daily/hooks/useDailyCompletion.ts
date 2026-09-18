'use client';

/**
 * DOSYA AMACI: Günlük bulmaca kazanma akışı: hamle geçmişini sunucuya gönderir
 * (`POST /daily/complete`), sonucu döner ve kazanılan XP'yi Redux'a işler.
 * Sonuç yalnızca sunucudan gelir; ağ hatasında yerelde skor hesaplanmaz.
 */
import { useCallback, useState } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { addXpAndScore } from '@/store/userSlice';
import { completeDaily, type CompleteDailyResponse } from '@/services/api/dailyClient';
import { isRateLimitError } from '@/services/api/workerClient';
import type { PlaySession } from '@/features/play';

export type DailyCompletionState =
  | { kind: 'idle' }
  | { kind: 'pending' }
  | { kind: 'done'; result: CompleteDailyResponse }
  | { kind: 'failed'; reason: 'offline' | 'error' | 'rate_limited' };

export function useDailyCompletion(session: PlaySession) {
  const dispatch = useAppDispatch();
  const [state, setState] = useState<DailyCompletionState>({ kind: 'idle' });
  const { moveHistoryRef, startTimeRef, hintsUsedRef } = session;

  const submit = useCallback(async (resolvedDate: string) => {
    setState({ kind: 'pending' });
    try {
      const result = await completeDaily({
        date: resolvedDate,
        moves: [...moveHistoryRef.current],
        timeSpent: Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000)),
        hintsUsed: hintsUsedRef.current,
      });
      setState({ kind: 'done', result });
      if (result.xpDelta > 0) {
        dispatch(addXpAndScore({ scoreDelta: 0, xpDelta: result.xpDelta, completedCountDelta: 0 }));
      }
    } catch (err) {
      console.warn('[Daily] complete failed:', err);
      if (isRateLimitError(err)) {
        // Hız limiti kalıcı bir hata değildir: "tekrar dene" düğmesi açık kalır.
        setState({ kind: 'failed', reason: 'rate_limited' });
        return;
      }
      const offline = typeof navigator !== 'undefined' && !navigator.onLine;
      setState({ kind: 'failed', reason: offline ? 'offline' : 'error' });
    }
  }, [dispatch, moveHistoryRef, startTimeRef, hintsUsedRef]);

  const reset = useCallback(() => setState({ kind: 'idle' }), []);

  return { state, submit, reset };
}
