'use client';

import type { LevelData } from '@/game-engine/level-format';
import { Modal, NBtn } from '../EditorUI';
import { useGeneratorForm } from '../../hooks/useGeneratorForm';
import type { GeneratedCandidate } from '../../hooks/useEditorUiState';
import GeneratorCandidates from './GeneratorCandidates';
import GeneratorGeneralSection from './GeneratorGeneralSection';
import GeneratorRoomsSection from './GeneratorRoomsSection';
import GeneratorPlayersSection from './GeneratorPlayersSection';
import GeneratorCellsSection from './GeneratorCellsSection';
import { GameIcon } from '@/components/icons';

export interface GeneratorModalProps {
  onClose: () => void;
  onGenerate: (
    level: LevelData,
    solution: string[] | null,
    moveCount: number,
    allCandidates?: GeneratedCandidate[],
    selectedIndex?: number
  ) => void;
}

/** Procedural level generator: settings form -> 3 candidates -> apply. */
export default function GeneratorModal({ onClose, onGenerate }: GeneratorModalProps) {
  const g = useGeneratorForm();
  const { generating, candidates, handleGenerateClick } = g;

  return (
    <Modal onClose={generating ? () => {} : onClose}>
      <div style={{ width: 440, maxWidth: '90vw', boxSizing: 'border-box', position: 'relative', display: 'flex', flexDirection: 'column', maxHeight: '85dvh' }}>
        <h3 style={{ margin: '0 0 14px', flexShrink: 0, fontSize: 14, fontWeight: 800, color: '#00c4ff', textShadow: '0 0 8px rgba(0,196,255,0.4)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Procedural Level Generator
        </h3>

        {generating ? (
          <div style={{ height: 350, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <div className="spinner" style={{
              width: 36, height: 36, border: '3px solid rgba(0,196,255,0.1)', borderTop: '3px solid #00c4ff', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }} />
            <span style={{ fontSize: 11, color: '#00c4ff', letterSpacing: '0.06em' }}>GENERATING LEVELS...</span>
            <span style={{ fontSize: 9, color: '#475569' }}>Calibrating physics & searching solution paths</span>
            <style dangerouslySetInnerHTML={{ __html: `
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}} />
          </div>
        ) : candidates ? (
          <GeneratorCandidates g={g} candidates={candidates} onGenerate={onGenerate} />
        ) : (
          <>
            {/* Scrollable contents */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: 6, display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 14 }}>
              <GeneratorGeneralSection g={g} />
              <GeneratorRoomsSection g={g} />
              <GeneratorPlayersSection g={g} />
              <GeneratorCellsSection g={g} />
            </div>

            {/* Sticky Actions Footer */}
            <div style={{ flexShrink: 0, display: 'flex', gap: 8, borderTop: '1px solid rgba(30,58,95,0.3)', paddingTop: 10 }}>
              <NBtn onClick={handleGenerateClick} color="#00c4ff" active style={{ flex: 2, padding: '8px 20px', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <GameIcon name="lightning" size={13} /> GENERATE LEVEL
              </NBtn>
              <NBtn onClick={onClose} style={{ flex: 1, padding: '8px 16px', fontSize: 12 }}>
                CANCEL
              </NBtn>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
