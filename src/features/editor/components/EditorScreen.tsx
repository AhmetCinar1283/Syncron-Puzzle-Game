'use client';

import { useSearchParams } from 'next/navigation';
import EditorLeftPanel from './EditorLeftPanel';
import LevelsManagerDialog from './levels/LevelsManagerDialog';
import ToolPalette from './palette/ToolPalette';
import EditorCanvas from './canvas/EditorCanvas';
import BottomSettingsPanel from './settings/BottomSettingsPanel';
import EditorRightPanel from './EditorRightPanel';
import EditorDialogs from './dialogs/EditorDialogs';
import EditorTestOverlay from './EditorTestOverlay';
import { EditorMobileTabs, EditorTopBar } from './EditorTopBar';
import { useEditorState } from '../hooks/useEditorState';
import { useGridOperations } from '../hooks/useGridOperations';
import { useEditorLayout } from '../hooks/useEditorLayout';
import { useEditorShortcuts } from '../hooks/useEditorShortcuts';
import { EditorContextProvider } from '../EditorContext';
import type { EditorContextValue } from '../EditorContext';

/** Editor root (formerly `EditorInner` in app/editor/page.tsx). Needs a Suspense boundary (useSearchParams). */
export default function EditorScreen() {
  const searchParams = useSearchParams();
  const editId = searchParams.get('id') ? Number(searchParams.get('id')) : null;
  const firestoreIdParam = searchParams.get('firestoreId');

  const s = useEditorState(editId, firestoreIdParam);
  const { isMobile, isLandscape, activeTab, setActiveTab, tabs, cellSize } =
    useEditorLayout(s.width, s.height, s.generatedCandidates.length);

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

  const ctxValue: EditorContextValue = {
    ...s,
    cellSize,
    ...gridOps,
  };

  return (
    <EditorContextProvider value={ctxValue}>
      <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#030712', color: '#e2e8f0', overflow: 'hidden' }}>

        {/* Top bar */}
        <EditorTopBar editId={editId} isMobile={isMobile} />

        {/* Mobile tab bar */}
        {isMobile && <EditorMobileTabs tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />}

        {/* Body */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <EditorLeftPanel
            isMobile={isMobile} visible={activeTab === 'alternatives'}
          />

          {/* Center column: palette + grid + bottom panel */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: isLandscape ? 'row' : 'column', overflow: 'hidden' }}>
              {!isLandscape && <ToolPalette isMobile={isMobile} isLandscape={false} />}
              <EditorCanvas isMobile={isMobile} visible={activeTab === 'grid'} />
              {isLandscape && <ToolPalette isMobile={isMobile} isLandscape={true} />}
            </div>
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
          />
        )}
      </div>
    </EditorContextProvider>
  );
}

/** Suspense fallback used by the route (unchanged markup). */
export function EditorLoadingFallback() {
  return (
    <div style={{ height: '100dvh', background: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: '#1e3a5f', fontSize: 12, letterSpacing: '0.1em' }}>LOADING...</span>
    </div>
  );
}
