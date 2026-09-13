'use client';

import { useEditorContext } from '../../EditorContext';
import { useT } from '@/contexts/LanguageContext';
import type { BoxConfig } from '../../lib/editorConfig';
import { SectionHeading } from './settingsShared';
import { GameIcon } from '@/components/icons';

/** Per-box cards: place/clear/delete, power requirement, durability, color filter. */
export default function BoxesSection() {
  const { boxes, setBoxes, activePlacingBoxId, setActivePlacingBoxId, setActiveTool } = useEditorContext();
  const t = useT();

  const patchBox = (id: number, patch: Partial<BoxConfig>) =>
    setBoxes((bs) => bs.map((b) => b.id === id ? { ...b, ...patch } : b));

  return (
    <div>
      <SectionHeading color="#f97316">Boxes</SectionHeading>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        {boxes.map((box) => {
          const isPlacing = activePlacingBoxId === box.id;
          return (
            <div key={box.id} style={{
              flexShrink: 0,
              padding: '8px 10px', minWidth: 130,
              background: isPlacing ? 'rgba(249,115,22,0.1)' : 'rgba(249,115,22,0.04)',
              border: `1px solid ${isPlacing ? 'rgba(249,115,22,0.5)' : 'rgba(249,115,22,0.2)'}`,
              borderRadius: 8,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: '#f97316', fontWeight: 700, display: 'inline-flex', alignItems: 'center' }}>
                  <GameIcon name="box" size={12} />
                </span>
                <button
                  onClick={() => setBoxes((bs) => bs.filter((b) => b.id !== box.id))}
                  style={{ fontSize: 10, background: 'none', border: 'none', color: '#334155', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                ><GameIcon name="close" size={10} /></button>
              </div>
              <div style={{ fontSize: 10, color: box.row !== null ? '#f97316' : '#334155', marginBottom: 6, display: 'flex', alignItems: 'center' }}>
                {box.row !== null ? `(${box.row}, ${box.col})` : t('editor.not_placed')}
                {box.row !== null && (
                  <button
                    onClick={() => patchBox(box.id, { row: null, col: null })}
                    style={{ marginLeft: 4, fontSize: 9, background: 'none', border: 'none', color: '#334155', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                  ><GameIcon name="close" size={9} /></button>
                )}
              </div>
              <button
                onClick={() => { setActivePlacingBoxId(box.id); setActiveTool('place_box'); }}
                style={{
                  width: '100%', padding: '3px 0', fontSize: 9,
                  background: isPlacing ? 'rgba(249,115,22,0.2)' : 'rgba(249,115,22,0.06)',
                  border: `1px solid ${isPlacing ? 'rgba(249,115,22,0.6)' : 'rgba(249,115,22,0.25)'}`,
                  color: '#f97316', borderRadius: 5, cursor: 'pointer', marginBottom: 6,
                }}
              >
                {isPlacing ? t('editor.box_placing') : t('editor.box_place')}
              </button>

              {/* Requires Power */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', marginBottom: 4 }}>
                <input
                  type="checkbox" checked={box.requiresPower}
                  onChange={(e) => patchBox(box.id, { requiresPower: e.target.checked })}
                  style={{ accentColor: '#fbbf24', width: 11, height: 11 }}
                />
                <span style={{ fontSize: 9, color: box.requiresPower ? '#fbbf24' : '#475569', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <GameIcon name="lightning" size={10} /> {t('editor.box_needs_power')}
                </span>
              </label>

              {/* Durability Setting */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', marginBottom: 4 }}>
                <input
                  type="checkbox" checked={box.durabilityEnabled}
                  onChange={(e) => patchBox(box.id, { durabilityEnabled: e.target.checked })}
                  style={{ accentColor: '#ef4444', width: 11, height: 11 }}
                />
                <span style={{ fontSize: 9, color: box.durabilityEnabled ? '#ef4444' : '#475569', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <GameIcon name="wood" size={10} /> Kırılgan Yap
                </span>
              </label>
              {box.durabilityEnabled && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, marginLeft: 16 }}>
                  <span style={{ fontSize: 9, color: '#64748b' }}>Limit:</span>
                  <input
                    type="number" min={1} max={99} value={box.durability ?? 3}
                    onChange={(e) => {
                      const val = Math.max(1, Math.min(99, parseInt(e.target.value) || 1));
                      patchBox(box.id, { durability: val });
                    }}
                    style={{
                      width: 36, padding: '1px 3px', fontSize: 9,
                      background: '#090d16',
                      border: '1px solid rgba(239,68,68,0.4)',
                      color: '#ef4444', borderRadius: 4, outline: 'none',
                    }}
                  />
                </div>
              )}

              {/* Color Filter Setting */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', marginBottom: 4 }}>
                <input
                  type="checkbox" checked={box.colorFilterEnabled}
                  onChange={(e) => patchBox(box.id, { colorFilterEnabled: e.target.checked })}
                  style={{ accentColor: '#00c4ff', width: 11, height: 11 }}
                />
                <span style={{ fontSize: 9, color: box.colorFilterEnabled ? '#00c4ff' : '#475569', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <GameIcon name="palette" size={10} /> Renk Filtresi
                </span>
              </label>
              {box.colorFilterEnabled && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, marginLeft: 16 }}>
                  <span style={{ fontSize: 9, color: '#64748b' }}>Karakter:</span>
                  <select
                    value={box.colorFilterIndex ?? 0}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      patchBox(box.id, { colorFilterIndex: val });
                    }}
                    style={{
                      background: '#0f172a',
                      border: '1px solid rgba(0,196,255,0.4)',
                      borderRadius: 4,
                      color: '#00c4ff',
                      fontSize: 9,
                      padding: '1px 2px',
                      outline: 'none',
                    }}
                  >
                    <option value={0}>P1 (Emerald)</option>
                    <option value={1}>P2 (Sky)</option>
                    <option value={2}>P3 (Purple)</option>
                    <option value={3}>P4 (Orange)</option>
                    <option value={4}>P5 (Pink)</option>
                    <option value={5}>P6 (Yellow)</option>
                  </select>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
