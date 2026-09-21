'use client';

import { Suspense } from 'react';
import { GameIcon } from '@/components/icons';
import { useTicketDetail } from '../hooks/useTicketDetail';
import { TicketHeaderCard } from './TicketHeaderCard';
import { TicketMessageFeed } from './TicketMessageFeed';
import { TicketReplyForm } from './TicketReplyForm';

function TicketDetailContent() {
  const {
    t,
    isTr,
    router,
    ticket,
    messages,
    loading,
    ticketLoading,
    replyBody,
    setReplyBody,
    sending,
    errorMsg,
    messagesEndRef,
    handleSendReply,
  } = useTicketDetail();

  if (loading || ticketLoading || !ticket) {
    return (
      <main style={{ position: 'relative', zIndex: 1, minHeight: '100dvh', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#00c4ff', fontSize: 12, letterSpacing: '0.1em' }}>{t('common.loading')}</span>
      </main>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        zIndex: 1,
        minHeight: '100dvh',
        background: 'transparent',
        color: '#f3f4f6',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '30px 16px',
        overflowX: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Background Glow */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(0, 196, 255, 0.04) 0%, transparent 70%)',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          width: '100%',
          maxWidth: '700px',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100dvh - 60px)',
          gap: '16px',
        }}
      >
        {/* Navigation row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <button
            onClick={() => router.push('/support/my-tickets')}
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#9ca3af',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#00c4ff';
              e.currentTarget.style.border = '1px solid rgba(0, 196, 255, 0.4)';
              e.currentTarget.style.background = 'rgba(0, 196, 255, 0.03)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#9ca3af';
              e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <GameIcon name="arrow-left" size={13} color="currentColor" />
              {t('support.my_tickets')}
            </span>
          </button>

          <span style={{ fontSize: '11px', color: '#4b5563', letterSpacing: '0.05em' }}>
            {t('support.ticket_id')}: #{ticket.id.slice(0, 8)}
          </span>
        </div>

        <TicketHeaderCard ticket={ticket} isTr={isTr} />

        <TicketMessageFeed messages={messages} isTr={isTr} messagesEndRef={messagesEndRef} />

        <TicketReplyForm
          t={t}
          ticket={ticket}
          replyBody={replyBody}
          setReplyBody={setReplyBody}
          sending={sending}
          errorMsg={errorMsg}
          onSubmit={handleSendReply}
        />
      </div>
    </div>
  );
}

export function TicketDetailPage() {
  return (
    <Suspense fallback={
      <main style={{ minHeight: '100dvh', background: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#00c4ff', fontSize: 12, letterSpacing: '0.1em' }}>LOADING TICKET...</span>
      </main>
    }>
      <TicketDetailContent />
    </Suspense>
  );
}
