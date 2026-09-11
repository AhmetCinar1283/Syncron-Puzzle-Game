'use client';

import { useState } from 'react';
import { useEditorContext } from '../../EditorContext';
import { collectCells } from './settingsShared';
import PlayersSection from './PlayersSection';
import BoxesSection from './BoxesSection';
import { ConveyorsSection, TrampolinesSection } from './StepCellsSections';
import ControlSwitchesSection from './ControlSwitchesSection';
import DeflectorsSection from './DeflectorsSection';

const CONVEYORS = ['conveyor_up', 'conveyor_down', 'conveyor_left', 'conveyor_right'];
const TRAMPOLINES = ['trampoline_up', 'trampoline_down', 'trampoline_left', 'trampoline_right'];

/** Collapsible bottom panel: summary chips + per-entity/per-cell config sections for the active room. */
export default function BottomSettingsPanel({ isMobile, visible }: { isMobile: boolean; visible?: boolean }) {
  const { grid, width, height, boxes, objects } = useEditorContext();
  const [expanded, setExpanded] = useState(false);

  const conveyorCells = collectCells(grid, width, height, (cell) => CONVEYORS.includes(cell));
  const trampolineCells = collectCells(grid, width, height, (cell) => TRAMPOLINES.includes(cell));
  const controlSwitchCells = collectCells(grid, width, height, (cell) => cell.startsWith('control_switch'));
  const deflectorCells = collectCells(grid, width, height, (cell) => cell === 'direction_deflector');

  const hasContent = objects.length > 0 || boxes.length > 0 || conveyorCells.length > 0 || trampolineCells.length > 0 || controlSwitchCells.length > 0 || deflectorCells.length > 0;

  if (!hasContent) return null;
  if (isMobile && !visible) return null;

  return (
    <div style={{
      flexShrink: 0,
      borderTop: '1px solid rgba(30,58,95,0.4)',
      background: 'rgba(3,7,18,0.97)',
      transition: 'max-height 0.2s ease',
    }}>
      {/* Collapsed header row */}
      <div
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 14px', cursor: 'pointer', userSelect: 'none',
          height: 40,
        }}
      >
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {objects.length > 0 && (
            <span style={{ fontSize: 11, color: '#00ff88' }}>🟢 {objects.length} player{objects.length > 1 ? 's' : ''}</span>
          )}
          {boxes.length > 0 && (
            <span style={{ fontSize: 11, color: '#f97316' }}>▣ {boxes.length} box{boxes.length > 1 ? 'es' : ''}</span>
          )}
          {conveyorCells.length > 0 && (
            <span style={{ fontSize: 11, color: '#c4b5fd' }}>◄► {conveyorCells.length} conveyor{conveyorCells.length > 1 ? 's' : ''}</span>
          )}
          {trampolineCells.length > 0 && (
            <span style={{ fontSize: 11, color: '#22d3ee' }}>▲ {trampolineCells.length} trampoline{trampolineCells.length > 1 ? 's' : ''}</span>
          )}
          {controlSwitchCells.length > 0 && (
            <span style={{ fontSize: 11, color: '#a855f7' }}>❖ {controlSwitchCells.length} control switch{controlSwitchCells.length > 1 ? 'es' : ''}</span>
          )}
          {deflectorCells.length > 0 && (
            <span style={{ fontSize: 11, color: '#ec4899' }}>⤭ {deflectorCells.length} deflector{deflectorCells.length > 1 ? 's' : ''}</span>
          )}
        </div>
        <span style={{ fontSize: 12, color: '#334155', transition: 'transform 0.2s', display: 'inline-block', transform: expanded ? 'rotate(180deg)' : 'none' }}>▼</span>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: '0 14px 12px', display: 'flex', flexDirection: 'row', gap: 12, overflowX: 'auto' }}>
          {/* Players */}
          {objects.length > 0 && <PlayersSection />}

          {/* Boxes */}
          {boxes.length > 0 && <BoxesSection />}

          {/* Conveyor config: power requirements + step counts */}
          {conveyorCells.length > 0 && <ConveyorsSection cells={conveyorCells} />}

          {/* Trampoline config: step counts */}
          {trampolineCells.length > 0 && <TrampolinesSection cells={trampolineCells} />}

          {/* Control Switch Config */}
          {controlSwitchCells.length > 0 && <ControlSwitchesSection cells={controlSwitchCells} />}

          {/* Direction Deflectors */}
          {deflectorCells.length > 0 && <DeflectorsSection cells={deflectorCells} />}
        </div>
      )}
    </div>
  );
}
