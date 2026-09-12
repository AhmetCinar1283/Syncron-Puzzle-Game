'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useAppSelector } from '@/store/hooks';
import { selectUser } from '@/store/userSlice';
import { getAllPlayedLevels } from '@/services/db';
import { useAds } from '@/contexts/MonetizationContext';
import { useAdPauseAudio } from './useAdPauseAudio';

/**
 * `/play` sayfasının reklam adaptörüne bağlandığı TEK yer. Mevcut play akışını
 * (yükleme, kazanma, restart, navigasyon) değiştirmez — `usePlayPage` bu hook'un
 * döndürdüğü fonksiyonları uygun anlarda çağırır.
 */
export function usePlayAds(levelReady: boolean) {
    const { loadingStart, loadingFinished, gameplayStart, gameplayStop, happyTime, recordLevelCompleted, syncCompletedTotal, requestInterstitial } = useAds();
    const loadingFinishedCalledRef = useRef(false);

    // Reklam sırasında sayfa sesini kısar (portal kuralı) — bkz. useAdPauseAudio.
    useAdPauseAudio();

    // SDK'ya yükleme başladığını bildir (bkz. CrazyGames game.loadingStart/loadingStop).
    // Bir kez, mount'ta — loadingFinished ile aynı "oturum başına bir kez" semantiği.
    useEffect(() => {
        loadingStart();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- bilerek sadece mount'ta
    }, []);

    const completedCount = useAppSelector((state) => selectUser(state).completedCount);

    // "İlk 5 level" kuralı oyuncunun kalıcı toplam tamamlama sayısına bakar
    // (Redux XP/skor senkronize olmamış olabilir; Dexie'deki oynanmış level
    // sayısı yedek/üst sınır olarak kullanılır — bkz. plan).
    useEffect(() => {
        let cancelled = false;
        getAllPlayedLevels()
            .then((played) => {
                if (cancelled) return;
                syncCompletedTotal(Math.max(completedCount, played.length));
            })
            .catch((err) => console.warn('[usePlayAds] Dexie played-level sayımı okunamadı:', err));
        return () => { cancelled = true; };
    }, [completedCount, syncCompletedTotal]);

    // Level oynanmaya hazır olduğunda: bir kez loadingFinished, her seferinde gameplayStart/Stop.
    useEffect(() => {
        if (!levelReady) return;
        if (!loadingFinishedCalledRef.current) {
            loadingFinishedCalledRef.current = true;
            loadingFinished();
        }
        gameplayStart();
        return () => { gameplayStop(); };
    }, [levelReady, loadingFinished, gameplayStart, gameplayStop]);

    /** Kazanma anında (win overlay açılırken) çağrılır: oynanış durur, mutlu an bildirilir, sayaç ilerler. */
    const notifyLevelCompleted = useCallback(() => {
        gameplayStop();
        happyTime();
        recordLevelCompleted();
    }, [gameplayStop, happyTime, recordLevelCompleted]);

    /** Sonraki levele geçmeden önce çağrılır: politika uygunsa bölüm arası reklam gösterir, her zaman çözülür. */
    const beforeNextLevel = useCallback(async (afterError: boolean) => {
        await requestInterstitial({ afterError });
    }, [requestInterstitial]);

    return { notifyLevelCompleted, beforeNextLevel };
}
