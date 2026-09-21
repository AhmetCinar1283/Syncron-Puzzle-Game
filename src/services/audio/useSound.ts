'use client';

import { useCallback, useEffect, useState } from 'react';
import { settingsService } from '@/services/settings';
import { soundEngine } from './soundEngine';
import type { SoundId, SoundChannel } from './soundEngine';

export type { SoundId, SoundChannel } from './soundEngine';

/**
 * PlayScreen ve arayüz bileşenlerinin ses arayüzü.
 * Gerçek çalma işi modül seviyesindeki tekil `soundEngine`'de (Web Audio) yapılır.
 * Bu hook, ses açık/kapalı ve ses seviyesi tercihlerini `settingsService` üzerinden yönetir.
 *
 * `channel` ayarlar (mute/ses seviyesi) için hangi kanalın gösterileceğini belirler ve
 * verilmişse `play` ile çalınan seslerin kanalını da ezer; verilmezse her ses kendi
 * tanımındaki kanaldan çalar, ayarlar oyun kanalını gösterir.
 */
export function useSoundManager(channel?: SoundChannel) {
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

  const isMenu = channel === 'menu';
  const muted = isMenu ? soundSettings.menuMuted : soundSettings.muted;
  const volume = isMenu ? soundSettings.menuVolume : soundSettings.volume;

  const play = useCallback(
    (name: SoundId) => {
      soundEngine.play(name, channel);
    },
    [channel]
  );

  const toggleMute = useCallback(() => {
    if (isMenu) {
      settingsService.toggleMenuSoundMute();
    } else {
      settingsService.toggleSoundMute();
    }
  }, [isMenu]);

  const setMuted = useCallback(
    (m: boolean) => {
      if (isMenu) {
        settingsService.setMenuSoundMuted(m);
      } else {
        settingsService.setSoundMuted(m);
      }
    },
    [isMenu]
  );

  const setVolume = useCallback(
    (v: number) => {
      if (isMenu) {
        settingsService.setMenuSoundVolume(v);
      } else {
        settingsService.setSoundVolume(v);
      }
    },
    [isMenu]
  );

  return {
    play,
    muted,
    volume,
    toggleMute,
    setMuted,
    setVolume,
    channel: channel ?? 'game',
  };
}

/** Oyun içi sesler için hook kısayolu. */
export function useGameSound() {
  return useSoundManager('game');
}

/** Menü ve harita sesleri için hook kısayolu. */
export function useMenuSound() {
  return useSoundManager('menu');
}
