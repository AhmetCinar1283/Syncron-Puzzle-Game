/**
 * DOSYA AMACI: Oyuncu ipucunu takip ederken aktif ipucunu ilerleten saf
 * fonksiyonlar. İpucundan sapan her eylem ipucunu kapatır (`null`), çünkü
 * sunucunun hesapladığı yol yalnızca o durumdan geçerlidir.
 */
import type { ActiveHint, HintMoveCode, ServerHint } from './types';

export function startHint(hint: ServerHint): ActiveHint | null {
  const active: ActiveHint = {
    phase: hint.restart ? 'restart' : hint.undoSteps > 0 ? 'undo' : 'moves',
    undoLeft: hint.restart ? 0 : hint.undoSteps,
    stepsRemaining: hint.stepsRemaining,
    moves: [...hint.moves],
  };
  return active.moves.length > 0 ? active : null;
}

/** Oyuncu bir hamle (ya da oda değiştirme) yaptı. */
export function advanceOnMove(active: ActiveHint, move: HintMoveCode): ActiveHint | null {
  if (active.phase !== 'moves' || active.moves[0] !== move) return null;
  const moves = active.moves.slice(1);
  if (moves.length === 0) return null;
  return { ...active, moves, stepsRemaining: active.stepsRemaining - 1 };
}

/** Oyuncu bir hamleyi geri aldı. */
export function advanceOnUndo(active: ActiveHint): ActiveHint | null {
  if (active.phase !== 'undo') return null;
  const undoLeft = active.undoLeft - 1;
  return undoLeft > 0 ? { ...active, undoLeft } : { ...active, undoLeft: 0, phase: 'moves' };
}

/** Oyuncu level'ı yeniden başlattı. */
export function advanceOnRestart(active: ActiveHint): ActiveHint | null {
  return active.phase === 'restart' ? { ...active, phase: 'moves' } : null;
}
