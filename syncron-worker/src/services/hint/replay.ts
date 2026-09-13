/**
 * DOSYA AMACI: İstemcinin gönderdiği hamle geçmişini level'ın başlangıç durumundan
 * itibaren sunucuda oynatır ve her hamleden önceki durumu döner. İstemci hiçbir
 * zaman "durum" göndermez; sunucu durumu kendi üretir, böylece sahte bir durum
 * için ipucu alınamaz.
 */

import type { Entity } from '../../../../src/game-engine/logic/entityTypes';
import type { Direction, RoomState } from '../../../../src/game-engine/logic/types';
import { convertToGame2State } from '../../../../src/game-engine/logic/converter';
import { checkWinCondition } from '../../../../src/game-engine/logic/winCondition';
import { transition } from '../../../../src/game-engine/solver/solver';

/** İstemcinin hamle geçmişindeki kodlar (features/play/lib/session.ts ile aynı). */
export type MoveCode = 'u' | 'd' | 'l' | 'r' | 's';
export const MOVE_CODES = ['u', 'd', 'l', 'r', 's'] as const;

export type SolverAction = Direction | 'switch_room';

const CODE_TO_ACTION: Record<MoveCode, SolverAction> = {
  u: 'up',
  d: 'down',
  l: 'left',
  r: 'right',
  s: 'switch_room',
};

export const ACTION_TO_CODE: Record<SolverAction, MoveCode> = {
  up: 'u',
  down: 'd',
  left: 'l',
  right: 'r',
  switch_room: 's',
};

export interface ReplayState {
  entities: Entity[];
  rooms: Record<string, RoomState>;
  controlledRoomIds: string[];
}

export interface ReplayResult {
  /** `states[i]` = `moves[i]` yapılmadan önceki durum; son eleman = şu anki durum. */
  states: ReplayState[];
  controlMode: 'all_rooms' | 'selected_room';
  trailCollision: boolean;
}

export type ReplayError = 'switch-not-allowed' | 'game-over' | 'already-won';

/**
 * Hamleleri oynatır. Oyunun oynanamaz olduğu bir noktadan (ölüm, kazanma) sonra
 * gelen ya da level'da mümkün olmayan oda değiştirme hamlesi içeren geçmiş reddedilir.
 */
export function replayMoves(
  level: any,
  moves: readonly MoveCode[],
): { ok: true; replay: ReplayResult } | { ok: false; error: ReplayError } {
  const game2 = convertToGame2State(level);
  const controlMode = game2.controlMode ?? 'all_rooms';
  const trailCollision = !!level.trailCollision;
  const roomCount = Object.keys(game2.rooms).length;

  // Çözücünün (solveFromState) kullandığı sınırlarla birebir aynı.
  const levelBounds = {
    rooms: Object.fromEntries(
      Object.entries(game2.rooms).map(([id, room]) => [id, { rows: room.height, cols: room.width, edges: room.edges }]),
    ),
    trailCollision,
  };

  let current: ReplayState = {
    entities: game2.entities,
    rooms: game2.rooms,
    controlledRoomIds: game2.initialControlledRooms ?? Object.keys(game2.rooms),
  };
  if (checkWinCondition(current.entities, current.rooms)) return { ok: false, error: 'already-won' };

  const states: ReplayState[] = [current];
  for (const code of moves) {
    const action = CODE_TO_ACTION[code];
    // İstemci oda değiştirmeyi yalnızca seçili oda modunda ve birden çok odada kaydeder.
    if (action === 'switch_room' && (controlMode !== 'selected_room' || roomCount < 2)) {
      return { ok: false, error: 'switch-not-allowed' };
    }
    const next = transition(current.entities, current.rooms, action, controlMode, current.controlledRoomIds, levelBounds);
    if (next.lost) return { ok: false, error: 'game-over' };
    if (next.won) return { ok: false, error: 'already-won' };
    current = { entities: next.entities, rooms: next.rooms, controlledRoomIds: next.controlledRoomIds };
    states.push(current);
  }

  return { ok: true, replay: { states, controlMode, trailCollision } };
}
