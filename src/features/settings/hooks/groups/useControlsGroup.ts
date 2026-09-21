/**
 * DOSYA AMACI: "Kontroller" grubunun satırlarını üretir: klavye, d-pad,
 * dokunarak hareket (tap-to-move), swipe hassasiyeti ve titreşim. Dokunmatik
 * cihaza özel satırlar masaüstünde gizlenir. Ayarı yalnızca yazar; girdi
 * mantığı (`usePlayInput` vb.) bu değerleri ayrıca okur.
 */

'use client';

import { Gamepad2 } from 'lucide-react';
import { useT } from '@/contexts/LanguageContext';
import type { SettingRow, SettingsGroup } from '../../lib/settingsModel';
import { useSettings } from '../useSettings';
import { useTouchCapable } from '../useTouchCapable';

type ToggleKey = 'keyboard' | 'dpad' | 'tapToMove' | 'haptics';

export function useControlsGroup(): SettingsGroup {
  const t = useT();
  const { settings, updateSettings } = useSettings();
  const touch = useTouchCapable();
  const c = settings.controls;

  const toggle = (key: ToggleKey, label: string, description: string): SettingRow => ({
    kind: 'toggle',
    id: `controls.${key}`,
    label,
    description,
    value: c[key],
    onLabel: t('settings.on'),
    offLabel: t('settings.off'),
    onChange: (value) => updateSettings({ controls: { [key]: value } }),
  });

  const rows: SettingRow[] = [
    toggle('keyboard', t('settings.controls_keyboard'), t('settings.controls_keyboard_desc')),
  ];

  if (touch) {
    rows.push(
      toggle('dpad', t('settings.controls_dpad'), t('settings.controls_dpad_desc')),
      toggle('tapToMove', t('settings.controls_tap_to_move'), t('settings.controls_tap_to_move_desc')),
      {
        kind: 'slider',
        id: 'controls.swipeSensitivity',
        label: t('settings.controls_swipe'),
        description: t('settings.controls_swipe_desc'),
        value: c.swipeSensitivity,
        min: 0,
        max: 100,
        step: 1,
        keyStep: 5,
        onChange: (v) => updateSettings({ controls: { swipeSensitivity: v } }),
      },
      toggle('haptics', t('settings.controls_haptics'), t('settings.controls_haptics_desc')),
    );
  }

  return {
    id: 'controls',
    title: t('settings.group_controls'),
    description: t('settings.controls_desc'),
    icon: Gamepad2,
    rows,
  };
}
