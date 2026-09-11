'use client';

import type { CSSProperties } from 'react';
import type { User } from 'firebase/auth';
import { Modal, NBtn } from '../EditorUI';
import { DIFFICULTY_COLORS } from '../../lib/editorConfig';
import { useT } from '@/contexts/LanguageContext';

export interface SubmitLevelDialogProps {
  onClose: () => void;
  submitNote: string;
  setSubmitNote: (v: string) => void;
  submitError: string;
  submitStatus: string;
  savedRequestId: string | null;
  levelName: string;
  difficulty: 1 | 2 | 3 | 4;
  user: User | null;
  userTag: string | null;
  onSubmit: () => void;
}

const FIELD_LABEL_STYLE: CSSProperties = { fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#334155', display: 'block', marginBottom: 4 };

/** "Submit to community" dialog (new request or update of an existing `levelRequests` doc). */
export default function SubmitLevelDialog({
  onClose, submitNote, setSubmitNote, submitError, submitStatus,
  savedRequestId, levelName, difficulty, user, userTag, onSubmit,
}: SubmitLevelDialogProps) {
  const t = useT();
  return (
    <Modal onClose={onClose}>
      <h3 style={{ margin: '0 0 12px', fontSize: 14, color: '#a78bfa', letterSpacing: '0.06em', textShadow: '0 0 8px rgba(167,139,250,0.5)' }}>
        {savedRequestId ? t('editor.dialog_submit_update') : t('editor.dialog_submit_new')}
      </h3>
      <div style={{ marginBottom: 10 }}>
        <span style={FIELD_LABEL_STYLE}>{t('editor.dialog_level_name')}</span>
        <span style={{ fontSize: 13, color: '#94a3b8' }}>{levelName || t('editor.dialog_unnamed')}</span>
      </div>
      <div style={{ marginBottom: 10 }}>
        <span style={FIELD_LABEL_STYLE}>{t('editor.dialog_creator')}</span>
        <span style={{ fontSize: 13, color: '#a78bfa' }}>
          {userTag ?? user?.displayName ?? user?.email ?? 'Unknown'}
        </span>
      </div>
      <div style={{ marginBottom: 10 }}>
        <span style={FIELD_LABEL_STYLE}>{t('editor.dialog_difficulty')}</span>
        <span style={{ fontSize: 13, color: DIFFICULTY_COLORS[difficulty], fontWeight: 700 }}>
          {t(`difficulty.${difficulty}`)}
        </span>
      </div>
      <div style={{ marginBottom: 14 }}>
        <span style={FIELD_LABEL_STYLE}>{t('editor.dialog_note')}</span>
        <textarea
          value={submitNote} onChange={(e) => setSubmitNote(e.target.value)}
          placeholder={t('editor.dialog_note_placeholder')}
          style={{ width: 320, height: 60, background: '#060d1a', border: '1px solid rgba(30,58,95,0.5)', color: '#94a3b8', fontFamily: 'inherit', fontSize: 12, borderRadius: 6, padding: 8, outline: 'none', resize: 'none', boxSizing: 'border-box' }}
        />
      </div>
      {submitError && <p style={{ fontSize: 11, color: '#ef4444', marginBottom: 8 }}>{submitError}</p>}
      <div style={{ display: 'flex', gap: 8 }}>
        <NBtn onClick={onSubmit} color="#a78bfa" active style={{ padding: '7px 20px', fontSize: 12 }}>
          {submitStatus || (savedRequestId ? t('editor.dialog_update_btn') : t('editor.dialog_submit_btn'))}
        </NBtn>
        <NBtn onClick={onClose} style={{ padding: '7px 16px', fontSize: 12 }}>{t('common.cancel')}</NBtn>
      </div>
      <p style={{ fontSize: 10, color: '#1e3a5f', margin: '10px 0 0', lineHeight: 1.5 }}>
        {savedRequestId ? t('editor.dialog_request_update_note') : t('editor.dialog_submit_note')}
      </p>
    </Modal>
  );
}
