/**
 * DOSYA AMACI: "Kontroller" grubunun satırlarını üretir: klavye,
 * dokunmatik kontrol şeması, tuş yeri, swipe hassasiyeti ve titreşim. Dokunmatik
 * cihaza özel satırlar masaüstünde gizlenir. Ayarı yalnızca yazar; girdi
 * mantığı (`usePlayInput` vb.) bu değerleri ayrıca okur.
 */

'use client';

import { Gamepad2 } from 'lucide-react';
import { useT } from '@/contexts/LanguageContext';
import type { SettingRow, SettingsGroup } from '../../lib/settingsModel';
import { useSettings } from '../useSettings';
import { useTouchCapable } from '../useTouchCapable';
import { PAD_SIDE_OPTIONS, SCHEME_OPTIONS } from '../../lib/options';
import type { ControlScheme, PadSide } from '@/services/settings';

type ToggleKey = 'keyboard' | 'haptics';

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
    rows.push({
      kind: 'segment',
      id: 'controls.scheme',
      label: t('settings.scheme_title'),
      description: t('settings.scheme_desc'),
      layout: 'inline',
      options: SCHEME_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) })),
      value: c.scheme,
      onChange: (v) => updateSettings({ controls: { scheme: v as ControlScheme } }),
    });

    // Tuş yeri yalnızca ekran tuşları açıkken, hassasiyet yalnızca kaydırma açıkken anlamlı.
    if (c.scheme !== 'swipe') {
      rows.push({
        kind: 'segment',
        id: 'controls.padSide',
        label: t('settings.pad_side_title'),
        description: t('settings.pad_side_desc'),
        layout: 'inline',
        options: PAD_SIDE_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) })),
        value: c.padSide,
        onChange: (v) => updateSettings({ controls: { padSide: v as PadSide } }),
      });
    }

    if (c.scheme !== 'buttons') {
      rows.push({
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
      });
    }

    rows.push(
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
