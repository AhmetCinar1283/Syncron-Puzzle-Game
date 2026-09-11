'use client';

import { useEffect, useState } from 'react';
import { sendFeedback } from '@/services/api/gameClient';
import type { FeedbackDifficulty } from '../lib/types';

const feedbackKey = (levelId: string, version: number) => `feedback_submitted_${levelId}_${version}`;

/**
 * Kazanma ekranı beğeni + zorluk geri bildirimi. İkisi de seçilince bir kez
 * gönderilir ve localStorage'a işaretlenir (aynı seviye versiyonu için tekrar sorulmaz).
 * `levelId`/`version` yoksa (kullanıcı seviyesi) hiçbir şey gönderilmez.
 */
export function useWinFeedback(levelId: string | undefined, version: number | undefined) {
    const [selectedLike, setSelectedLike] = useState<boolean | null>(null);
    const [selectedDiff, setSelectedDiff] = useState<FeedbackDifficulty | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const [alreadyFeedback, setAlreadyFeedback] = useState(false);

    // Check if user has already submitted feedback for this level version locally
    useEffect(() => {
        if (levelId && version) {
            const hasFeedback = localStorage.getItem(feedbackKey(levelId, version));
            if (hasFeedback) {
                setAlreadyFeedback(true);
            }
        }
    }, [levelId, version]);

    // Submit feedback when both thumbs and difficulty are chosen
    useEffect(() => {
        if (levelId && version && selectedLike !== null && selectedDiff !== null && !submitted) {
            setSubmitted(true);
            localStorage.setItem(feedbackKey(levelId, version), 'true');

            sendFeedback({
                levelId,
                version,
                difficulty: selectedDiff,
                liked: selectedLike ? 1 : 0,
            });
        }
    }, [selectedLike, selectedDiff, levelId, version, submitted]);

    return { selectedLike, setSelectedLike, selectedDiff, setSelectedDiff, submitted, alreadyFeedback };
}
