import React from 'react';
import { CELL_RENDERERS } from './cells/CELL_RENDERERS';
import { Cell, CellTypes } from '../logic/cellTypes';
import { Direction } from '../logic/types';
import { CELL_DEFS } from '../logic/cells/registry';

interface GameCellAdapterProps {
  cellType: string;
  cellSize?: number;
  isPowered?: boolean;
}

type CellMapping = {
  type: CellTypes;
  customData?: Record<string, unknown>;
};

function mapCellType(old: string): CellMapping {
  if (old.startsWith('target_')) {
    const numStr = old.substring('target_'.length);
    const playerIndex = parseInt(numStr, 10) - 1;
    if (!isNaN(playerIndex)) {
      return { type: 'target', customData: { playerIndex } };
    }
  }
  if (old.startsWith('teleporter_in_')) {
    const group = old.substring('teleporter_in_'.length);
    return { type: 'teleport', customData: { group, isIn: true } };
  }
  if (old.startsWith('teleporter_out_')) {
    const group = old.substring('teleporter_out_'.length);
    return { type: 'teleport', customData: { group, isIn: false } };
  }
  if (old.startsWith('control_switch')) {
    return { type: 'control_switch' };
  }

  switch (old) {
    case 'empty':
      return { type: 'normal' };
    case 'obstacle':
      return { type: 'obstacle' };
    case 'forbidden':
      return { type: 'forbidden' };
    case 'ice':
      return { type: 'ice' };
    case 'power_node':
      return { type: 'power' };
    case 'direction_toggle':
      return { type: 'toggle' };
    case 'direction_deflector':
      return { type: 'direction_deflector' };
    case 'conveyor_up':
      return { type: 'conveyor', customData: { direction: 'up' as Direction } };
    case 'conveyor_down':
      return { type: 'conveyor', customData: { direction: 'down' as Direction } };
    case 'conveyor_left':
      return { type: 'conveyor', customData: { direction: 'left' as Direction } };
    case 'conveyor_right':
      return { type: 'conveyor', customData: { direction: 'right' as Direction } };
    case 'trampoline_up':
      return { type: 'trampoline', customData: { direction: 'up' as Direction } };
    case 'trampoline_down':
      return { type: 'trampoline', customData: { direction: 'down' as Direction } };
    case 'trampoline_left':
      return { type: 'trampoline', customData: { direction: 'left' as Direction } };
    case 'trampoline_right':
      return { type: 'trampoline', customData: { direction: 'right' as Direction } };
    default:
      return { type: 'normal' };
  }
}

export const GameCellAdapter: React.FC<GameCellAdapterProps> = ({ cellType, cellSize = 64, isPowered }) => {
  const mapping = mapCellType(cellType);
  const Renderer = CELL_RENDERERS[mapping.type] || CELL_RENDERERS['normal'];
  const cellDef = CELL_DEFS[mapping.type] || CELL_DEFS['normal'];

  const dummyCell: Cell = {
    id: `cell-preview-${cellType}`,
    type: mapping.type,
    def: cellDef,
    position: { row: 0, col: 0 },
    isElectrified: isPowered ?? false,
    customData: mapping.customData ?? {},
  };

  const scale = cellSize / 64;

  return (
    <div
      style={{
        width: cellSize,
        height: cellSize,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          transform: scale !== 1 ? `scale(${scale})` : undefined,
          transformOrigin: 'center center',
          flexShrink: 0,
        }}
      >
        <Renderer cell={dummyCell} entityOnCell={null} prevEntityOnCell={null} />
      </div>
    </div>
  );
};

export default GameCellAdapter;
