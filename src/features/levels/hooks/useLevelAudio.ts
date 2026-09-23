'use client';

import { useCallback } from 'react';
import { soundEngine } from '@/services/audio';

/**
 * DOSYA AMACI: Levels sayfasında taktil geri bildirim sunan mikro ses efektleri hook'u.
 * Merkezi `soundEngine` ve `settingsService` altyapısını kullanarak sesleri düşük gecikmeyle çalar.
 */
export function useLevelAudio() {
  const playTick = useCallback(() => {
    soundEngine.playMenu('ui.tick');
  }, []);

  const playSelect = useCallback(() => {
    soundEngine.playMenu('ui.navigate');
  }, []);

  const playBack = useCallback(() => {
    soundEngine.playMenu('ui.back');
  }, []);

  const playWarp = useCallback(() => {
    soundEngine.playMenu('game.teleport');
  }, []);

  const playLock = useCallback(() => {
    soundEngine.playMenu('ui.denied');
  }, []);

  const playSector = useCallback(() => {
    soundEngine.playMenu('ui.navigate');
  }, []);

  return {
    playTick,
    playSelect,
    playBack,
    playWarp,
    playLock,
    playSector,
  };
}
