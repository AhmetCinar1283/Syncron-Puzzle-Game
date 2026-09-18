'use client';

/**
 * DOSYA AMACI: Prosedürel üreticiden günlük bulmaca adayları üretir (admin tarayıcısında,
 * her aday arasında UI'a nefes aldırarak), adayı onaylayıp kütüphaneye kaydeder ya da
 * düzenlemek üzere editöre aktarır. Par, üreticinin BFS çözümünden gelir; worker
 * kayıtta çözümü oynatarak doğrular.
 */
import { useCallback, useRef, useState } from 'react';
import type { LevelData } from '@/game-engine/level-format';
import { generateProceduralLevel } from '@/game-engine/solver/generator';
import { toMoveCodes, type MoveCode } from '@/game-engine/solver/par';
import { savePuzzle } from '@/services/api/adminDailyClient';
import { stashDailyDraft } from '@/lib/dailyDraftHandoff';
import { CANDIDATE_LIMITS, DEFAULT_CANDIDATE_FORM, serverErrorKey, toGeneratorFilters, type CandidateForm } from '../lib/candidateFilters';

export interface DailyCandidate {
  key: string;
  level: LevelData;
  solution: MoveCode[];
  par: number;
  savedId: string | null;
}

export function useCandidateGenerator(onSaved: () => void, openUrl: (url: string) => void) {
  const [form, setForm] = useState<CandidateForm>(DEFAULT_CANDIDATE_FORM);
  const [candidates, setCandidates] = useState<DailyCandidate[]>([]);
  const [generating, setGenerating] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const runIdRef = useRef(0);

  const generate = useCallback(async () => {
    const runId = ++runIdRef.current;
    setGenerating(true);
    setErrorKey(null);
    setCandidates([]);
    const filters = toGeneratorFilters(form);
    const count = Math.min(CANDIDATE_LIMITS.maxCount, Math.max(1, form.count));

    for (let i = 0; i < count; i++) {
      // Üretim senkron ve ağırdır: adaylar arasında tarayıcıya çizim fırsatı verilir.
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (runIdRef.current !== runId) return;
      const { level, solution } = generateProceduralLevel(filters);
      if (!solution || solution.length === 0) continue;
      const moves = toMoveCodes(solution as Parameters<typeof toMoveCodes>[0]);
      const key = `${runId}-${i}`;
      const named: LevelData = { ...level, name: level.name || `Daily ${key}` };
      setCandidates((prev) => [...prev, { key, level: named, solution: moves, par: moves.length, savedId: null }]);
    }
    if (runIdRef.current === runId) setGenerating(false);
  }, [form]);

  const approve = useCallback(async (candidate: DailyCandidate, opts: { title: string; inPool: boolean; assignDate: string }) => {
    setBusyKey(candidate.key);
    setErrorKey(null);
    try {
      const res = await savePuzzle({
        id: candidate.savedId ?? undefined,
        title: opts.title.trim() || candidate.level.name,
        level: candidate.level as unknown as Record<string, unknown>,
        solution: candidate.solution,
        parSource: 'solver',
        source: 'generated',
        status: 'approved',
        inPool: opts.inPool,
        difficulty: candidate.level.difficulty ?? form.difficulty,
        assignDate: opts.assignDate || undefined,
      });
      setCandidates((prev) => prev.map((c) => (c.key === candidate.key ? { ...c, savedId: res.id } : c)));
      onSaved();
    } catch (err) {
      setErrorKey(serverErrorKey(err));
    } finally {
      setBusyKey(null);
    }
  }, [form.difficulty, onSaved]);

  const editInEditor = useCallback((candidate: DailyCandidate) => {
    openUrl(stashDailyDraft({ level: candidate.level as unknown as Record<string, unknown>, source: 'generated' }));
  }, [openUrl]);

  const discard = useCallback((key: string) => setCandidates((prev) => prev.filter((c) => c.key !== key)), []);

  return { form, setForm, candidates, generating, busyKey, errorKey, generate, approve, editInEditor, discard };
}
