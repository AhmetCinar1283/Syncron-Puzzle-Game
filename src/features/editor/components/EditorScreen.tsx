'use client';

import { useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import type { LevelData } from '@/game-engine/level-format';
import LevelsManagerDialog from './levels/LevelsManagerDialog';
import ToolPalette from './palette/ToolPalette';
import EditorCanvas from './canvas/EditorCanvas';
import BottomSettingsPanel from './settings/BottomSettingsPanel';
import EditorRightPanel from './EditorRightPanel';
import EditorDialogs from './dialogs/EditorDialogs';
import EditorTestOverlay from './EditorTestOverlay';
import DailyPuzzleDialog from './dialogs/DailyPuzzleDialog';
import { EditorMobileTabs, EditorTopBar } from './EditorTopBar';
import { useEditorState } from '../hooks/useEditorState';
import { useGridOperations } from '../hooks/useGridOperations';
import { useEditorLayout } from '../hooks/useEditorLayout';
import { useEditorShortcuts } from '../hooks/useEditorShortcuts';
import { useDailyPuzzleEditor } from '../hooks/useDailyPuzzleEditor';
import { EditorContextProvider } from '../EditorContext';
import type { EditorContextValue } from '../EditorContext';

/** Editor root (formerly `EditorInner` in app/editor/page.tsx). Needs a Suspense boundary (useSearchParams). */
export default function EditorScreen() {
  const searchParams = useSearchParams();
  const editId = searchParams.get('id') ? Number(searchParams.get('id')) : null;
  const firestoreIdParam = searchParams.get('firestoreId');

  const s = useEditorState(editId, firestoreIdParam);
  const {
    isMobile, isCompactBar, paletteOrientation,
    activeTab, setActiveTab, tabs, cellSize, canvasAreaRef,
  } = useEditorLayout(s.width, s.height);

  const gridOps = useGridOperations({
    grid: s.grid, setGrid: s.setGrid,
    width: s.width, setWidth: s.setWidth,
    height: s.height, setHeight: s.setHeight,
    objects: s.objects, setObjects: s.setObjects,
    boxes: s.boxes, setBoxes: s.setBoxes,
    conveyorPowerRequired: s.conveyorPowerRequired, setConveyorPowerRequired: s.setConveyorPowerRequired,
    conveyorConfig: s.conveyorConfig, setConveyorConfig: s.setConveyorConfig,
    trampolineConfig: s.trampolineConfig, setTrampolineConfig: s.setTrampolineConfig,
    pushGridHistory: s.pushGridHistory,
    activeRoomId: s.activeRoomId,
  });

  useEditorShortcuts(s.undo, s.testLevel, s.handleTest);

  // Günlük bulmaca modu yalnızca admin içindir (worker da yazmayı admin'e sınırlar).
  const { role } = useAuth();
  const { doGenerateLevel } = s;
  const loadDailyLevel = useCallback((level: LevelData) => doGenerateLevel(level, null, 0), [doGenerateLevel]);
  const daily = useDailyPuzzleEditor({
    enabled: role === 'admin',
    dailyPuzzleId: searchParams.get('dailyPuzzleId'),
    dailyDraft: searchParams.get('dailyDraft') === '1',
    generateLevelData: s.generateLevelData,
    loadLevel: loadDailyLevel,
    optimalSolution: s.optimalSolution,
  });

  // Mobilde palet yalnızca ızgara sekmesinde anlamlı; masaüstünde her zaman açık.
  const showGrid = !isMobile || activeTab === 'grid';

  const ctxValue: EditorContextValue = {
    ...s,
    cellSize,
    ...gridOps,
  };

  return (
    <EditorContextProvider value={ctxValue}>
      <div className="h-[100dvh]" style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#030712', color: '#e2e8f0', overflow: 'hidden' }}>

        {/* Top bar */}
        <EditorTopBar
          editId={editId}
          isCompact={isCompactBar}
          showTitle={!isCompactBar}
          onDailyPuzzle={role === 'admin' ? daily.openDialog : undefined}
        />

        {/* Test hatası: hangi sekmede olursak olalım görünür kalır */}
        {s.testError && (
          <div style={{
            flexShrink: 0, padding: '6px 14px', fontSize: 11, fontWeight: 600,
            color: '#fecaca', background: 'rgba(239,68,68,0.12)',
            borderBottom: '1px solid rgba(239,68,68,0.35)',
          }}>
            {s.testError}
          </div>
        )}

        {/* Mobile tab bar */}
        {isMobile && <EditorMobileTabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />}

        {/* Body: [palet] [tuval + alt panel] [ayarlar] */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
          {/* Geniş ekranda palet solda sabit sütun; tuvalin sol tarafında,
              ayar paneliyle karışmayacak şekilde. */}
          {paletteOrientation === 'column' && showGrid && (
            <ToolPalette isMobile={isMobile} orientation="column" />
          )}

          {/* Center column: palette (dar ekran) + grid + bottom panel */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
            {paletteOrientation === 'row' && showGrid && (
              <ToolPalette isMobile={isMobile} orientation="row" />
            )}
            <EditorCanvas isMobile={isMobile} visible={activeTab === 'grid'} areaRef={canvasAreaRef} />
            <BottomSettingsPanel isMobile={isMobile} visible={activeTab === 'grid'} />
          </div>

          <EditorRightPanel isMobile={isMobile} visible={activeTab === 'settings'} />
        </div>

        <EditorDialogs
          saveDialogOpen={s.saveDialogOpen}
          onSaveClose={() => s.setSaveDialogOpen(false)}
          savePosition={s.savePosition} setSavePosition={s.setSavePosition}
          savedLevels={s.savedLevels} onSave={s.doSave}
          submitDialogOpen={s.submitDialogOpen}
          onSubmitClose={() => { s.setSubmitDialogOpen(false); s.setSubmitNote(''); }}
          submitNote={s.submitNote} setSubmitNote={s.setSubmitNote}
          submitError={s.submitError} submitStatus={s.submitStatus}
          savedRequestId={s.savedRequestId} levelName={s.levelName}
          difficulty={s.difficulty} user={s.user} userTag={s.userTag}
          onSubmit={s.handleSubmitLevel}
          generatorDialogOpen={s.generatorDialogOpen}
          onGeneratorClose={() => s.setGeneratorDialogOpen(false)}
          onGenerate={s.doGenerateLevel}
          aiAssistantDialogOpen={s.aiAssistantDialogOpen}
          onAiAssistantClose={() => s.setAiAssistantDialogOpen(false)}
        />

        <LevelsManagerDialog
          open={s.levelsDialogOpen}
          onClose={() => s.setLevelsDialogOpen(false)}
        />

        {s.testLevel && (
          <EditorTestOverlay
            testLevel={s.testLevel}
            setTestLevel={s.setTestLevel}
            solutionSteps={s.showSolutionPath ? s.optimalSolution : null}
            onSolved={daily.recordTestSolution}
          />
        )}

        {daily.open && <DailyPuzzleDialog daily={daily} defaultTitle={s.levelName} />}
      </div>
    </EditorContextProvider>
  );
}

/** Suspense fallback used by the route (unchanged markup). */
export function EditorLoadingFallback() {
  return (
    <div className="h-[100dvh]" style={{ height: '100dvh', background: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: '#1e3a5f', fontSize: 12, letterSpacing: '0.1em' }}>LOADING...</span>
    </div>
  );
}
