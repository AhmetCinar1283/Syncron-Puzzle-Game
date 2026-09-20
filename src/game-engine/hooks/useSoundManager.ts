'use client';

import { useCallback, useEffect, useState } from 'react';
import { settingsService } from '@/services/settings';
import { soundEngine } from '../audio/soundEngine';
import type { SoundName } from '../audio/soundEngine';

export type { SoundName } from '../audio/soundEngine';

/**
 * PlayScreen ve arayüz bileşenlerinin ses arayüzü.
 * Gerçek çalma işi modül seviyesindeki tekil `soundEngine`'de (Web Audio) yapılır.
 * Bu hook, ses açık/kapalı ve ses seviyesi tercihlerini `settingsService` üzerinden yönetir.
 */
export function useSoundManager() {
  const [soundSettings, setSoundSettings] = useState(() => settingsService.getSettings().sound);

  useEffect(() => {
    const unsubscribe = settingsService.subscribe((settings) => {
      setSoundSettings(settings.sound);
    });
    return unsubscribe;
  }, []);

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
    soundEngine.play(name);
  }, []);

  const toggleMute = useCallback(() => {
    settingsService.toggleSoundMute();
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    settingsService.setSoundMuted(muted);
  }, []);

  const setVolume = useCallback((volume: number) => {
    settingsService.setSoundVolume(volume);
  }, []);

  return {
    play,
    muted: soundSettings.muted,
    volume: soundSettings.volume,
    toggleMute,
    setMuted,
    setVolume,
  };
}
