'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { RefObject, TouchEvent as ReactTouchEvent } from 'react';
import type { Direction, UIButtonType } from '../logic/types';
import { useGamepad } from '@/hooks/useGamepad';
import { KEY_TO_DIRECTION, SWIPE_THRESHOLD } from '../components/play-screen/constants';
import { hapticImpact } from '@/lib/haptics';

interface UsePlayInputArgs {
    /** Render sırasında güncellenen ref; oyun bittiyse yön girdileri yok sayılır. */
    isGameOverRef: RefObject<boolean>;
    /** `true` iken tüm oyun girdileri yok sayılır (ör. ipucu kartı açık). */
    inputLockedRef?: RefObject<boolean>;
    triggerMove: (direction: Direction) => void;
    handleButtonPress: (buttonType: UIButtonType) => void;
    cycleControlledRoom: () => void;
    handleUndo: () => void;
    /** Yalnızca editör test modunda verilir (F). */
    handleStepForward?: () => void;
    /** Yalnızca ipucu destekli oyuncu modunda verilir (H). */
    handleHint?: () => void;
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
    inputLockedRef,
    triggerMove,
    handleButtonPress,
    cycleControlledRoom,
    handleUndo,
    handleStepForward,
    handleHint,
}: UsePlayInputArgs) {
    // ── Klavye kontrolü ────────────────────────────────────────────────────
    const handleKey = useCallback((e: KeyboardEvent) => {
        if (inputLockedRef?.current) return;
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
        if ((e.key === 'f' || e.key === 'F') && handleStepForward) {
            e.preventDefault();
            handleStepForward();
            return;
        }
        if ((e.key === 'h' || e.key === 'H') && handleHint) {
            e.preventDefault();
            handleHint();
            return;
        }

        if (isGameOverRef.current) return;
        const rawDirection = KEY_TO_DIRECTION[e.key];
        if (!rawDirection) return;
        e.preventDefault();
        triggerMove(rawDirection);
    }, [triggerMove, handleButtonPress, cycleControlledRoom, handleUndo, handleStepForward, handleHint, isGameOverRef, inputLockedRef]);

    useEffect(() => {
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [handleKey]);

    // ── Gamepad ────────────────────────────────────────────────────────────
    useGamepad({
        onMove: useCallback((dir: Direction) => {
            if (isGameOverRef.current || inputLockedRef?.current) return;
            triggerMove(dir);
        }, [triggerMove, isGameOverRef, inputLockedRef]),
        onRestart: useCallback(() => {
            if (inputLockedRef?.current) return;
            handleButtonPress('restart');
        }, [handleButtonPress, inputLockedRef]),
        onMenu: useCallback(() => {
            if (inputLockedRef?.current) return;
            handleButtonPress('menu');
        }, [handleButtonPress, inputLockedRef]),
    });

    // ── Swipe (Touch) Kontrolü ─────────────────────────────────────────────
    // Hamle, parmak kalkınca değil, swipe eşiği AŞILDIĞI ANDA (touchmove)
    // tetiklenir — bu tek başına 80-150ms algılanan gecikme kazandırır.
    // Haptik darbe simülasyondan ÖNCE verilir: cihaz, oyun durumu hesaplanmaya
    // başlamadan tepki vermiş olur.
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);
    /** Bu dokunuş için hamle zaten tetiklendi mi? (tek dokunuş = tek hamle) */
    const swipeFiredRef = useRef(false);

    /** Eşiği aşan bir delta'yı yöne çevirir; aşmıyorsa null. */
    const resolveDirection = (dx: number, dy: number): Direction | null => {
        if (Math.abs(dx) < SWIPE_THRESHOLD && Math.abs(dy) < SWIPE_THRESHOLD) return null;
        if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left';
        return dy > 0 ? 'down' : 'up';
    };

    const fireSwipe = useCallback((direction: Direction) => {
        // Önce dokunsal geri bildirim, sonra (senkron ve pahalı olan) simülasyon.
        hapticImpact('light');
        triggerMove(direction);
    }, [triggerMove]);

    const handleTouchStart = useCallback((e: ReactTouchEvent) => {
        const t0 = e.touches[0];
        touchStartRef.current = { x: t0.clientX, y: t0.clientY };
        swipeFiredRef.current = false;
    }, []);

    const handleTouchMove = useCallback((e: ReactTouchEvent) => {
        e.preventDefault();
        if (swipeFiredRef.current || !touchStartRef.current) return;
        if (isGameOverRef.current || inputLockedRef?.current) return;

        const touch = e.touches[0];
        if (!touch) return;
        const direction = resolveDirection(
            touch.clientX - touchStartRef.current.x,
            touch.clientY - touchStartRef.current.y,
        );
        if (!direction) return;

        swipeFiredRef.current = true;
        fireSwipe(direction);
    }, [fireSwipe, isGameOverRef, inputLockedRef]);

    const handleTouchEnd = useCallback((e: ReactTouchEvent) => {
        const start = touchStartRef.current;
        touchStartRef.current = null;

        // touchmove'da zaten tetiklendiyse burada bir şey yapma.
        if (swipeFiredRef.current) return;
        if (!start || isGameOverRef.current || inputLockedRef?.current) return;

        // Yedek yol: touchmove hiç gelmeden (çok hızlı flick) parmak kalktıysa.
        const touch = e.changedTouches[0];
        if (!touch) return;
        const direction = resolveDirection(touch.clientX - start.x, touch.clientY - start.y);
        if (!direction) return;

        swipeFiredRef.current = true;
        fireSwipe(direction);
    }, [fireSwipe, isGameOverRef, inputLockedRef]);

    return { handleTouchStart, handleTouchMove, handleTouchEnd };
}
