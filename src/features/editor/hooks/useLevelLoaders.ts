import { useCallback, useEffect, type MutableRefObject } from 'react';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { LevelData } from '@/game-engine/level-format';
import type { FirestoreLevel } from '@/services/firebase/admin';
import { makeGrid } from '../lib/editorConfig';
import {
  DEFAULT_OBJS, buildLegacyRoom, filterLockedCells, hasRooms, parseRooms,
  toBoxConfigs, toObjConfigs, type EditorRoom, type LevelLike, type RoomParseOptions,
} from '../lib/levelSnapshot';
import type { LevelDocument } from './useLevelDocument';
import type { EditorRoomsApi } from './useEditorRooms';
import type { EditorUiState, GeneratedCandidate } from './useEditorUiState';
import type { ModeratorLevels } from './useModeratorLevels';

/**
 * Per-source parse options. These encode the (pre-existing) differences between
 * the four loaders — see `lib/levelSnapshot.ts` header. A new source = a new
 * entry here, nothing else changes.
 */
const EDIT_OPTS: RoomParseOptions = { keepRevealed: true, customData: true, parseLegacyGrid: true };
const IMPORT_OPTS: RoomParseOptions = { keepRevealed: false, customData: false, parseLegacyGrid: true };
const FIRESTORE_OPTS: RoomParseOptions = { keepRevealed: false, customData: false, parseLegacyGrid: true };
const GENERATED_OPTS: RoomParseOptions = { keepRevealed: true, customData: false, parseLegacyGrid: false };

interface LoaderDeps {
  editId: number | null;
  router: AppRouterInstance;
  pushGridHistory: () => void;
  savedIdForSubmitRef: MutableRefObject<number | null>;
}

/**
 * Everything that REPLACES the current document: load `?id=` from Dexie,
 * import JSON (clipboard / AI), load a Firestore level, apply a generator
 * candidate, and reset to a new level. Owns the `?id=` load effect.
 */
export function useLevelLoaders(
  doc: LevelDocument,
  roomsApi: EditorRoomsApi,
  ui: EditorUiState,
  mod: Pick<ModeratorLevels, 'setFirestoreEditId'>,
  deps: LoaderDeps,
) {
  const {
    setLevelName, setGameNotes, setCreatorNotes, setWidth, setHeight, setPendingW, setPendingH,
    setTrailCollision, setDifficulty, setSavedRequestId, setEdges, setGrid, setLockedCells,
    setObjects, setBoxes, setActivePlacingBoxId, setConveyorPowerRequired, setConveyorConfig,
    setTrampolineConfig, setDeflectorConfig, setFogOfWar, setFogVisibilityDistance, setFogKeepRevealed,
  } = doc;
  const { setRooms, setActiveRoomId, setControlMode } = roomsApi;
  const {
    setOptimalSolution, setOptimalSolutionMoves, setSelection, setActiveCandidateIndex,
    setGeneratorDialogOpen, setGeneratedCandidates,
  } = ui;
  const { setFirestoreEditId } = mod;
  const { editId, router, pushGridHistory, savedIdForSubmitRef } = deps;

  /** Makes `room` the active room (copies its size/edges/grid/fog into the document). */
  const activateRoom = useCallback((room: EditorRoom, keepRevealed: boolean) => {
    setActiveRoomId(room.id);
    setWidth(room.width); setHeight(room.height);
    setPendingW(room.width); setPendingH(room.height);
    setEdges(room.edges);
    setGrid(room.grid);
    setFogOfWar(room.fogOfWar ?? false);
    setFogVisibilityDistance(room.fogVisibilityDistance ?? 1.5);
    if (keepRevealed) setFogKeepRevealed(room.fogKeepRevealed ?? true);
  }, [setActiveRoomId, setWidth, setHeight, setPendingW, setPendingH, setEdges, setGrid, setFogOfWar, setFogVisibilityDistance, setFogKeepRevealed]);

  /** Multi-room levels load all rooms; legacy levels become a single `main` room. */
  const applyRooms = useCallback((src: LevelLike, legacyName: string, opts: RoomParseOptions) => {
    if (hasRooms(src)) {
      const parsedRooms = parseRooms(src.rooms!, opts);
      setRooms(parsedRooms);
      activateRoom(parsedRooms[0], opts.keepRevealed);
    } else {
      const mainRoom = buildLegacyRoom(src, legacyName, opts);
      setRooms([mainRoom]);
      activateRoom(mainRoom, opts.keepRevealed);
    }
  }, [setRooms, activateRoom]);

  /** Boxes + per-cell configs; clears any in-progress box placement. */
  const applyEntities = useCallback((src: LevelLike) => {
    setBoxes(toBoxConfigs(src.initialBoxes));
    setConveyorPowerRequired(src.conveyorPowerRequired ?? []);
    setConveyorConfig(src.conveyorConfig ?? []);
    setTrampolineConfig(src.trampolineConfig ?? []);
    setDeflectorConfig(src.deflectorConfig ?? []);
    setActivePlacingBoxId(null);
  }, [setBoxes, setConveyorPowerRequired, setConveyorConfig, setTrampolineConfig, setDeflectorConfig, setActivePlacingBoxId]);

  const loadForEdit = useCallback(async (id: number) => {
    const { getUserLevelById } = await import('@/services/db');
    const stored = await getUserLevelById(id);
    if (!stored) return;
    setLevelName(stored.name);
    setGameNotes(stored.gameNotes ?? '');
    setCreatorNotes(stored.creatorNotes ?? '');
    setOptimalSolution(null);
    setOptimalSolutionMoves(0);
    setTrailCollision(!!stored.trailCollision);
    setDifficulty((stored.difficulty != undefined ? stored.difficulty : 2) as 1 | 2 | 3 | 4);
    setSavedRequestId(stored.requestId ?? null);
    setControlMode(stored.controlMode ?? 'all_rooms');
    applyRooms(stored as LevelLike, stored.name, EDIT_OPTS);
    setLockedCells(stored.lockedCells ?? {});
    setObjects(toObjConfigs(stored.initialObjects));
    applyEntities(stored as LevelLike);
    setSelection(null);
    setActiveCandidateIndex(null);
  }, [setLevelName, setGameNotes, setCreatorNotes, setOptimalSolution, setOptimalSolutionMoves, setTrailCollision,
    setDifficulty, setSavedRequestId, setControlMode, applyRooms, setLockedCells, setObjects, applyEntities,
    setSelection, setActiveCandidateIndex]);

  useEffect(() => { if (editId !== null) loadForEdit(editId); }, [editId, loadForEdit]);

  /** Imports a raw level JSON string directly. Returns error string or null on success. */
  const doImportLevelJson = useCallback((raw: string): string | null => {
    if (!raw) return 'JSON boş.';
    try {
      const parsed = JSON.parse(raw) as LevelLike & { name?: string; trailCollision?: boolean; lockedCells?: Record<string, boolean>; controlMode?: 'all_rooms' | 'selected_room' };

      setLevelName(parsed.name ?? 'Pasted Level');
      setTrailCollision(!!parsed.trailCollision);
      setLockedCells(parsed.lockedCells ?? {});
      setControlMode(parsed.controlMode ?? 'all_rooms');

      if (!hasRooms(parsed) && (!parsed.grid || !parsed.width || !parsed.height)) return 'Geçersiz format.';
      applyRooms(parsed, parsed.name ?? 'Pasted Level', IMPORT_OPTS);
      applyEntities(parsed);
      setObjects(toObjConfigs(parsed.initialObjects));
      return null;
    } catch {
      return 'Geçersiz JSON.';
    }
  }, [setLevelName, setTrailCollision, setLockedCells, setControlMode, applyRooms, applyEntities, setObjects]);

  const loadFirestoreLevel = useCallback((fl: FirestoreLevel) => {
    setFirestoreEditId(fl.firestoreId);
    setLevelName(fl.name);
    setGameNotes(fl.gameNotes ?? '');
    setCreatorNotes(fl.creatorNotes ?? '');
    setOptimalSolution(null);
    setOptimalSolutionMoves(0);
    setTrailCollision(!!fl.trailCollision);
    setDifficulty((fl.difficulty != undefined ? fl.difficulty : 2) as 1 | 2 | 3 | 4);
    setControlMode(fl.controlMode ?? 'all_rooms');
    applyRooms(fl as unknown as LevelLike, fl.name, FIRESTORE_OPTS);
    setObjects(toObjConfigs(fl.initialObjects));
    applyEntities(fl as unknown as LevelLike);
    setSelection(null);
    setActiveCandidateIndex(null);
  }, [setFirestoreEditId, setLevelName, setGameNotes, setCreatorNotes, setOptimalSolution, setOptimalSolutionMoves,
    setTrailCollision, setDifficulty, setControlMode, applyRooms, setObjects, applyEntities, setSelection, setActiveCandidateIndex]);

  const handleNewLevel = useCallback(() => {
    router.push('/editor');
    setLevelName('My Level');
    setGameNotes('');
    setCreatorNotes('');
    setOptimalSolution(null);
    setOptimalSolutionMoves(0);
    setWidth(5); setHeight(5); setPendingW(5); setPendingH(5);
    setEdges({ top: { type: 'wall' }, bottom: { type: 'wall' }, left: { type: 'wall' }, right: { type: 'wall' } });
    setGrid(makeGrid(5, 5)); setTrailCollision(false); setDifficulty(2);
    setSavedRequestId(null); savedIdForSubmitRef.current = null;

    setRooms([
      {
        id: 'main',
        name: 'Main Room',
        width: 5,
        height: 5,
        x: 0,
        y: 0,
        edges: {
          top: { type: 'wall' },
          bottom: { type: 'wall' },
          left: { type: 'wall' },
          right: { type: 'wall' },
        },
        grid: makeGrid(5, 5),
        fogOfWar: false,
        fogVisibilityDistance: 1.5,
      }
    ]);
    setActiveRoomId('main');
    setControlMode('all_rooms');
    setFogOfWar(false);
    setFogVisibilityDistance(1.5);

    setObjects([...DEFAULT_OBJS.map((o) => ({ ...o, roomId: 'main' }))]);
    setBoxes([]); setLockedCells({}); setConveyorPowerRequired([]); setConveyorConfig([]); setTrampolineConfig([]); setDeflectorConfig([]); setActivePlacingBoxId(null); setFirestoreEditId(null);

    setSelection(null);
    setActiveCandidateIndex(null);
  }, [router, setLevelName, setGameNotes, setCreatorNotes, setOptimalSolution, setOptimalSolutionMoves, setWidth, setHeight,
    setPendingW, setPendingH, setEdges, setGrid, setTrailCollision, setDifficulty, setSavedRequestId, savedIdForSubmitRef,
    setRooms, setActiveRoomId, setControlMode, setFogOfWar, setFogVisibilityDistance, setObjects, setBoxes, setLockedCells,
    setConveyorPowerRequired, setConveyorConfig, setTrampolineConfig, setDeflectorConfig, setActivePlacingBoxId,
    setFirestoreEditId, setSelection, setActiveCandidateIndex]);

  const doGenerateLevel = useCallback((
    level: LevelData,
    solution: string[] | null,
    moveCount: number,
    allCandidates?: GeneratedCandidate[],
    selectedIndex?: number
  ) => {
    pushGridHistory();
    setLevelName(level.name);
    setOptimalSolution(solution);
    setOptimalSolutionMoves(moveCount);
    setTrailCollision(!!level.trailCollision);
    setDifficulty((level.difficulty != undefined ? level.difficulty : 2) as 1 | 2 | 3 | 4);
    setSavedRequestId(null);
    setFirestoreEditId(null);
    setControlMode(level.controlMode ?? 'all_rooms');
    applyRooms(level as unknown as LevelLike, level.name, GENERATED_OPTS);
    setObjects(toObjConfigs(level.initialObjects));
    applyEntities(level as unknown as LevelLike);
    setGeneratorDialogOpen(false);

    setSelection(null);
    setLockedCells((prev) => filterLockedCells(prev, level.width, level.height));

    if (allCandidates) {
      setGeneratedCandidates(allCandidates);
    }
    if (selectedIndex !== undefined) {
      setActiveCandidateIndex(selectedIndex);
    }
  }, [pushGridHistory, setLevelName, setOptimalSolution, setOptimalSolutionMoves, setTrailCollision, setDifficulty,
    setSavedRequestId, setFirestoreEditId, setControlMode, applyRooms, setObjects, applyEntities, setGeneratorDialogOpen,
    setSelection, setLockedCells, setGeneratedCandidates, setActiveCandidateIndex]);

  return { doImportLevelJson, loadFirestoreLevel, handleNewLevel, doGenerateLevel };
}
