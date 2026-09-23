'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useAppRouter, useAppSearchParams } from '@/lib/navigation';
import { type StoredLevel, type StoredPlayedLevel } from '@/services/db';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/contexts/LanguageContext';
import { useAppSelector } from '@/store/hooks';
import { selectUser } from '@/store/userSlice';
import type { LevelPart } from '@/services/firebase/adminTypes';
import { computeLockedSet, isProgressed, isChapterUnlocked } from '../lib/progression';
import { getResponsiveColumnCount, calculateChapterStars } from '../lib/gridCalculations';
import { useGameTheme } from '@/game-engine/contexts/GameThemeContext';
import { getLevelTheme } from '../themes/levelThemeAdapters';
import { useCircuitNavigation } from './useCircuitNavigation';
import { useLevelAudio } from './useLevelAudio';
import type { ChapterItemData } from '../components/chapters/ChapterBar';

export type LevelEntry = StoredLevel & { id: number };

const SELECTED_PART_STORAGE_KEY = 'levelsPage:selectedPartId';

export function useLevelsPage() {
  const t = useT();
  const router = useAppRouter();
  const searchParams = useAppSearchParams();
  const { isModerator, user } = useAuth();
  const { totalScore } = useAppSelector(selectUser);
  const { theme: gameTheme } = useGameTheme();
  const themeDef = useMemo(() => getLevelTheme(gameTheme), [gameTheme]);
  const audio = useLevelAudio();

  const [presets, setPresets] = useState<LevelEntry[]>([]);
  const [userLevels, setUserLevels] = useState<LevelEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 400);
  const [isOffline, setIsOffline] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<LevelEntry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [parts, setParts] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedPartId, setSelectedPartId] = useState<string>('');
  const [playedMap, setPlayedMap] = useState<Map<string, StoredPlayedLevel>>(new Map());
  /** Ödüllü reklamla atlanan bölümler: kilidi açar, skor/yıldız vermez. */
  const [skippedSet, setSkippedSet] = useState<Set<string>>(new Set());
  const [partsMap, setPartsMap] = useState<Map<string, LevelPart>>(new Map());

  const [activeTab, setActiveTab] = useState<'campaign' | 'custom'>('campaign');
  const [isWarping, setIsWarping] = useState(false);
  const [victoryModal, setVictoryModal] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [previewLevel, setPreviewLevel] = useState<LevelEntry | null>(null);
  const [previewIsPreset, setPreviewIsPreset] = useState<boolean>(true);

  const gridContainerRef = useRef<HTMLDivElement>(null);

  // ── 1. Çevrimdışı Durumu ────────────────────────────────────────────────
  useEffect(() => {
    setIsOffline(typeof navigator !== 'undefined' && !navigator.onLine);
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // ── 2. Responsive Boyutlandırma ─────────────────────────────────────────
  useEffect(() => {
    function handleResize() {
      const w = window.innerWidth;
      setWindowWidth(w);
      setIsMobile(w < 640);
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const columns = useMemo(() => getResponsiveColumnCount(windowWidth), [windowWidth]);

  // ── 3. Veri Yükleme ─────────────────────────────────────────────────────
  const reload = useCallback(async () => {
    const { getOrderedLevels, getPresetLevels, getAllPlayedLevels, getAllSkippedLevels } = await import('@/services/db');
    const [presetData, userData] = await Promise.all([getPresetLevels(), getOrderedLevels()]);
    setPresets(presetData as LevelEntry[]);
    setUserLevels(userData as LevelEntry[]);

    const [playedData, skippedData] = await Promise.all([getAllPlayedLevels(), getAllSkippedLevels()]);
    setPlayedMap(new Map(playedData.map((p) => [p.levelId, p])));
    setSkippedSet(new Set(skippedData.map((s) => s.levelId)));

    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
    const handleFocusOrVisibility = () => {
      if (document.visibilityState === 'visible') reload();
    };
    window.addEventListener('focus', handleFocusOrVisibility);
    document.addEventListener('visibilitychange', handleFocusOrVisibility);
    return () => {
      window.removeEventListener('focus', handleFocusOrVisibility);
      document.removeEventListener('visibilitychange', handleFocusOrVisibility);
    };
  }, [reload]);

  // ── 4. Senkronizasyon ───────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    import('@/services/sync/playedLevels').then(({ syncPlayedLevelsFromWorker }) => {
      syncPlayedLevelsFromWorker(user)
        .then((res) => {
          if (res.upserted > 0 || res.deleted > 0) reload();
        })
        .catch((err) => console.warn('[Sync] PlayedLevels sync failed:', err));
    });
  }, [user, reload]);

  useEffect(() => {
    const fromUrl = searchParams.get('part');
    const fromStorage = localStorage.getItem(SELECTED_PART_STORAGE_KEY);
    const initialPart = fromUrl || fromStorage || '';
    if (initialPart) setSelectedPartId(initialPart);

    import('@/services/levels/campaignParts').then(({ getCampaignParts }) => {
      getCampaignParts()
        .then((fetchedParts) => {
          const mapped = fetchedParts.map((p) => ({ id: p.partId, name: p.name }));
          setParts(mapped);
          setSelectedPartId((prev) => (prev && mapped.some((p) => p.id === prev) ? prev : mapped[0]?.id ?? ''));
          const m = new Map<string, LevelPart>();
          fetchedParts.forEach((p) => m.set(p.partId, p));
          setPartsMap(m);
        })
        .catch((err) => console.warn('[Parts]', err));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedPartId) return;
    localStorage.setItem(SELECTED_PART_STORAGE_KEY, selectedPartId);
    const url = new URL(window.location.href);
    if (url.searchParams.get('part') !== selectedPartId) {
      url.searchParams.set('part', selectedPartId);
      window.history.replaceState(window.history.state, '', url.toString());
    }
  }, [selectedPartId]);

  useEffect(() => {
    import('@/services/firebase/sync').then(({ syncLevelsMeta }) => {
      syncLevelsMeta()
        .then(() => reload())
        .catch((err) => console.warn('[Sync] Meta sync failed:', err));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = useCallback(async () => {
    if (!user) return;
    setSyncing(true);
    try {
      const [{ syncLevelsMeta }, { syncPlayedLevelsFromWorker }] = await Promise.all([
        import('@/services/firebase/sync'),
        import('@/services/sync/playedLevels'),
      ]);
      await syncLevelsMeta(true);
      await syncPlayedLevelsFromWorker(user, true);
    } catch (err) {
      console.warn('[Sync] Refresh failed:', err);
    }
    await reload();
    setSyncing(false);
  }, [reload, user]);

  // ── 5. Kullanıcı Seviyeleri Yönetimi ────────────────────────────────────
  const move = useCallback(
    async (index: number, dir: -1 | 1) => {
      const target = index + dir;
      if (target < 0 || target >= userLevels.length) return;
      const next = [...userLevels];
      [next[index], next[target]] = [next[target], next[index]];
      setUserLevels(next);
      const { reorderLevels } = await import('@/services/db');
      await reorderLevels(next.map((l) => l.id));
    },
    [userLevels],
  );

  const handleDelete = useCallback(
    async (id: number) => {
      if (!confirm('Delete this level? This cannot be undone.')) return;
      const { deleteStoredLevel } = await import('@/services/db');
      await deleteStoredLevel(id);
      await reload();
    },
    [reload],
  );

  const confirmDeletePreset = useCallback(async () => {
    if (!deleteConfirm?.firestoreId) return;
    setDeleting(true);
    try {
      const { deleteFirestoreLevel, getAllParts } = await import('@/services/firebase/admin');
      const allParts = await getAllParts();
      const part = allParts.find((p) =>
        Object.values(p.order).some((e) => (typeof e === 'string' ? e : e.id) === deleteConfirm.firestoreId),
      );
      await deleteFirestoreLevel(deleteConfirm.firestoreId, part ? part.partId : '');
      const { deletePresetLevel } = await import('@/services/db');
      await deletePresetLevel(deleteConfirm.id);
      await reload();
    } catch (err) {
      console.error('[DeletePreset]', err);
    }
    setDeleting(false);
    setDeleteConfirm(null);
  }, [deleteConfirm, reload]);

  // ── 6. İlerleme & Yıldız Hesaplamaları ──────────────────────────────────
  const totalEarnedStars = useMemo(() => {
    let sum = 0;
    for (const p of playedMap.values()) {
      if (p.stars) sum += p.stars;
    }
    return sum;
  }, [playedMap]);

  const filteredPresets = useMemo(
    () => (selectedPartId ? presets.filter((lv) => String(lv.part) === selectedPartId) : presets),
    [presets, selectedPartId],
  );

  const progressSets = useMemo(() => ({ played: playedMap, skipped: skippedSet }), [playedMap, skippedSet]);

  const activePart = partsMap.get(selectedPartId);
  const currentPartIdx = parts.findIndex((p) => p.id === selectedPartId);

  // Chapter'ın kilit durumu (Yıldız bariyeri kontrolü)
  const isCurrentChapterLocked = useMemo(() => {
    if (isModerator || !activePart) return false;
    return !isChapterUnlocked(activePart, totalEarnedStars);
  }, [isModerator, activePart, totalEarnedStars]);

  const lockedSet = useMemo((): Set<string> => {
    if (isModerator || !selectedPartId) return new Set();
    const part = partsMap.get(selectedPartId);
    return part ? computeLockedSet(part, progressSets, totalEarnedStars) : new Set();
  }, [selectedPartId, partsMap, progressSets, totalEarnedStars, isModerator]);

  const isSessionCompleted =
    filteredPresets.length > 0 &&
    filteredPresets.every((lv) => lv.firestoreId && isProgressed(lv.firestoreId, progressSets));

  const defaultActiveIdx = useMemo(() => {
    const idx = filteredPresets.findIndex((lv) => {
      const progressed = lv.firestoreId ? isProgressed(lv.firestoreId, progressSets) : false;
      const isLocked = lv.firestoreId ? lockedSet.has(lv.firestoreId) : false;
      return !isLocked && !progressed;
    });
    return idx !== -1 ? idx : 0;
  }, [filteredPresets, progressSets, lockedSet]);

  // Chapter listesi ve yıldız istatistikleri
  const chapters: ChapterItemData[] = useMemo(() => {
    return parts.map((p) => {
      const fullPart = partsMap.get(p.id);
      const partLevels = presets.filter((l) => String(l.part) === p.id);
      const { earned, max } = calculateChapterStars(partLevels, playedMap);
      const req = fullPart?.unlockRequirement ?? 0;
      const locked = !isModerator && totalEarnedStars < req;

      return {
        id: p.id,
        name: p.name,
        total: partLevels.length,
        completed: partLevels.filter((l) => l.firestoreId && playedMap.has(l.firestoreId)).length,
        earnedStars: earned,
        maxStars: max,
        isLocked: locked,
        unlockRequirement: req,
      };
    });
  }, [parts, partsMap, presets, playedMap, isModerator, totalEarnedStars]);

  // ── 7. Navigasyon ve Başlatma ───────────────────────────────────────────
  const currentList = activeTab === 'campaign' ? filteredPresets : userLevels;

  useEffect(() => {
    setSelectedIndex(activeTab === 'campaign' ? defaultActiveIdx : 0);
  }, [activeTab, defaultActiveIdx, selectedPartId]);

  const playLevel = useCallback(
    (lv: LevelEntry, isPreset: boolean) => {
      const isLocked = isPreset && lv.firestoreId ? lockedSet.has(lv.firestoreId) : false;
      if (isLocked) {
        audio.playLock();
        return;
      }
      audio.playSelect();
      router.push(isPreset ? `/play?id=${lv.id}&source=preset` : `/play?id=${lv.id}`);
    },
    [lockedSet, router, audio],
  );

  const goToChapter = useCallback(
    (targetIdx: number) => {
      if (targetIdx < 0 || targetIdx >= parts.length) return;
      audio.playWarp();
      setIsWarping(true);
      setTimeout(() => {
        setSelectedPartId(parts[targetIdx].id);
        setIsWarping(false);
      }, 350);
    },
    [parts, audio],
  );

  const handleSelectLevel = useCallback(
    (action: React.SetStateAction<number | null>) => {
      setSelectedIndex((prev) => {
        const next = typeof action === 'function' ? action(prev) : action;
        if (next !== prev) {
          audio.playTick();
        }
        return next;
      });
    },
    [audio],
  );

  const handleSelectPart = useCallback(
    (action: React.SetStateAction<string>) => {
      setSelectedPartId((prev) => {
        const next = typeof action === 'function' ? action(prev) : action;
        if (prev && next !== prev) {
          audio.playSector();
        }
        return next;
      });
    },
    [audio],
  );

  const hasPortalStart = currentPartIdx > 0;
  const handleEntryPortal = useCallback(() => goToChapter(currentPartIdx - 1), [goToChapter, currentPartIdx]);
  const handleExitPortal = useCallback(() => {
    if (!isSessionCompleted) return;
    if (currentPartIdx === parts.length - 1) {
      setVictoryModal(true);
      return;
    }
    goToChapter(currentPartIdx + 1);
  }, [isSessionCompleted, currentPartIdx, parts.length, goToChapter]);

  const { isGamepadConnected } = useCircuitNavigation({
    totalItems: currentList.length,
    setSelectedIndex,
    onConfirm: () => {
      const idx = selectedIndex ?? defaultActiveIdx;
      const lv = currentList[idx];
      if (lv) playLevel(lv, activeTab === 'campaign');
    },
    onBack: () => { audio.playBack(); router.push('/'); },
    onChapterPrev: () => goToChapter(currentPartIdx - 1),
    onChapterNext: () => {
      if (currentPartIdx === parts.length - 1 && isSessionCompleted) {
        setVictoryModal(true);
        return;
      }
      goToChapter(currentPartIdx + 1);
    },
    onJumpToCurrent: () => setSelectedIndex(defaultActiveIdx),
    onSwitchTab: () => setActiveTab((prev) => (prev === 'campaign' ? 'custom' : 'campaign')),
    disabled: !!deleteConfirm || victoryModal || isWarping || !!previewLevel,
  });

  return {
    t,
    router,
    isModerator,
    totalScore,
    totalEarnedStars,
    presets,
    userLevels,
    loading,
    syncing,
    isMobile,
    isOffline,
    deleteConfirm,
    setDeleteConfirm,
    deleting,
    parts,
    selectedPartId,
    setSelectedPartId: handleSelectPart,
    playedMap,
    skippedSet,
    activeTab,
    setActiveTab,
    isWarping,
    victoryModal,
    setVictoryModal,
    selectedIndex,
    setSelectedIndex: handleSelectLevel,
    previewLevel,
    setPreviewLevel,
    previewIsPreset,
    setPreviewIsPreset,
    gridContainerRef,
    handleRefresh,
    move,
    handleDelete,
    confirmDeletePreset,
    filteredPresets,
    lockedSet,
    activePart,
    isCurrentChapterLocked,
    isSessionCompleted,
    hasPortalStart,
    handleEntryPortal,
    handleExitPortal,
    defaultActiveIdx,
    chapters,
    playLevel,
    isGamepadConnected,
    goToChapter,
    themeDef,
    columns,
  };
}
