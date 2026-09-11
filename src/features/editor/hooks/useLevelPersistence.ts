import { useCallback, type MutableRefObject } from 'react';
import type { User } from 'firebase/auth';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { LevelData } from '@/game-engine/level-format';
import type { StoredLevel } from '@/services/db';
import type { BuildLevelResult } from '../lib/buildLevelData';
import type { EditorUiState } from './useEditorUiState';

interface PersistenceDeps {
  user: User | null;
  isAnonymous: boolean;
  userTag: string | null;
  creatorName: string;
  editId: number | null;
  router: AppRouterInstance;
  t: (key: string, vars?: Record<string, string | number>) => string;
  difficulty: 1 | 2 | 3 | 4;
  savedRequestId: string | null;
  setSavedRequestId: (v: string | null) => void;
  savedLevels: (StoredLevel & { id: number })[];
  reloadLevels: () => Promise<void>;
  generateLevelData: () => BuildLevelResult;
  handleNewLevel: () => void;
  savedIdForSubmitRef: MutableRefObject<number | null>;
}

/**
 * Save to Dexie, submit to community (`levelRequests`), delete, and the
 * `editorClipboard` copy/paste. All data access goes through `@/services/**`
 * (dynamic imports kept as in the original to preserve code-splitting).
 *
 * `buildPayload` maps LevelData -> StoredLevel fields one-to-one; its field
 * list is part of the persisted format (contract §4) — do not rename/reorder.
 */
export function useLevelPersistence(
  ui: EditorUiState,
  doImportLevelJson: (raw: string) => string | null,
  deps: PersistenceDeps,
) {
  const {
    user, isAnonymous, userTag, creatorName, editId, router, t, difficulty, savedRequestId, setSavedRequestId,
    savedLevels, reloadLevels, generateLevelData, handleNewLevel, savedIdForSubmitRef,
  } = deps;
  const {
    setTestError, setSaveSuccess, setSaveDialogOpen, setSavePosition, setSubmitError, setSubmitStatus,
    setSubmitDialogOpen, setSubmitNote, setCopied,
  } = ui;

  const buildPayload = useCallback((level: LevelData): Omit<StoredLevel, 'id' | 'createdAt' | 'updatedAt'> => ({
    name: level.name, width: level.width, height: level.height, edges: level.edges,
    grid: level.grid, initialObjects: level.initialObjects, targets: level.targets,
    trailCollision: level.trailCollision, initialBoxes: level.initialBoxes,
    conveyorPowerRequired: level.conveyorPowerRequired,
    conveyorConfig: level.conveyorConfig,
    trampolineConfig: level.trampolineConfig,
    deflectorConfig: level.deflectorConfig,
    difficulty,
    lockedCells: level.lockedCells,
    rooms: level.rooms,
    controlMode: level.controlMode,
    initialControlledRooms: level.initialControlledRooms,
    gameNotes: level.gameNotes,
    creatorNotes: level.creatorNotes,
    ...(savedRequestId ? { requestId: savedRequestId } : {}),
    position: savedLevels.length
  }), [difficulty, savedRequestId, savedLevels.length]);

  const doSave = useCallback(async (posInput?: string) => {
    const { level, error } = generateLevelData();
    if (error || !level) { setTestError(error); return; }
    const payload = buildPayload(level);
    if (editId !== null) {
      const { updateStoredLevel } = await import('@/services/db');
      await updateStoredLevel(editId, payload);
    } else {
      const { saveLevelAtPosition } = await import('@/services/db');
      let pos: number | undefined;
      if (posInput?.trim()) { const n = parseInt(posInput, 10); if (!isNaN(n) && n >= 1) pos = n - 1; }
      const newId = await saveLevelAtPosition(payload, pos);
      router.replace(`/editor?id=${newId}`);
    }
    await reloadLevels();
    setSaveSuccess('Saved!');
    setTimeout(() => setSaveSuccess(''), 2000);
    setSaveDialogOpen(false); setSavePosition('');
  }, [editId, generateLevelData, buildPayload, reloadLevels, router, setTestError, setSaveSuccess, setSaveDialogOpen, setSavePosition]);

  const handleSaveClick = useCallback(() => {
    if (editId !== null) doSave();
    else setSaveDialogOpen(true);
  }, [editId, doSave, setSaveDialogOpen]);

  const handleSubmitLevel = useCallback(async () => {
    if (!user || isAnonymous) return;
    const { level, error } = generateLevelData();
    if (error || !level) { setSubmitError(error ?? 'Level geçersiz.'); return; }
    setSubmitError('');
    try {
      if (savedRequestId) {
        const { updateLevelRequest } = await import('@/services/firebase/firestore');
        await updateLevelRequest(savedRequestId, level, difficulty);
        setSubmitStatus('Güncellendi!');
      } else {
        const { submitLevelRequest } = await import('@/services/firebase/firestore');
        const reqId = await submitLevelRequest(user.uid, level, userTag, difficulty, creatorName);
        setSavedRequestId(reqId);
        const targetId = savedIdForSubmitRef.current ?? (editId ?? null);
        if (targetId !== null) {
          const { setLevelRequestId } = await import('@/services/db');
          await setLevelRequestId(targetId, reqId);
        }
        setSubmitStatus('Gönderildi!');
      }
      setTimeout(() => { setSubmitStatus(''); setSubmitDialogOpen(false); setSubmitNote(''); }, 2000);
    } catch (err) {
      console.error('[Submit]', err);
      setSubmitError('Gönderim başarısız. Tekrar dene.');
    }
  }, [user, isAnonymous, generateLevelData, userTag, savedRequestId, difficulty, editId,
    // creatorName derives from user/userTag; the ref and setters are stable -> same identity as before
    creatorName, savedIdForSubmitRef, setSavedRequestId, setSubmitError, setSubmitStatus, setSubmitDialogOpen, setSubmitNote]);

  const handleSaveAndSubmit = useCallback(async () => {
    if (!user || isAnonymous) return;
    const { level, error } = generateLevelData();
    if (error || !level) { setTestError(error); return; }
    const payload = buildPayload(level);
    if (editId !== null) {
      const { updateStoredLevel } = await import('@/services/db');
      await updateStoredLevel(editId, payload);
      savedIdForSubmitRef.current = editId;
    } else {
      const { saveLevelAtPosition } = await import('@/services/db');
      const newId = await saveLevelAtPosition(payload);
      savedIdForSubmitRef.current = newId;
      await reloadLevels();
      router.replace(`/editor?id=${newId}`);
    }
    setSaveSuccess('Kaydedildi!');
    setTimeout(() => setSaveSuccess(''), 2000);
    setSubmitError(''); setSubmitDialogOpen(true);
  }, [user, isAnonymous, editId, generateLevelData, buildPayload, reloadLevels, router, savedIdForSubmitRef,
    setTestError, setSaveSuccess, setSubmitError, setSubmitDialogOpen]);

  /** Saves current level JSON to localStorage clipboard (`editorClipboard`, contract §4). */
  const handleCopyBoard = useCallback(() => {
    const { level } = generateLevelData();
    if (!level) return;
    if (typeof window !== 'undefined') {
      localStorage.setItem('editorClipboard', JSON.stringify(level));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [generateLevelData, setCopied]);

  /** Loads level JSON from localStorage clipboard. Returns error string or null on success. */
  const handlePasteBoard = useCallback((): string | null => {
    if (typeof window === 'undefined') return 'Unavailable';
    const raw = localStorage.getItem('editorClipboard');
    if (!raw) return 'Pano boş.';
    return doImportLevelJson(raw);
  }, [doImportLevelJson]);

  const handleLoadLevel = useCallback((stored: StoredLevel & { id: number }) => {
    router.push(`/editor?id=${stored.id}`);
  }, [router]);

  const handleDeleteLevel = useCallback(async (id: number) => {
    const target = savedLevels.find((l) => l.id === id);
    const name = target?.name ?? 'Level';
    const confirmMsg = t('levels.delete_body', { name }) || `"${name}" will be deleted permanently. Are you sure?`;
    if (!window.confirm(confirmMsg)) return;

    const { deleteStoredLevel } = await import('@/services/db');
    await deleteStoredLevel(id);
    await reloadLevels();
    if (editId === id) {
      handleNewLevel();
    }
  }, [savedLevels, reloadLevels, editId, handleNewLevel, t]);

  return {
    doSave, handleSaveClick, handleSubmitLevel, handleSaveAndSubmit,
    handleCopyBoard, handlePasteBoard, handleLoadLevel, handleDeleteLevel,
  };
}
