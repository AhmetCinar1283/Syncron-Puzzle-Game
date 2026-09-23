'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';
import { sendFeedback } from '@/services/api/gameClient';
import type { FeedbackDifficulty } from '../lib/types';

const feedbackKey = (levelId: string, version: number) => `feedback_submitted_${levelId}_${version}`;

const NOOP_UNSUBSCRIBE = () => {};
/** localStorage bu değeri dışarıdan değiştirmez; aboneliğe gerek yok. */
const subscribeToNothing = () => NOOP_UNSUBSCRIBE;
const getServerSnapshot = () => false;

/**
 * Kazanma ekranı beğeni + zorluk geri bildirimi. İkisi de seçilince bir kez
 * gönderilir ve localStorage'a işaretlenir (aynı seviye versiyonu için tekrar sorulmaz).
 * `levelId`/`version` yoksa (kullanıcı seviyesi) hiçbir şey gönderilmez.
 *
 * NOT (efekt temizliği): Daha önce iki iş de `useEffect` içinde state set ediyordu.
 * 1) localStorage okuması artık `useSyncExternalStore` ile yapılıyor — React'in
 *    dış veri kaynağı okumak için önerdiği API; sunucuda `false` döner, bu yüzden
 *    hidrasyon ayrışmaz.
 * 2) Gönderim artık bir EFEKT değil, seçimi tamamlayan TIKLAMANIN sonucu. "İki
 *    seçim de doluysa gönder" kararı kullanıcı etkileşiminde verilir; böylece
 *    efekt yeniden koşarsa ikinci kez gönderme yarışı da ortadan kalkar.
 * Dışarıya verilen API (alan adları ve anlamları) değişmedi.
 */
export function useWinFeedback(levelId: string | undefined, version: number | undefined) {
    const [selectedLike, setSelectedLikeState] = useState<boolean | null>(null);
    const [selectedDiff, setSelectedDiffState] = useState<FeedbackDifficulty | null>(null);
    const [submitted, setSubmitted] = useState(false);

    const readStoredFlag = useCallback(() => {
        if (!levelId || !version) return false;
        return localStorage.getItem(feedbackKey(levelId, version)) !== null;
    }, [levelId, version]);

    const alreadyFeedback = useSyncExternalStore(subscribeToNothing, readStoredFlag, getServerSnapshot);

    /** İki seçim de tamamlandıysa tek seferlik gönderim. */
    const submitIfComplete = (like: boolean | null, diff: FeedbackDifficulty | null) => {
        if (!levelId || !version || like === null || diff === null || submitted) return;

        setSubmitted(true);
        localStorage.setItem(feedbackKey(levelId, version), 'true');

        sendFeedback({
            levelId,
            version,
            difficulty: diff,
            liked: like ? 1 : 0,
        });
    };

    const setSelectedLike = (value: boolean | null) => {
        setSelectedLikeState(value);
        submitIfComplete(value, selectedDiff);
    };

    const setSelectedDiff = (value: FeedbackDifficulty | null) => {
        setSelectedDiffState(value);
        submitIfComplete(selectedLike, value);
    };

    return { selectedLike, setSelectedLike, selectedDiff, setSelectedDiff, submitted, alreadyFeedback };
}
