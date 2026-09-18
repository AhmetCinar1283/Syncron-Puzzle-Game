'use client';

/**
 * DOSYA AMACI: Editörün günlük bulmaca modu (yalnızca admin): `?dailyPuzzleId=` /
 * `?dailyDraft=1` ile gelen bulmacayı editöre yükler, test modunda kazanılan
 * çözümü kaydeder, çözücüyle par bulur ve bulmacayı worker'a kaydeder. Editörün
 * genel durum hook'larına dokunmaz; yalnızca dışa açılan eylemlerini kullanır.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { LevelData } from '@/game-engine/level-format';
import { findPar, toMoveCodes, type MoveCode } from '@/game-engine/solver/par';
import { fetchPuzzle, savePuzzle, type DailyPuzzleSource, type DailyPuzzleStatus } from '@/services/api/adminDailyClient';
import { takeDailyDraft } from '@/lib/dailyDraftHandoff';

interface DailyEditorDeps {
  enabled: boolean;
  dailyPuzzleId: string | null;
  dailyDraft: boolean;
  generateLevelData: () => { level: LevelData | null; error: string | null };
  loadLevel: (level: LevelData) => void;
  optimalSolution: string[] | null;
}

/** Bir çözümün hangi level içeriği için bulunduğu (level değişince geçersiz olur). */
export interface SolutionSnapshot {
  moves: MoveCode[];
  levelKey: string;
}

export interface DailySaveForm {
  title: string;
  status: DailyPuzzleStatus;
  inPool: boolean;
  assignDate: string;
  useAdminSolution: boolean;
}

export type DailySaveState =
  | { kind: 'idle' }
  | { kind: 'solving' }
  | { kind: 'saving' }
  | { kind: 'saved'; par: number }
  | { kind: 'error'; key: string };

const levelKeyOf = (level: LevelData) => JSON.stringify(level);

export function useDailyPuzzleEditor({ enabled, dailyPuzzleId, dailyDraft, generateLevelData, loadLevel, optimalSolution }: DailyEditorDeps) {
  const [open, setOpen] = useState(false);
  const [puzzleId, setPuzzleId] = useState<string | null>(null);
  const [source, setSource] = useState<DailyPuzzleSource>('designed');
  const [solverSolution, setSolverSolution] = useState<SolutionSnapshot | null>(null);
  const [adminSolution, setAdminSolution] = useState<SolutionSnapshot | null>(null);
  const [state, setState] = useState<DailySaveState>({ kind: 'idle' });
  const loadedRef = useRef<string | null>(null);

  // Derin bağlantı: kayıtlı bulmaca veya takvimden aktarılan aday bir kez yüklenir.
  useEffect(() => {
    if (!enabled) return;
    const key = dailyPuzzleId ?? (dailyDraft ? 'draft' : null);
    if (!key || loadedRef.current === key) return;
    loadedRef.current = key;
    (async () => {
      if (dailyPuzzleId) {
        try {
          const puzzle = await fetchPuzzle(dailyPuzzleId);
          loadLevel(puzzle.level as unknown as LevelData);
          setPuzzleId(puzzle.id);
          setSource(puzzle.source);
        } catch (err) {
          console.warn('[Editor] daily puzzle load failed:', err);
        }
      } else {
        const draft = takeDailyDraft();
        if (draft) {
          loadLevel(draft.level as unknown as LevelData);
          setSource(draft.source);
        }
      }
    })();
  }, [enabled, dailyPuzzleId, dailyDraft, loadLevel]);

  /** Test modunda level kazanıldı: bu çözüm "admin çözümü" olarak kullanılabilir. */
  const recordTestSolution = useCallback((level: LevelData, moves: string[]) => {
    if (!enabled || moves.length === 0) return;
    setAdminSolution({ moves: moves as MoveCode[], levelKey: levelKeyOf(level) });
  }, [enabled]);

  const openDialog = useCallback(() => {
    const { level } = generateLevelData();
    // Editörün canlı çözücüsü (BFS) zaten en kısa çözümü bulduysa derin aramaya gerek yok.
    if (level && optimalSolution?.length) {
      setSolverSolution({ moves: toMoveCodes(optimalSolution as Parameters<typeof toMoveCodes>[0]), levelKey: levelKeyOf(level) });
    }
    setState({ kind: 'idle' });
    setOpen(true);
  }, [generateLevelData, optimalSolution]);

  const runSolver = useCallback(() => {
    const { level, error } = generateLevelData();
    if (error || !level) { setState({ kind: 'error', key: 'daily_admin.error_invalid_level' }); return; }
    setState({ kind: 'solving' });
    // Arama senkron ve ağırdır: "çözülüyor" durumunun çizilmesi için bir tur beklenir.
    setTimeout(() => {
      const result = findPar(level);
      if (result) {
        setSolverSolution({ moves: result.solution, levelKey: levelKeyOf(level) });
        setState({ kind: 'idle' });
      } else {
        setSolverSolution(null);
        setState({ kind: 'error', key: 'daily_admin.error_solver_failed' });
      }
    }, 30);
  }, [generateLevelData]);

  const save = useCallback(async (form: DailySaveForm) => {
    const { level, error } = generateLevelData();
    if (error || !level) { setState({ kind: 'error', key: 'daily_admin.error_invalid_level' }); return; }
    const snapshot = form.useAdminSolution ? adminSolution : solverSolution;
    if (!snapshot) { setState({ kind: 'error', key: 'daily_admin.error_no_solution' }); return; }
    if (snapshot.levelKey !== levelKeyOf(level)) { setState({ kind: 'error', key: 'daily_admin.error_stale_solution' }); return; }

    setState({ kind: 'saving' });
    try {
      const res = await savePuzzle({
        id: puzzleId ?? undefined,
        title: form.title.trim() || level.name || 'Daily',
        level: level as unknown as Record<string, unknown>,
        solution: snapshot.moves,
        parSource: form.useAdminSolution ? 'admin' : 'solver',
        source,
        status: form.status,
        inPool: form.inPool,
        difficulty: level.difficulty ?? null,
        assignDate: form.assignDate || undefined,
      });
      setPuzzleId(res.id);
      setState({ kind: 'saved', par: res.par });
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      setState({ kind: 'error', key: `daily_admin.server_${code.replace(/-/g, '_')}` });
    }
  }, [generateLevelData, adminSolution, solverSolution, puzzleId, source]);

  return {
    open,
    openDialog,
    closeDialog: useCallback(() => setOpen(false), []),
    puzzleId,
    solverSolution,
    adminSolution,
    state,
    runSolver,
    save,
    recordTestSolution,
  };
}

export type DailyPuzzleEditor = ReturnType<typeof useDailyPuzzleEditor>;
