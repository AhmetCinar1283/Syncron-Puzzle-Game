'use client';

import { useEffect } from 'react';
import { useAds } from '@/contexts/MonetizationContext';

/**
 * Reklam gösterimi sırasında (SDK'nın `before-ad`/`after-ad` olayları) sayfadaki
 * tüm `<audio>`/`<video>` elementlerini sessize alır. Portal kuralları (CrazyGames,
 * GameDistribution) reklam sırasında oyun sesinin kapatılmasını ZORUNLU tutar.
 * `game-engine` reklamdan hiçbir şey bilmez — yalnızca DOM medya elementlerine
 * dokunur (bkz. 00-mimari-ilkeler.md §3).
 */
export function useAdPauseAudio() {
  const { onAdEvent } = useAds();

  useEffect(() => {
    const setMuted = (muted: boolean) => {
      document.querySelectorAll('audio, video').forEach((el) => {
        (el as HTMLMediaElement).muted = muted;
      });
    };

    return onAdEvent((event) => {
      setMuted(event === 'before-ad');
    });
  }, [onAdEvent]);
}
