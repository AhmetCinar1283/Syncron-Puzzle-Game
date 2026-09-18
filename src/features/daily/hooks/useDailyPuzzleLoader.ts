'use client';

/**
 * DOSYA AMACI: Bir tarihin günlük bulmacasını sunucudan yükler ve PlayScreen'in
 * ihtiyaç duyduğu oyun durumuna çevirir. Günlük bulmaca yerelde önbelleklenmez
 * (sunucu yoksa özellik yok). `reload()` yalnızca tahtayı sıfırlar, yeniden istek atmaz.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { signInAnonymously } from 'firebase/auth';
import { auth } from '@/services/firebase/config';
import { fetchDailyPuzzle, type DailyPuzzleResponse } from '@/services/api/dailyClient';
import { convertToGame2State } from '@/game-engine/logic/converter';
import type { LevelEdges } from '@/game-engine/logic/engine/getNextTopologyPosition';

type ConverterInput = Parameters<typeof convertToGame2State>[0];

/** Grid JSON string olarak gelmişse (Firestore biçimi) diziye çevirir. */
function toConverterInput(level: Record<string, unknown>): ConverterInput {
  const grid = typeof level.grid === 'string' ? JSON.parse(level.grid) : level.grid;
  return { ...level, grid } as unknown as ConverterInput;
}

export function useDailyPuzzleLoader(date: string | null) {
  const [view, setView] = useState<DailyPuzzleResponse | null>(null);
  const [error, setError] = useState(false);
  const [restartKey, setRestartKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Oyuncu oynamayı seçti: resmî sonucu bilebilmek için oturum (gerekirse anonim) açılır.
        if (!auth.currentUser) {
          try { await signInAnonymously(auth); } catch (err) { console.warn('[Daily] anonymous sign-in failed:', err); }
        }
        const res = await fetchDailyPuzzle(date ?? undefined);
        if (cancelled) return;
        setView(res);
        setError(!res.puzzle);
      } catch (err) {
        console.warn('[Daily] puzzle load failed:', err);
        if (!cancelled) setError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [date]);

  const level = view?.puzzle?.level;
  const game = useMemo(() => {
    if (!level) return null;
    try {
      const input = toConverterInput(level);
      return {
        state: convertToGame2State(input),
        edges: (level as { edges?: LevelEdges }).edges,
        trailCollision: !!(level as { trailCollision?: boolean }).trailCollision,
        gameNotes: typeof level.gameNotes === 'string' ? level.gameNotes : '',
      };
    } catch (err) {
      console.error('[Daily] level convert failed:', err);
      return null;
    }
  }, [level]);

  const reload = useCallback(() => setRestartKey((k) => k + 1), []);
  const loading = !error && view === null;

  return { view, game, loading, error: error || (!!view && !game), restartKey, reload };
}
