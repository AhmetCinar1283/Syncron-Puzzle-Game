'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { StoredLevel } from '@/app/src/lib/db';
import { useUserStorage } from '@/app/src/lib/userStorage';
import { PlayScreen } from '@/app/src/game2/components/PlayScreen';
import { convertToGame2State } from '@/app/src/game2/logic/converter';
import { LoadingScreen } from './components/LoadingScreen';
import { ErrorScreen } from './components/ErrorScreen';
import { WinResultOverlay } from './components/WinResultOverlay';
import type { UIButtonType, Direction } from '@/app/src/game2/logic/types';
import type { Entity } from '@/app/src/game2/logic/entityTypes';
import type { Cell } from '@/app/src/game2/logic/cellTypes';
import type { LevelEdges } from '@/app/src/game2/logic/engine/getNextTopologyPosition';
import { signInAnonymously } from 'firebase/auth';
import { auth } from '@/app/src/lib/firebase/config';
import { useAppDispatch } from '@/app/src/store/hooks';
import { addXpAndScore } from '@/app/src/store/userSlice';

// ─── Worker tipi (docs/scoring.md) ──────────────────────────────────────────

interface WorkerResult {
    success: boolean;
    stars?: 1 | 2 | 3;
    scoreDelta?: number;
    xpDelta?: number;
    isFirstCompletion?: boolean;
    isNewBestSolution?: boolean;
    isBestSolution?: boolean;
    isGoodSolution?: boolean;
}

// ─── StoredLevel → LevelData yardımcısı (game/page.tsx ile aynı) ─────────────

function storedToLevelData(stored: StoredLevel & { id: number }) {
    return {
        ...stored,
        grid: typeof stored.grid === 'string' ? JSON.parse(stored.grid) : stored.grid,
    } as StoredLevel & { id: number };
}

// ─── Inner component ─────────────────────────────────────────────────────────

function PlayContent() {

    const searchParams = useSearchParams();
    const router = useRouter();
    const dispatch = useAppDispatch();

    const idParam = searchParams.get('id');
    const source = searchParams.get('source');
    const isPreset = source === 'preset';
    const levelId = idParam ? Number(idParam) : null;

    const { setItem: storageSet } = useUserStorage();

    // ── Seviye yükleme state'leri ────────────────────────────
    const [levelName, setLevelName] = useState<string>('');
    const [firestoreId, setFirestoreId] = useState<string | undefined>();
    const [game2State, setGame2State] = useState<any | null>(null);
    const [levelEdges, setLevelEdges] = useState<LevelEdges | undefined>();
    const [nextLevelId, setNextLevelId] = useState<number | null>(null);
    const [trailCollision, setTrailCollision] = useState<boolean>(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [gameNotes, setGameNotes] = useState<string>('');

    // ── Oyun izleme ──────────────────────────────────────────
    const moveHistoryRef = useRef<string[]>([]); // 'u' | 'd' | 'l' | 'r'
    const startTimeRef = useRef(Date.now());
    const [restartKey, setRestartKey] = useState(0);

    const [levelVersion, setLevelVersion] = useState<number>(1);

    // ── Telemetry & Session Tracking ────────────────────────
    const sessionRef = useRef<{
        id: string;
        startTime: number;
        restarts: number;
        deaths: number;
        levelId: string | null;
        version: number;
    } | null>(null);

    const generateUUID = () => {
        if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
            return window.crypto.randomUUID();
        }
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    };

    const submitTelemetry = useCallback(async (outcome: 'win' | 'restart' | 'quit') => {
        if (!sessionRef.current || !sessionRef.current.levelId) return;
        const currentSession = sessionRef.current;
        const timeSpent = Math.round((Date.now() - currentSession.startTime) / 1000);
        const movesCount = moveHistoryRef.current.length;

        // Clear active session from localStorage
        localStorage.removeItem('active_level_session');

        const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL;
        if (!WORKER_URL) return;

        try {
            const { auth: firebaseAuth } = await import('@/app/src/lib/firebase/config');
            const token = firebaseAuth.currentUser ? await firebaseAuth.currentUser.getIdToken() : null;
            if (!token) return;

            await fetch(`${WORKER_URL}/game/telemetry`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    id: currentSession.id,
                    levelId: currentSession.levelId,
                    version: currentSession.version,
                    outcome,
                    timeSpent,
                    restarts: currentSession.restarts,
                    deaths: currentSession.deaths,
                    movesCount,
                }),
            });
        } catch (err) {
            console.warn('[Telemetry] Failed to submit telemetry:', err);
        }
    }, []);

    // ── Win overlay ──────────────────────────────────────────
    const [showWin, setShowWin] = useState(false);
    const [workerResult, setWorkerResult] = useState<WorkerResult | null>(null);

    // ── Seviye yükleme ───────────────────────────────────────
    useEffect(() => {
        if (levelId === null) { router.replace('/levels'); return; }

        setLoading(true);
        setGame2State(null);
        setLevelEdges(undefined);
        setNextLevelId(null);
        setError(false);
        setShowWin(false);
        setWorkerResult(null);
        moveHistoryRef.current = [];
        startTimeRef.current = Date.now();

        let cancelled = false;

        async function load() {
            try {
                // JIT anonymous sign-in: if user hasn’t signed in yet, do it now
                // before loading the level. This is the moment they chose to play.
                if (!auth.currentUser) {
                    try {
                        await signInAnonymously(auth);
                    } catch (anonErr) {
                        // Non-fatal: level still loads from local Dexie cache
                        console.warn('[Play] JIT anonymous sign-in failed:', anonErr);
                    }
                }

                let stored: (StoredLevel & { id: number }) | undefined;
                let nextId: number | null = null;

                if (isPreset) {
                    const { getDB, getNextPresetLevelId } = await import('@/app/src/lib/db');
                    const db = getDB();
                    let raw = await db.presetLevels.get(levelId!);
                    if (cancelled) return;
                    if (!raw) { setError(true); setLoading(false); return; }
                    
                    if ((raw.isNeedSync || !raw.grid?.length || raw.rooms === undefined) && raw.firestoreId) {
                        try {
                            const { fetchAndCacheLevel } = await import('@/app/src/lib/firebase/sync');
                            await fetchAndCacheLevel(raw.firestoreId, raw.id!);
                            raw = await db.presetLevels.get(levelId!);
                        } catch (err) {
                            console.warn('[Play] Lazy fetch failed:', err);
                        }
                        if (cancelled) return;
                        if (!raw) { setError(true); setLoading(false); return; }
                    }

                    stored = storedToLevelData(raw as StoredLevel & { id: number });
                    nextId = await getNextPresetLevelId(levelId!);
                    storageSet('lastPlayedLevelId', String(levelId));
                    storageSet('lastPlayedSource', 'preset');
                } else {
                    const { getDB, getNextLevelId } = await import('@/app/src/lib/db');
                    const db = getDB();
                    const raw = await db.levels.get(levelId!);
                    if (cancelled) return;
                    if (!raw) { setError(true); setLoading(false); return; }
                    
                    stored = storedToLevelData(raw as StoredLevel & { id: number });
                    nextId = await getNextLevelId(levelId!);
                    storageSet('lastPlayedLevelId', String(levelId));
                    storageSet('lastPlayedSource', 'user');
                }
                
                if (cancelled) return;
                setLevelName(stored.name ?? '');
                setFirestoreId(stored.firestoreId);
                setLevelVersion(stored.version ?? 1);
                setTrailCollision(!!stored.trailCollision);
                setGameNotes(stored.gameNotes ?? '');
                setGame2State(convertToGame2State(stored));
                setLevelEdges(stored.edges as LevelEdges | undefined);
                setNextLevelId(nextId);

                // Initialize telemetry session
                if (stored.firestoreId) {
                    const sessionId = generateUUID();
                    sessionRef.current = {
                        id: sessionId,
                        startTime: Date.now(),
                        restarts: 0,
                        deaths: 0,
                        levelId: stored.firestoreId,
                        version: stored.version ?? 1,
                    };
                    localStorage.setItem('active_level_session', JSON.stringify({
                        id: sessionId,
                        levelId: stored.firestoreId,
                        version: stored.version ?? 1,
                        startTime: Date.now(),
                        restarts: 0,
                        deaths: 0,
                        lastActiveTime: Date.now(),
                    }));
                } else {
                    sessionRef.current = null;
                }
            } catch (err) {
                console.error('[Play] Level load error:', err);
                if (!cancelled) setError(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => { cancelled = true; };
    }, [levelId, isPreset, router, restartKey]);

    // ── Move tracking ─────────────────────────────────────────
    const handleMoveExecuted = useCallback((direction: Direction | 'switch_room') => {
        if (direction === 'switch_room') {
            moveHistoryRef.current.push('s');
        } else {
            const map: Record<Direction, string> = { up: 'u', down: 'd', left: 'l', right: 'r' };
            moveHistoryRef.current.push(map[direction]);
        }

        // Update lastActiveTime in active session
        if (sessionRef.current) {
            localStorage.setItem('active_level_session', JSON.stringify({
                id: sessionRef.current.id,
                levelId: sessionRef.current.levelId,
                version: sessionRef.current.version,
                startTime: sessionRef.current.startTime,
                restarts: sessionRef.current.restarts,
                deaths: sessionRef.current.deaths,
                lastActiveTime: Date.now(),
            }));
        }
    }, []);

    // ── Worker çağrısı (kazanma) ──────────────────────────────
    const callWorker = useCallback(async () => {
        if (!firestoreId) return; // Kullanıcı seviyelerinde worker yok
        const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL;
        if (!WORKER_URL) return;

        const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);

        try {
            // Get Firebase ID Token for authorization.
            // If auth.currentUser is null (JIT sign-in failed silently during load()),
            // attempt one last anonymous sign-in before giving up — prevents silent score loss.
            const { auth: firebaseAuth } = await import('@/app/src/lib/firebase/config');

            if (!firebaseAuth.currentUser) {
                try {
                    const { signInAnonymously: anonSignIn } = await import('firebase/auth');
                    await anonSignIn(firebaseAuth);
                } catch (retryErr) {
                    console.warn('[Play] Token retry sign-in failed — cannot submit score:', retryErr);
                    setWorkerResult({ success: false });
                    return;
                }
            }

            const token = firebaseAuth.currentUser
                ? await firebaseAuth.currentUser.getIdToken()
                : null;

            if (!token) {
                console.warn('[Play] No auth token available after retry — cannot submit score.');
                setWorkerResult({ success: false });
                return;
            }

            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            };

            const res = await fetch(`${WORKER_URL}/complete-level`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    levelId: firestoreId,
                    moves: moveHistoryRef.current,
                    timeSpent,
                }),
            });
            if (res.ok) {
                const data: WorkerResult = await res.json();
                setWorkerResult(data);

                // Update Redux state with earned XP and score delta
                if (data.success) {
                    submitTelemetry('win');
                    dispatch(addXpAndScore({
                        scoreDelta: data.scoreDelta ?? 0,
                        xpDelta: data.xpDelta ?? 0,
                        completedCountDelta: data.isFirstCompletion ? 1 : 0,
                    }));
                }

                // Dexie'ye de kaydet (anlık — sync beklemeden)
                if (data.success && data.stars) {
                    try {
                        const { getDB } = await import('@/app/src/lib/db');
                        const db = getDB();
                        const levelKey = String(levelId!);
                        const existing = await db.playedLevels.get(levelKey);
                        await db.playedLevels.put({
                            levelId: levelKey,
                            score: data.stars,
                            timeSpent: Math.round((Date.now() - startTimeRef.current) / 1000),
                            completedAt: existing?.completedAt ?? Date.now(),
                            updatedAt: Date.now(),
                            stars: data.stars,
                            moveCount: moveHistoryRef.current.length,
                        });
                    } catch (e) {
                        console.warn('[Play] Dexie local save failed:', e);
                    }
                }
            } else {
                const errText = await res.text();
                console.warn('[Play] Worker verification failed with status:', res.status, errText);
                setWorkerResult({ success: false });
            }
        } catch (err) {
            console.warn('[Play] Worker call failed:', err);
            // Worker olmadan da oyun devam eder — sonuç overlay'i gösterilir
            setWorkerResult({ success: false });
        }
    }, [firestoreId, levelId, isPreset]);

    // ── UI button handler ─────────────────────────────────────
    const handleButtonPressed = useCallback((buttonType: UIButtonType, details?: { isDeath?: boolean }) => {
        if (buttonType === 'next_level') {
            // Kazandı → worker çağır, win overlay göster
            setShowWin(true);
            callWorker();
        } else if (buttonType === 'restart') {
            // Update session tracking
            if (sessionRef.current) {
                if (details?.isDeath) {
                    sessionRef.current.deaths += 1;
                } else {
                    sessionRef.current.restarts += 1;
                }
                localStorage.setItem('active_level_session', JSON.stringify({
                    id: sessionRef.current.id,
                    levelId: sessionRef.current.levelId,
                    version: sessionRef.current.version,
                    startTime: sessionRef.current.startTime,
                    restarts: sessionRef.current.restarts,
                    deaths: sessionRef.current.deaths,
                    lastActiveTime: Date.now(),
                }));
            }
            moveHistoryRef.current = [];
            startTimeRef.current = Date.now();
            setRestartKey(k => k + 1); // PlayScreen'i sıfırla
        } else if (buttonType === 'menu') {
            submitTelemetry('quit');
            router.push('/levels');
        }
    }, [callWorker, router, submitTelemetry]);

    // ── Next level navigasyon ─────────────────────────────────
    const handleNextLevel = useCallback(() => {
        if (nextLevelId !== null) {
            router.push(isPreset
                ? `/play?id=${nextLevelId}&source=preset`
                : `/play?id=${nextLevelId}`
            );
        }
    }, [nextLevelId, isPreset, router]);

    // ── Render ───────────────────────────────────────────────
    if (loading) return <LoadingScreen />;
    if (error || !game2State) return <ErrorScreen onBack={() => router.push('/levels')} />;

    return (
        <main style={{
            // Tam ekran — scroll yok, native'de de bounce yok
            position: 'fixed',
            inset: 0,
            background: '#030712',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            touchAction: 'none',
        }}>
            {/* PlayScreen kendi HUD'unu içeriyor: level adı, restart, ses */}
            <PlayScreen
                key={`${levelId}-${restartKey}`}
                levelName={levelName}
                gameNotes={gameNotes}
                initialEntities={game2State.entities}
                initialRooms={game2State.rooms}
                controlMode={game2State.controlMode}
                initialControlledRooms={game2State.initialControlledRooms}
                levelEdges={levelEdges}
                trailCollision={trailCollision}
                onMoveExecuted={handleMoveExecuted}
                onUndoExecuted={() => {
                    moveHistoryRef.current.pop();
                }}
                onButtonPressed={handleButtonPressed}
            />

            {/* Kazanma result overlay — position:fixed olduğu için scale wrapper dışına çıkar */}
            {showWin && (
                <WinResultOverlay
                    result={workerResult}
                    moveCount={moveHistoryRef.current.length}
                    levelId={firestoreId}
                    version={levelVersion}
                    onRestart={() => handleButtonPressed('restart')}
                    onNextLevel={nextLevelId !== null ? handleNextLevel : undefined}
                    onMenu={() => router.push('/levels')}
                />
            )}
        </main>
    );
}

// ─── Page export ─────────────────────────────────────────────────────────────

export default function PlayPage() {
    return (
        <Suspense fallback={<LoadingScreen />}>
            <PlayContent />
        </Suspense>
    );
}
