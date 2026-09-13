'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useAds } from '@/contexts/MonetizationContext';
import { useAdPauseAudio } from './useAdPauseAudio';

/**
 * `/play` sayfasının reklam adaptörüne bağlandığı TEK yer. Mevcut play akışını
 * (yükleme, kazanma, restart, navigasyon) değiştirmez — `usePlayPage` bu hook'un
 * döndürdüğü fonksiyonları uygun anlarda çağırır.
 *
 * Sıklık modeli: bir level BİTTİĞİNDE (kazanma ya da restart/ölüm, fark etmez)
 * sayaç ilerler; reklam kararını `policy/frequencyPolicy.ts` verir. Misafir
 * oyuncuya daha sık reklam gösterilir (eşikler `policy/policyConfig.ts`'te).
 */
export function usePlayAds(levelReady: boolean) {
    const {
        loadingStart,
        loadingFinished,
        gameplayStart,
        gameplayStop,
        happyTime,
        recordLevelFinished,
        requestInterstitial,
    } = useAds();
    const loadingFinishedCalledRef = useRef(false);
    /**
     * Bu deneme için "level bitti" sayacı zaten ilerletildi mi. Kazanma anında
     * true olur; oyuncu kazanma ekranından "Tekrar"a basarsa aynı deneme İKİNCİ
     * KEZ sayılmasın diye kullanılır.
     */
    const finishRecordedRef = useRef(false);

    // Misafir mi kayıtlı mı — reklam eşiği bu bilgiye göre seçilir.
    const { user, isAnonymous } = useAuthContext();
    const isRegisteredUser = !!user && !isAnonymous;

    // Reklam sırasında sayfa sesini kısar (portal kuralı) — bkz. useAdPauseAudio.
    useAdPauseAudio();

    // SDK'ya yükleme başladığını bildir (bkz. CrazyGames game.loadingStart/loadingStop).
    // Bir kez, mount'ta — loadingFinished ile aynı "oturum başına bir kez" semantiği.
    useEffect(() => {
        loadingStart();
        // eslint-disable-next-line react-hooks/exhaustive-deps -- bilerek sadece mount'ta
    }, []);

    // Level oynanmaya hazır olduğunda: bir kez loadingFinished, her seferinde gameplayStart/Stop.
    useEffect(() => {
        if (!levelReady) return;
        if (!loadingFinishedCalledRef.current) {
            loadingFinishedCalledRef.current = true;
            loadingFinished();
        }
        // Yeni bir deneme başlıyor: bitiş sayacı bu deneme için henüz işlenmedi.
        finishRecordedRef.current = false;
        gameplayStart();
        return () => { gameplayStop(); };
    }, [levelReady, loadingFinished, gameplayStart, gameplayStop]);

    /**
     * Kazanma anında (win overlay açılırken) çağrılır: oynanış durur, mutlu an
     * bildirilir, "level bitti" sayacı ilerler. Reklam burada GÖSTERİLMEZ —
     * oyuncu önce sonucunu görür; reklam kararı ekrandan ayrılırken verilir.
     */
    const notifyLevelCompleted = useCallback(() => {
        gameplayStop();
        happyTime();
        if (!finishRecordedRef.current) {
            finishRecordedRef.current = true;
            recordLevelFinished();
        }
    }, [gameplayStop, happyTime, recordLevelFinished]);

    /**
     * Kazanma ekranından ayrılırken (sonraki level ya da menü) çağrılır.
     * Sayaç zaten `notifyLevelCompleted`'te ilerledi; burada yalnızca karar verilir.
     * Her zaman çözülür — reklam gösterilmese de akış bloklanmaz.
     */
    const beforeLeavingWinScreen = useCallback(
        () => requestInterstitial({ isRegisteredUser }),
        [requestInterstitial, isRegisteredUser],
    );

    /**
     * Yeniden başlatmadan (başarısızlık/ölüm ya da elle restart) ÖNCE çağrılır:
     * bu da bir "level bitişi"dir — sayacı ilerletir ve politika uygunsa reklam
     * gösterir. Kazanma akışından tek farkı, sayacın burada ilerlemesidir
     * (ayrı bir "kazandın" anı yok).
     */
    const beforeRestart = useCallback(() => {
        // Kazanma ekranından "Tekrar"a basıldıysa bitiş zaten sayıldı, tekrar sayma.
        if (!finishRecordedRef.current) {
            finishRecordedRef.current = true;
            recordLevelFinished();
        }
        return requestInterstitial({ isRegisteredUser });
    }, [recordLevelFinished, requestInterstitial, isRegisteredUser]);

    return { notifyLevelCompleted, beforeLeavingWinScreen, beforeRestart, isRegisteredUser };
}
