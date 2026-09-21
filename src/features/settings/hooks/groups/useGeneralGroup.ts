/**
 * DOSYA AMACI: "Genel" grubunun satırlarını üretir: uygulama dili, görsel tema
 * ve oyun sırasında ekranın açık kalması (wake lock) tercihi.
 */

'use client';

import { SlidersHorizontal } from 'lucide-react';
import { useT } from '@/contexts/LanguageContext';
import { ALL_THEMES, type GameTheme } from '@/game-engine/themes/themeConfig';
import { LANGS, type Lang } from '@/lib/i18n';
import type { IconName } from '@/components/icons/types';
import type { SettingsGroup } from '../../lib/settingsModel';
import { useSettings } from '../useSettings';

export function useGeneralGroup(): SettingsGroup {
  const t = useT();
  const { settings, setLanguage, setTheme, updateSettings } = useSettings();

  return {
    id: 'general',
    title: t('settings.group_general'),
    icon: SlidersHorizontal,
    rows: [
      {
        kind: 'segment',
        id: 'general.language',
        label: t('settings.language_title'),
        description: t('settings.language_desc'),
        layout: 'inline',
        options: LANGS.map(({ code, label }) => ({ value: code, label })),
        value: settings.language,
        onChange: (v) => setLanguage(v as Lang),
      },
      {
        kind: 'segment',
        id: 'general.theme',
        label: t('settings.theme_title'),
        description: t('settings.theme_desc'),
        layout: 'grid',
        options: ALL_THEMES.map((th) => ({
          value: th.id,
          label: t(th.nameKey) || th.defaultName,
          accent: th.accentColor,
          icon: th.icon as IconName,
        })),
        value: settings.theme,
        onChange: (v) => setTheme(v as GameTheme),
      },
      {
        kind: 'toggle',
        id: 'general.wakeLock',
        label: t('settings.wake_lock_title'),
        description: t('settings.wake_lock_desc'),
        value: settings.general.wakeLock,
        onLabel: t('settings.on'),
        offLabel: t('settings.off'),
        onChange: (value) => updateSettings({ general: { wakeLock: value } }),
      },
    ],
  };
}
