'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAppRouter } from '@/lib/navigation';
import { signInAnonymously } from 'firebase/auth';
import type { StoredLevel } from '@/services/db';
import { auth } from '@/services/firebase/config';
import { useUserStorage } from '@/lib/userStorage';
import { convertToGame2State } from '@/game-engine/logic/converter';
import type { LevelEdges } from '@/game-engine/logic/engine/getNextTopologyPosition';
import type { Game2State } from '../lib/types';
import { storedToLevelData } from '../lib/session';

interface UseLevelLoaderArgs {
    levelId: number | null;
    isPreset: boolean;
    /**
     * Her yükleme başında (senkron, effect içinde) çağrılır: win overlay ve hamle
     * izleme sıfırlaması. Effect deps'ine BİLEREK eklenmez — önceki page.tsx'te bu
     * işler aynı effect'in içinde inline'dı ve effect yalnızca
     * [levelId, isPreset, router, restartKey] ile yeniden çalışıyordu. Deps'e
     * eklemek her render'da yeniden yüklemeye yol açardı. Çağıranlar yalnızca
     * setter/ref kullanan callback'ler geçmeli.
     */
    onBeforeLoad: () => void;
    /** Seviye yüklendiğinde çağrılır (telemetri oturumunu başlatır). Aynı deps notu geçerli. */
    onLoaded: (firestoreId: string | undefined, version: number) => void;
}

/**
 * `/play?id=..&source=preset|user` seviyesini Dexie'den (gerekirse Firestore
 * fallback ile) yükler ve PlayScreen'in ihtiyaç duyduğu game2 state'ini üretir.
 * `reload()` restartKey'i artırır → effect yeniden çalışır, PlayScreen key'i değişir.
 */
export function useLevelLoader({ levelId, isPreset, onBeforeLoad, onLoaded }: UseLevelLoaderArgs) {
    const router = useAppRouter();
    const { setItem: storageSet } = useUserStorage();

    const [levelName, setLevelName] = useState<string>('');
    const [firestoreId, setFirestoreId] = useState<string | undefined>();
    /** Kampanya bölümü (levelParts id) — yalnızca hazır level'larda; ödüllü atlama bunu sunucuya iletir. */
    const [partId, setPartId] = useState<string | undefined>();
    const [game2State, setGame2State] = useState<Game2State | null>(null);
    const [levelEdges, setLevelEdges] = useState<LevelEdges | undefined>();
    const [nextLevelId, setNextLevelId] = useState<number | null>(null);
    const [trailCollision, setTrailCollision] = useState<boolean>(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [gameNotes, setGameNotes] = useState<string>('');
    const [restartKey, setRestartKey] = useState(0);
    const [levelVersion, setLevelVersion] = useState<number>(1);

    useEffect(() => {
        if (levelId === null) { router.replace('/levels'); return; }

        setLoading(true);
        setGame2State(null);
        setLevelEdges(undefined);
        setNextLevelId(null);
        setError(false);
        onBeforeLoad();

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
                    const { getPresetLevelById, getNextPresetLevelId } = await import('@/services/db');
                    let raw = await getPresetLevelById(levelId!);
                    if (cancelled) return;
                    if (!raw) {
                        try {
                            const { syncLevelsMeta } = await import('@/services/firebase/sync');
                            await syncLevelsMeta();
                            raw = await getPresetLevelById(levelId!);
                        } catch (err) {
                            console.warn('[Play] syncLevelsMeta fallback failed:', err);
                        }
                        if (cancelled) return;
                    }
                    if (!raw) { setError(true); setLoading(false); return; }

                    if ((raw.isNeedSync || !raw.grid?.length || raw.rooms === undefined) && raw.firestoreId) {
                        try {
                            const { fetchAndCacheLevel } = await import('@/services/firebase/sync');
                            await fetchAndCacheLevel(raw.firestoreId, raw.id!);
                            raw = await getPresetLevelById(levelId!);
                        } catch (err) {
                            // Çevrimdışı/ağ hatası: level daha önce hiç tam indirilmemişse
                            // grid hâlâ boş kalır — aşağıdaki kontrol bunu yakalar.
                            console.warn('[Play] Lazy fetch failed:', err);
                        }
                        if (cancelled) return;
                        // Fetch başarısız olduysa `raw` hâlâ eski (boş grid'li) placeholder
                        // olabilir. Boş tahtayla oynatmak yerine "bir kez online gir" hatası
                        // gösterilir (bkz. 02-portal-buildleri.md §4).
                        if (!raw || !raw.grid?.length) { setError(true); setLoading(false); return; }
                    }

                    stored = storedToLevelData(raw as StoredLevel & { id: number });
                    nextId = await getNextPresetLevelId(levelId!);
                    storageSet('lastPlayedLevelId', String(levelId));
                    storageSet('lastPlayedSource', 'preset');
                } else {
                    const { getUserLevelById, getNextLevelId } = await import('@/services/db');
                    const raw = await getUserLevelById(levelId!);
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
                setPartId(isPreset && stored.part ? String(stored.part) : undefined);
                setLevelVersion(stored.version ?? 1);
                setTrailCollision(!!stored.trailCollision);
                setGameNotes(stored.gameNotes ?? '');
                setGame2State(convertToGame2State(stored));
                setLevelEdges(stored.edges as LevelEdges | undefined);
                setNextLevelId(nextId);

                // Initialize telemetry session
                onLoaded(stored.firestoreId, stored.version ?? 1);
            } catch (err) {
                console.error('[Play] Level load error:', err);
                if (!cancelled) setError(true);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        load();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- deps birebir korunuyor (bkz. onBeforeLoad notu)
    }, [levelId, isPreset, router, restartKey]);

    const reload = useCallback(() => setRestartKey(k => k + 1), []);

    return {
        levelName,
        firestoreId,
        partId,
        game2State,
        levelEdges,
        nextLevelId,
        trailCollision,
        loading,
        error,
        gameNotes,
        levelVersion,
        restartKey,
        reload,
    };
}
