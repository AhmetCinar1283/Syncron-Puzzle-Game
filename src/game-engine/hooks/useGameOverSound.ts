'use client';

import { useEffect, useRef } from 'react';
import type { UIEvent } from '../logic/types';
import type { SoundId } from '@/services/audio';

/**
 * Oyun bittiğinde (animasyon da bittikten sonra) bir kez win/lose sesi çalar.
 * `success` tipinde bir text UI event'i varsa win, yoksa lose. Oyun tekrar
 * başladığında (isGameOver=false) kilit sıfırlanır.
 */
export function useGameOverSound(
    isGameOver: boolean,
    isAnimating: boolean,
    uiEvents: UIEvent[],
    play: (name: SoundId) => void,
) {
    const prevIsGameOver = useRef(false);
    useEffect(() => {
        if (isGameOver && !prevIsGameOver.current) {
            const hasSuccess = uiEvents.some(e => e.kind === 'text' && e.textType === 'success');
            if (hasSuccess) {
                play('game.win');
                prevIsGameOver.current = true;
            } else if (!isAnimating) {
                play('game.lose');
                prevIsGameOver.current = true;
            }
        }
        if (!isGameOver) {
            prevIsGameOver.current = false;
        }
    }, [isGameOver, isAnimating, uiEvents, play]);
}
