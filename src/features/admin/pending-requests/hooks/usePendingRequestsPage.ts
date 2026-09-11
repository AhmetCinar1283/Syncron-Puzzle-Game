'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import type { LevelRequest } from '@/services/firebase/firestore';
import type { LevelPart } from '@/services/firebase/admin';
import { useT } from '@/contexts/LanguageContext';

export function usePendingRequestsPage() {
  const t = useT();
  const router = useRouter();
  const { user, role, loading } = useAuth();
  const [requests, setRequests] = useState<LevelRequest[]>([]);
  const [parts, setParts] = useState<LevelPart[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [toast, setToast] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState<number | null>(null);
  const [filterCellTypes, setFilterCellTypes] = useState<Set<string>>(new Set());

  // Redirect non-admins
  useEffect(() => {
    if (!loading && role !== 'admin') router.replace('/');
  }, [loading, role, router]);

  // Load requests + parts
  useEffect(() => {
    if (role !== 'admin') return;
    (async () => {
      const [{ getLevelRequests }, { getAllParts }] = await Promise.all([
        import('@/services/firebase/firestore'),
        import('@/services/firebase/admin'),
      ]);
      const [reqs, allParts] = await Promise.all([
        getLevelRequests('pending'),
        getAllParts(),
      ]);
      setRequests(reqs);
      setParts(allParts);
      setDataLoading(false);
    })();
  }, [role]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }, []);

  const handleApprove = useCallback(async (req: LevelRequest, partId: string) => {
    if (!user) return;
    const { approveLevelRequest } = await import('@/services/firebase/admin');
    await approveLevelRequest(req.id, partId, req, user.uid);
    setRequests((prev) => prev.filter((r) => r.id !== req.id));
    showToast(t('admin.approved_toast', { name: req.name, part: partId }));
  }, [showToast, t, user]);

  const handleReject = useCallback(async (req: LevelRequest, note?: string) => {
    const { rejectLevelRequest } = await import('@/services/firebase/admin');
    await rejectLevelRequest(req.id, note);
    setRequests((prev) => prev.filter((r) => r.id !== req.id));
    showToast(t('admin.rejected_toast', { name: req.name }));
  }, [showToast, t]);

  // Filtered requests
  const filteredRequests = requests.filter((req) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!req.name.toLowerCase().includes(q) && !req.creatorName.toLowerCase().includes(q)) return false;
    }
    if (filterDifficulty !== null && (req.difficulty ?? null) !== filterDifficulty) return false;
    if (filterCellTypes.size > 0) {
      const flat = (req.grid as string[][]).flat();
      const hasAll = [...filterCellTypes].every((ct) => flat.includes(ct));
      if (!hasAll) return false;
    }
    return true;
  });

  const toggleCellType = (types: readonly string[]) => {
    setFilterCellTypes((prev) => {
      const next = new Set(prev);
      const allIn = types.every((ty) => next.has(ty));
      if (allIn) types.forEach((ty) => next.delete(ty));
      else types.forEach((ty) => next.add(ty));
      return next;
    });
  };

  return {
    t,
    router,
    role,
    loading,
    requests,
    parts,
    dataLoading,
    toast,
    search,
    setSearch,
    filterDifficulty,
    setFilterDifficulty,
    filterCellTypes,
    clearCellTypes: () => setFilterCellTypes(new Set()),
    toggleCellType,
    filteredRequests,
    handleApprove,
    handleReject,
  };
}
