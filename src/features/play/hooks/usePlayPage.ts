'use client';

import { useCallback, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { UIButtonType } from '@/game-engine/logic/types';
import type { WorkerResult } from '../lib/types';
import { usePlaySession } from './usePlaySession';
import { useLevelLoader } from './useLevelLoader';
import { useLevelCompletion } from './useLevelCompletion';

/**
 * `/play` sayfasının tüm state/akışı: URL param → seviye yükleme → oyun izleme →
 * kazanma (worker) → navigasyon. View (`PlayContent`) sadece dönen değerleri çizer.
 */
export function usePlayPage() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const idParam = searchParams.get('id');
    const source = searchParams.get('source');
    const isPreset = source === 'preset';
    const levelId = idParam ? Number(idParam) : null;

    const session = usePlaySession();

    // ── Win overlay ──────────────────────────────────────────
    const [showWin, setShowWin] = useState(false);
    const [workerResult, setWorkerResult] = useState<WorkerResult | null>(null);

    const { resetTracking, beginSession, submitTelemetry, recordRestart } = session;

    const level = useLevelLoader({
        levelId,
        isPreset,
        onBeforeLoad: () => {
            setShowWin(false);
            setWorkerResult(null);
            resetTracking();
        },
        onLoaded: beginSession,
    });
    const { reload, nextLevelId } = level;

    const callWorker = useLevelCompletion({
        firestoreId: level.firestoreId,
        levelId,
        session,
        setWorkerResult,
    });

    // ── UI button handler ─────────────────────────────────────
    const handleButtonPressed = useCallback((buttonType: UIButtonType, details?: { isDeath?: boolean }) => {
        if (buttonType === 'next_level') {
            // Kazandı → worker çağır, win overlay göster
            setShowWin(true);
            callWorker();
        } else if (buttonType === 'restart') {
            // Update session tracking
            recordRestart(details?.isDeath);
            reload(); // PlayScreen'i sıfırla
        } else if (buttonType === 'menu') {
            submitTelemetry('quit');
            router.push('/levels');
        }
    }, [callWorker, router, submitTelemetry, recordRestart, reload]);

    // ── Next level navigasyon ─────────────────────────────────
    const handleNextLevel = useCallback(() => {
        if (nextLevelId !== null) {
            router.push(isPreset
                ? `/play?id=${nextLevelId}&source=preset`
                : `/play?id=${nextLevelId}`
            );
        }
    }, [nextLevelId, isPreset, router]);

    const goToLevels = useCallback(() => router.push('/levels'), [router]);

    return {
        levelId,
        level,
        session,
        showWin,
        workerResult,
        handleButtonPressed,
        handleNextLevel,
        goToLevels,
    };
}
