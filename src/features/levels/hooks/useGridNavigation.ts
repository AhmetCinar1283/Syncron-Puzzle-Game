'use client';

import { useCallback, useEffect, type Dispatch, type SetStateAction } from 'react';
import { useGamepad, type GamepadDirection } from '@/hooks/useGamepad';
import { calculateNextGridIndex, type GridNavDirection } from '../lib/gridCalculations';

export interface UseGridNavigationOptions {
  totalItems: number;
  columns: number;
  selectedIndex?: number | null;
  setSelectedIndex: Dispatch<SetStateAction<number | null>>;
  onConfirm: () => void;
  onBack: () => void;
  onChapterPrev?: () => void;
  onChapterNext?: () => void;
  onJumpToCurrent?: () => void;
  onSwitchTab?: () => void;
  disabled?: boolean;
}

/**
 * DOSYA AMACI: 2D Grid Matrisi üzerinde Klavye ve Gamepad gezinmesini
 * tek elden yöneten, sütun farklarını ve tuş atamalarını bağlayan hook.
 */
export function useGridNavigation({
  totalItems,
  columns,
  setSelectedIndex,
  onConfirm,
  onBack,
  onChapterPrev,
  onChapterNext,
  onJumpToCurrent,
  onSwitchTab,
  disabled = false,
}: UseGridNavigationOptions) {
  const moveDirection = useCallback(
    (direction: GridNavDirection) => {
      if (totalItems <= 0 || disabled) return;
      setSelectedIndex((prev) => calculateNextGridIndex(prev ?? 0, totalItems, direction, columns));
    },
    [totalItems, disabled, setSelectedIndex, columns],
  );

  // ── 1. Klavye Girdileri ──────────────────────────────────────────────────
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = document.activeElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onBack();
          break;

        case 'Enter':
        case ' ':
          e.preventDefault();
          onConfirm();
          break;

        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          moveDirection('left');
          break;

        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          moveDirection('right');
          break;

        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          moveDirection('up');
          break;

        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          moveDirection('down');
          break;

        case '[':
        case 'PageUp':
        case 'q':
        case 'Q':
          e.preventDefault();
          onChapterPrev?.();
          break;

        case ']':
        case 'PageDown':
        case 'e':
        case 'E':
          e.preventDefault();
          onChapterNext?.();
          break;

        case 'Tab':
          if (onSwitchTab) {
            e.preventDefault();
            onSwitchTab();
          }
          break;

        case 'Home':
        case 'h':
        case 'H':
          e.preventDefault();
          onJumpToCurrent?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    disabled,
    moveDirection,
    onBack,
    onConfirm,
    onChapterPrev,
    onChapterNext,
    onSwitchTab,
    onJumpToCurrent,
  ]);

  // ── 2. Gamepad Girdileri ─────────────────────────────────────────────────
  const handleGamepadMove = useCallback(
    (direction: GamepadDirection) => {
      moveDirection(direction);
    },
    [moveDirection],
  );

  const handleGamepadButtonPress = useCallback(
    (buttonIndex: number, pressed: boolean) => {
      if (!pressed || disabled) return;

      // L1 / LB: Önceki Chapter
      if (buttonIndex === 4) {
        onChapterPrev?.();
      }
      // R1 / RB: Sonraki Chapter
      if (buttonIndex === 5) {
        onChapterNext?.();
      }
      // Y / Triangle (3): Kaldığı seviyeye odaklan
      if (buttonIndex === 3) {
        onJumpToCurrent?.();
      }
    },
    [disabled, onChapterPrev, onChapterNext, onJumpToCurrent],
  );

  const { isConnected: isGamepadConnected } = useGamepad({
    enabled: !disabled,
    onMove: handleGamepadMove,
    onConfirm,
    onMenu: onBack,
    onButtonPress: handleGamepadButtonPress,
  });

  return {
    isGamepadConnected,
    moveDirection,
  };
}
