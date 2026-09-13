'use client';

import { useState } from 'react';
import { Modal, NBtn, Lbl, iStyle } from '../EditorUI';
import { useAiConfig } from '../../hooks/useAiConfig';
import { useAiPromptGenerator } from '../../hooks/useAiPromptGenerator';
import { useAiCurriculumEditor } from '../../hooks/useAiCurriculumEditor';
import { useAiTemplateEditor } from '../../hooks/useAiTemplateEditor';
import { GameIcon } from '@/components/icons';
import { IconName } from '@/components/icons/types';
import AiGeneratorTab from './AiGeneratorTab';
import AiCurriculumTab from './AiCurriculumTab';
import AiTemplatesTab from './AiTemplatesTab';

interface AiAssistantDialogProps {
  open: boolean;
  onClose: () => void;
}

type AiTab = 'generator' | 'curriculum' | 'templates' | 'rules';

/** Tab header definitions (display order, accent color, active background). */
const TABS: { id: AiTab; label: string; icon: IconName; color: string; activeBg: string }[] = [
  { id: 'generator', label: 'Prompt Generator', icon: 'robot', color: '#00c4ff', activeBg: 'rgba(0,196,255,0.08)' },
  { id: 'curriculum', label: 'Müfredat Düzenleyici', icon: 'book', color: '#00ff88', activeBg: 'rgba(0,255,136,0.08)' },
  { id: 'templates', label: 'Şablonlar', icon: 'template', color: '#a78bfa', activeBg: 'rgba(167,139,250,0.08)' },
  { id: 'rules', label: 'Oyun Kuralları (Referans)', icon: 'settings', color: '#fbbf24', activeBg: 'rgba(251,191,36,0.08)' },
];

/**
 * AI puzzle-design lab. All tab state lives here (via the four hooks, called in
 * the pre-split declaration order so effect order is unchanged) so switching
 * tabs keeps unsaved edits; the tab bodies are presentational.
 */
export default function AiAssistantDialog({ open, onClose }: AiAssistantDialogProps) {
  // Navigation states
  const [activeTab, setActiveTab] = useState<AiTab>('generator');
  const [isFullScreen, setIsFullScreen] = useState(false);

  const config = useAiConfig(open);
  const generator = useAiPromptGenerator(open, onClose, config);
  const curriculumEditor = useAiCurriculumEditor(config);
  const templateEditor = useAiTemplateEditor(config);
  const { gameRules, setGameRules, handleSaveRules, handleResetRulesDefault } = config;

  return (
    <Modal onClose={onClose}>
      <div style={{
        width: isFullScreen ? '97vw' : 920,
        height: isFullScreen ? '93vh' : '82vh',
        maxHeight: '93vh',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        transition: 'all 0.25s ease-in-out'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,196,255,0.15)', paddingBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h3 style={{ margin: 0, fontSize: 15, color: '#00c4ff', textShadow: '0 0 8px rgba(0,196,255,0.4)', letterSpacing: '0.06em', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
              <GameIcon name="robot" size={18} /> AI BULMACA TASARIM LABİLESİ
            </h3>
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              style={{
                background: 'rgba(0,196,255,0.06)',
                border: '1px solid rgba(0,196,255,0.25)',
                borderRadius: 4, color: '#00c4ff', fontSize: 10, padding: '2px 8px', cursor: 'pointer', fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 4
              }}
            >
              <GameIcon name={isFullScreen ? 'minimize' : 'fullscreen'} size={12} />
              {isFullScreen ? 'Küçük Ekran' : 'Tam Ekran'}
            </button>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GameIcon name="close" size={14} />
          </button>
        </div>

        {/* Tab Headers */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(30,58,95,0.3)', paddingBottom: 2, gap: 4 }}>
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: '6px 12px', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', background: active ? tab.activeBg : 'transparent', border: 'none', borderBottom: `2px solid ${active ? tab.color : 'transparent'}`, color: active ? tab.color : '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <GameIcon name={tab.icon} size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

          {/* TAB 1: GENERATOR */}
          {activeTab === 'generator' && <AiGeneratorTab g={generator} />}

          {/* TAB 2: CURRICULUM EDITOR */}
          {activeTab === 'curriculum' && <AiCurriculumTab c={curriculumEditor} />}

          {/* TAB 3: TEMPLATES */}
          {activeTab === 'templates' && <AiTemplatesTab t={templateEditor} />}

          {/* TAB 4: RULES EDITOR */}
          {activeTab === 'rules' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, color: '#fbbf24', fontSize: 13 }}>
                  Sistem Yönergeleri &amp; Oyun Fiziği Referans Kılavuzu
                </h4>
                <div style={{ display: 'flex', gap: 8 }}>
                  <NBtn onClick={handleResetRulesDefault} style={{ padding: '5px 12px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <GameIcon name="repeat" size={12} /> Varsayılana Dön
                  </NBtn>
                  <NBtn onClick={handleSaveRules} color="#fbbf24" active style={{ padding: '5px 16px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <GameIcon name="save" size={12} /> Kuralları Kaydet
                  </NBtn>
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Lbl>Yapay zekaya oyunun çalışma kurallarını ve JSON format şemasını aktaran metin:</Lbl>
                <textarea value={gameRules} onChange={(e) => setGameRules(e.target.value)} style={{ ...iStyle, flex: 1, fontFamily: 'monospace', fontSize: 10, background: '#02050c', resize: 'none' }} />
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(30,58,95,0.3)', paddingTop: 8 }}>
          <NBtn onClick={onClose} style={{ padding: '5px 20px', fontSize: 12 }}>Kapat</NBtn>
        </div>
      </div>
    </Modal>
  );
}
