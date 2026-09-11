'use client';

import { NBtn } from './EditorUI';
import { useEditorContext } from '../EditorContext';
import { useT } from '@/contexts/LanguageContext';
import type { EditorMobileTab } from '../hooks/useEditorLayout';

export function EditorTopBar({ editId, isMobile }: { editId: number | null; isMobile: boolean }) {
  const t = useT();
  const s = useEditorContext();
  return (
    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 20px', background: 'rgba(3,7,18,0.97)', borderBottom: '1px solid rgba(0,196,255,0.15)' }}>
      <button onClick={() => s.router.push('/')} style={{ background: 'none', border: 'none', color: '#334155', fontSize: 12, cursor: 'pointer', letterSpacing: '0.06em' }}>{t('common.back_menu')}</button>
      <h1 style={{ margin: 0, fontSize: 13, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#00c4ff', textShadow: '0 0 10px rgba(0,196,255,0.5)' }}>
        {t('editor.title')} {editId !== null ? <span style={{ color: '#1e3a5f', fontWeight: 400 }}>{t('editor.editing', { id: editId })}</span> : t('editor.new')}
      </h1>
      <div style={{ display: 'flex', gap: 8 }}>
        <NBtn onClick={() => s.setLevelsDialogOpen(true)} color="#00c4ff" active style={{ padding: '5px 16px' }}>
          📂 {isMobile ? 'Bölümler' : t('editor.saved_levels')}
        </NBtn>
        {!s.isAnonymous && !s.isModerator && (
          <>
            <NBtn onClick={s.handleSaveClick} color="#a78bfa" active style={{ padding: '5px 16px' }}>
              {s.saveSuccess || (editId !== null ? t('editor.update') : t('editor.save'))}
            </NBtn>
            <NBtn onClick={s.handleSaveAndSubmit} color="#00ff88" style={{ padding: '5px 14px', fontSize: 11 }}>
              {editId !== null ? t('editor.update_submit') : t('editor.save_submit')}
            </NBtn>
          </>
        )}
        {(s.isAnonymous || s.isModerator) && (
          <NBtn onClick={s.handleSaveClick} color="#00ff88" active style={{ padding: '5px 16px' }}>
            {s.saveSuccess || (editId !== null ? t('editor.update') : t('editor.save'))}
          </NBtn>
        )}
      </div>
    </div>
  );
}

export function EditorMobileTabs({ tabs, activeTab, setActiveTab }: {
  tabs: readonly EditorMobileTab[];
  activeTab: EditorMobileTab;
  setActiveTab: (tab: EditorMobileTab) => void;
}) {
  const t = useT();
  return (
    <div style={{ flexShrink: 0, display: 'flex', borderBottom: '1px solid rgba(30,58,95,0.4)', background: 'rgba(3,7,18,0.97)' }}>
      {tabs.map((tab) => (
        <button
          key={tab} onClick={() => setActiveTab(tab)}
          style={{ flex: 1, padding: '8px 4px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === tab ? '#00c4ff' : 'transparent'}`, color: activeTab === tab ? '#00c4ff' : '#334155', cursor: 'pointer', transition: 'all 0.15s' }}
        >
          {tab === 'grid'
            ? t('editor.tab_grid')
            : tab === 'settings'
            ? t('editor.tab_settings')
            : '✨ ' + (t('editor.alternatives') || 'Seçenekler')}
        </button>
      ))}
    </div>
  );
}
