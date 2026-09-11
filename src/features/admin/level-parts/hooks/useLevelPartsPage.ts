'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import type { LevelPart, LevelOrderEntry } from '@/services/firebase/admin';
import { useToast } from '@/contexts/ToastContext';
import { sortedEntries } from '../lib/helpers';

export function useLevelPartsPage() {
  const router = useRouter();
  const { role, loading } = useAuth();
  const { showToast, hideToast } = useToast();

  const [initialParts, setInitialParts] = useState<LevelPart[]>([]);
  const [parts, setParts] = useState<LevelPart[]>([]);
  const [deletedLevels, setDeletedLevels] = useState<Array<{ levelId: string; partId: string }>>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [savingAll, setSavingAll] = useState(false);

  // Map Designer state
  const [designerPart, setDesignerPart] = useState<LevelPart | null>(null);

  // Create part modal
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUnlock, setNewUnlock] = useState('0');
  const [creating, setCreating] = useState(false);

  const isDirty = useMemo(() => {
    if (deletedLevels.length > 0) return true;
    if (parts.length !== initialParts.length) return true;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      const ip = initialParts[i];
      if (p.partId !== ip.partId) return true;
      const pKeys = Object.keys(p.order);
      const ipKeys = Object.keys(ip.order);
      if (pKeys.length !== ipKeys.length) return true;
      for (const key of pKeys) {
        if (!ip.order[key]) return true;
        if (p.order[key].position !== ip.order[key].position) return true;
      }
    }
    return false;
  }, [parts, initialParts, deletedLevels]);

  const handleSaveMapLayout = useCallback((
    partId: string,
    levelCoords: Record<string, { mapX: number; mapY: number }>,
    portalCoords: { portalX: number; portalY: number; portalStartX: number; portalStartY: number },
    theme: string
  ) => {
    const updatePartLayout = (p: LevelPart) => {
      if (p.partId !== partId) return p;

      const newOrder = { ...p.order };
      Object.entries(levelCoords).forEach(([levelId, c]) => {
        if (newOrder[levelId]) {
          newOrder[levelId] = {
            ...newOrder[levelId],
            mapX: c.mapX,
            mapY: c.mapY
          };
        }
      });

      return {
        ...p,
        order: newOrder,
        portalX: portalCoords.portalX,
        portalY: portalCoords.portalY,
        portalStartX: portalCoords.portalStartX,
        portalStartY: portalCoords.portalStartY,
        mapTheme: theme
      };
    };

    setParts((prev) => prev.map(updatePartLayout));
    setInitialParts((prev) => prev.map(updatePartLayout));
    showToast('Map layout updated successfully', 'success');
  }, [showToast]);

  // Redirect non-admins
  useEffect(() => {
    if (!loading && role !== 'admin') router.replace('/');
  }, [loading, role, router]);

  // Fetch all parts once on mount
  useEffect(() => {
    if (role !== 'admin') return;
    (async () => {
      const { getAllParts } = await import('@/services/firebase/admin');
      const fetched = await getAllParts();
      setParts(fetched);
      setInitialParts(JSON.parse(JSON.stringify(fetched)));
      setDataLoading(false);
    })();
  }, [role]);

  // ── Create part ─────────────────────────────────────────────────────────────

  const handleCreatePart = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const { setPart } = await import('@/services/firebase/admin');
    const created = await setPart(newName.trim(), Math.max(0, Number(newUnlock) || 0));
    setParts((prev) => [...prev, created]);
    setInitialParts((prev) => [...prev, JSON.parse(JSON.stringify(created))]);
    setNewName('');
    setNewUnlock('0');
    setCreating(false);
    setShowCreate(false);
    showToast(`Part "${created.name}" created`, 'success');
  };

  // ── Part metadata update (local state only — Firebase called inside PartCard) ─

  const handleUpdatePartName = useCallback((partId: string, name: string) => {
    setParts((prev) =>
      prev.map((p) => p.partId === partId ? { ...p, name } : p),
    );
    setInitialParts((prev) =>
      prev.map((p) => p.partId === partId ? { ...p, name } : p),
    );
    showToast('Part updated', 'success');
  }, [showToast]);

  const handleUpdatePartUnlock = useCallback((partId: string, unlockRequirement: number) => {
    setParts((prev) =>
      prev.map((p) => p.partId === partId ? { ...p, unlockRequirement } : p),
    );
    setInitialParts((prev) =>
      prev.map((p) => p.partId === partId ? { ...p, unlockRequirement } : p),
    );
    showToast('Part unlock requirement updated', 'success');
  }, [showToast]);

  const handleDeletePart = useCallback((partId: string, name: string) => {
    setParts((prev) => prev.filter((p) => p.partId !== partId));
    setInitialParts((prev) => prev.filter((p) => p.partId !== partId));
    showToast(`Part "${name}" deleted`, 'info');
  }, [showToast]);

  // ── Level operations ────────────────────────────────────────────────────────

  const handleReorderLevel = useCallback(async (partId: string, levelId: string, dir: 'up' | 'down') => {
    setParts((prev) => {
      const partIdx = prev.findIndex((p) => p.partId === partId);
      if (partIdx === -1) return prev;
      const part = prev[partIdx];
      const levels = sortedEntries(part.order);
      const idx = levels.findIndex((e) => e.id === levelId);
      const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= levels.length) return prev;

      const levelA = levels[idx];
      const levelB = levels[swapIdx];
      const posA = levelA.position ?? idx;
      const posB = levelB.position ?? swapIdx;

      const newOrder = {
        ...part.order,
        [levelA.id]: { ...levelA, position: posB },
        [levelB.id]: { ...levelB, position: posA },
      };
      const newParts = [...prev];
      newParts[partIdx] = { ...part, order: newOrder };
      return newParts;
    });
  }, []);

  const handleDeleteLevel = useCallback(async (partId: string, levelId: string) => {
    setParts((prev) => {
      const partIdx = prev.findIndex((p) => p.partId === partId);
      if (partIdx === -1) return prev;
      const part = prev[partIdx];
      const newOrder = { ...part.order };
      delete newOrder[levelId];
      const newParts = [...prev];
      newParts[partIdx] = { ...part, order: newOrder };
      return newParts;
    });

    setDeletedLevels((prev) => [...prev, { levelId, partId }]);
    showToast('Level removed locally. Click "Save Changes" to apply.', 'warning', 4000);
  }, [showToast]);

  const handleReset = useCallback(() => {
    setParts(JSON.parse(JSON.stringify(initialParts)));
    setDeletedLevels([]);
    showToast('Changes discarded.', 'info', 3000);
  }, [initialParts, showToast]);

  const handleSaveChanges = async () => {
    setSavingAll(true);
    const savingToastId = showToast('Saving changes...', 'info', 0);
    try {
      const partsToUpdate: Array<{ partId: string; order: Record<string, LevelOrderEntry> }> = [];
      for (const part of parts) {
        const initialPart = initialParts.find((ip) => ip.partId === part.partId);
        if (!initialPart) continue;

        let hasChanged = false;
        const initialKeys = Object.keys(initialPart.order);
        const currentKeys = Object.keys(part.order);

        if (initialKeys.length !== currentKeys.length) {
          hasChanged = true;
        } else {
          for (const key of currentKeys) {
            if (!initialPart.order[key] || part.order[key].position !== initialPart.order[key].position) {
              hasChanged = true;
              break;
            }
          }
        }

        if (hasChanged) {
          partsToUpdate.push({
            partId: part.partId,
            order: part.order,
          });
        }
      }

      const { saveBatchChanges } = await import('@/services/firebase/admin');
      await saveBatchChanges(deletedLevels, partsToUpdate);

      setInitialParts(JSON.parse(JSON.stringify(parts)));
      setDeletedLevels([]);

      hideToast(savingToastId);
      showToast('Changes saved successfully!', 'success', 4000);
    } catch (err) {
      console.error('[SaveChanges]', err);
      hideToast(savingToastId);
      showToast('Failed to save changes!', 'error', 5000);
    } finally {
      setSavingAll(false);
    }
  };

  const handleEditLevel = useCallback((firestoreId: string) => {
    if (firestoreId) {
      router.push(`/editor?firestoreId=${firestoreId}`);
    } else {
      router.push('/editor');
    }
  }, [router]);

  return {
    router,
    role,
    loading,
    parts,
    dataLoading,
    savingAll,
    isDirty,
    designerPart,
    setDesignerPart,
    showCreate,
    setShowCreate,
    newName,
    setNewName,
    newUnlock,
    setNewUnlock,
    creating,
    handleSaveMapLayout,
    handleCreatePart,
    handleUpdatePartName,
    handleUpdatePartUnlock,
    handleDeletePart,
    handleReorderLevel,
    handleDeleteLevel,
    handleReset,
    handleSaveChanges,
    handleEditLevel,
  };
}
