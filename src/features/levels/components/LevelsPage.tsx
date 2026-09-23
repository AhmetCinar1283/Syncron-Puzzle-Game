'use client';

import { Suspense } from 'react';
import { useCapabilities } from '@/contexts/MonetizationContext';
import { useLevelsPage } from '../hooks/useLevelsPage';
import { LevelsHUD } from './LevelsHUD';
import { LevelsControlBar } from './LevelsControlBar';
import { ChapterBar } from './chapters/ChapterBar';
import { ChapterLockShield } from './chapters/ChapterLockShield';
import { ConstellationCircuit } from './circuit/ConstellationCircuit';
import { CustomLevelsView } from './custom/CustomLevelsView';
import { WarpTransition } from './WarpTransition';
import { GameIcon } from '@/components/icons';
import { Modal } from '@/components/ui';
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
    previewLevel,
    setPreviewLevel,
    previewIsPreset,
    setPreviewIsPreset,
  } = useLevelsPage();

  // Alt kontrol çubuğundaki "Oyna" butonunun hedeflediği seviye (scroll/klavye/gamepad ile seçilen)
  const activeLevel = filteredPresets[selectedIndex ?? defaultActiveIdx];

  return (
    <div
      className="relative z-1 flex h-[100dvh] w-screen flex-col overflow-hidden text-slate-200 bg-transparent"
    >
      {/* 1. Üst HUD */}
      {/* Yükseklik = bar içeriği + çentik/status bar payı (safe-area). HUD bu kutuyu inset-0 ile doldurur. */}
      <div
        className="relative z-30 shrink-0"
        style={{ height: `calc(${isMobile ? 52 : 60}px + env(safe-area-inset-top))` }}
      >
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

            {/* Alt Kontrol Çubuğu: önceki/sonraki sektör + seçili seviyeyi doğrudan oynat */}
            {!isCurrentChapterLocked && (
              <LevelsControlBar
                isMobile={isMobile}
                themeDef={themeDef}
                canGoPrevSector={hasPortalStart}
                canGoNextSector={isSessionCompleted}
                onPrevSector={handleEntryPortal}
                onNextSector={handleExitPortal}
                onPlay={() => {
                  const idx = selectedIndex ?? defaultActiveIdx;
                  const lv = filteredPresets[idx];
                  if (lv) playLevel(lv, true);
                }}
                playDisabled={
                  !activeLevel || (!!activeLevel.firestoreId && lockedSet.has(activeLevel.firestoreId))
                }
                playLabel={t('levels.play_btn')}
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
        <Modal
          open={victoryModal}
          onClose={() => setVictoryModal(false)}
          maxWidth={420}
          accentColor="#facc15"
          showCloseButton={false}
          showHandle={true}
        >
          <div style={{ textAlign: 'center', padding: '10px 4px 6px' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
              <GameIcon
                name="trophy"
                size={54}
                color="#facc15"
                style={{ filter: 'drop-shadow(0 0 16px rgba(250, 204, 21, 0.5))' }}
              />
            </div>
            <h3 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#facc15' }}>
              {t('levels.victory_portal_title')}
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: 13, lineHeight: 1.6, color: '#94a3b8' }}>
              {t('levels.victory_portal_body')}
            </p>
            <button
              type="button"
              onClick={() => setVictoryModal(false)}
              className="home-sheet__close-btn"
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                borderColor: '#f59e0b',
                color: '#030712',
                fontWeight: 900,
                boxShadow: '0 0 20px rgba(245, 158, 11, 0.4)',
              }}
            >
              {t('levels.victory_portal_back')}
            </button>
          </div>
        </Modal>
      )}

      {/* 6. Hazır Bölüm Silme Onayı (Moderatör) */}
      {deleteConfirm && (
        <Modal
          open={!!deleteConfirm}
          onClose={() => !deleting && setDeleteConfirm(null)}
          title={t('levels.delete_title')}
          accentColor="#ef4444"
          maxWidth={380}
          showCloseButton={false}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 2px' }}>
            <p style={{ margin: 0, fontSize: 13, color: '#e2e8f0', lineHeight: 1.5 }}>
              {t('levels.delete_body', { name: deleteConfirm.name })}
            </p>
            <p style={{ margin: 0, fontSize: 11, color: '#f87171' }}>
              {t('levels.delete_warning')}
            </p>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                type="button"
                onClick={confirmDeletePreset}
                disabled={deleting}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1.5px solid #ef4444',
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#ef4444',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.6 : 1,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {deleting ? '...' : t('levels.delete_yes')}
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: '1.5px solid rgba(255, 255, 255, 0.12)',
                  background: 'rgba(255, 255, 255, 0.04)',
                  color: '#94a3b8',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </Modal>
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
            position: previewLevel.position ?? (previewIsPreset ? filteredPresets.findIndex((l) => l.id === previewLevel.id) : undefined),
            partName: activePart?.name,
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
