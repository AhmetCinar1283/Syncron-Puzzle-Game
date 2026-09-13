import type { T } from '@/contexts/LanguageContext';
import { GameIcon } from '@/components/icons';
import { TICKET_REPLY_MAX } from '@/services/firebase';

export function ReplyForm({
  t,
  replyBody,
  setReplyBody,
  replying,
  errorMsg,
  onSubmit,
}: {
  t: T;
  replyBody: string;
  setReplyBody: (v: string) => void;
  replying: boolean;
  errorMsg: string;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
      {errorMsg && (
        <div style={{ fontSize: '11px', color: '#ec4899', padding: '0 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
          <GameIcon name="close" size={11} color="#ec4899" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
        <textarea
          value={replyBody}
          onChange={(e) => setReplyBody(e.target.value)}
          placeholder={t('support.reply_placeholder')}
          maxLength={TICKET_REPLY_MAX}
          disabled={replying}
          rows={2}
          style={{
            flex: 1,
            background: '#060d1a',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            color: '#e2e8f0',
            borderRadius: '10px',
            padding: '12px 16px',
            fontSize: '14px',
            outline: 'none',
            resize: 'none',
            minHeight: '52px',
            maxHeight: '120px',
            lineHeight: '1.4',
            boxSizing: 'border-box',
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#fbbf24';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(251, 191, 36, 0.3)';
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSubmit(e);
            }
          }}
        />

        <button
          type="submit"
          disabled={replying || !replyBody.trim()}
          style={{
            background: 'rgba(251, 191, 36, 0.08)',
            border: '1px solid rgba(251, 191, 36, 0.6)',
            color: '#fbbf24',
            height: '52px',
            padding: '0 24px',
            fontSize: '13px',
            fontWeight: 700,
            borderRadius: '10px',
            cursor: (replying || !replyBody.trim()) ? 'not-allowed' : 'pointer',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            transition: 'all 0.2s',
            opacity: (replying || !replyBody.trim()) ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 10px rgba(251, 191, 36, 0.05)',
            flexShrink: 0
          }}
          onMouseEnter={(e) => {
            if (replying || !replyBody.trim()) return;
            e.currentTarget.style.background = 'rgba(251, 191, 36, 0.18)';
            e.currentTarget.style.boxShadow = '0 0 20px rgba(251, 191, 36, 0.2)';
          }}
          onMouseLeave={(e) => {
            if (replying || !replyBody.trim()) return;
            e.currentTarget.style.background = 'rgba(251, 191, 36, 0.08)';
            e.currentTarget.style.boxShadow = '0 0 10px rgba(251, 191, 36, 0.05)';
          }}
        >
          {replying ? '...' : t('support.reply_send')}
        </button>
      </div>
    </form>
  );
}
