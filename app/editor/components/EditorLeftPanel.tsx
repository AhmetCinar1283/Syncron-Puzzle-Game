'use client';

import { useEditorContext } from '../EditorContext';

interface EditorLeftPanelProps {
  isMobile: boolean;
  visible: boolean;
}

export default function EditorLeftPanel({ isMobile, visible }: EditorLeftPanelProps) {
  const { generatedCandidates, activeCandidateIndex, doGenerateLevel } = useEditorContext();

  const hasCandidates = generatedCandidates.length > 0;

  // On desktop: do not display if there are no candidates
  // On mobile: display if visible (controlled by tabs)
  const displayStyle = isMobile
    ? (visible ? 'flex' : 'none')
    : (hasCandidates ? 'flex' : 'none');

  if (!isMobile && !hasCandidates) return null;

  return (
    <div
      style={{
        width: isMobile ? '100%' : 170,
        flexShrink: 0,
        borderRight: isMobile ? 'none' : '1px solid rgba(30,58,95,0.4)',
        display: displayStyle,
        flexDirection: 'column',
        overflow: 'hidden',
        background: 'rgba(3, 7, 18, 0.4)',
      }}
    >
      <div style={{ flex: 1, paddingBottom: 6 }}>
        <div style={{ padding: '10px 12px 6px' }}>
          <span
            style={{
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#00c4ff',
              textShadow: '0 0 6px rgba(0,196,255,0.3)',
            }}
          >
            Alternatif Seviyeler
          </span>
        </div>
        <div style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {generatedCandidates.map((cand, idx) => {
            const active = activeCandidateIndex === idx;
            return (
              <button
                key={idx}
                onClick={() => doGenerateLevel(cand.level, cand.solution, cand.moveCount, undefined, idx)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
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
      </div>
    </div>
  );
}
