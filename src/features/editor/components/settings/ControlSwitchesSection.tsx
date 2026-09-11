'use client';

import type { CellType } from '@/game-engine/level-format';
import { useEditorContext } from '../../EditorContext';
import { SectionHeading, type CellRef } from './settingsShared';

/**
 * Control-switch cells. The config is encoded in the persisted cell literal
 * itself: `control_switch_<action>_<roomId,roomId,...>` (parsed by the engine
 * converter) — editing rewrites that string in the grid.
 */
export default function ControlSwitchesSection({ cells }: { cells: CellRef[] }) {
  const { grid, setGrid, rooms } = useEditorContext();

  const updateControlSwitch = (r: number, c: number, newAction: string, newTargetRooms: string[]) => {
    const newVal = `control_switch_${newAction}_${newTargetRooms.join(',')}`;
    setGrid((g) => {
      const next = g.map((row) => [...row]);
      next[r][c] = newVal as CellType;
      return next;
    });
  };

  return (
    <div>
      <SectionHeading color="#a855f7">
        Control Switches
      </SectionHeading>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {cells.map(({ r, c }) => {
          const cellVal = grid[r][c];
          let action = 'set';
          let targetRooms: string[] = [];
          if (cellVal.startsWith('control_switch_')) {
            const parts = cellVal.split('_');
            action = parts[2] || 'set';
            targetRooms = parts[3] ? parts[3].split(',') : [];
          }

          return (
            <div key={`${r},${c}`} style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              padding: '8px 10px',
              minWidth: 150,
              background: 'rgba(168,85,247,0.05)',
              border: '1px solid rgba(168,85,247,0.2)',
              borderRadius: 6,
            }}>
              <span style={{ fontSize: 10, color: '#a855f7', fontWeight: 700 }}>
                Switch ({r},{c})
              </span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 9, color: '#64748b' }}>Action:</span>
                <select
                  value={action}
                  onChange={(e) => {
                    updateControlSwitch(r, c, e.target.value, targetRooms);
                  }}
                  style={{
                    background: '#0f172a',
                    border: '1px solid rgba(168,85,247,0.3)',
                    borderRadius: 4,
                    color: '#a855f7',
                    fontSize: 10,
                    padding: '2px 4px',
                    outline: 'none',
                  }}
                >
                  <option value="set">Set</option>
                  <option value="toggle">Toggle</option>
                  <option value="cycle">Cycle</option>
                  <option value="add">Add</option>
                  <option value="remove">Remove</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 9, color: '#64748b' }}>Target Rooms:</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 80, overflowY: 'auto', background: '#090d16', padding: '4px 6px', borderRadius: 4, border: '1px solid rgba(148,163,184,0.1)' }}>
                  {rooms.map((room) => {
                    const isChecked = targetRooms.includes(room.id);
                    return (
                      <label key={room.id} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontSize: 9, color: isChecked ? '#a855f7' : '#94a3b8' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const nextTargets = e.target.checked
                              ? [...targetRooms, room.id]
                              : targetRooms.filter((id) => id !== room.id);
                            updateControlSwitch(r, c, action, nextTargets);
                          }}
                          style={{ accentColor: '#a855f7', width: 10, height: 10 }}
                        />
                        {room.name}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
