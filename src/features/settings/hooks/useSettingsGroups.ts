/**
 * DOSYA AMACI: Ayar gruplarının tek kayıt (registry) noktası. Sayfa ve modal
 * gruplara yalnızca buradan ulaşır; yeni grup = buraya bir satır. Gruplar
 * görünme sırasıyla döner; satırı kalmayan grup gizlenir.
 */

'use client';

import type { SettingsGroup } from '../lib/settingsModel';
import { useGeneralGroup } from './groups/useGeneralGroup';
import { useSoundGroup } from './groups/useSoundGroup';
import { useControlsGroup } from './groups/useControlsGroup';
import { useGraphicsGroup } from './groups/useGraphicsGroup';

export function useSettingsGroups(): SettingsGroup[] {
  const groups = [useGeneralGroup(), useSoundGroup(), useControlsGroup(), useGraphicsGroup()];
  return groups.filter((g) => g.rows.length > 0);
}
