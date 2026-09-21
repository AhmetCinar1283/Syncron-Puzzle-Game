/**
 * DOSYA AMACI: "Ses" grubunun satırlarını üretir: oyun sesi ve menü sesi için
 * ayrı ayrı aç/kapa + seviye. Ayarı yalnızca yazar; sesin çalınması ilgili
 * motorların işidir.
 */

'use client';

import { Volume2 } from 'lucide-react';
import { useT } from '@/contexts/LanguageContext';
import type { SettingsGroup } from '../../lib/settingsModel';
import { useSettings } from '../useSettings';

export function useSoundGroup(): SettingsGroup {
  const t = useT();
  const { settings, updateSettings } = useSettings();
  const { muted, volume, menuMuted, menuVolume } = settings.sound;

  return {
    id: 'sound',
    title: t('settings.group_sound'),
    description: t('settings.sound_desc'),
    icon: Volume2,
    rows: [
      {
        kind: 'toggle',
        id: 'sound.game.enabled',
        label: t('settings.sound_game'),
        description: t('settings.sound_game_desc'),
        value: !muted,
        onLabel: t('settings.sound_active'),
        offLabel: t('settings.sound_muted'),
        onChange: (on) => updateSettings({ sound: { muted: !on } }),
      },
      {
        kind: 'slider',
        id: 'sound.game.volume',
        label: t('settings.sound_game_volume'),
        value: volume,
        min: 0,
        max: 100,
        step: 1,
        keyStep: 5,
        disabled: muted,
        onChange: (v) => updateSettings({ sound: { volume: v, ...(muted && v > 0 ? { muted: false } : {}) } }),
      },
      {
        kind: 'toggle',
        id: 'sound.menu.enabled',
        label: t('settings.sound_menu'),
        description: t('settings.sound_menu_desc'),
        value: !menuMuted,
        onLabel: t('settings.sound_active'),
        offLabel: t('settings.sound_muted'),
        onChange: (on) => updateSettings({ sound: { menuMuted: !on } }),
      },
      {
        kind: 'slider',
        id: 'sound.menu.volume',
        label: t('settings.sound_menu_volume'),
        value: menuVolume,
        min: 0,
        max: 100,
        step: 1,
        keyStep: 5,
        disabled: menuMuted,
        onChange: (v) => updateSettings({ sound: { menuVolume: v, ...(menuMuted && v > 0 ? { menuMuted: false } : {}) } }),
      },
    ],
  };
}
