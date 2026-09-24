/**
 * DOSYA AMACI: "Performans ve Görsellik" grubunun satırlarını üretir: hareket
 * kademesi ve profiler katmanı.
 */

'use client';

import { Gauge } from 'lucide-react';
import { useT } from '@/contexts/LanguageContext';
import type { MotionPreference } from '@/services/settings';
import { MOTION_OPTIONS } from '../../lib/options';
import type { SettingsGroup } from '../../lib/settingsModel';
import { useSettings } from '../useSettings';

export function useGraphicsGroup(): SettingsGroup {
  const t = useT();
  const { settings, updateSettings } = useSettings();
  const g = settings.graphics;

  return {
    id: 'graphics',
    title: t('settings.group_graphics'),
    description: t('settings.graphics_desc'),
    icon: Gauge,
    rows: [
      {
        kind: 'segment',
        id: 'graphics.motion',
        label: t('settings.motion_title'),
        description: t('settings.motion_desc'),
        layout: 'inline',
        options: MOTION_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) })),
        value: g.motion,
        onChange: (v) => updateSettings({ graphics: { motion: v as MotionPreference } }),
      },
      {
        kind: 'toggle',
        id: 'graphics.profiler',
        label: t('settings.profiler_title'),
        description: t('settings.profiler_desc'),
        value: g.profiler,
        onLabel: t('settings.on'),
        offLabel: t('settings.off'),
        onChange: (value) => updateSettings({ graphics: { profiler: value } }),
      },
    ],
  };
}
