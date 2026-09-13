import type { RefObject } from 'react';
import { GameIcon } from '@/components/icons';
import type { SupportTicket, TicketMessage } from '@/services/firebase';

export function ConversationFeed({
  messages,
  ticket,
  isTr,
  messagesEndRef,
}: {
  messages: TicketMessage[];
  ticket: SupportTicket;
  isTr: boolean;
  messagesEndRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      style={{
        flex: 1,
        background: 'rgba(10, 15, 26, 0.4)',
        border: '1px solid rgba(251, 191, 36, 0.08)',
        borderRadius: '10px',
        padding: '20px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {messages.map((msg) => {
        const isAdminSender = msg.senderType === 'admin';
        const msgTime = new Date(msg.createdAt).toLocaleTimeString(isTr ? 'tr-TR' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit'
        });
        const msgDate = new Date(msg.createdAt).toLocaleDateString(isTr ? 'tr-TR' : 'en-US');

        return (
          <div
            key={msg.id}
            style={{
              alignSelf: isAdminSender ? 'flex-start' : 'flex-end',
              maxWidth: '75%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: isAdminSender ? 'flex-start' : 'flex-end',
              gap: '4px',
            }}
          >
            <div
              style={{
                background: isAdminSender
                  ? 'rgba(0, 255, 136, 0.05)'
                  : 'rgba(0, 196, 255, 0.05)',
                border: isAdminSender
                  ? '1px solid rgba(0, 255, 136, 0.3)'
                  : '1px solid rgba(0, 196, 255, 0.3)',
                color: '#e2e8f0',
                borderRadius: isAdminSender
                  ? '12px 12px 12px 2px'
                  : '12px 12px 2px 12px',
                padding: '12px 16px',
                fontSize: '14px',
                lineHeight: 1.5,
                wordBreak: 'break-word',
                userSelect: 'text',
              }}
            >
              {!isAdminSender && (
                <div style={{ fontSize: '9px', fontWeight: 800, color: '#00c4ff', letterSpacing: '0.08em', marginBottom: '4px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <GameIcon name="user" size={10} color="#00c4ff" />
                  <span>{ticket.displayName} ({isTr ? 'Kullanıcı' : 'User'})</span>
                </div>
              )}
              {msg.body}
            </div>
            <span style={{ fontSize: '9px', color: '#475569' }}>
              {msgDate} {msgTime}
            </span>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}
