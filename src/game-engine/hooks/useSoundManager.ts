'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { userStorageGet, userStorageSet } from '@/lib/userStorage';
import { soundEngine } from '../audio/soundEngine';
import type { SoundName } from '../audio/soundEngine';

export type { SoundName } from '../audio/soundEngine';

const MUTED_KEY = 'soundMuted';

/**
 * PlayScreen'in ses arayüzü. Gerçek çalma işi modül seviyesindeki tekil
 * `soundEngine`'de (Web Audio) yapılır — buffer'lar bir kez çözülür, bu hook
 * yalnızca sessiz/sesli tercihini yönetir.
 */
export function useSoundManager() {
  const [muted, setMuted] = useState(() => (typeof window !== 'undefined' ? userStorageGet(MUTED_KEY) === 'true' : false));
  const mutedRef = useRef(typeof window !== 'undefined' ? userStorageGet(MUTED_KEY) === 'true' : false);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  // Buffer'ları indir/çöz (tekil — ikinci çağrı iş yapmaz).
  useEffect(() => {
    soundEngine.preload();
  }, []);

  // Otomatik oynatma politikası: AudioContext ilk kullanıcı etkileşimine kadar
  // askıda kalır. İlk dokunuş/tuş/tıklamada aç, sonra dinleyicileri kaldır.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const unlock = () => soundEngine.unlock();
    const events = ['pointerdown', 'touchstart', 'keydown'] as const;
    events.forEach((ev) => window.addEventListener(ev, unlock, { once: true, passive: true }));
    return () => events.forEach((ev) => window.removeEventListener(ev, unlock));
  }, []);

  const play = useCallback((name: SoundName) => {
    if (mutedRef.current || userStorageGet(MUTED_KEY) === 'true') return;
    soundEngine.play(name);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      mutedRef.current = next;
      userStorageSet(MUTED_KEY, String(next));
      if (next) soundEngine.stopAll();
      return next;
    });
  }, []);

  return { play, muted, toggleMute };
}
