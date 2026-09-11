'use client';

import { useEffect, useState, useCallback, useMemo, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { type StoredLevel, type StoredPlayedLevel } from '@/app/src/lib/db';
import { useAuth } from '@/app/src/hooks/useAuth';
import { useT } from '@/app/src/contexts/LanguageContext';
import { useAppSelector } from '@/app/src/store/hooks';
import { selectUser } from '@/app/src/store/userSlice';
import type { LevelPart } from '@/app/src/lib/firebase/adminTypes';
import { getMapTheme } from './mapThemes';
import { useLevelsNavigation } from './hooks/useLevelsNavigation';
import { LevelsHUD } from './components/LevelsHUD';
import { CampaignMap } from './components/CampaignMap';
import { ChapterDock, type ChapterInfo } from './components/ChapterDock';
import { LevelDetailPanel } from './components/LevelDetailPanel';
import { WarpTransition } from './components/WarpTransition';
import { LevelListView } from './components/LevelListView';

type LevelEntry = StoredLevel & { id: number };

const SELECTED_PART_STORAGE_KEY = 'levelsPage:selectedPartId';

function LevelsPageContent() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isModerator, user } = useAuth();
  const { totalScore } = useAppSelector(selectUser);

  const [presets, setPresets] = useState<LevelEntry[]>([]);
  const [userLevels, setUserLevels] = useState<LevelEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
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
    const { getOrderedLevels, getPresetLevels, getDB } = await import('@/app/src/lib/db');
    const [presetData, userData] = await Promise.all([getPresetLevels(), getOrderedLevels()]);
    setPresets(presetData as LevelEntry[]);
    setUserLevels(userData as LevelEntry[]);

    const db = getDB();
    const playedData = await db.playedLevels.toArray();
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
    import('@/app/src/lib/sync/playedLevels').then(({ syncPlayedLevelsFromWorker }) => {
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

    import('@/app/src/lib/firebase/adminParts').then(({ getAllParts }) => {
      getAllParts()
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
    import('@/app/src/lib/firebase/sync').then(({ syncLevelsMeta }) => {
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
        import('@/app/src/lib/firebase/sync'),
        import('@/app/src/lib/sync/playedLevels'),
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
      const { reorderLevels } = await import('@/app/src/lib/db');
      await reorderLevels(next.map((l) => l.id));
    },
    [userLevels],
  );

  const handleDelete = useCallback(
    async (id: number) => {
      if (!confirm('Delete this level? This cannot be undone.')) return;
      const { deleteStoredLevel } = await import('@/app/src/lib/db');
      await deleteStoredLevel(id);
      await reload();
    },
    [reload],
  );

  const confirmDeletePreset = useCallback(async () => {
    if (!deleteConfirm?.firestoreId) return;
    setDeleting(true);
    try {
      const { deleteFirestoreLevel, getAllParts } = await import('@/app/src/lib/firebase/admin');
      const allParts = await getAllParts();
      const part = allParts.find((p) =>
        Object.values(p.order).some((e) => (typeof e === 'string' ? e : e.id) === deleteConfirm.firestoreId),
      );
      await deleteFirestoreLevel(deleteConfirm.firestoreId, part ? part.partId : '');
      const { getDB } = await import('@/app/src/lib/db');
      await getDB().presetLevels.delete(deleteConfirm.id);
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

  return (
    <div
      className="relative flex h-[100dvh] w-screen flex-col overflow-hidden text-slate-200"
      style={
        {
          background: theme.background,
          '--hud-h': `${hudH}px`,
          '--dock-h': `${dockH}px`,
          '--panel-h': `${panelH}px`,
          transition: 'background 0.4s ease',
        } as React.CSSProperties
      }
    >
      <LevelsHUD
        isMobile={isMobile}
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        totalScore={totalScore}
        syncing={syncing}
        onRefresh={handleRefresh}
        onBack={() => router.push('/')}
        onNewLevel={() => router.push('/editor')}
        isGamepadConnected={isGamepadConnected}
        labels={{
          back: t('common.back_menu'),
          campaign: t('levels.campaign'),
          custom: t('levels.custom'),
          newLevel: t('levels.new'),
        }}
      />

      <div className="relative flex-1 overflow-hidden">
        <WarpTransition active={isWarping} label="WARPING..." />

        {activeTab === 'campaign' && viewMode === 'map' && (
          <CampaignMap
            levels={filteredPresets}
            activePart={activePart}
            hasPortalStart={hasPortalStart}
            isSessionCompleted={isSessionCompleted}
            playedMap={playedMap}
            lockedSet={lockedSet}
            selectedIndex={selectedIndex}
            defaultActiveIndex={defaultActiveIdx}
            isMobile={isMobile}
            onSelect={setSelectedIndex}
            onActivate={(idx) => {
              const lv = filteredPresets[idx];
              if (lv) playLevel(lv, true);
            }}
            onEntryPortal={handleEntryPortal}
            onExitPortal={handleExitPortal}
            containerRef={mapContainerRef}
          />
        )}

        {(activeTab === 'custom' || viewMode === 'list') && (
          <div
            ref={listContainerRef}
            className="absolute inset-0 flex flex-col items-center overflow-y-auto"
            style={{
              paddingTop: 'calc(var(--hud-h) + 16px)',
              paddingBottom: 'calc(var(--dock-h) + 24px)',
              paddingLeft: isMobile ? 8 : 32,
              paddingRight: isMobile ? 8 : 32,
            }}
          >
            {loading ? (
              <div className="pt-16 text-[13px] tracking-widest text-yellow-400">{t('common.loading')}</div>
            ) : (
              <div className="w-full max-w-5xl rounded-2xl border border-white/[0.08] bg-[#080c1c]/55 p-3 shadow-[0_12px_40px_rgba(0,0,0,0.5)] backdrop-blur-md sm:p-6">
                {activeTab === 'campaign' ? (
                  <LevelListView
                    levels={filteredPresets}
                    isPreset
                    isAdmin={isModerator}
                    isMobile={isMobile}
                    playedMap={playedMap}
                    lockedSet={lockedSet}
                    selectedIndex={selectedIndex}
                    onHover={setSelectedIndex}
                    onPlay={(lv) => playLevel(lv, true)}
                    onEdit={(lv) => lv.firestoreId && router.push(`/editor?firestoreId=${lv.firestoreId}`)}
                    onDelete={(lv) => setDeleteConfirm(lv)}
                    onMoveUp={() => {}}
                    onMoveDown={() => {}}
                  />
                ) : (
                  <LevelListView
                    levels={userLevels}
                    isPreset={false}
                    isMobile={isMobile}
                    playedMap={playedMap}
                    lockedSet={lockedSet}
                    selectedIndex={selectedIndex}
                    onHover={setSelectedIndex}
                    onPlay={(lv) => playLevel(lv, false)}
                    onEdit={(lv) => router.push(`/editor?id=${lv.id}`)}
                    onDelete={(lv) => handleDelete(lv.id)}
                    onMoveUp={(idx) => move(idx, -1)}
                    onMoveDown={(idx) => move(idx, 1)}
                    emptyState={
                      <div className="flex flex-col items-center gap-4 py-10">
                        <p className="text-[13px] tracking-wide text-slate-500">{t('levels.no_custom')}</p>
                        <button
                          onClick={() => router.push('/editor')}
                          className="rounded-lg border border-cyan-400/40 bg-cyan-400/[0.06] px-7 py-2.5 text-[13px] font-bold uppercase tracking-wider text-cyan-400 shadow-[0_4px_12px_rgba(0,196,255,0.2)]"
                        >
                          {t('levels.create_first')}
                        </button>
                      </div>
                    }
                  />
                )}
              </div>
            )}
          </div>
        )}

        {showPanel && selectedLevel && (
          <LevelDetailPanel
            level={selectedLevel}
            index={selectedIndex ?? 0}
            isLocked={selectedLevel.firestoreId ? lockedSet.has(selectedLevel.firestoreId) : false}
            playedData={selectedLevel.firestoreId ? playedMap.get(selectedLevel.firestoreId) : undefined}
            accentColor={theme.activeColor}
            isGamepadConnected={isGamepadConnected}
            onPlay={() => playLevel(selectedLevel, true)}
            t={t}
          />
        )}

        {!loading && activeTab === 'campaign' && (
          <ChapterDock
            chapters={chapters}
            selectedChapterId={selectedPartId}
            onSelectChapter={setSelectedPartId}
            viewMode={viewMode}
            onToggleView={() => setViewMode((v) => (v === 'map' ? 'list' : 'map'))}
            onJumpToCurrent={() => setSelectedIndex(defaultActiveIdx)}
            isMobile={isMobile}
            isGamepadConnected={isGamepadConnected}
          />
        )}
      </div>

      {/* Kampanya bitiş modalı */}
      {victoryModal && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#03070f]/92 p-4 backdrop-blur-sm"
          onClick={() => setVictoryModal(false)}
        >
          <div
            className="w-full max-w-[420px] rounded-2xl border border-yellow-400/30 bg-[#070a13] p-7 text-center shadow-[0_0_50px_rgba(255,215,0,0.15)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 text-5xl">🏆</div>
            <h3 className="mb-3 text-lg font-black uppercase tracking-wide text-yellow-400">{t('levels.victory_portal_title')}</h3>
            <p className="mb-6 text-[13px] leading-relaxed text-slate-400">{t('levels.victory_portal_body')}</p>
            <button
              onClick={() => setVictoryModal(false)}
              className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 py-2.5 text-[13px] font-extrabold uppercase tracking-wide text-[#030712] shadow-[0_4px_12px_rgba(245,158,11,0.3)]"
            >
              {t('levels.victory_portal_back')}
            </button>
          </div>
        </div>
      )}

      {/* Hazır bölüm silme onayı */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#03070f]/88 p-4 backdrop-blur-[6px]"
          onClick={() => !deleting && setDeleteConfirm(null)}
        >
          <div
            className="w-full max-w-[360px] rounded-2xl border border-red-500/30 bg-[#0a0f1a] p-6 shadow-[0_0_40px_rgba(239,68,68,0.1)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 text-[15px] tracking-wide text-red-500">{t('levels.delete_title')}</h3>
            <p className="mb-1.5 text-[13px] text-slate-500">{t('levels.delete_body', { name: deleteConfirm.name })}</p>
            <p className="mb-5 text-[11px] text-slate-700">{t('levels.delete_warning')}</p>
            <div className="flex gap-2">
              <button
                onClick={confirmDeletePreset}
                disabled={deleting}
                className="rounded-lg border border-red-500/50 bg-red-500/10 px-5 py-2 text-[13px] font-bold text-red-500 disabled:opacity-60"
              >
                {deleting ? '...' : t('levels.delete_yes')}
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="rounded-lg border border-white/10 px-4 py-2 text-[13px] text-slate-500"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LevelsPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-[#030712]" />}>
      <LevelsPageContent />
    </Suspense>
  );
}
