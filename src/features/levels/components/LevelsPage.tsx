'use client';

import { Suspense } from 'react';
import { useCapabilities } from '@/contexts/MonetizationContext';
import { useLevelsPage } from '../hooks/useLevelsPage';
import { LevelsHUD } from './LevelsHUD';
import { CampaignMap } from './CampaignMap';
import { ChapterDock } from './ChapterDock';
import { LevelDetailPanel } from './LevelDetailPanel';
import { WarpTransition } from './WarpTransition';
import { LevelListView } from './LevelListView';

function LevelsPageContent() {
  const { devTools } = useCapabilities();
  const {
    t,
    router,
    isModerator,
    totalScore,
    userLevels,
    loading,
    syncing,
    isMobile,
    isOffline,
    deleteConfirm,
    setDeleteConfirm,
    deleting,
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
  } = useLevelsPage();

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
        showCustomTab={devTools}
        labels={{
          back: t('common.back_menu'),
          campaign: t('levels.campaign'),
          custom: t('levels.custom'),
          newLevel: t('levels.new'),
        }}
      />

      {isOffline && (
        <div
          className="absolute inset-x-0 z-40 flex items-center justify-center bg-amber-500/15 py-1 text-center text-[11px] font-bold tracking-wide text-amber-400 backdrop-blur-sm"
          style={{ top: 'var(--hud-h)' }}
        >
          {t('levels.offline_banner')}
        </div>
      )}

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

export function LevelsPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-[#030712]" />}>
      <LevelsPageContent />
    </Suspense>
  );
}
