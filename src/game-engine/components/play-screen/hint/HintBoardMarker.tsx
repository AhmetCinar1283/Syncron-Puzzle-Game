'use client';

/**
 * DOSYA AMACI: Board üzerinde ipucunun SIRADAKİ adımını işaretler: hareket edecek
 * her oyuncunun etrafında nabız halkası ve fiilen gideceği yönde bir ok; oda
 * değiştirme adımında kontrolün geçeceği odanın çerçevesi. Board'un native
 * (ölçeklenmemiş) koordinatlarında çizilir, tıklamaları engellemez.
 */
import type { Entity } from '../../../logic/entityTypes';
import type { Direction, RoomState } from '../../../logic/types';
import { calculateRoomLayoutOffsets } from '../../../logic/engine/rooms';
import { getHintTargets, type ActiveHint, type HintMoveCode } from '../../../hint';
import { NATIVE_CELL_SIZE, ROOM_LAYOUT_GAP } from '../constants';
import { HINT_COLOR, HINT_GLOW } from './hintStyles';

interface HintBoardMarkerProps {
    hint: ActiveHint;
    entities: Entity[];
    rooms: Record<string, RoomState>;
    controlMode: 'all_rooms' | 'selected_room';
    controlledRoomIds: string[];
}

const CODE_TO_DIRECTION: Record<Exclude<HintMoveCode, 's'>, Direction> = { u: 'up', d: 'down', l: 'left', r: 'right' };

const ARROW_GLYPH: Record<Direction, string> = { up: '▲', down: '▼', left: '◀', right: '▶' };
const ARROW_OFFSET: Record<Direction, { dx: number; dy: number }> = {
    up: { dx: 0, dy: -1 },
    down: { dx: 0, dy: 1 },
    left: { dx: -1, dy: 0 },
    right: { dx: 1, dy: 0 },
};

/** Seçili oda modunda "oda değiştir" adımının kontrolü devredeceği oda (motorla aynı döngü). */
function nextControlledRoom(rooms: Record<string, RoomState>, controlledRoomIds: string[]): string | null {
    const roomKeys = Object.keys(rooms);
    if (roomKeys.length < 2) return null;
    const currentIdx = roomKeys.indexOf(controlledRoomIds[0] ?? '');
    return roomKeys[(currentIdx + 1) % roomKeys.length];
}

export function HintBoardMarker({ hint, entities, rooms, controlMode, controlledRoomIds }: HintBoardMarkerProps) {
    // Önce geri al / baştan başla bekleniyorsa board'da işaretlenecek adım yok (HUD butonu vurgulanır).
    const next = hint.phase === 'moves' ? hint.moves[0] : undefined;
    if (!next) return null;

    const { roomPositions } = calculateRoomLayoutOffsets(rooms, NATIVE_CELL_SIZE, ROOM_LAYOUT_GAP);
    const layer = { position: 'absolute' as const, inset: 0, pointerEvents: 'none' as const, zIndex: 40 };

    if (next === 's') {
        const roomId = nextControlledRoom(rooms, controlledRoomIds);
        const offset = roomId ? roomPositions[roomId] : undefined;
        if (!offset) return null;
        return (
            <div style={layer}>
                <div style={{
                    position: 'absolute',
                    left: offset.left - 6,
                    top: offset.top - 6,
                    width: offset.width + 12,
                    height: offset.height + 12,
                    border: `3px dashed ${HINT_COLOR}`,
                    borderRadius: 10,
                    boxShadow: `0 0 18px ${HINT_GLOW}`,
                    animation: 'hint-ring-pulse 1.2s ease-in-out infinite',
                }} />
            </div>
        );
    }

    const targets = getHintTargets(entities, controlMode, controlledRoomIds, CODE_TO_DIRECTION[next]);

    return (
        <div style={layer}>
            {targets.map((target) => {
                const offset = roomPositions[target.position.roomId ?? 'main'];
                if (!offset) return null;
                const left = offset.left + target.position.col * NATIVE_CELL_SIZE;
                const top = offset.top + target.position.row * NATIVE_CELL_SIZE;
                const { dx, dy } = ARROW_OFFSET[target.direction];
                return (
                    <div key={target.entityId}>
                        <div style={{
                            position: 'absolute',
                            left: left + 4,
                            top: top + 4,
                            width: NATIVE_CELL_SIZE - 8,
                            height: NATIVE_CELL_SIZE - 8,
                            borderRadius: '50%',
                            border: `3px solid ${HINT_COLOR}`,
                            boxShadow: `0 0 16px ${HINT_GLOW}, inset 0 0 10px ${HINT_GLOW}`,
                            animation: 'hint-ring-pulse 1.1s ease-in-out infinite',
                        }} />
                        <div style={{
                            position: 'absolute',
                            left: left + dx * NATIVE_CELL_SIZE * 0.72,
                            top: top + dy * NATIVE_CELL_SIZE * 0.72,
                            width: NATIVE_CELL_SIZE,
                            height: NATIVE_CELL_SIZE,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: HINT_COLOR,
                            fontSize: 30,
                            textShadow: `0 0 10px ${HINT_GLOW}`,
                            ['--hint-dx' as string]: `${dx * 8}px`,
                            ['--hint-dy' as string]: `${dy * 8}px`,
                            animation: 'hint-arrow-nudge 0.9s ease-in-out infinite',
                        }}>
                            {ARROW_GLYPH[target.direction]}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
