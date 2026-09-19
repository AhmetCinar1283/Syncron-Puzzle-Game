/**
 * DOSYA AMACI: İz (trail) ve kablo (cable) katmanları — oda başına memoize.
 *
 * NEDEN: Her iki katman da eski kodda tüm ızgarayı baştan tarıyor ve hücre
 * başına `entities.filter(...)` çağırıyordu; yani kare başına ızgara üç kez
 * taranıyordu. Oysa bu katmanlar yalnızca ızgara ya da oyuncu konumları
 * değiştiğinde değişir.
 *
 * Karşılaştırıcılar `room` referansına (Faz 2'den beri ızgara değişmediğinde
 * sabit) ve oyuncu konumlarının ucuz imzasına bakar — ikisi de aynıysa katman
 * hiç yeniden çizilmez.
 */

'use client';

import { memo, ReactNode } from 'react';
import { Cell } from '../../logic/cellTypes';
import { Entity } from '../../logic/entityTypes';
import { RoomState } from '../../logic/types';
import { getPlayerColor } from '../playerColors';
import { isCellVisible } from './boardIndex';

interface RoomOffset { left: number; top: number; width: number; height: number }

interface OverlayProps {
    room: RoomState;
    offset: RoomOffset;
    cellSize: number;
    /** Odadaki yaşayan oyuncular (sis hesabı için). */
    players: Entity[];
    /** `playerIndex` -> oyuncu (izin oyuncuya bağlanması için). */
    playerByIndex: Map<number, Entity>;
    /** Oyuncu konumlarının imzası; memo karşılaştırıcısının anahtarı. */
    sig: string;
}

function sameOverlayProps(a: OverlayProps, b: OverlayProps): boolean {
    return (
        a.room === b.room &&
        a.cellSize === b.cellSize &&
        a.offset.left === b.offset.left &&
        a.offset.top === b.offset.top &&
        a.sig === b.sig
    );
}

/** Bir hücrenin çizilecek kadar keşfedilmiş olup olmadığı. */
function explored(room: RoomState, cell: Cell, visible: boolean): boolean {
    if (!room.fogOfWar) return true;
    return room.fogKeepRevealed !== false ? !!cell.customData.explored : visible;
}

function RoomTrailsImpl({ room, offset, cellSize, players, playerByIndex }: OverlayProps) {
    const nodes: ReactNode[] = [];

    for (const row of room.grid as Cell[][]) {
        for (const cell of row) {
            const trailPlayerIndex = cell.customData.trailPlayerIndex as number | undefined;
            if (trailPlayerIndex === undefined) continue;

            const r = cell.position.row;
            const c = cell.position.col;
            const isCurrentlyVisible = isCellVisible(room, players, r, c);
            if (!explored(room, cell, isCurrentlyVisible)) continue;

            const { hex: color, glow } = getPlayerColor(trailPlayerIndex);

            const hasLeft  = room.grid[r]?.[c - 1]?.customData.trailPlayerIndex === trailPlayerIndex;
            const hasRight = room.grid[r]?.[c + 1]?.customData.trailPlayerIndex === trailPlayerIndex;
            const hasUp    = room.grid[r - 1]?.[c]?.customData.trailPlayerIndex === trailPlayerIndex;
            const hasDown  = room.grid[r + 1]?.[c]?.customData.trailPlayerIndex === trailPlayerIndex;

            const player = playerByIndex.get(trailPlayerIndex);
            const isPlayerLeft  = !!player && player.position.row === r && player.position.col === c - 1;
            const isPlayerRight = !!player && player.position.row === r && player.position.col === c + 1;
            const isPlayerUp    = !!player && player.position.row === r - 1 && player.position.col === c;
            const isPlayerDown  = !!player && player.position.row === r + 1 && player.position.col === c;

            nodes.push(
                <div
                    key={`trail-${cell.id}`}
                    style={{
                        position: 'absolute',
                        top: offset.top + r * cellSize,
                        left: offset.left + c * cellSize,
                        width: cellSize,
                        height: cellSize,
                        pointerEvents: 'none',
                        zIndex: 5,
                        opacity: isCurrentlyVisible ? 1.0 : 0.2,
                        transition: 'opacity 0.3s ease',
                    }}
                >
                    {(hasLeft || isPlayerLeft) && (
                        <div style={{ position: 'absolute', left: 0, top: 29, width: 32, height: 6, backgroundColor: color, boxShadow: `0 0 8px ${color}, 0 0 16px ${glow}` }} />
                    )}
                    {(hasRight || isPlayerRight) && (
                        <div style={{ position: 'absolute', left: 32, top: 29, width: 32, height: 6, backgroundColor: color, boxShadow: `0 0 8px ${color}, 0 0 16px ${glow}` }} />
                    )}
                    {(hasUp || isPlayerUp) && (
                        <div style={{ position: 'absolute', left: 29, top: 0, width: 6, height: 32, backgroundColor: color, boxShadow: `0 0 8px ${color}, 0 0 16px ${glow}` }} />
                    )}
                    {(hasDown || isPlayerDown) && (
                        <div style={{ position: 'absolute', left: 29, top: 32, width: 6, height: 32, backgroundColor: color, boxShadow: `0 0 8px ${color}, 0 0 16px ${glow}` }} />
                    )}
                    <div style={{
                        position: 'absolute', left: 25, top: 25, width: 14, height: 14,
                        borderRadius: '50%', backgroundColor: '#ffffff', border: `3px solid ${color}`,
                        boxShadow: `0 0 10px ${color}, 0 0 20px ${color}`, zIndex: 6,
                    }} />
                </div>
            );
        }
    }

    return <>{nodes}</>;
}

function RoomCablesImpl({ room, offset, cellSize, players }: OverlayProps) {
    const nodes: ReactNode[] = [];

    for (const row of room.grid as Cell[][]) {
        for (const cell of row) {
            if (!cell.isElectrified && cell.type !== 'power') continue;

            const r = cell.position.row;
            const c = cell.position.col;
            const isCurrentlyVisible = isCellVisible(room, players, r, c);
            if (!explored(room, cell, isCurrentlyVisible)) continue;

            const cableConns = (cell.customData.cableConnections as string[]) ?? [];
            const hasRightConnection = cableConns.includes('right');
            const hasDownConnection = cableConns.includes('down');

            const rightCell = room.grid[r]?.[c + 1];
            const isRightExplored = !!rightCell && explored(room, rightCell, isCellVisible(room, players, rightCell.position.row, rightCell.position.col));

            const downCell = room.grid[r + 1]?.[c];
            const isDownExplored = !!downCell && explored(room, downCell, isCellVisible(room, players, downCell.position.row, downCell.position.col));

            nodes.push(
                <div
                    key={`cable-${cell.id}`}
                    style={{
                        position: 'absolute',
                        top: offset.top + r * cellSize,
                        left: offset.left + c * cellSize,
                        width: cellSize,
                        height: cellSize,
                        pointerEvents: 'none',
                        zIndex: 6,
                        opacity: isCurrentlyVisible ? 0.65 : 0.15,
                        transition: 'opacity 0.3s ease',
                    }}
                >
                    {hasRightConnection && isRightExplored && (
                        <div style={{ position: 'absolute', left: 32, top: 31, width: 64, height: 2, backgroundColor: 'rgba(251, 191, 36, 0.85)', boxShadow: '0 0 4px rgba(234, 179, 8, 0.6)' }} />
                    )}
                    {hasDownConnection && isDownExplored && (
                        <div style={{ position: 'absolute', left: 31, top: 32, width: 2, height: 64, backgroundColor: 'rgba(251, 191, 36, 0.85)', boxShadow: '0 0 4px rgba(234, 179, 8, 0.6)' }} />
                    )}
                    <div style={{
                        position: 'absolute', left: 30, top: 30, width: 4, height: 4,
                        borderRadius: '50%', backgroundColor: '#ffffff',
                        boxShadow: '0 0 4px rgba(234, 179, 8, 0.8)', zIndex: 7,
                    }} />
                </div>
            );
        }
    }

    return <>{nodes}</>;
}

export const RoomTrails = memo(RoomTrailsImpl, sameOverlayProps);
export const RoomCables = memo(RoomCablesImpl, sameOverlayProps);
