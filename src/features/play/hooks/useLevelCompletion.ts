'use client';

import { useCallback } from 'react';
import { useAppDispatch } from '@/store/hooks';
import { addXpAndScore } from '@/store/userSlice';
import { completeLevel } from '@/services/api/gameClient';
import { getPlayedLevel, putPlayedLevel } from '@/services/db';
import type { WorkerResult } from '../lib/types';
import type { PlaySession } from './usePlaySession';

interface UseLevelCompletionArgs {
    firestoreId: string | undefined;
    levelId: number | null;
    session: PlaySession;
    setWorkerResult: (result: WorkerResult | null) => void;
}

/**
 * Kazanma akışı: önce Dexie'ye iyimser kayıt, sonra (sadece firestoreId varsa)
 * `/complete-level` worker doğrulaması + Redux XP/puan + sunucu yıldızlarıyla Dexie.
 *
 * `firestoreId` yoksa (kullanıcı seviyesi) worker çağrılmaz ve `workerResult`
 * null kalır → overlay yükleniyor yıldızlarında kalır (önceki davranış).
 */
export function useLevelCompletion({ firestoreId, levelId, session, setWorkerResult }: UseLevelCompletionArgs) {
    const dispatch = useAppDispatch();
    const { moveHistoryRef, startTimeRef, submitTelemetry } = session;

    return useCallback(async () => {
        const levelKey = firestoreId || (levelId !== null ? String(levelId) : null);
        const timeSpent = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));

        // ── 1. Optimistic write: save immediately to local Dexie so UI updates without lag ──
        if (levelKey) {
            try {
                const existing = await getPlayedLevel(levelKey);
                const provisionalStars = (existing?.stars ?? 0) >= 1 ? existing!.stars! : 1;
                await putPlayedLevel({
                    levelId: levelKey,
                    score: provisionalStars,
                    timeSpent,
                    completedAt: existing?.completedAt ?? Date.now(),
                    updatedAt: Date.now(),
                    stars: provisionalStars as 1 | 2 | 3,
                    moveCount: moveHistoryRef.current.length,
                });
            } catch (e) {
                console.warn('[Play] Immediate optimistic Dexie save failed:', e);
            }
        }

        if (!firestoreId) return; // Kullanıcı seviyelerinde worker yok

        try {
            // Get Firebase ID Token for authorization.
            // If auth.currentUser is null (JIT sign-in failed silently during load()),
            // attempt one last anonymous sign-in before giving up — prevents silent score loss.
            const { auth: firebaseAuth } = await import('@/services/firebase/config');

            if (!firebaseAuth.currentUser) {
                try {
                    const { signInAnonymously: anonSignIn } = await import('firebase/auth');
                    await anonSignIn(firebaseAuth);
                } catch (retryErr) {
                    console.warn('[Play] Token retry sign-in failed — cannot submit score:', retryErr);
                    setWorkerResult({ success: false, reason: navigator.onLine ? 'error' : 'offline' });
                    return;
                }
            }

            const token = firebaseAuth.currentUser
                ? await firebaseAuth.currentUser.getIdToken()
                : null;

            if (!token) {
                console.warn('[Play] No auth token available after retry — cannot submit score.');
                setWorkerResult({ success: false, reason: 'error' });
                return;
            }

            const result = await completeLevel<WorkerResult>(token, {
                levelId: firestoreId,
                moves: moveHistoryRef.current,
                timeSpent,
            });
            if (result.ok && result.data) {
                const data = result.data;
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

                // Dexie'ye de kaydet (sunucu tarafından onaylanmış yıldızlarla güncelle)
                if (data.success && data.stars) {
                    try {
                        const existing = await getPlayedLevel(levelKey!);
                        await putPlayedLevel({
                            levelId: levelKey!,
                            score: data.stars,
                            timeSpent,
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
                console.warn('[Play] Worker verification failed with status:', result.status, result.errorText);
                setWorkerResult({ success: false, reason: 'error' });
            }
        } catch (err) {
            console.warn('[Play] Worker call failed:', err);
            // Worker olmadan da oyun devam eder — sonuç overlay'i gösterilir.
            // navigator.onLine kesin değildir (bazı tarayıcılarda yanlış pozitif/negatif
            // verebilir) ama burada elimizdeki en iyi sinyal; asıl hata zaten loglandı.
            setWorkerResult({ success: false, reason: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error' });
        }
    }, [firestoreId, levelId, submitTelemetry, dispatch, moveHistoryRef, startTimeRef, setWorkerResult]);
}
