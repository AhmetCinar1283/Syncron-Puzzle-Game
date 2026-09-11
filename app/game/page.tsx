'use client';

import { Suspense, useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { LevelData } from '@/app/src/games/types';
import type { StoredLevel } from '@/app/src/lib/db';
import { useUserStorage } from '@/app/src/lib/userStorage';
import { PlayScreen } from '@/app/src/game2/components/PlayScreen';
import { convertToGame2State } from '@/app/src/game2/logic/converter';
import { GameThemeProvider } from '@/app/src/game2/contexts/GameThemeContext';
import { useT } from '@/app/src/contexts/LanguageContext';
import { signInAnonymously } from 'firebase/auth';
import { auth } from '@/app/src/lib/firebase/config';
import { UIButtonType } from '@/app/src/game2/logic/types';
import { solvePuzzle } from '@/app/src/games/logic/solver';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function storedToLevelData(stored: StoredLevel & { id: number }): LevelData {
  return {
    id: stored.id,
    firestoreId: stored.firestoreId,
    name: stored.name,
    width: stored.width,
    height: stored.height,
    edges: stored.edges,
    grid: typeof stored.grid == 'string' ? JSON.parse(stored.grid) : stored.grid,
    initialObjects: stored.initialObjects,
    targets: stored.targets,
    trailCollision: stored.trailCollision,
    initialBoxes: stored.initialBoxes,
    conveyorPowerRequired: stored.conveyorPowerRequired,
    gameNotes: stored.gameNotes,
  };
}

// ─── Inner component (needs useSearchParams → must be in Suspense) ────────────

function GameContent() {
  const t = useT();
  const searchParams = useSearchParams();
  const router = useRouter();
  const idParam = searchParams.get('id');
  const source = searchParams.get('source'); // 'preset' | null (null = user level)
  const isPreset = source === 'preset';
  const levelId = idParam ? Number(idParam) : null;

  const { setItem: storageSet } = useUserStorage();
  const [level, setLevel] = useState<LevelData | null>(null);
  const [nextLevelId, setNextLevelId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (levelId === null) {
      router.replace('/levels');
      return;
    }

    setLoading(true);
    setLevel(null);
    setNextLevelId(null);
    setError(false);

    let cancelled = false;
    async function load() {
      if (!auth.currentUser) {
        try {
          await signInAnonymously(auth);
        } catch (anonErr) {
          console.warn('[Game] JIT anonymous sign-in failed:', anonErr);
        }
      }

      if (isPreset) {
        const { getDB, getNextPresetLevelId } = await import('@/app/src/lib/db');
        const db = getDB();
        let stored = await db.presetLevels.get(levelId!);

        if (cancelled) return;
        if (!stored) { setError(true); setLoading(false); return; }

        if ((stored.isNeedSync || !stored.grid?.length) && stored.firestoreId) {
          try {
            const { fetchAndCacheLevel } = await import('@/app/src/lib/firebase/sync');
            await fetchAndCacheLevel(stored.firestoreId, stored.id!);
            stored = await db.presetLevels.get(levelId!);
          } catch (err) {
            console.warn('[Game] Lazy fetch failed, using cached data:', err);
          }
          if (cancelled) return;
          if (!stored) { setError(true); setLoading(false); return; }
        }

        const levelData = storedToLevelData(stored as StoredLevel & { id: number });
        setLevel(levelData);
        storageSet('lastPlayedLevelId', String(levelId));
        storageSet('lastPlayedSource', 'preset');
        const next = await getNextPresetLevelId(levelId!);
        if (!cancelled) { setNextLevelId(next); setLoading(false); }
      } else {
        const { getDB, getNextLevelId } = await import('@/app/src/lib/db');
        const db = getDB();
        const stored = await db.levels.get(levelId!);

        if (cancelled) return;
        if (!stored) { setError(true); setLoading(false); return; }

        const levelData = storedToLevelData(stored as StoredLevel & { id: number });
        setLevel(levelData);
        storageSet('lastPlayedLevelId', String(levelId));
        storageSet('lastPlayedSource', 'user');
        const next = await getNextLevelId(levelId!);
        if (!cancelled) { setNextLevelId(next); setLoading(false); }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [levelId, isPreset, router]);

  const handleNextLevel = useCallback(() => {
    if (nextLevelId !== null) {
      router.push(isPreset ? `/game?id=${nextLevelId}&source=preset` : `/game?id=${nextLevelId}`);
    }
  }, [nextLevelId, isPreset, router]);

  const handleButtonPressed = useCallback((buttonType: UIButtonType) => {
    if (buttonType === 'menu') {
      router.push('/levels');
    } else if (buttonType === 'next_level') {
      handleNextLevel();
    }
  }, [router, handleNextLevel]);

  const game2State = useMemo(() => {
    if (!level) return null;
    return convertToGame2State(level as unknown as StoredLevel & { id: number });
  }, [level]);

  const solutionSteps = useMemo(() => {
    if (!level) return null;
    const res = solvePuzzle(level, 30, 4000);
    return res.solvable ? res.solution : null;
  }, [level]);

  if (loading) return <LoadingScreen />;
  if (error || !level || !game2State) return <ErrorScreen onBack={() => router.push('/levels')} />;

  const mainRoomGrid = game2State.rooms['main']?.grid;

  return (
    <main
      style={{
        height: '100dvh',
        width: '100vw',
        background: '#030712',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <PlayScreen
        key={level.id}
        levelName={level.name}
        initialEntities={game2State.entities}
        initialGrid={mainRoomGrid}
        initialRooms={game2State.rooms}
        controlMode={game2State.controlMode}
        initialControlledRooms={game2State.initialControlledRooms}
        levelEdges={level.edges}
        trailCollision={level.trailCollision}
        onButtonPressed={handleButtonPressed}
        gameNotes={level.gameNotes}
        solutionSteps={solutionSteps}
      />
    </main>
  );
}

// ─── Loading / Error ──────────────────────────────────────────────────────────

function LoadingScreen() {
  const t = useT();
  return (
    <main
      style={{
        minHeight: '100dvh',
        background: '#030712',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span style={{ color: '#1e3a5f', fontSize: 12, letterSpacing: '0.1em' }}>{t('common.loading')}</span>
    </main>
  );
}

function ErrorScreen({ onBack }: { onBack: () => void }) {
  const t = useT();
  return (
    <main
      style={{
        minHeight: '100dvh',
        background: '#030712',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
      }}
    >
      <span style={{ color: '#ef4444', fontSize: 14 }}>{t('game.not_found')}</span>
      <button
        onClick={onBack}
        style={{
          padding: '8px 20px',
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.4)',
          color: '#ef4444',
          borderRadius: 8,
          cursor: 'pointer',
          fontSize: 12,
        }}
      >
        {t('game.back_to_levels')}
      </button>
    </main>
  );
}

// ─── Page export ─────────────────────────────────────────────────────────────

export default function GamePage() {
  return (
    <GameThemeProvider>
      <Suspense fallback={<LoadingScreen />}>
        <GameContent />
      </Suspense>
    </GameThemeProvider>
  );
}
