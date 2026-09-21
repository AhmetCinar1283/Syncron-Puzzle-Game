'use client';

import { STATUS_LABELS, STATUS_COLORS } from '@/services/firebase';
import { useTicketDetailPage } from './hooks/useTicketDetailPage';
import { ConversationFeed } from './components/ConversationFeed';
import { ReplyForm } from './components/ReplyForm';
import { TicketOperationsPanel } from './components/TicketOperationsPanel';
import { AdminNotePanel } from './components/AdminNotePanel';
import { UserInfoPanel } from './components/UserInfoPanel';

export default function TicketDetailPage() {
  const {
    t,
    isTr,
    router,
    loading,
    ticket,
    messages,
    ticketLoading,
    replyBody,
    setReplyBody,
    replying,
    internalNoteLocal,
    setInternalNoteLocal,
    savingNote,
    noteSavedToast,
    errorMsg,
    messagesEndRef,
    handleSendReply,
    handleStatusChange,
    handlePriorityChange,
    handleSaveInternalNote,
  } = useTicketDetailPage();

  if (loading || ticketLoading || !ticket) {
    return (
      <main style={{ position: 'relative', zIndex: 1, minHeight: '100dvh', background: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#fbbf24', fontSize: 12, letterSpacing: '0.1em' }}>LOADING PANEL...</span>
      </main>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        zIndex: 1,
        minHeight: '100dvh',
        background: '#030712',
        color: '#e2e8f0',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Bar */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          background: 'rgba(3, 7, 18, 0.97)',
          borderBottom: '1px solid rgba(251, 191, 36, 0.15)',
          zIndex: 10,
        }}
      >
        <button
          onClick={() => router.push('/admin/support')}
          style={{
            background: 'none',
            border: 'none',
            color: '#475569',
            fontSize: '12px',
            cursor: 'pointer',
            letterSpacing: '0.06em',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#fbbf24')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
        >
          ← {isTr ? 'Taleplere Dön' : 'Back to Tickets'}
        </button>

        <h1
          style={{
            margin: 0,
            fontSize: '13px',
            fontWeight: 800,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#fbbf24',
          }}
        >
          {isTr ? 'BİLET ÇALIŞMA ALANI' : 'TICKET WORKSPACE'}
        </h1>

        <span style={{ fontSize: '11px', color: '#475569' }}>
          ID: #{ticket.id.slice(0, 10)}
        </span>
      </div>

      {/* Main Workspace Grid (Two-Column Layout) */}
      <div
        style={{
          flex: 1,
          maxWidth: '1200px',
          width: '100%',
          margin: '0 auto',
          padding: '20px 16px',
          boxSizing: 'border-box',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 300px',
          gap: '20px',
          height: 'calc(100dvh - 60px)',
          alignItems: 'stretch',
        }}
      >
        {/* Left Column: Live Chat Conversation & Reply */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
          {/* Ticket Header Brief */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.01)',
              border: '1px solid rgba(251, 191, 36, 0.12)',
              borderRadius: '10px',
              padding: '16px 20px',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                {ticket.subject}
              </h2>
              <span
                style={{
                  fontSize: '10px',
                  color: STATUS_COLORS[ticket.status],
                  background: `${STATUS_COLORS[ticket.status]}0d`,
                  border: `1px solid ${STATUS_COLORS[ticket.status]}35`,
                  borderRadius: '5px',
                  padding: '2px 8px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                {STATUS_LABELS[ticket.status][isTr ? 'tr' : 'en']}
              </span>
            </div>
          </div>

          <ConversationFeed
            messages={messages}
            ticket={ticket}
            isTr={isTr}
            messagesEndRef={messagesEndRef}
          />

          <ReplyForm
            t={t}
            replyBody={replyBody}
            setReplyBody={setReplyBody}
            replying={replying}
            errorMsg={errorMsg}
            onSubmit={handleSendReply}
          />
        </div>

        {/* Right Column: Admin Operations & User Details Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
          <TicketOperationsPanel
            t={t}
            isTr={isTr}
            ticket={ticket}
            onStatusChange={handleStatusChange}
            onPriorityChange={handlePriorityChange}
          />

          <AdminNotePanel
            t={t}
            internalNoteLocal={internalNoteLocal}
            setInternalNoteLocal={setInternalNoteLocal}
            savingNote={savingNote}
            noteSavedToast={noteSavedToast}
            onSave={handleSaveInternalNote}
          />

          <UserInfoPanel t={t} isTr={isTr} ticket={ticket} />
        </div>
      </div>
    </div>
  );
}
