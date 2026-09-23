/**
 * DOSYA AMACI: LevelPreviewModal için seviye verisini yerel veritabanından (Dexie)
 * veya buluttan (Firestore) asenkron yükleyen, gerektiğinde arka planda senkronizasyon
 * tetikleyen ve yükleme/hata durumlarını yöneten özel hook.
 */

import { useState, useCallback, useEffect } from 'react';
import type { LevelData } from '@/game-engine/level-format';
import { useT } from '@/contexts/LanguageContext';
import { normalizeLevelData } from '../lib/normalizeLevelData';

interface UseLevelPreviewDataOptions {
  isOpen: boolean;
  levelId?: string | number | null;
  initialLevelData?: LevelData | null;
}

export function useLevelPreviewData({
  isOpen,
  levelId,
  initialLevelData,
}: UseLevelPreviewDataOptions) {
  const t = useT();
  const [data, setData] = useState<LevelData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (initialLevelData) {
      setData(normalizeLevelData(initialLevelData));
      setLoading(false);
      setError(null);
      return;
    }

    if (!levelId) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (typeof levelId === 'string') {
        const { getFirestoreLevel } = await import('@/services/firebase/adminLevels');
        const fl = await getFirestoreLevel(levelId);
        if (fl) {
          setData(normalizeLevelData(fl));
        } else {
          setError(t('levels.not_found') || 'Seviye verisi bulunamadı.');
        }
      } else if (typeof levelId === 'number') {
        const { getPresetLevelById, getUserLevelById } = await import('@/services/db');
        let lvl = (await getPresetLevelById(levelId)) || (await getUserLevelById(levelId));

        if (
          lvl &&
          (!lvl.grid || (Array.isArray(lvl.grid) && lvl.grid.length === 0) || lvl.isNeedSync) &&
          lvl.firestoreId
        ) {
          try {
            const { fetchAndCacheLevel } = await import('@/services/firebase/sync');
            await fetchAndCacheLevel(lvl.firestoreId, levelId);
            lvl = (await getPresetLevelById(levelId)) || lvl;
          } catch (syncErr) {
            console.warn('[LevelPreviewModal] Sync failed:', syncErr);
          }
        }

        if (lvl) {
          setData(normalizeLevelData(lvl));
        } else {
          setError(t('levels.not_found') || 'Yerel veritabanında seviye bulunamadı.');
        }
      }
    } catch (err) {
      console.error('[LevelPreviewModal] Error loading level:', err);
      setError(t('common.error') || 'Veri yüklenirken bir sorun oluştu.');
    } finally {
      setLoading(false);
    }
  }, [initialLevelData, levelId, t]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    } else {
      setData(null);
      setError(null);
    }
  }, [isOpen, loadData]);

  return {
    data,
    loading,
    error,
    reload: loadData,
  };
}
