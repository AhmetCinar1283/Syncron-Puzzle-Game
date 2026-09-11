'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { RefObject, TouchEvent as ReactTouchEvent } from 'react';
import type { Direction, UIButtonType } from '../logic/types';
import { useGamepad } from '@/hooks/useGamepad';
import { KEY_TO_DIRECTION, SWIPE_THRESHOLD } from '../components/play-screen/constants';

interface UsePlayInputArgs {
    /** Render sırasında güncellenen ref; oyun bittiyse yön girdileri yok sayılır. */
    isGameOverRef: RefObject<boolean>;
    triggerMove: (direction: Direction) => void;
    handleButtonPress: (buttonType: UIButtonType) => void;
    cycleControlledRoom: () => void;
    handleUndo: () => void;
    handleStepForward: () => void;
}

/**
 * PlayScreen girdi kaynakları → komutlar: klavye (window keydown), gamepad
 * (useGamepad RAF döngüsü) ve swipe (board alanına bağlanan touch handler'ları).
 *
 * Sıra önemli ve korunuyor: önce keydown effect'i, sonra useGamepad (içindeki
 * effect'ler), sonra touch callback'leri — PlayScreen'deki önceki hook sırasıyla aynı.
 * Klavye listener'ı handleKey değiştikçe yeniden bağlanır (bkz. usePlayScreenActions notu).
 */
export function usePlayInput({
    isGameOverRef,
    triggerMove,
    handleButtonPress,
    cycleControlledRoom,
    handleUndo,
    handleStepForward,
}: UsePlayInputArgs) {
    // ── Klavye kontrolü ────────────────────────────────────────────────────
    const handleKey = useCallback((e: KeyboardEvent) => {
        if (e.key === 'r' || e.key === 'R') {
            e.preventDefault();
            handleButtonPress('restart');
            return;
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            handleButtonPress('menu');
            return;
        }

        // Seçili oda geçiş tuşu (Tab veya Boşluk)
        if (e.key === 'Tab' || e.key === ' ') {
            e.preventDefault();
            cycleControlledRoom();
            return;
        }

        if (e.key === 'z' || e.key === 'Z') {
            e.preventDefault();
            handleUndo();
            return;
        }
        if (e.key === 'f' || e.key === 'F') {
            e.preventDefault();
            handleStepForward();
            return;
        }

        if (isGameOverRef.current) return;
        const rawDirection = KEY_TO_DIRECTION[e.key];
        if (!rawDirection) return;
        e.preventDefault();
        triggerMove(rawDirection);
    }, [triggerMove, handleButtonPress, cycleControlledRoom, handleUndo, handleStepForward, isGameOverRef]);

    useEffect(() => {
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [handleKey]);

    // ── Gamepad ────────────────────────────────────────────────────────────
    useGamepad({
        onMove: useCallback((dir: Direction) => {
            if (isGameOverRef.current) return;
            triggerMove(dir);
        }, [triggerMove, isGameOverRef]),
        onRestart: useCallback(() => {
            handleButtonPress('restart');
        }, [handleButtonPress]),
        onMenu: useCallback(() => {
            handleButtonPress('menu');
        }, [handleButtonPress]),
    });

    // ── Swipe (Touch) Kontrolü ─────────────────────────────────────────────
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);

    const handleTouchStart = useCallback((e: ReactTouchEvent) => {
        const t0 = e.touches[0];
        touchStartRef.current = { x: t0.clientX, y: t0.clientY };
    }, []);

    const handleTouchMove = useCallback((e: ReactTouchEvent) => {
        e.preventDefault();
    }, []);

    const handleTouchEnd = useCallback((e: ReactTouchEvent) => {
        if (!touchStartRef.current || isGameOverRef.current) return;
        const touch = e.changedTouches[0];
        const dx = touch.clientX - touchStartRef.current.x;
        const dy = touch.clientY - touchStartRef.current.y;
        touchStartRef.current = null;

        if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return;

        let direction: Direction;
        if (Math.abs(dx) >= Math.abs(dy)) {
            direction = dx > 0 ? 'right' : 'left';
        } else {
            direction = dy > 0 ? 'down' : 'up';
        }

        triggerMove(direction);
    }, [triggerMove, isGameOverRef]);

    return { handleTouchStart, handleTouchMove, handleTouchEnd };
}
