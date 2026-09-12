'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useAppRouter, useAppSearchParams } from '@/lib/navigation';
import { type StoredLevel, type StoredPlayedLevel } from '@/services/db';
import { useAuth } from '@/hooks/useAuth';
import { useT } from '@/contexts/LanguageContext';
import { useAppSelector } from '@/store/hooks';
import { selectUser } from '@/store/userSlice';
import type { LevelPart } from '@/services/firebase/adminTypes';
import { getMapTheme } from '../lib/mapThemes';
import { useLevelsNavigation } from './useLevelsNavigation';
import type { ChapterInfo } from '../components/ChapterDock';

export type LevelEntry = StoredLevel & { id: number };

const SELECTED_PART_STORAGE_KEY = 'levelsPage:selectedPartId';

export function useLevelsPage() {
  const t = useT();
  const router = useAppRouter();
  const searchParams = useAppSearchParams();
  const { isModerator, user } = useAuth();
  const { totalScore } = useAppSelector(selectUser);

  const [presets, setPresets] = useState<LevelEntry[]>([]);
  const [userLevels, setUserLevels] = useState<LevelEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<LevelEntry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [parts, setParts] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedPartId, setSelectedPartId] = useState<string>('');
  const [playedMap, setPlayedMap] = useState<Map<string, StoredPlayedLevel>>(new Map());
  const [partsMap, setPartsMap] = useState<Map<string, LevelPart>>(new Map());

  const [activeTab, setActiveTab] = useState<'campaign' | 'custom'>('campaign');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [isWarping, setIsWarping] = useState(false);
  const [victoryModal, setVictoryModal] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // ── Çevrimdışı bandı ────────────────────────────────────────────────────
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

  // ── Responsive ──────────────────────────────────────────────────────────
  useEffect(() => {
    function check() {
      setIsMobile(window.innerWidth < 600);
    }
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Veri yükleme ────────────────────────────────────────────────────────
  const reload = useCallback(async () => {
    const { getOrderedLevels, getPresetLevels, getAllPlayedLevels } = await import('@/services/db');
    const [presetData, userData] = await Promise.all([getPresetLevels(), getOrderedLevels()]);
    setPresets(presetData as LevelEntry[]);
    setUserLevels(userData as LevelEntry[]);

    const playedData = await getAllPlayedLevels();
    setPlayedMap(new Map(playedData.map((p) => [p.levelId, p])));

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

  // ── Türetilmiş veri ─────────────────────────────────────────────────────
  const filteredPresets = useMemo(
    () => (selectedPartId ? presets.filter((lv) => String(lv.part) === selectedPartId) : presets),
    [presets, selectedPartId],
  );

  const lockedSet = useMemo((): Set<string> => {
    if (isModerator) return new Set();
    const locked = new Set<string>();
    if (!selectedPartId) return locked;
    const part = partsMap.get(selectedPartId);
    if (!part) return locked;

    const sorted = Object.values(part.order).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    for (let i = 0; i < sorted.length; i++) {
      const fid = typeof sorted[i] === 'string' ? (sorted[i] as unknown as string) : sorted[i].id;
      if (i === 0) {
        if (totalScore < (part.unlockRequirement ?? 0)) locked.add(fid);
      } else {
        const prevEntry = sorted[i - 1];
        const prevFid = typeof prevEntry === 'string' ? (prevEntry as unknown as string) : prevEntry.id;
        if (!playedMap.has(prevFid)) locked.add(fid);
      }
    }
    return locked;
  }, [selectedPartId, partsMap, playedMap, totalScore, isModerator]);

  const activePart = partsMap.get(selectedPartId);
  const currentPartIdx = parts.findIndex((p) => p.id === selectedPartId);
  const hasPortalStart = currentPartIdx > 0;
  const isSessionCompleted =
    filteredPresets.length > 0 && filteredPresets.every((lv) => lv.firestoreId && playedMap.has(lv.firestoreId));

  const defaultActiveIdx = useMemo(() => {
    const idx = filteredPresets.findIndex((lv) => {
      const isCompleted = lv.firestoreId ? playedMap.has(lv.firestoreId) : false;
      const isLocked = lv.firestoreId ? lockedSet.has(lv.firestoreId) : false;
      return !isLocked && !isCompleted;
    });
    return idx !== -1 ? idx : 0;
  }, [filteredPresets, playedMap, lockedSet]);

  const chapters: ChapterInfo[] = useMemo(
    () =>
      parts.map((p) => {
        const partLevels = presets.filter((l) => String(l.part) === p.id);
        return {
          id: p.id,
          name: p.name,
          total: partLevels.length,
          completed: partLevels.filter((l) => l.firestoreId && playedMap.has(l.firestoreId)).length,
        };
      }),
    [parts, presets, playedMap],
  );

  // Sekme/görünüm değişince seçim varsayılana döner
  useEffect(() => {
    setSelectedIndex(activeTab === 'campaign' ? defaultActiveIdx : 0);
  }, [activeTab, viewMode, defaultActiveIdx]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [selectedPartId]);

  // ── Navigasyon eylemleri ─────────────────────────────────────────────────
  const currentList = activeTab === 'campaign' ? filteredPresets : userLevels;

  const playLevel = useCallback(
    (lv: LevelEntry, isPreset: boolean) => {
      const isLocked = isPreset && lv.firestoreId ? lockedSet.has(lv.firestoreId) : false;
      if (isLocked) return;
      router.push(isPreset ? `/play?id=${lv.id}&source=preset` : `/play?id=${lv.id}`);
    },
    [lockedSet, router],
  );

  const goToChapter = useCallback(
    (targetIdx: number) => {
      if (targetIdx < 0 || targetIdx >= parts.length) return;
      setIsWarping(true);
      setTimeout(() => {
        setSelectedPartId(parts[targetIdx].id);
        setIsWarping(false);
      }, 420);
    },
    [parts],
  );

  const { isGamepadConnected } = useLevelsNavigation({
    itemCount: currentList.length,
    disabled: !!deleteConfirm || victoryModal,
    chapterModeVertical: activeTab === 'campaign' && viewMode === 'map',
    scrollContainerRef: activeTab === 'campaign' && viewMode === 'map' ? mapContainerRef : listContainerRef,
    onNavigate: (delta) => {
      setSelectedIndex((prev) => {
        const len = currentList.length;
        if (len === 0) return prev;
        const current = prev ?? 0;
        return (current + delta + len) % len;
      });
    },
    onConfirm: () => {
      const idx = selectedIndex ?? 0;
      const lv = currentList[idx];
      if (lv) playLevel(lv, activeTab === 'campaign');
    },
    onBack: () => router.push('/'),
    onToggleView: () => {
      if (activeTab === 'campaign') setViewMode((v) => (v === 'map' ? 'list' : 'map'));
    },
    onSwitchTab: () => setActiveTab((prev) => (prev === 'campaign' ? 'custom' : 'campaign')),
    onChapterPrev: () => goToChapter(currentPartIdx - 1),
    onChapterNext: () => {
      if (currentPartIdx === parts.length - 1) {
        if (isSessionCompleted) setVictoryModal(true);
        return;
      }
      goToChapter(currentPartIdx + 1);
    },
    onAxisScroll: (dx, dy) => {
      const el = mapContainerRef.current;
      if (!el) return;
      el.scrollLeft += dx;
      el.scrollTop += dy;
    },
  });

  const handleEntryPortal = useCallback(() => goToChapter(currentPartIdx - 1), [goToChapter, currentPartIdx]);
  const handleExitPortal = useCallback(() => {
    if (!isSessionCompleted) return;
    if (currentPartIdx === parts.length - 1) {
      setVictoryModal(true);
      return;
    }
    goToChapter(currentPartIdx + 1);
  }, [isSessionCompleted, currentPartIdx, parts.length, goToChapter]);

  const theme = getMapTheme(activePart?.mapTheme);
  const selectedLevel = selectedIndex !== null ? filteredPresets[selectedIndex] : undefined;
  const showPanel = !loading && activeTab === 'campaign' && viewMode === 'map' && !!selectedLevel;
  const hudH = isMobile ? 52 : 60;
  const dockH = isMobile ? 76 : 88;
  const panelH = showPanel ? (isMobile ? 78 : 86) : 0;

  return {
    t,
    router,
    isModerator,
    totalScore,
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
    setSelectedPartId,
    playedMap,
    activeTab,
    setActiveTab,
    viewMode,
    setViewMode,
    isWarping,
    victoryModal,
    setVictoryModal,
    selectedIndex,
    setSelectedIndex,
    mapContainerRef,
    listContainerRef,
    handleRefresh,
    move,
    handleDelete,
    confirmDeletePreset,
    filteredPresets,
    lockedSet,
    activePart,
    hasPortalStart,
    isSessionCompleted,
    defaultActiveIdx,
    chapters,
    playLevel,
    isGamepadConnected,
    handleEntryPortal,
    handleExitPortal,
    theme,
    selectedLevel,
    showPanel,
    hudH,
    dockH,
    panelH,
  };
}
