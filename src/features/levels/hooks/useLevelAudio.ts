'use client';

import { useCallback } from 'react';
import { assetUrl } from '@/lib/assetUrl';
import { userStorageGet } from '@/lib/userStorage';

/**
 * DOSYA AMACI: Levels sayfasında taktil geri bildirim sunan mikro ses efektleri hook'u.
 */
export function useLevelAudio() {
  const playSound = useCallback((path: string, volume = 0.3) => {
    if (typeof window !== 'undefined' && userStorageGet('soundMuted') === 'true') return;
    try {
      const audio = new Audio(assetUrl(path));
      audio.volume = volume;
      audio.play().catch(() => {});
    } catch {
      // Audio playback silently catches autoplay restrictions
    }
  }, []);

  const playTick = useCallback(() => {
    playSound('/sounds/tick.mp3', 0.25);
  }, [playSound]);

  const playSelect = useCallback(() => {
    playSound('/sounds/move.mp3', 0.35);
  }, [playSound]);

  const playWarp = useCallback(() => {
    playSound('/sounds/portal.mp3', 0.4);
  }, [playSound]);

  const playLock = useCallback(() => {
    playSound('/sounds/ice.mp3', 0.3);
  }, [playSound]);

  return {
    playTick,
    playSelect,
    playWarp,
    playLock,
  };
}
