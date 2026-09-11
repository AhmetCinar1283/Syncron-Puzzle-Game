import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import type { RootState } from '@/store';
import { useT } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { useLevelDocument } from './useLevelDocument';
import { useEditorRooms } from './useEditorRooms';
import { useEditorTool, useEditorUiState } from './useEditorUiState';
import { useEditorHistory } from './useEditorHistory';
import { useModeratorLevels, useModeratorPublish } from './useModeratorLevels';
import { useSavedLevels } from './useSavedLevels';
import { useLevelLoaders } from './useLevelLoaders';
import { useLevelBuilder, useLiveSolver, useTestLevel } from './useLevelBuilder';
import { useCellEditing } from './useCellEditing';
import { useLevelPersistence } from './useLevelPersistence';

/**
 * Editor state facade. Composes the smaller hooks and returns EXACTLY the same
 * object shape as the pre-refactor monolith (consumed via `EditorContextValue`).
 *
 * Effect order matters and is preserved by call order:
 *   1-2 moderator parts / part levels  (useModeratorLevels)
 *   3   reload saved levels            (useSavedLevels)
 *   4   load `?id=`                    (useLevelLoaders)
 *   5   live solver                    (useLiveSolver)
 *   6   `?firestoreId=` deep link      (useModeratorPublish)
 * Do not reorder the hook calls below without checking that list.
 */
export function useEditorState(editId: number | null, firestoreIdParam: string | null) {
  const router = useRouter();
  const { user, isAnonymous, isModerator } = useAuth();
  const userTag = useSelector((state: RootState) => state.user.tag);
  const creatorName = userTag ?? user?.displayName ?? user?.email ?? 'Unknown';
  const t = useT();

  const doc = useLevelDocument();
  const roomsApi = useEditorRooms(doc);
  const tool = useEditorTool();
  const history = useEditorHistory(doc.grid, doc.lockedCells, doc.setGrid, doc.setLockedCells);
  const ui = useEditorUiState();
  const savedIdForSubmitRef = useRef<number | null>(null);

  const mod = useModeratorLevels(isModerator);
  const saved = useSavedLevels();
  const loaders = useLevelLoaders(doc, roomsApi, ui, mod, {
    editId, router, pushGridHistory: history.pushGridHistory, savedIdForSubmitRef,
  });

  const generateLevelData = useLevelBuilder(doc, roomsApi, editId, creatorName);
  useLiveSolver(doc, roomsApi.rooms, generateLevelData, ui);

  const cellEditing = useCellEditing(doc, roomsApi.activeRoomId, tool, ui, history.pushGridHistory);
  const persistence = useLevelPersistence(ui, loaders.doImportLevelJson, {
    user, isAnonymous, userTag, creatorName, editId, router, t,
    difficulty: doc.difficulty, savedRequestId: doc.savedRequestId, setSavedRequestId: doc.setSavedRequestId,
    savedLevels: saved.savedLevels, reloadLevels: saved.reloadLevels,
    generateLevelData, handleNewLevel: loaders.handleNewLevel, savedIdForSubmitRef,
  });
  const { doPublish } = useModeratorPublish(mod, {
    user, isModerator, firestoreIdParam, generateLevelData,
    savedLevelsCount: saved.savedLevels.length, difficulty: doc.difficulty,
    setTestError: ui.setTestError, loadFirestoreLevel: loaders.loadFirestoreLevel,
  });
  const handleTest = useTestLevel(generateLevelData, ui.setTestError, ui.setTestLevel);

  return {
    // Auth
    user, isAnonymous, isModerator, userTag,
    // Level data
    levelName: doc.levelName, setLevelName: doc.setLevelName, width: doc.width, setWidth: doc.setWidth,
    height: doc.height, setHeight: doc.setHeight,
    pendingW: doc.pendingW, setPendingW: doc.setPendingW, pendingH: doc.pendingH, setPendingH: doc.setPendingH,
    trailCollision: doc.trailCollision, setTrailCollision: doc.setTrailCollision,
    difficulty: doc.difficulty, setDifficulty: doc.setDifficulty,
    savedRequestId: doc.savedRequestId, edges: doc.edges, setEdges: doc.setEdges,
    grid: doc.grid, setGrid: doc.setGrid, objects: doc.objects, setObjects: doc.setObjects,
    boxes: doc.boxes, setBoxes: doc.setBoxes,
    activePlacingBoxId: doc.activePlacingBoxId, setActivePlacingBoxId: doc.setActivePlacingBoxId,
    conveyorPowerRequired: doc.conveyorPowerRequired, setConveyorPowerRequired: doc.setConveyorPowerRequired,
    conveyorConfig: doc.conveyorConfig, setConveyorConfig: doc.setConveyorConfig,
    trampolineConfig: doc.trampolineConfig, setTrampolineConfig: doc.setTrampolineConfig,
    deflectorConfig: doc.deflectorConfig, setDeflectorConfig: doc.setDeflectorConfig,
    // Multi-room
    rooms: roomsApi.rooms, setRooms: roomsApi.setRooms,
    activeRoomId: roomsApi.activeRoomId, setActiveRoomId: roomsApi.setActiveRoomId,
    controlMode: roomsApi.controlMode, setControlMode: roomsApi.setControlMode,
    switchActiveRoom: roomsApi.switchActiveRoom, addRoom: roomsApi.addRoom, deleteRoom: roomsApi.deleteRoom,
    updateRoomName: roomsApi.updateRoomName, updateRoomLayoutPosition: roomsApi.updateRoomLayoutPosition,
    fogOfWar: doc.fogOfWar, setFogOfWar: doc.setFogOfWar,
    fogVisibilityDistance: doc.fogVisibilityDistance, setFogVisibilityDistance: doc.setFogVisibilityDistance,
    fogKeepRevealed: doc.fogKeepRevealed, setFogKeepRevealed: doc.setFogKeepRevealed,
    // Tool
    activeTool: tool.activeTool, setActiveTool: tool.setActiveTool, router,
    gameNotes: doc.gameNotes, setGameNotes: doc.setGameNotes, creatorNotes: doc.creatorNotes, setCreatorNotes: doc.setCreatorNotes,
    // Saved levels
    savedLevels: saved.savedLevels, levelsLoading: saved.levelsLoading,
    levelsDialogOpen: ui.levelsDialogOpen, setLevelsDialogOpen: ui.setLevelsDialogOpen,
    // UI
    testLevel: ui.testLevel, setTestLevel: ui.setTestLevel, testError: ui.testError,
    saveDialogOpen: ui.saveDialogOpen, setSaveDialogOpen: ui.setSaveDialogOpen,
    savePosition: ui.savePosition, setSavePosition: ui.setSavePosition,
    saveSuccess: ui.saveSuccess, copied: ui.copied,
    submitDialogOpen: ui.submitDialogOpen, setSubmitDialogOpen: ui.setSubmitDialogOpen,
    submitNote: ui.submitNote, setSubmitNote: ui.setSubmitNote, submitStatus: ui.submitStatus, submitError: ui.submitError,
    generatorDialogOpen: ui.generatorDialogOpen, setGeneratorDialogOpen: ui.setGeneratorDialogOpen,
    aiAssistantDialogOpen: ui.aiAssistantDialogOpen, setAiAssistantDialogOpen: ui.setAiAssistantDialogOpen,
    optimalSolution: ui.optimalSolution,
    optimalSolutionMoves: ui.optimalSolutionMoves,
    showSolutionPath: ui.showSolutionPath,
    setShowSolutionPath: ui.setShowSolutionPath,
    // Admin
    parts: mod.parts, selectedPartId: mod.selectedPartId, setSelectedPartId: mod.setSelectedPartId,
    firestoreLevels: mod.firestoreLevels,
    showFirestoreLevels: mod.showFirestoreLevels, setShowFirestoreLevels: mod.setShowFirestoreLevels,
    publishStatus: mod.publishStatus, firestoreEditId: mod.firestoreEditId, setFirestoreEditId: mod.setFirestoreEditId,
    // Undo
    undo: history.undo, canUndo: history.canUndo, pushGridHistory: history.pushGridHistory,
    lockedCells: doc.lockedCells, setLockedCells: doc.setLockedCells,
    optimalSolutionTrajectory: ui.optimalSolutionTrajectory, setOptimalSolutionTrajectory: ui.setOptimalSolutionTrajectory,
    selection: ui.selection, setSelection: ui.setSelection,
    generatedCandidates: ui.generatedCandidates, setGeneratedCandidates: ui.setGeneratedCandidates,
    activeCandidateIndex: ui.activeCandidateIndex, setActiveCandidateIndex: ui.setActiveCandidateIndex,
    // Handlers
    applyResize: cellEditing.applyResize, paintCell: cellEditing.paintCell, generateLevelData,
    doSave: persistence.doSave, handleSaveClick: persistence.handleSaveClick,
    handleSubmitLevel: persistence.handleSubmitLevel, handleSaveAndSubmit: persistence.handleSaveAndSubmit,
    handleCopyBoard: persistence.handleCopyBoard, handlePasteBoard: persistence.handlePasteBoard,
    doImportLevelJson: loaders.doImportLevelJson,
    loadFirestoreLevel: loaders.loadFirestoreLevel, doPublish,
    handleLoadLevel: persistence.handleLoadLevel, handleNewLevel: loaders.handleNewLevel, handleTest,
    doGenerateLevel: loaders.doGenerateLevel,
    handleReorderLevels: saved.handleReorderLevels,
    handleDeleteLevel: persistence.handleDeleteLevel,
  };
}
