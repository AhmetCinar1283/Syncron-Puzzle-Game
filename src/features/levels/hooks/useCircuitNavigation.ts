'use client';

import { useCallback, useEffect, type Dispatch, type SetStateAction } from 'react';
import { useGamepad, type GamepadDirection } from '@/hooks/useGamepad';
import { isAnyModalOpen } from '@/components/ui';

export interface UseCircuitNavigationOptions {
  totalItems: number;
  selectedIndex?: number | null;
  setSelectedIndex: Dispatch<SetStateAction<number | null>>;
  onConfirm: () => void;
  onBack: () => void;
  onChapterPrev?: () => void;
  onChapterNext?: () => void;
  onJumpToCurrent?: () => void;
  onSwitchTab?: () => void;
  /**
   * Sağ/sol (ok, A/D, d-pad) ne yapsın: `chapter` = sektör değiştir (kampanya),
   * `step` = yukarı/aşağı gibi bir önceki/sonraki öğe (yatay sektör kavramı olmayan listeler).
   */
  horizontal?: 'chapter' | 'step';
  disabled?: boolean;
}

/**
 * DOSYA AMACI: Kozmik Rota boyunca Klavye ve Gamepad girdilerini
 * 1D rota akışı (yukarı/aşağı = seviye) ve sektör geçişleriyle (sağ/sol) bağlayan gezinme hook'u.
 */
export function useCircuitNavigation({
  totalItems,
  setSelectedIndex,
  onConfirm,
  onBack,
  onChapterPrev,
  onChapterNext,
  onJumpToCurrent,
  onSwitchTab,
  horizontal = 'chapter',
  disabled = false,
}: UseCircuitNavigationOptions) {
  const step = useCallback(
    (delta: -1 | 1) => {
      if (totalItems <= 0 || disabled || isAnyModalOpen()) return;
      setSelectedIndex((prev) => {
        const current = prev ?? 0;
        const next = current + delta;
        return Math.max(0, Math.min(totalItems - 1, next));
      });
    },
    [totalItems, disabled, setSelectedIndex],
  );

  // ── 1. Klavye Girdileri ──────────────────────────────────────────────────
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled || isAnyModalOpen()) return;
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

        // Sonraki seviye
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          step(1);
          break;

        // Önceki seviye
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          step(-1);
          break;

        // Sağ / sol: sektör değişimi (yatay sektör kavramı olmayan listelerde seviye adımı)
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          if (horizontal === 'chapter') onChapterNext?.();
          else step(1);
          break;

        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          if (horizontal === 'chapter') onChapterPrev?.();
          else step(-1);
          break;

        // Bölüm (Chapter) Değişimi
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
    horizontal,
    step,
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
      if (disabled || isAnyModalOpen()) return;
      if (direction === 'down') step(1);
      else if (direction === 'up') step(-1);
      else if (direction === 'right') {
        if (horizontal === 'chapter') onChapterNext?.();
        else step(1);
      } else if (direction === 'left') {
        if (horizontal === 'chapter') onChapterPrev?.();
        else step(-1);
      }
    },
    [step, disabled, horizontal, onChapterPrev, onChapterNext],
  );

  const handleGamepadButtonPress = useCallback(
    (buttonIndex: number, pressed: boolean) => {
      if (!pressed || disabled || isAnyModalOpen()) return;

      // L1 / LB: Önceki Sektör
      if (buttonIndex === 4) {
        onChapterPrev?.();
      }
      // R1 / RB: Sonraki Sektör
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
    enabled: !disabled && !isAnyModalOpen(),
    onMove: handleGamepadMove,
    onConfirm,
    onMenu: onBack,
    onButtonPress: handleGamepadButtonPress,
  });

  return {
    isGamepadConnected,
    step,
  };
}
