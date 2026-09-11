'use client';

import { NBtn, iStyle, Lbl } from '../EditorUI';
import type { GeneratorFormApi } from '../../hooks/useGeneratorForm';

export const GEN_SECTION_STYLE: React.CSSProperties = { background: '#040914', border: '1px solid rgba(30,58,95,0.3)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 };
export const GEN_SECTION_TITLE_STYLE: React.CSSProperties = { fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: '#00c4ff', textTransform: 'uppercase' };

/** Group 1: presets, grid size, difficulty, mutation rate. */
export default function GeneratorGeneralSection({ g }: { g: GeneratorFormApi }) {
  const { form, update, presets, selectedPresetIndex, newPresetName, setNewPresetName,
    handlePresetSelect, handleDeletePreset, handleSavePreset } = g;
  const { width, height, difficulty, mutationRate } = form;

  return (
    <div style={GEN_SECTION_STYLE}>
      <span style={GEN_SECTION_TITLE_STYLE}>1. Metadata & General Settings</span>

      {/* Presets Management */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, borderBottom: '1px solid rgba(30,58,95,0.15)', paddingBottom: 10 }}>
        <Lbl style={{ fontSize: 8 }}>Preset Management</Lbl>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            value={selectedPresetIndex}
            onChange={(e) => handlePresetSelect(e.target.value)}
            style={{ ...iStyle, flex: 1, background: '#060d1a', border: '1px solid rgba(30,58,95,0.5)', height: 30, fontSize: 10 }}
          >
            <option value="default">Default Configuration</option>
            <option value="last_used">Last Used Settings</option>
            {presets.map((p, idx) => (
              <option key={idx} value={idx}>{p.name}</option>
            ))}
          </select>
          {typeof selectedPresetIndex === 'number' && (
            <button
              onClick={handleDeletePreset}
              style={{ padding: '0 12px', fontSize: 11, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', color: '#ef4444', borderRadius: 6, cursor: 'pointer' }}
            >
              Delete
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          <input
            type="text" placeholder="Preset Name..."
            value={newPresetName} onChange={(e) => setNewPresetName(e.target.value)}
            style={{ ...iStyle, flex: 1, height: 28, fontSize: 10 }}
          />
          <button
            onClick={handleSavePreset}
            disabled={!newPresetName.trim()}
            style={{ padding: '5px 12px', fontSize: 11, fontWeight: 600, background: newPresetName.trim() ? 'rgba(0,196,255,0.1)' : 'rgba(255,255,255,0.02)', border: `1px solid ${newPresetName.trim() ? 'rgba(0,196,255,0.4)' : 'rgba(255,255,255,0.08)'}`, color: newPresetName.trim() ? '#00c4ff' : '#475569', borderRadius: 6, cursor: newPresetName.trim() ? 'pointer' : 'not-allowed' }}
          >
            Save Preset
          </button>
        </div>
      </div>

      {/* Grid Dimensions */}
      <div style={{ display: 'flex', gap: 14 }}>
        <div style={{ flex: 1 }}>
          <Lbl>Width: {width}</Lbl>
          <input type="range" min={3} max={12} value={width} onChange={(e) => update({ width: Number(e.target.value) })} style={{ width: '100%', accentColor: '#00c4ff' }} />
        </div>
        <div style={{ flex: 1 }}>
          <Lbl>Height: {height}</Lbl>
          <input type="range" min={3} max={12} value={height} onChange={(e) => update({ height: Number(e.target.value) })} style={{ width: '100%', accentColor: '#00c4ff' }} />
        </div>
      </div>

      {/* Difficulty */}
      <div>
        <Lbl>Difficulty</Lbl>
        <div style={{ display: 'flex', gap: 3 }}>
          {([1, 2, 3, 4] as const).map((d) => {
            const colors = { 1: '#00ff88', 2: '#00c4ff', 3: '#fbbf24', 4: '#ef4444' };
            const labels = { 1: 'Easy', 2: 'Medium', 3: 'Hard', 4: 'Expert' };
            return (
              <NBtn key={d} onClick={() => update({ difficulty: d })} active={difficulty === d} color={colors[d]} style={{ flex: 1, padding: '5px 1px', fontSize: 9 }}>
                {labels[d]}
              </NBtn>
            );
          })}
        </div>
      </div>

      {/* Mutation Rate / Fine-Tuning */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Lbl style={{ margin: 0 }}>Mutation Rate (Fine-Tuning)</Lbl>
          <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 'bold' }}>{Math.round(mutationRate * 100)}%</span>
        </div>
        <p style={{ fontSize: 9, color: '#475569', margin: '0 0 2px', lineHeight: 1.3 }}>
          Lower rates preserve more cells from the current canvas grid.
        </p>
        <input
          type="range" min={10} max={100} step={10}
          value={mutationRate * 100}
          onChange={(e) => update({ mutationRate: Number(e.target.value) / 100 })}
          style={{ width: '100%', accentColor: '#00c4ff' }}
        />
      </div>
    </div>
  );
}
