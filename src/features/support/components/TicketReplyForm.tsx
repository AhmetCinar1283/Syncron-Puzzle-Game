'use client';

import { GameIcon } from '@/components/icons';
import { TICKET_REPLY_MAX, type SupportTicket } from '@/services/firebase';

export function TicketReplyForm({
  t,
  ticket,
  replyBody,
  setReplyBody,
  sending,
  errorMsg,
  onSubmit,
}: {
  t: (key: string) => string;
  ticket: SupportTicket;
  replyBody: string;
  setReplyBody: (v: string) => void;
  sending: boolean;
  errorMsg: string;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const isClosed = ticket.status === 'resolved' || ticket.status === 'closed';

  if (isClosed) {
    return (
      <div
        style={{
          background: ticket.status === 'resolved' ? 'rgba(0, 255, 136, 0.06)' : 'rgba(236, 72, 153, 0.06)',
          border: ticket.status === 'resolved' ? '1px solid rgba(0, 255, 136, 0.3)' : '1px solid rgba(236, 72, 153, 0.3)',
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center',
          fontSize: '13px',
          color: ticket.status === 'resolved' ? '#00ff88' : '#ec4899',
          lineHeight: 1.5,
          flexShrink: 0
        }}
      >
        {ticket.status === 'resolved' ? t('support.resolved_banner') : t('support.closed_banner')}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
      {errorMsg && (
        <div style={{ fontSize: '11px', color: '#ec4899', padding: '0 4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
          disabled={sending}
          rows={1}
          style={{
            flex: 1,
            background: '#060d1a',
            border: '1px solid rgba(0, 196, 255, 0.3)',
            color: '#e2e8f0',
            borderRadius: '10px',
            padding: '12px 16px',
            fontSize: '14px',
            outline: 'none',
            resize: 'none',
            minHeight: '44px',
            maxHeight: '120px',
            lineHeight: '1.4',
            boxSizing: 'border-box',
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#00c4ff';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'rgba(0, 196, 255, 0.3)';
          }}
          onKeyDown={(e) => {
            // Send on Enter (unless shift is held)
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSubmit(e);
            }
          }}
        />

        <button
          type="submit"
          disabled={sending || !replyBody.trim()}
          style={{
            background: 'rgba(0, 196, 255, 0.08)',
            border: '1px solid rgba(0, 196, 255, 0.6)',
            color: '#00c4ff',
            height: '44px',
            padding: '0 24px',
            fontSize: '13px',
            fontWeight: 700,
            borderRadius: '10px',
            cursor: (sending || !replyBody.trim()) ? 'not-allowed' : 'pointer',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            transition: 'all 0.2s',
            opacity: (sending || !replyBody.trim()) ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 10px rgba(0, 196, 255, 0.05)',
            flexShrink: 0
          }}
          onMouseEnter={(e) => {
            if (sending || !replyBody.trim()) return;
            e.currentTarget.style.background = 'rgba(0, 196, 255, 0.18)';
            e.currentTarget.style.boxShadow = '0 0 25px rgba(0, 196, 255, 0.25)';
          }}
          onMouseLeave={(e) => {
            if (sending || !replyBody.trim()) return;
            e.currentTarget.style.background = 'rgba(0, 196, 255, 0.08)';
            e.currentTarget.style.boxShadow = '0 0 10px rgba(0, 196, 255, 0.05)';
          }}
        >
          {sending ? '...' : t('support.reply_send')}
        </button>
      </div>
    </form>
  );
}
