'use client';

import { NBtn, Lbl } from '../EditorUI';
import type { GeneratorFormApi } from '../../hooks/useGeneratorForm';
import { DENSITY_ELEMENTS, EDGE_ALLOWED_KEY } from '../../lib/generatorFilters';
import { GEN_SECTION_STYLE, GEN_SECTION_TITLE_STYLE } from './GeneratorGeneralSection';

/** Display order of the 2x2 edge grid (unchanged: top, right, bottom, left). */
const EDGE_SIDES = [
  ['top', 'Top Edge'],
  ['right', 'Right Edge'],
  ['bottom', 'Bottom Edge'],
  ['left', 'Left Edge'],
] as const;

/** Group 3: allowed edge behaviors, element densities / exact counts, teleporter pairs. */
export default function GeneratorCellsSection({ g }: { g: GeneratorFormApi }) {
  const { form, update, toggleEdgeAllowed, handleModeChange, toggleConveyorStep, toggleTrampolineStep } = g;
  const { width, height, conveyorSteps, trampolineSteps, teleporterCount } = form;

  return (
    <div style={GEN_SECTION_STYLE}>
      <span style={GEN_SECTION_TITLE_STYLE}>3. Cell & Element Settings</span>

      {/* Granular Edge Behaviors */}
      <div>
        <Lbl style={{ marginBottom: 4 }}>Granular Edge Behaviors</Lbl>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, background: '#020617', padding: 8, borderRadius: 8, border: '1px solid rgba(30,58,95,0.2)' }}>
          {EDGE_SIDES.map(([side, label]) => (
            <div key={side}>
              <Lbl style={{ margin: '0 0 3px', fontSize: 8 }}>{label}</Lbl>
              <div style={{ display: 'flex', gap: 2 }}>
                {(['wall', 'portal', 'lava', 'random'] as const).map((b) => (
                  <NBtn
                    key={b}
                    onClick={() => toggleEdgeAllowed(side, b)}
                    active={form[EDGE_ALLOWED_KEY[side]].includes(b)}
                    color={b === 'wall' ? '#00c4ff' : b === 'portal' ? '#a78bfa' : b === 'lava' ? '#ef4444' : '#f59e0b'}
                    style={{ flex: 1, padding: '4px 0', fontSize: 8 }}
                  >
                    {b === 'wall' ? 'Wall' : b === 'portal' ? 'Port' : b === 'lava' ? 'Lava' : 'Rand'}
                  </NBtn>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Granular Sliders for Densities/Exact Counts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid rgba(30,58,95,0.15)', paddingTop: 10 }}>
        <Lbl style={{ margin: 0 }}>Special Element Densities & Ratios</Lbl>

        {DENSITY_ELEMENTS.map((cfg) => {
          const mode = form[cfg.modeKey];
          const ratio = form[cfg.densityKey];
          const count = form[cfg.countKey];
          const maxCount = width * height;
          const isActive = mode === 'ratio' ? ratio > 0 : count > 0;
          return (
            <div key={cfg.label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 9, color: '#94a3b8' }}>{cfg.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {/* Toggle buttons for Ratio / Count */}
                  <div style={{ display: 'flex', background: '#020617', borderRadius: 4, padding: 1, border: '1px solid rgba(30,58,95,0.4)' }}>
                    {(['ratio', 'count'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleModeChange(cfg.key, m)}
                        style={{
                          padding: '1px 5px',
                          fontSize: 8,
                          fontWeight: 600,
                          border: 'none',
                          borderRadius: 3,
                          background: mode === m ? 'rgba(0,196,255,0.2)' : 'transparent',
                          color: mode === m ? '#00c4ff' : '#475569',
                          cursor: 'pointer',
                          textTransform: 'uppercase',
                          lineHeight: 1
                        }}
                      >
                        {m === 'ratio' ? '%' : '#'}
                      </button>
                    ))}
                  </div>
                  <span style={{ fontSize: 9, color: '#e2e8f0', minWidth: 28, textAlign: 'right', fontWeight: 'bold' }}>
                    {mode === 'ratio' ? `${Math.round(ratio * 100)}%` : `${count} pcs`}
                  </span>
                </div>
              </div>

              {mode === 'ratio' ? (
                <input
                  type="range"
                  min={0}
                  max={cfg.maxRatio}
                  step={5}
                  value={ratio * 100}
                  onChange={(e) => update({ [cfg.densityKey]: Number(e.target.value) / 100 })}
                  style={{ width: '100%', accentColor: '#00c4ff' }}
                />
              ) : (
                <input
                  type="range"
                  min={0}
                  max={maxCount}
                  step={1}
                  value={count}
                  onChange={(e) => update({ [cfg.countKey]: Number(e.target.value) })}
                  style={{ width: '100%', accentColor: '#00c4ff' }}
                />
              )}

              {/* Conveyor steps expand dynamically */}
              {cfg.key === 'conveyor' && isActive && (
                <div style={{ marginTop: 4, paddingLeft: 8, borderLeft: '2px solid rgba(0,196,255,0.3)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 8, color: '#00c4ff' }}>Conveyor Steps (Select multiple for random):</span>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {([1, 2, 3, 4, 5] as const).map((s) => {
                      const active = conveyorSteps.includes(s);
                      return (
                        <NBtn key={s} onClick={() => toggleConveyorStep(s)} active={active} color="#00c4ff" style={{ flex: 1, padding: '3px 0', fontSize: 8 }}>
                          {s}
                        </NBtn>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Trampoline steps expand dynamically */}
              {cfg.key === 'trampoline' && isActive && (
                <div style={{ marginTop: 4, paddingLeft: 8, borderLeft: '2px solid rgba(0,196,255,0.3)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 8, color: '#00c4ff' }}>Trampoline Steps (Select multiple for random):</span>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {([1, 2, 3, 4, 5] as const).map((s) => {
                      const active = trampolineSteps.includes(s);
                      return (
                        <NBtn key={s} onClick={() => toggleTrampolineStep(s)} active={active} color="#00c4ff" style={{ flex: 1, padding: '3px 0', fontSize: 8 }}>
                          {s}
                        </NBtn>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Teleporter pairs slider (always count) */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#94a3b8', marginBottom: 2 }}>
            <span>Teleporter pairs (A, B, C)</span>
            <span style={{ color: '#e2e8f0', fontWeight: 'bold' }}>{teleporterCount} Pairs</span>
          </div>
          <input type="range" min={0} max={3} step={1} value={teleporterCount} onChange={(e) => update({ teleporterCount: Number(e.target.value) })} style={{ width: '100%', accentColor: '#00c4ff' }} />
        </div>
      </div>
    </div>
  );
}
