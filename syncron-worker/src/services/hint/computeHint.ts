/**
 * DOSYA AMACI: Sunucu tarafı ipucu motoru. Oynatılmış hamle geçmişinden
 * (replay.ts) "çözüme kaç adım kaldı" ve sonraki en fazla 5 adımı üretir.
 * Mevcut durum çözümsüzse, geçmişte en yakın çözülebilir noktayı bulur
 * ("N kez geri al") ya da baştan başlamayı önerir.
 *
 * Doğruluk garantisi: sonuç yalnızca çözücü gerçek bir çözüm bulduğunda ya da
 * çözümsüzlüğü aramayı TÜKETEREK kanıtladığında verilir. Bütçe yetmezse `null`
 * döner — yanlış ipucu vermektense hiç vermeyiz (reklam da gösterilmez).
 *
 * Not: Cloudflare Worker'da `Date.now()` hesaplama sırasında ilerlemez; bu yüzden
 * bütçe süre değil taranan durum sayısıdır (hintBudget.ts).
 */

import { solveFromState } from '../../../../src/game-engine/solver/solver';
import { ACTION_TO_CODE, type MoveCode, type ReplayResult, type ReplayState } from './replay';
import { DEFAULT_HINT_BUDGET, HINT_PREVIEW_LENGTH, type HintBudget } from './hintBudget';

export interface HintResult {
  /** Önce kaç kez "geri al" yapılmalı (0 = mevcut durumdan devam). */
  undoSteps: number;
  /** Önce baştan başlanmalı (true ise `undoSteps` 0'dır). */
  restart: boolean;
  /** O noktadan çözüme kalan en az adım (oda değiştirme de bir adımdır). */
  stepsRemaining: number;
  /** O noktadan itibaren sonraki en fazla 5 adım. */
  moves: MoveCode[];
}

type Verdict =
  | { kind: 'solvable'; solution: MoveCode[] }
  | { kind: 'unsolvable' }
  | { kind: 'unknown' };

export function computeHint(
  replay: ReplayResult,
  moves: readonly MoveCode[],
  budget: HintBudget = DEFAULT_HINT_BUDGET,
): HintResult | null {
  let statesLeft = budget.totalStates;

  const evaluate = (state: ReplayState, maxStates: number): Verdict => {
    const result = solveFromState(
      state.entities,
      state.rooms,
      state.controlledRoomIds,
      replay.controlMode,
      replay.trailCollision,
      budget.maxDepth,
      maxStates,
    );
    statesLeft -= result.statesExplored;
    if (result.solvable && result.solution) {
      return { kind: 'solvable', solution: result.solution.map((a) => ACTION_TO_CODE[a]) };
    }
    return result.exhausted ? { kind: 'unsolvable' } : { kind: 'unknown' };
  };

  const toResult = (solution: MoveCode[], undoSteps: number, restart: boolean): HintResult => ({
    undoSteps,
    restart,
    stepsRemaining: solution.length,
    moves: solution.slice(0, HINT_PREVIEW_LENGTH),
  });

  const states = replay.states;
  const current = evaluate(states[states.length - 1], Math.min(budget.maxStatesPerSearch, statesLeft));
  if (current.kind === 'solvable') return toResult(current.solution, 0, false);
  // Mevcut durum belki çözülebilir; emin olmadan geri almayı önermeyiz.
  if (current.kind === 'unknown') return null;

  // Çözümsüz: istemcideki "geri al" yalnızca yön hamlelerini geri alır ve o hamleden
  // önceki durumu (oda seçimi dahil) geri yükler. Bu yüzden aday noktalar yön
  // hamlelerinden hemen önceki durumlardır; aradaki oda değiştirmeler de geri alınır.
  let undoSteps = 0;
  for (let i = moves.length - 1; i >= 0 && undoSteps < budget.maxUndoProbes; i--) {
    if (moves[i] === 's') continue;
    undoSteps++;
    const isInitial = i === 0;
    if (!isInitial && statesLeft <= 0) break;
    // Başlangıç durumu ayrılmış bütçeyle denenir: yayınlanmış level'lar çözülebilirdir.
    const verdict = evaluate(states[i], isInitial ? budget.maxStatesPerSearch : Math.min(budget.maxStatesPerSearch, statesLeft));
    // Başlangıca geri alarak dönmek, yeniden başlatmaya tercih edilir (restart reklam tetikleyebilir).
    if (verdict.kind === 'solvable') return toResult(verdict.solution, undoSteps, false);
    if (isInitial) return null;
    // `unknown` bir aday atlanır: daha geride KANITLANMIŞ çözülebilir bir nokta önermek yine doğrudur.
  }

  // Geçmiş, denenebilecek geri alma sayısından uzun: baştan başlama önerilir.
  const initial = evaluate(states[0], budget.maxStatesPerSearch);
  return initial.kind === 'solvable' ? toResult(initial.solution, 0, true) : null;
}
