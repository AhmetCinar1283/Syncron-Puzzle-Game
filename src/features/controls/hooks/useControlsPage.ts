'use client';

import { useAppRouter } from '@/lib/navigation';
import { useEffect, useState, useCallback } from 'react';
import { useT } from '@/contexts/LanguageContext';
import { useGamepad } from '@/hooks/useGamepad';
import { useSoundManager } from '@/services/audio';

export type ControlsTab = 'all' | 'keyboard' | 'gamepad' | 'touch';
export type InputMode = 'keyboard' | 'gamepad' | 'touch';
export type SwipeDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export function useControlsPage() {
  const t = useT();
  const router = useAppRouter();
  const { play: playSound } = useSoundManager('menu');

  const [activeButtons, setActiveButtons] = useState<Record<number, boolean>>({});
  const [axes, setAxes] = useState<number[]>([0, 0, 0, 0]);
  const [pressedKeys, setPressedKeys] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTabState] = useState<ControlsTab>('all');
  const [activeInputMode, setActiveInputMode] = useState<InputMode>(() => {
    if (typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches) {
      return 'touch';
    }
    return 'keyboard';
  });
  const [lastSwipeDir, setLastSwipeDir] = useState<SwipeDirection | null>(null);

  // Use hook to detect gamepad and listen to inputs
  const { gamepad, isConnected } = useGamepad({
    onButtonPress: (index, pressed) => {
      setActiveButtons(prev => ({ ...prev, [index]: pressed }));
      if (pressed) {
        setActiveInputMode('gamepad');
        playSound('ui.tick');
      }
    },
    onAxisMove: (index, val) => {
      setAxes(prev => {
        const next = [...prev];
        next[index] = val;
        return next;
      });
      if (Math.abs(val) > 0.15) {
        setActiveInputMode('gamepad');
      }
      // Scroll page vertically using Right Stick Y (axis 3)
      if (index === 3 && Math.abs(val) > 0.15) {
        window.scrollBy({ top: val * 22, behavior: 'auto' });
      }
    },
    onMenu: () => {
      playSound('ui.confirm');
      router.push('/');
    },
    onMove: (dir) => {
      if (dir === 'up') {
        window.scrollBy({ top: -180, behavior: 'smooth' });
      } else if (dir === 'down') {
        window.scrollBy({ top: 180, behavior: 'smooth' });
      }
    }
  });

  // Track physical keyboard key presses
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      setActiveInputMode('keyboard');
      setPressedKeys(prev => ({ ...prev, [key]: true, [e.code.toLowerCase()]: true }));

      if (e.key === 'Escape') {
        playSound('ui.confirm');
        router.push('/');
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        window.scrollBy({ top: -180, behavior: 'smooth' });
      } else if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        window.scrollBy({ top: 180, behavior: 'smooth' });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      setPressedKeys(prev => {
        const next = { ...prev };
        delete next[key];
        delete next[e.code.toLowerCase()];
        return next;
      });
    };

    const handleBlur = () => {
      setPressedKeys({});
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [router, playSound]);

  // Tab switching with sound
  const setActiveTab = useCallback((tab: ControlsTab) => {
    playSound('ui.tick');
    setActiveTabState(tab);
  }, [playSound]);

  // Navigate back to home
  const handleBack = useCallback(() => {
    playSound('ui.confirm');
    router.push('/');
  }, [playSound, router]);

  // Interactive swipe test handler
  const handleTestSwipe = useCallback((dir: SwipeDirection) => {
    setActiveInputMode('touch');
    setLastSwipeDir(dir);
    playSound('ui.tick');
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(15);
      } catch {
        // Ignore haptics error if not allowed by browser
      }
    }
  }, [playSound]);

  return {
    t,
    router,
    activeButtons,
    axes,
    gamepad,
    isConnected,
    pressedKeys,
    activeTab,
    setActiveTab,
    activeInputMode,
    lastSwipeDir,
    handleTestSwipe,
    handleBack,
  };
}
