import type { T } from '@/contexts/LanguageContext';

export function AdminNotePanel({
  t,
  internalNoteLocal,
  setInternalNoteLocal,
  savingNote,
  noteSavedToast,
  onSave,
}: {
  t: T;
  internalNoteLocal: string;
  setInternalNoteLocal: (v: string) => void;
  savingNote: boolean;
  noteSavedToast: boolean;
  onSave: () => void;
}) {
  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.01)',
        border: '1px solid rgba(251, 191, 36, 0.12)',
        borderRadius: '10px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <h3 style={{ fontSize: '12px', fontWeight: 800, color: '#fbbf24', letterSpacing: '0.08em', margin: 0, borderBottom: '1px solid rgba(251, 191, 36, 0.12)', paddingBottom: '10px' }}>
        {t('support.admin_note')}
      </h3>

      <textarea
        value={internalNoteLocal}
        onChange={(e) => setInternalNoteLocal(e.target.value)}
        placeholder={t('support.admin_note_placeholder')}
        rows={4}
        style={{
          background: '#060d1a',
          border: '1px solid rgba(251, 191, 36, 0.2)',
          color: '#e2e8f0',
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '13px',
          outline: 'none',
          resize: 'vertical',
          width: '100%',
          boxSizing: 'border-box',
          fontFamily: 'inherit',
          minHeight: '80px',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = '#fbbf24';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'rgba(251, 191, 36, 0.2)';
        }}
      />

      <button
        onClick={onSave}
        disabled={savingNote}
        style={{
          background: 'rgba(251, 191, 36, 0.05)',
          border: '1px solid rgba(251, 191, 36, 0.4)',
          color: '#fbbf24',
          padding: '8px 0',
          fontSize: '12px',
          fontWeight: 700,
          borderRadius: '6px',
          cursor: savingNote ? 'not-allowed' : 'pointer',
          textTransform: 'uppercase',
          transition: 'all 0.2s',
          opacity: savingNote ? 0.6 : 1,
        }}
        onMouseEnter={(e) => {
          if (savingNote) return;
          e.currentTarget.style.background = 'rgba(251, 191, 36, 0.12)';
        }}
        onMouseLeave={(e) => {
          if (savingNote) return;
          e.currentTarget.style.background = 'rgba(251, 191, 36, 0.05)';
        }}
      >
        {savingNote ? '...' : t('support.admin_note_save')}
      </button>

      {noteSavedToast && (
        <span style={{ fontSize: '11px', color: '#00ff88', textAlign: 'center', display: 'block', marginTop: '4px' }}>
          ✓ {t('support.note_updated')}
        </span>
      )}
    </div>
  );
}
