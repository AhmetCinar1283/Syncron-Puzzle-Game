/**
 * DOSYA AMACI: Bir level'ın hedef hamle sayısını (par) bulmak için geniş bütçeli
 * çözüm araması ve çözümün sunucunun oynattığı hamle kodlarına ('u','d','l','r','s')
 * çevrilmesi. Editördeki canlı çözücüden daha büyük bütçe kullanır; yalnızca
 * kullanıcı istediğinde (ör. günlük bulmaca kaydında) çalıştırılır.
 */
import type { Direction, LevelData } from '../level-format';
import { solvePuzzle } from './solver';

export type MoveCode = 'u' | 'd' | 'l' | 'r' | 's';

const DIRECTION_CODE: Record<Direction, MoveCode> = { up: 'u', down: 'd', left: 'l', right: 'r' };

export function toMoveCodes(solution: readonly (Direction | 'switch_room')[]): MoveCode[] {
  return solution.map((step) => (step === 'switch_room' ? 's' : DIRECTION_CODE[step]));
}

export interface ParBudget {
  maxMoves: number;
  maxStates: number;
}

/** Tarayıcıda birkaç saniyeyi aşmayacak varsayılan bütçe. */
export const DEFAULT_PAR_BUDGET: ParBudget = { maxMoves: 80, maxStates: 250_000 };

export interface ParResult {
  /** BFS'in bulduğu en kısa çözüm (hamle kodları). */
  solution: MoveCode[];
  par: number;
  statesExplored: number;
}

/** Bütçe içinde çözüm yoksa `null` (level çözümsüz ya da arama yetmedi — ayırt edilemez). */
export function findPar(level: LevelData, budget: ParBudget = DEFAULT_PAR_BUDGET): ParResult | null {
  const result = solvePuzzle(level, budget.maxMoves, budget.maxStates);
  if (!result.solvable || !result.solution || result.solution.length === 0) return null;
  const solution = toMoveCodes(result.solution);
  return { solution, par: solution.length, statesExplored: result.statesExplored };
}
