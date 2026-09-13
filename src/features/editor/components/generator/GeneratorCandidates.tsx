'use client';

import { NBtn } from '../EditorUI';
import GeneratorMiniPreview from './GeneratorMiniPreview';
import type { GeneratorFormApi } from '../../hooks/useGeneratorForm';
import type { GeneratedCandidate } from '../../hooks/useEditorUiState';
import type { LevelData } from '@/game-engine/level-format';
import { GameIcon } from '@/components/icons';

interface GeneratorCandidatesProps {
  g: GeneratorFormApi;
  candidates: GeneratedCandidate[];
  onGenerate: (
    level: LevelData,
    solution: string[] | null,
    moveCount: number,
    allCandidates?: GeneratedCandidate[],
    selectedIndex?: number
  ) => void;
}

/** Step 2 of the generator: pick one of the 3 generated candidates. */
export default function GeneratorCandidates({ g, candidates, onGenerate }: GeneratorCandidatesProps) {
  const { selectedCandidateIndex, setSelectedCandidateIndex, handleGenerateClick, setCandidates } = g;
  return (
    <>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 14 }}>
        <span style={{ fontSize: 11, color: '#94a3b8', textAlign: 'center' }}>
          We have generated 3 different level candidates. Please select one to apply:
        </span>
        <div style={{ display: 'flex', gap: 10, padding: '10px 0', overflowX: 'auto', justifyContent: 'center' }}>
          {candidates.map((cand, idx) => {
            const active = selectedCandidateIndex === idx;
            return (
              <div
                key={idx}
                onClick={() => setSelectedCandidateIndex(idx)}
                style={{
                  flex: '0 0 130px',
                  border: `2px solid ${active ? '#00c4ff' : 'rgba(30,58,95,0.4)'}`,
                  borderRadius: 10,
                  padding: 10,
                  background: active ? 'rgba(0,196,255,0.08)' : 'rgba(6,13,26,0.5)',
                  boxShadow: active ? '0 0 15px rgba(0,196,255,0.2)' : 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  transition: 'all 0.2s',
                  alignItems: 'center'
                }}
              >
                <span style={{ fontSize: 10, fontWeight: 'bold', color: active ? '#00c4ff' : '#64748b' }}>
                  Option {idx + 1}
                </span>
                <GeneratorMiniPreview level={cand.level} />
                <span style={{ fontSize: 9, color: '#94a3b8' }}>
                  Moves: <strong style={{ color: '#00ff88' }}>{cand.moveCount}</strong>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sticky Actions Footer */}
      <div style={{ flexShrink: 0, display: 'flex', gap: 8, borderTop: '1px solid rgba(30,58,95,0.3)', paddingTop: 10 }}>
        <NBtn
          onClick={() => {
            if (selectedCandidateIndex !== null && candidates[selectedCandidateIndex]) {
              const sel = candidates[selectedCandidateIndex];
              onGenerate(sel.level, sel.solution, sel.moveCount, candidates, selectedCandidateIndex);
            }
          }}
          color="#00c4ff"
          active
          style={{ flex: 2, padding: '8px 20px', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <GameIcon name="check" size={14} /> APPLY SELECTED
        </NBtn>
        <NBtn onClick={handleGenerateClick} style={{ flex: 1, padding: '8px 10px', fontSize: 11, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <GameIcon name="repeat" size={12} /> REGENERATE
        </NBtn>
        <NBtn onClick={() => setCandidates(null)} style={{ flex: 1, padding: '8px 10px', fontSize: 11, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <GameIcon name="arrow-left" size={12} /> BACK
        </NBtn>
      </div>
    </>
  );
}
