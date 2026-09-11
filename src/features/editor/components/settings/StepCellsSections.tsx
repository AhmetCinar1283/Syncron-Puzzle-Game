'use client';

import { useEditorContext } from '../../EditorContext';
import { useT } from '@/contexts/LanguageContext';
import { SectionHeading, type CellRef } from './settingsShared';

/** Conveyor cells: power requirement + step count (steps === 1 is the default and is not stored). */
export function ConveyorsSection({ cells }: { cells: CellRef[] }) {
  const { grid, conveyorPowerRequired, setConveyorPowerRequired, conveyorConfig, setConveyorConfig } = useEditorContext();
  const t = useT();

  return (
    <div>
      <SectionHeading color="#c4b5fd">
        Conveyors
      </SectionHeading>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {cells.map(({ r, c }) => {
          const isRequired = conveyorPowerRequired.some((p) => p.row === r && p.col === c);
          const cfgEntry = conveyorConfig.find((x) => x.position.row === r && x.position.col === c);
          const steps = cfgEntry?.steps ?? 1;
          return (
            <div key={`${r},${c}`} style={{
              display: 'flex', flexDirection: 'column', gap: 4,
              padding: '6px 8px', minWidth: 100,
              background: 'rgba(139,92,246,0.05)',
              border: '1px solid rgba(139,92,246,0.2)',
              borderRadius: 6,
            }}>
              <span style={{ fontSize: 10, color: '#c4b5fd', fontWeight: 700 }}>
                {grid[r][c]} ({r},{c})
              </span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}>
                <input
                  type="checkbox" checked={isRequired}
                  onChange={(e) => {
                    if (e.target.checked) setConveyorPowerRequired((cpr) => [...cpr, { row: r, col: c }]);
                    else setConveyorPowerRequired((cpr) => cpr.filter((p) => !(p.row === r && p.col === c)));
                  }}
                  style={{ accentColor: '#c4b5fd', width: 11, height: 11 }}
                />
                <span style={{ fontSize: 9, color: isRequired ? '#c4b5fd' : '#475569' }}>⚡ {t('editor.conveyor_needs_power')}</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 9, color: '#c4b5fd' }}>Steps:</span>
                <input
                  type="number" min={1} max={20} value={steps}
                  onChange={(e) => {
                    const val = Math.max(1, Math.min(20, parseInt(e.target.value) || 1));
                    setConveyorConfig((cc) => {
                      const without = cc.filter((x) => !(x.position.row === r && x.position.col === c));
                      if (val === 1) return without; // default → omit
                      return [...without, { position: { row: r, col: c }, steps: val }];
                    });
                  }}
                  style={{
                    width: 40, padding: '2px 4px', fontSize: 10,
                    background: 'rgba(139,92,246,0.1)',
                    border: '1px solid rgba(139,92,246,0.3)',
                    color: '#c4b5fd', borderRadius: 4, outline: 'none',
                  }}
                />
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Trampoline cells: step count (steps === 3 is the default and is not stored). */
export function TrampolinesSection({ cells }: { cells: CellRef[] }) {
  const { grid, trampolineConfig, setTrampolineConfig } = useEditorContext();

  return (
    <div>
      <SectionHeading color="#22d3ee">
        Trampolines
      </SectionHeading>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {cells.map(({ r, c }) => {
          const cfgEntry = trampolineConfig.find((x) => x.position.row === r && x.position.col === c);
          // Default step sayısı interface'de belirtildiği gibi 3 olarak alındı
          const steps = cfgEntry?.steps ?? 3;

          return (
            <div key={`${r},${c}`} style={{
              display: 'flex', flexDirection: 'column', gap: 4,
              padding: '6px 8px', minWidth: 100,
              background: 'rgba(34,211,238,0.05)',
              border: '1px solid rgba(34,211,238,0.2)',
              borderRadius: 6,
            }}>
              <span style={{ fontSize: 10, color: '#22d3ee', fontWeight: 700 }}>
                {grid[r][c]} ({r},{c})
              </span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ fontSize: 9, color: '#22d3ee' }}>Steps:</span>
                <input
                  type="number" min={1} max={20} value={steps}
                  onChange={(e) => {
                    const val = Math.max(1, Math.min(20, parseInt(e.target.value) || 1));
                    setTrampolineConfig((tc) => {
                      const without = tc.filter((x) => !(x.position.row === r && x.position.col === c));
                      if (val === 3) return without; // Varsayılan değerdeyse gereksiz yere state'te tutmaya gerek yok
                      return [...without, { position: { row: r, col: c }, steps: val }];
                    });
                  }}
                  style={{
                    width: 40, padding: '2px 4px', fontSize: 10,
                    background: 'rgba(34,211,238,0.1)',
                    border: '1px solid rgba(34,211,238,0.3)',
                    color: '#22d3ee', borderRadius: 4, outline: 'none',
                  }}
                />
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
