'use client';

import { useEffect } from 'react';
import { useAds } from '@/contexts/MonetizationContext';
import { soundEngine } from '@/services/audio';

/**
 * Reklam gösterimi sırasında (SDK'nın `before-ad`/`after-ad` olayları) sayfadaki
 * tüm `<audio>`/`<video>` elementlerini ve Web Audio `soundEngine`'i sessize alır.
 * Portal kuralları (CrazyGames, GameDistribution) reklam sırasında oyun sesinin
 * kapatılmasını ZORUNLU tutar.
 */
export function useAdPauseAudio() {
  const { onAdEvent } = useAds();

  useEffect(() => {
    const setMuted = (muted: boolean) => {
      soundEngine.setAdMuted(muted);
      document.querySelectorAll('audio, video').forEach((el) => {
        (el as HTMLMediaElement).muted = muted;
      });
    };

    return onAdEvent((event) => {
      setMuted(event === 'before-ad');
    });
  }, [onAdEvent]);
}
