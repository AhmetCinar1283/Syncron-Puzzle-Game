'use client';

import type { StoredLevel } from '@/services/db';
import { Modal, NBtn, iStyle } from '../EditorUI';
import { useT } from '@/contexts/LanguageContext';

export interface SaveLevelDialogProps {
  onClose: () => void;
  savePosition: string;
  setSavePosition: (v: string) => void;
  savedLevels: (StoredLevel & { id: number })[];
  onSave: (pos?: string) => void;
}

/** "Save level" dialog: pick the list position for the local (Dexie) save. */
export default function SaveLevelDialog({ onClose, savePosition, setSavePosition, savedLevels, onSave }: SaveLevelDialogProps) {
  const t = useT();
  return (
    <Modal onClose={onClose}>
      <h3 style={{ margin: '0 0 12px', fontSize: 14, color: '#00ff88', textShadow: '0 0 8px rgba(0,255,136,0.5)', letterSpacing: '0.06em' }}>{t('editor.dialog_save_title')}</h3>
      <p style={{ fontSize: 12, color: '#475569', margin: '0 0 14px' }}>{t('editor.dialog_save_instruction')}</p>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
        <input
          type="number" min={1} placeholder={t('editor.dialog_save_last', { n: savedLevels.length + 1 })}
          value={savePosition} onChange={(e) => setSavePosition(e.target.value)}
          style={{ ...iStyle, width: 90 }}
          autoFocus
        />
        <span style={{ fontSize: 11, color: '#334155' }}>{t('editor.dialog_save_of', { n: savedLevels.length + 1 })}</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <NBtn onClick={() => onSave(savePosition)} color="#00ff88" style={{ padding: '7px 20px', fontSize: 12 }}>{t('editor.dialog_save_btn')}</NBtn>
        <NBtn onClick={onClose} style={{ padding: '7px 16px', fontSize: 12 }}>{t('common.cancel')}</NBtn>
      </div>
    </Modal>
  );
}
