import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import type { FirestoreLevel, LevelPart } from '@/services/firebase/admin';
import type { BuildLevelResult } from '../lib/buildLevelData';

/**
 * Moderator-only Firestore state (parts, part levels, publish status).
 * Contains the two moderator effects that originally ran FIRST in
 * `useEditorState`; call this hook before the other effectful editor hooks
 * to keep the effect order unchanged.
 */
export function useModeratorLevels(isModerator: boolean) {
  const [parts, setParts] = useState<LevelPart[]>([]);
  const [selectedPartId, setSelectedPartId] = useState('1');
  const [firestoreLevels, setFirestoreLevels] = useState<FirestoreLevel[]>([]);
  const [showFirestoreLevels, setShowFirestoreLevels] = useState(false);
  const [publishStatus, setPublishStatus] = useState('');
  const [firestoreEditId, setFirestoreEditId] = useState<string | null>(null);

  useEffect(() => {
    if (!isModerator) return;
    (async () => {
      const { getAllParts } = await import('@/services/firebase/admin');
      const allParts = await getAllParts();
      setParts(allParts);
      if (allParts.length > 0) setSelectedPartId(allParts[0].partId);
    })();
  }, [isModerator]);

  useEffect(() => {
    if (!isModerator || !showFirestoreLevels) return;
    (async () => {
      const { getPartLevels } = await import('@/services/firebase/admin');
      setFirestoreLevels(await getPartLevels(selectedPartId));
    })();
  }, [isModerator, selectedPartId, showFirestoreLevels]);

  return {
    parts, selectedPartId, setSelectedPartId,
    firestoreLevels, setFirestoreLevels,
    showFirestoreLevels, setShowFirestoreLevels,
    publishStatus, setPublishStatus,
    firestoreEditId, setFirestoreEditId,
  };
}

export type ModeratorLevels = ReturnType<typeof useModeratorLevels>;

interface PublishDeps {
  user: User | null;
  isModerator: boolean;
  firestoreIdParam: string | null;
  generateLevelData: () => BuildLevelResult;
  savedLevelsCount: number;
  difficulty: 1 | 2 | 3 | 4;
  setTestError: (e: string | null) => void;
  loadFirestoreLevel: (fl: FirestoreLevel) => void;
}

/**
 * Publish-to-Firestore action + `?firestoreId=` deep-link loader.
 * The deep-link effect was the LAST effect in the original hook; call this
 * hook last to preserve ordering.
 */
export function useModeratorPublish(mod: ModeratorLevels, deps: PublishDeps) {
  const { user, isModerator, firestoreIdParam, generateLevelData, savedLevelsCount, difficulty, setTestError, loadFirestoreLevel } = deps;
  const {
    selectedPartId, setSelectedPartId, firestoreEditId, setFirestoreEditId,
    showFirestoreLevels, setShowFirestoreLevels, setFirestoreLevels, setPublishStatus,
  } = mod;

  const doPublish = useCallback(async () => {
    if (!user || !isModerator) return;
    const { level, error } = generateLevelData();
    if (error || !level) { setTestError(error); return; }
    const payload = { ...level, part: selectedPartId, position: savedLevelsCount, difficulty };
    const { publishLevel, updateFirestoreLevel } = await import('@/services/firebase/admin');
    if (firestoreEditId) {
      await updateFirestoreLevel(firestoreEditId, payload, user.uid, selectedPartId);
    } else {
      setFirestoreEditId(await publishLevel(payload, selectedPartId, user.uid));
    }
    setPublishStatus(firestoreEditId ? 'Updated!' : 'Published!');
    if (showFirestoreLevels) {
      const { getPartLevels } = await import('@/services/firebase/admin');
      setFirestoreLevels(await getPartLevels(selectedPartId));
    }
    setTimeout(() => setPublishStatus(''), 2000);
  }, [user, isModerator, generateLevelData, selectedPartId, firestoreEditId, showFirestoreLevels, savedLevelsCount, difficulty,
    setTestError, setFirestoreEditId, setPublishStatus, setFirestoreLevels]);

  useEffect(() => {
    if (!firestoreIdParam || !isModerator) return;
    (async () => {
      const { getPartLevels, getAllParts } = await import('@/services/firebase/admin');
      const allParts = await getAllParts();
      for (const part of allParts) {
        const levels = await getPartLevels(part.partId);
        const fl = levels.find((l) => l.firestoreId === firestoreIdParam);
        if (fl) { loadFirestoreLevel(fl); setSelectedPartId(part.partId); setShowFirestoreLevels(true); break; }
      }
    })();
  }, [firestoreIdParam, isModerator, loadFirestoreLevel, setSelectedPartId, setShowFirestoreLevels]);

  return { doPublish };
}
