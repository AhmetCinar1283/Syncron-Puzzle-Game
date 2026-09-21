'use client';

import { Suspense, useState } from 'react';
import { useCapabilities } from '@/contexts/MonetizationContext';
import { useLevelsPage, type LevelEntry } from '../hooks/useLevelsPage';
import { LevelsHUD } from './LevelsHUD';
import { ChapterBar } from './chapters/ChapterBar';
import { ChapterLockShield } from './chapters/ChapterLockShield';
import { ConstellationCircuit } from './circuit/ConstellationCircuit';
import { CustomLevelsView } from './custom/CustomLevelsView';
import { WarpTransition } from './WarpTransition';
import { GameIcon } from '@/components/icons';
import LevelPreviewModal from '@/components/common/LevelPreviewModal';

function LevelsPageContent() {
  const { devTools } = useCapabilities();
  const {
    t,
    router,
    totalScore,
    totalEarnedStars,
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
    skippedSet,
    activeTab,
    setActiveTab,
    isWarping,
    victoryModal,
    setVictoryModal,
    selectedIndex,
    setSelectedIndex,
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
    themeDef,
  } = useLevelsPage();

  const [previewLevel, setPreviewLevel] = useState<LevelEntry | null>(null);
  const [previewIsPreset, setPreviewIsPreset] = useState<boolean>(true);

  return (
    <div
      className="relative z-1 flex h-[100dvh] w-screen flex-col overflow-hidden text-slate-200 bg-transparent"
    >
      {/* 1. Üst HUD */}
      <div className="relative z-30" style={{ height: isMobile ? 52 : 60 }}>
        <LevelsHUD
          isMobile={isMobile}
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          totalScore={totalScore}
          totalStars={totalEarnedStars}
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
      </div>

      {/* 3. Çevrimdışı Bildirim Bandı */}
      {isOffline && (
        <div className="relative z-40 flex items-center justify-center bg-amber-500/15 py-1 text-center text-[11px] font-bold tracking-wide text-amber-400 backdrop-blur-sm">
          {t('levels.offline_banner')}
        </div>
      )}

      {/* 4. Ana İçerik Alanı */}
      <div className="relative flex flex-1 flex-col overflow-hidden">
        <WarpTransition active={isWarping} label={t('levels.sector_loading')} />

        {loading ? (
          <div className="flex flex-1 items-center justify-center pt-16 text-[13px] tracking-widest text-yellow-400 animate-pulse">
            {t('common.loading')}
          </div>
        ) : activeTab === 'campaign' ? (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Chapter Seçici Çubuk */}
            <ChapterBar
              chapters={chapters}
              selectedChapterId={selectedPartId}
              onSelectChapter={setSelectedPartId}
              themeDef={themeDef}
              isGamepadConnected={isGamepadConnected}
              onJumpToCurrent={() => setSelectedIndex(defaultActiveIdx)}
            />

            {/* Sektör Kilitliyse Kalkanı Göster, Değilse Izgarayı Göster */}
            {isCurrentChapterLocked ? (
              <div className="flex flex-1 items-center justify-center p-4 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <ChapterLockShield
                  chapterName={activePart?.name ?? ''}
                  requiredStars={activePart?.unlockRequirement ?? 0}
                  currentStars={totalEarnedStars}
                  themeDef={themeDef}
                />
              </div>
            ) : (
              <ConstellationCircuit
                levels={filteredPresets}
                hasPortalStart={hasPortalStart}
                isSessionCompleted={isSessionCompleted}
                playedMap={playedMap}
                skippedSet={skippedSet}
                lockedSet={lockedSet}
                selectedIndex={selectedIndex}
                defaultActiveIndex={defaultActiveIdx}
                themeDef={themeDef}
                isMobile={isMobile}
                onSelect={setSelectedIndex}
                onPlay={(lv) => {
                  setPreviewLevel(lv);
                  setPreviewIsPreset(true);
                }}
                onEntryPortal={handleEntryPortal}
                onExitPortal={handleExitPortal}
                containerRef={gridContainerRef}
              />
            )}
          </div>
        ) : (
          /* Özel / Kullanıcı Seviyeleri */
          <CustomLevelsView
            levels={userLevels}
            isMobile={isMobile}
            playedMap={playedMap}
            skippedSet={skippedSet}
            lockedSet={lockedSet}
            selectedIndex={selectedIndex}
            onHover={setSelectedIndex}
            onPlay={(lv) => {
              setPreviewLevel(lv);
              setPreviewIsPreset(false);
            }}
            onEdit={(lv) => router.push(`/editor?id=${lv.id}`)}
            onDelete={handleDelete}
            onMove={move}
            onNewLevel={() => router.push('/editor')}
            t={t}
          />
        )}
      </div>

      {/* 5. Kampanya Bitiş Modalı */}
      {victoryModal && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#03070f]/92 p-4 backdrop-blur-sm"
          onClick={() => setVictoryModal(false)}
        >
          <div
            className="w-full max-w-[420px] rounded-2xl border border-yellow-400/30 bg-[#070a13] p-7 text-center shadow-[0_0_50px_rgba(255,215,0,0.15)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex justify-center">
              <GameIcon
                name="trophy"
                size={54}
                color="#facc15"
                style={{ filter: 'drop-shadow(0 0 16px rgba(250, 204, 21, 0.4))' }}
              />
            </div>
            <h3 className="mb-3 text-lg font-black uppercase tracking-wide text-yellow-400">
              {t('levels.victory_portal_title')}
            </h3>
            <p className="mb-6 text-[13px] leading-relaxed text-slate-400">
              {t('levels.victory_portal_body')}
            </p>
            <button
              onClick={() => setVictoryModal(false)}
              className="w-full rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 py-2.5 text-[13px] font-extrabold uppercase tracking-wide text-[#030712] shadow-[0_4px_12px_rgba(245,158,11,0.3)]"
            >
              {t('levels.victory_portal_back')}
            </button>
          </div>
        </div>
      )}

      {/* 6. Hazır Bölüm Silme Onayı (Moderatör) */}
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
            <p className="mb-1.5 text-[13px] text-slate-500">
              {t('levels.delete_body', { name: deleteConfirm.name })}
            </p>
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

      {/* 7. Bölüm Detay & Harita Önizleme Modalı */}
      {previewLevel && (
        <LevelPreviewModal
          isOpen={!!previewLevel}
          onClose={() => setPreviewLevel(null)}
          levelId={previewLevel.id}
          levelData={
            previewLevel.grid && Array.isArray(previewLevel.grid) && previewLevel.grid.length > 0
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ? (previewLevel as any)
              : undefined
          }
          metadata={{
            name: previewLevel.name,
            width: previewLevel.width,
            height: previewLevel.height,
            difficulty: previewLevel.difficulty,
            creatorName: previewLevel.creatorName,
            position: previewLevel.position,
            firestoreId: previewLevel.firestoreId,
            playedData: previewLevel.firestoreId ? playedMap.get(previewLevel.firestoreId) : undefined,
            isSkipped: !!previewLevel.firestoreId && skippedSet.has(previewLevel.firestoreId),
            isLocked: previewLevel.firestoreId ? lockedSet.has(previewLevel.firestoreId) : false,
          }}
          mode="play"
          onPlay={() => {
            const lv = previewLevel;
            const isPreset = previewIsPreset;
            setPreviewLevel(null);
            playLevel(lv, isPreset);
          }}
        />
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
export default LevelsPage;
