'use client';

import { useCallback } from 'react';
import { soundEngine } from '@/game-engine/audio/soundEngine';

/**
 * DOSYA AMACI: Levels sayfasında taktil geri bildirim sunan mikro ses efektleri hook'u.
 * Merkezi `soundEngine` ve `settingsService` altyapısını kullanarak sesleri düşük gecikmeyle çalar.
 */
export function useLevelAudio() {
  const playTick = useCallback(() => {
    soundEngine.play('tick');
  }, []);

  const playSelect = useCallback(() => {
    soundEngine.play('move');
  }, []);

  const playWarp = useCallback(() => {
    soundEngine.play('portal');
  }, []);

  const playLock = useCallback(() => {
    soundEngine.play('ice');
  }, []);

  return {
    playTick,
    playSelect,
    playWarp,
    playLock,
  };
}
