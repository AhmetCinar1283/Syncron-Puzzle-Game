import { useCallback, useEffect, useState } from 'react';
import type { StoredLevel } from '@/services/db';

/**
 * Local (Dexie) saved-levels list. Owns the initial `reloadLevels` effect,
 * which originally ran right after the moderator effects and before the
 * `?id=` load effect — keep the call order in `useEditorState`.
 */
export function useSavedLevels() {
  const [savedLevels, setSavedLevels] = useState<(StoredLevel & { id: number })[]>([]);
  const [levelsLoading, setLevelsLoading] = useState(true);

  const reloadLevels = useCallback(async () => {
    const { getOrderedLevels } = await import('@/services/db');
    setSavedLevels((await getOrderedLevels()) as (StoredLevel & { id: number })[]);
    setLevelsLoading(false);
  }, []);

  const handleReorderLevels = useCallback(async (newOrder: number[]) => {
    const { reorderLevels } = await import('@/services/db');
    await reorderLevels(newOrder);
    await reloadLevels();
  }, [reloadLevels]);

  useEffect(() => { reloadLevels(); }, [reloadLevels]);

  return { savedLevels, levelsLoading, reloadLevels, handleReorderLevels };
}
