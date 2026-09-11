'use client';

import type { DeflectorCellConfig } from '@/game-engine/level-format';
import { useEditorContext } from '../../EditorContext';
import { SectionHeading, type CellRef } from './settingsShared';

type DeflectorMapping = DeflectorCellConfig['mapping'];
type Dir = keyof DeflectorMapping;

/** Default clockwise mapping used when a deflector has no stored config. */
const DEFAULT_MAPPING: DeflectorMapping = { up: 'right', right: 'down', down: 'left', left: 'up' };

/** Direction-deflector cells of the active room: incoming -> outgoing direction per side. */
export default function DeflectorsSection({ cells }: { cells: CellRef[] }) {
  const { deflectorConfig, setDeflectorConfig, activeRoomId } = useEditorContext();

  return (
    <div>
      <SectionHeading color="#ec4899">
        Deflectors
      </SectionHeading>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {cells.map(({ r, c }) => {
          const cfgEntry = deflectorConfig.find((x) => (x.position.roomId ?? 'main') === activeRoomId && x.position.row === r && x.position.col === c);
          const mapping = cfgEntry?.mapping ?? DEFAULT_MAPPING;

          return (
            <div key={`${r},${c}`} style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              padding: '6px 8px',
              minWidth: 140,
              background: 'rgba(236,72,153,0.05)',
              border: '1px solid rgba(236,72,153,0.2)',
              borderRadius: 6,
            }}>
              <span style={{ fontSize: 10, color: '#ec4899', fontWeight: 700 }}>
                Deflector ({r},{c})
              </span>
              {(['up', 'right', 'down', 'left'] as const).map((fromDir) => {
                const toDir = mapping[fromDir];
                return (
                  <div key={fromDir} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                    <span style={{ fontSize: 9, color: '#64748b', textTransform: 'capitalize' }}>{fromDir}:</span>
                    <select
                      value={toDir}
                      onChange={(e) => {
                        const val = e.target.value as Dir;
                        setDeflectorConfig((prev) => {
                          const without = prev.filter((x) => !((x.position.roomId ?? 'main') === activeRoomId && x.position.row === r && x.position.col === c));
                          const current = prev.find((x) => (x.position.roomId ?? 'main') === activeRoomId && x.position.row === r && x.position.col === c);
                          const newMapping: DeflectorMapping = {
                            ...DEFAULT_MAPPING,
                            ...(current?.mapping ?? {}),
                            [fromDir]: val,
                          };
                          return [...without, { position: { roomId: activeRoomId, row: r, col: c }, mapping: newMapping }];
                        });
                      }}
                      style={{
                        background: '#0f172a',
                        border: '1px solid rgba(236,72,153,0.3)',
                        borderRadius: 4,
                        color: '#ec4899',
                        fontSize: 9,
                        padding: '1px 2px',
                        outline: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <option value="up">Up</option>
                      <option value="right">Right</option>
                      <option value="down">Down</option>
                      <option value="left">Left</option>
                    </select>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
