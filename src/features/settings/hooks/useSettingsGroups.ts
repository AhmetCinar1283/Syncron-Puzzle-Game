/**
 * DOSYA AMACI: Ayar gruplarının tek kayıt (registry) noktası. Sayfa ve modal
 * gruplara yalnızca buradan ulaşır; yeni grup = buraya bir satır. Gruplar
 * görünme sırasıyla döner; satırı kalmayan grup gizlenir.
 */

'use client';

import type { SettingsGroup } from '../lib/settingsModel';
import { useControlsGroup } from './groups/useControlsGroup';
import { useGeneralGroup } from './groups/useGeneralGroup';
import { useGraphicsGroup } from './groups/useGraphicsGroup';
import { useSoundGroup } from './groups/useSoundGroup';

export function useSettingsGroups(): SettingsGroup[] {
  const groups = [useSoundGroup(), useControlsGroup(), useGraphicsGroup(), useGeneralGroup()];
  return groups.filter((g) => g.rows.length > 0);
}
