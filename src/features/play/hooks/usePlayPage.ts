'use client';

import { useCallback, useState } from 'react';
import { useAppSearchParams, useAppRouter } from '@/lib/navigation';
import type { UIButtonType } from '@/game-engine/logic/types';
import type { WorkerResult } from '../lib/types';
import { usePlaySession } from './usePlaySession';
import { useLevelLoader } from './useLevelLoader';
import { useLevelCompletion } from './useLevelCompletion';
import { usePlayAds } from './usePlayAds';

/**
 * `/play` sayfasının tüm state/akışı: URL param → seviye yükleme → oyun izleme →
 * kazanma (worker) → navigasyon. View (`PlayContent`) sadece dönen değerleri çizer.
 */
export function usePlayPage() {
    const searchParams = useAppSearchParams();
    const router = useAppRouter();

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

    // ── Reklam adaptörü ────────────────────────────────────────
    const levelReady = !level.loading && !level.error && !!level.game2State;
    const { notifyLevelCompleted, beforeLeavingWinScreen, beforeRestart, isRegisteredUser } = usePlayAds(levelReady);

    /**
     * Bölüm arası reklam GERÇEKTEN gösterildiyse, kapandıktan sonra teşvik kartı
     * açılır (misafire "hesap aç", kayıtlıya "reklamları kaldır" — bkz.
     * components/AfterAdPrompt.tsx). Reklam gösterilmediyse hiçbir şey olmaz.
     */
    const [showAfterAdPrompt, setShowAfterAdPrompt] = useState(false);
    const dismissAfterAdPrompt = useCallback(() => setShowAfterAdPrompt(false), []);

    // ── UI button handler ─────────────────────────────────────
    const handleButtonPressed = useCallback(async (buttonType: UIButtonType, details?: { isDeath?: boolean }) => {
        if (buttonType === 'next_level') {
            // Kazandı → worker çağır, win overlay göster
            setShowWin(true);
            callWorker();
            notifyLevelCompleted();
        } else if (buttonType === 'restart') {
            // Yeniden başlatma da bir "level bitişi"dir: sayacı ilerletir ve
            // politika uygunsa reklam gösterir. Reklam kapanmadan board sıfırlanmaz.
            recordRestart(details?.isDeath);
            const result = await beforeRestart();
            reload(); // PlayScreen'i sıfırla
            if (result.shown) setShowAfterAdPrompt(true);
        } else if (buttonType === 'menu') {
            // Oyunu yarıda bırakıp çıkmak bir "bitiş" sayılmaz — reklam gösterilmez.
            submitTelemetry('quit');
            router.push('/levels');
        }
    }, [callWorker, router, submitTelemetry, recordRestart, reload, notifyLevelCompleted, beforeRestart]);

    // ── Kazanma ekranından ayrılış (sonraki level / menü) ─────
    // İkisi de aynı reklam kontrolünden geçer: level bitti, ekrandan ayrılıyoruz.
    const leaveWinScreen = useCallback(async (navigate: () => void) => {
        const result = await beforeLeavingWinScreen();
        navigate();
        if (result.shown) setShowAfterAdPrompt(true);
    }, [beforeLeavingWinScreen]);

    const handleNextLevel = useCallback(async () => {
        if (nextLevelId === null) return;
        await leaveWinScreen(() => router.replace(isPreset
            ? `/play?id=${nextLevelId}&source=preset`
            : `/play?id=${nextLevelId}`
        ));
    }, [nextLevelId, isPreset, router, leaveWinScreen]);

    /** Kazanma ekranındaki "Menü" butonu — level bitti, reklam kontrolünden geçer. */
    const handleMenuFromWin = useCallback(
        () => leaveWinScreen(() => router.push('/levels')),
        [leaveWinScreen, router],
    );

    /** Reklam akışı OLMADAN menüye dönüş (hata ekranı gibi yerler için). */
    const goToLevels = useCallback(() => router.push('/levels'), [router]);

    return {
        levelId,
        level,
        session,
        showWin,
        workerResult,
        handleButtonPressed,
        handleNextLevel,
        handleMenuFromWin,
        goToLevels,
        isRegisteredUser,
        showAfterAdPrompt,
        dismissAfterAdPrompt,
    };
}
