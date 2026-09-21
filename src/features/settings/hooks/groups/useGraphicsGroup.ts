/**
 * DOSYA AMACI: "Performans ve Görsellik" grubunun satırlarını üretir: tahta
 * çizicisi (Otomatik / DOM / Canvas), hareket kademesi ve profiler katmanı.
 * Otomatik karar sistemi `game-engine/render/boardRenderer.ts` içindedir; burası
 * yalnızca kullanıcının tercihini yazar.
 */

'use client';

import { Gauge } from 'lucide-react';
import { useT } from '@/contexts/LanguageContext';
import { setBoardRendererSetting } from '@/game-engine/render/boardRenderer';
import type { MotionPreference, RendererPreference } from '@/services/settings';
import { MOTION_OPTIONS, RENDERER_OPTIONS } from '../../lib/options';
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
        id: 'graphics.renderer',
        label: t('settings.renderer_title'),
        description: t('settings.renderer_desc'),
        layout: 'inline',
        options: RENDERER_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) })),
        value: g.renderer,
        // Adaptör: seçim 'auto' olunca kasma dedektörü kararı da temizlenir.
        onChange: (v) => setBoardRendererSetting(v as RendererPreference),
      },
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
