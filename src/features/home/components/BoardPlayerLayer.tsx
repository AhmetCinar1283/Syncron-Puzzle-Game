'use client';

import React from 'react';
import { PlayerGraphic } from '@/game-engine/components/entities/PlayerGraphic';
import { Entity } from '@/game-engine/logic/entityTypes';
import { buildBoardMenuRows } from '../lib/boardMenuLayout';

interface BoardPlayerLayerProps {
  activeOptionId: string;
  optionIds: readonly string[];
  isMobile: boolean;
}

export function BoardPlayerLayer({
  activeOptionId,
  optionIds,
  isMobile,
}: BoardPlayerLayerProps) {
  const rows = buildBoardMenuRows(optionIds);
  const totalRows = Math.max(rows.length, 1);

  const rowIndex = rows.findIndex((row) => row.includes(activeOptionId));
  const safeRowIndex = rowIndex === -1 ? 0 : rowIndex;
  const currentRow = rows[safeRowIndex] || [];
  const colIndex = currentRow.indexOf(activeOptionId);
  const isHero = activeOptionId === 'play';

  // Calculate target vertical position (% from top of the grid)
  const rowHeightPercent = 100 / totalRows;
  const topPercent = (safeRowIndex + 0.5) * rowHeightPercent;

  // Calculate target horizontal positions for Player 1 & Player 2
  let p1LeftPercent = 38;
  let p2LeftPercent = 62;

  if (isHero) {
    p1LeftPercent = isMobile ? 32 : 36;
    p2LeftPercent = isMobile ? 68 : 64;
  } else if (colIndex === 0) {
    // Left column
    p1LeftPercent = isMobile ? 12 : 14;
    p2LeftPercent = isMobile ? 38 : 36;
  } else {
    // Right column
    p1LeftPercent = isMobile ? 62 : 64;
    p2LeftPercent = isMobile ? 88 : 86;
  }

  const p1Entity: Entity = {
    id: 1,
    type: 'player',
    position: { row: safeRowIndex, col: colIndex === -1 ? 0 : colIndex },
    physics: { direction: 'up', force: 0, z: 0 },
    def: { mass: 1, resistance: 0, isSolid: true },
    traits: new Set(),
    isElectrified: false,
    customData: { playerIndex: 0, mode: 'normal' },
  };

  const p2Entity: Entity = {
    id: 2,
    type: 'player',
    position: { row: safeRowIndex, col: colIndex === -1 ? 1 : colIndex },
    physics: { direction: 'up', force: 0, z: 0 },
    def: { mass: 1, resistance: 0, isSolid: true },
    traits: new Set(),
    isElectrified: false,
    customData: { playerIndex: 1, mode: 'normal' },
  };

  const scale = isMobile ? 0.52 : 0.62;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 10,
        overflow: 'hidden',
      }}
    >
      {/* Player 1 (Green / Cyan) */}
      <div
        style={{
          position: 'absolute',
          top: `${topPercent}%`,
          left: `${p1LeftPercent}%`,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transition:
            'top 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), left 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
          filter: 'drop-shadow(0 0 10px #00ff8880)',
        }}
      >
        <PlayerGraphic entity={p1Entity} />
      </div>

      {/* Player 2 (Orange / Magenta) */}
      <div
        style={{
          position: 'absolute',
          top: `${topPercent}%`,
          left: `${p2LeftPercent}%`,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transition:
            'top 0.28s cubic-bezier(0.34, 1.56, 0.64, 1), left 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
          filter: 'drop-shadow(0 0 10px #f9731680)',
        }}
      >
        <PlayerGraphic entity={p2Entity} />
      </div>
    </div>
  );
}
