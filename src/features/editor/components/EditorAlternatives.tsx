'use client';

import { useEditorContext } from '../EditorContext';
import { Sec } from './EditorUI';

/**
 * Üreteçten çıkan alternatif seviyeler. Eskiden ayrı bir sol sütun ve ayrı bir
 * mobil sekmeydi; artık ayarlar panelinin bir bölümü — böylece editörde tek bir
 * "ayarlar" yüzeyi kalıyor ve sütun sayısı azalıyor.
 */
export default function EditorAlternatives() {
  const { generatedCandidates, activeCandidateIndex, doGenerateLevel } = useEditorContext();

  if (generatedCandidates.length === 0) return null;

  return (
    <Sec title="Alternatif Seviyeler">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 5 }}>
        {generatedCandidates.map((cand, idx) => {
          const active = activeCandidateIndex === idx;
          return (
            <button
              key={idx}
              onClick={() => doGenerateLevel(cand.level, cand.solution, cand.moveCount, undefined, idx)}
              style={{
                padding: '8px 9px',
                minHeight: 44,
                textAlign: 'left',
                background: active ? 'rgba(0,196,255,0.1)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${active ? '#00c4ff' : 'rgba(255,255,255,0.06)'}`,
                color: active ? '#00c4ff' : '#64748b',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 11,
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontWeight: 'bold' }}>Seçenek {idx + 1}</span>
              <span style={{ fontSize: 9, color: active ? '#00ff88' : '#1e3a5f', display: 'block', marginTop: 1 }}>
                Hamle: {cand.moveCount}
              </span>
            </button>
          );
        })}
      </div>
    </Sec>
  );
}
