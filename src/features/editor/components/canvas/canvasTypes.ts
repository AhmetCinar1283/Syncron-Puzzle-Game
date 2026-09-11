import type { calculateRoomLayoutOffsets } from '@/game-engine/logic/engine/rooms';
import type { EditorContextValue } from '../../EditorContext';

/** One editor room as stored in context (`rooms[]`; untyped upstream, kept as-is). */
export type EditorRoom = EditorContextValue['rooms'][number];
export type RoomSide = 'top' | 'bottom' | 'left' | 'right';
export type RoomPositions = ReturnType<typeof calculateRoomLayoutOffsets>['roomPositions'];
export const ROOM_SIDES = ['top', 'bottom', 'left', 'right'] as const;
