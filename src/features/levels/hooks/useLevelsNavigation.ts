/**
 * DOSYA AMACI: Levels sayfasındaki klavye VE gamepad girdisini tek bir yerde birleştiren hook.
 * Önceki sürümde bu mantık (index sarma, onay, geri, sekme değişimi) klavye `keydown`
 * dinleyicisinde ve `useGamepad`'in `onMove`/`onConfirm` callback'lerinde iki kez ayrı ayrı
 * yazılmıştı. Burada tek bir sözleşim var: yön → index değiştir, onay → seç, menü → geri.
 */

'use client';

import { useCallback, useEffect } from 'react';
import { useGamepad } from '@/hooks/useGamepad';

export interface UseLevelsNavigationOptions {
  /** Şu an gezinilen listenin/haritanın eleman sayısı (0 ise gezinme devre dışı) */
  itemCount: number;
  /** Klavye/gamepad ile odak devre dışı mı (örn. bir modal açıkken) */
  disabled?: boolean;
  onNavigate: (delta: -1 | 1) => void;
  onConfirm: () => void;
  onBack: () => void;
  /** "M" tuşu veya gamepad Y/X/Select — harita/liste görünümü değiştir */
  onToggleView?: () => void;
  /** Tab tuşu veya gamepad sol/sağ (liste modunda) — Campaign/Custom sekmesi değiştir */
  onSwitchTab?: () => void;
  /** Gamepad yukarı/aşağı (harita modunda) — önceki/sonraki bölüm (chapter) */
  onChapterPrev?: () => void;
  onChapterNext?: () => void;
  /** Harita/liste kaydırma alanı — PageUp/PageDown için */
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
  /** Gamepad analog çubuk ile serbest kaydırma (harita panlama) */
  onAxisScroll?: (dx: number, dy: number) => void;
  /** true ise yön tuşları chapter değiştirir (harita), false ise liste elemanı seçer */
  chapterModeVertical?: boolean;
}

export function useLevelsNavigation({
  itemCount,
  disabled = false,
  onNavigate,
  onConfirm,
  onBack,
  onToggleView,
  onSwitchTab,
  onChapterPrev,
  onChapterNext,
  scrollContainerRef,
  onAxisScroll,
  chapterModeVertical = false,
}: UseLevelsNavigationOptions) {
  const navigate = useCallback(
    (delta: -1 | 1) => {
      if (itemCount <= 0) return;
      onNavigate(delta);
    },
    [itemCount, onNavigate],
  );

  // ── Klavye ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = document.activeElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          onBack();
          return;
        case 'PageUp':
          e.preventDefault();
          (scrollContainerRef?.current ?? window).scrollBy?.({ top: -300, behavior: 'smooth' } as ScrollToOptions);
          return;
        case 'PageDown':
          e.preventDefault();
          (scrollContainerRef?.current ?? window).scrollBy?.({ top: 300, behavior: 'smooth' } as ScrollToOptions);
          return;
        case 'Tab':
          if (onSwitchTab) {
            e.preventDefault();
            onSwitchTab();
          }
          return;
        case 'm':
        case 'M':
          if (onToggleView) {
            e.preventDefault();
            onToggleView();
          }
          return;
        // Harita modunda: sol/sağ = düğüm seç, yukarı/aşağı = bölüm (chapter) değiştir.
        // Liste modunda: yukarı/aşağı = satır seç, sol/sağ = sekme (Campaign/Custom) değiştir
        // — bu, gamepad ile aynı sözleşimi kullanır (bkz. useGamepad onMove aşağıda).
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          if (chapterModeVertical) navigate(-1);
          else onSwitchTab?.();
          return;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          if (chapterModeVertical) navigate(1);
          else onSwitchTab?.();
          return;
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          if (chapterModeVertical) onChapterPrev?.();
          else navigate(-1);
          return;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          if (chapterModeVertical) onChapterNext?.();
          else navigate(1);
          return;
        case 'Enter':
        case ' ':
          e.preventDefault();
          onConfirm();
          return;
        default:
          return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, navigate, onConfirm, onBack, onToggleView, onSwitchTab, onChapterPrev, onChapterNext, scrollContainerRef, chapterModeVertical]);

  // ── Gamepad (aynı sözleşim, tekrar yazılmıyor) ─────────────────────────
  const { isConnected } = useGamepad({
    enabled: !disabled,
    onMove: (dir) => {
      if (chapterModeVertical) {
        if (dir === 'left') navigate(-1);
        else if (dir === 'right') navigate(1);
        else if (dir === 'up') onChapterPrev?.();
        else if (dir === 'down') onChapterNext?.();
      } else {
        if (dir === 'up') navigate(-1);
        else if (dir === 'down') navigate(1);
        else if (dir === 'left' || dir === 'right') onSwitchTab?.();
      }
    },
    onConfirm: () => onConfirm(),
    onMenu: () => onBack(),
    onRestart: () => onToggleView?.(),
    onAxisMove: (axisIndex, value) => {
      if (Math.abs(value) < 0.15 || !onAxisScroll) return;
      if (axisIndex === 2) onAxisScroll(value * 22, 0);
      else if (axisIndex === 3) onAxisScroll(0, value * 22);
    },
  });

  return { isGamepadConnected: isConnected };
}
