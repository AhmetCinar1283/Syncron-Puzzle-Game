/**
 * DOSYA AMACI: Bu dosya, uygulama açıldığında veya sekme görünür hale geldiğinde 
 * oyuncunun seviye ilerleme verilerini Cloudflare D1'den IndexedDB'ye senkronize eden useFirestoreSync hook'unu içerir.
 */

'use client';

import { useEffect, useRef } from 'react';
import { syncPlayedLevelsFromWorker } from '@/services/sync/playedLevels';
import { sendTelemetry } from '@/services/api/gameClient';
import { useAuthContext } from '@/contexts/AuthContext';

/**
 * Triggers Cloudflare D1 → Dexie sync for played levels on:
 * 1. First mount (app open)
 * 2. Page visibility change: hidden → visible (tab switch / screen reopen)
 *
 * Level metadata sync is handled by the /levels page itself (syncLevelsMeta).
 * The 5-minute cooldown inside syncPlayedLevelsFromWorker prevents redundant calls.
 */
// Kullanıcının oturum durumunu takip ederek D1'den lokal veritabanına (Dexie) senkronizasyon tetikler.
export function useFirestoreSync() {
  const { user } = useAuthContext();
  const hasSyncedOnMount = useRef(false);

  useEffect(() => {
    if (hasSyncedOnMount.current) return;
    hasSyncedOnMount.current = true;

    const checkStaleSession = async () => {
      try {
        const raw = localStorage.getItem('active_level_session');
        if (!raw) return;
        const session = JSON.parse(raw);

        // If more than 5 minutes has passed since the last activity, consider it an abandonment/rage-quit
        if (Date.now() - session.lastActiveTime > 5 * 60 * 1000) {
          localStorage.removeItem('active_level_session');

          if (!user) return;

          await sendTelemetry({
            id: session.id,
            levelId: session.levelId,
            version: session.version,
            outcome: 'quit',
            timeSpent: Math.max(0, Math.round((session.lastActiveTime - session.startTime) / 1000)),
            restarts: session.restarts,
            deaths: session.deaths,
            movesCount: 0,
          });
        }
      } catch (err) {
        console.warn('[Sync] Failed to process stale level session:', err);
      }
    };

    const runSync = () => {
      // Sync level metadata for all users (guests & authenticated) into Dexie
      import('@/services/firebase/sync').then(({ syncLevelsMeta }) => {
        syncLevelsMeta().catch((err) => console.warn('[Sync] LevelsMeta sync failed:', err));
      });

      if (user) {
        syncPlayedLevelsFromWorker(user).catch((err) =>
          console.warn('[Sync] PlayedLevels sync failed:', err),
        );
        checkStaleSession();
      }
    };

    runSync();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runSync();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);
}
