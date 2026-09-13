'use client';

import { motion } from 'framer-motion';
import type { RefObject } from 'react';
import { GameIcon } from '@/components/icons';
import type { TicketMessage } from '@/services/firebase';

export function TicketMessageFeed({
  messages,
  isTr,
  messagesEndRef,
}: {
  messages: TicketMessage[];
  isTr: boolean;
  messagesEndRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      style={{
        flex: 1,
        background: 'rgba(10, 15, 26, 0.4)',
        border: '1px solid rgba(0, 196, 255, 0.08)',
        borderRadius: '12px',
        padding: '20px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      {messages.map((msg) => {
        const isAdminSender = msg.senderType === 'admin';
        const msgDate = new Date(msg.createdAt).toLocaleTimeString(isTr ? 'tr-TR' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit'
        });

        return (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, x: isAdminSender ? -15 : 15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              alignSelf: isAdminSender ? 'flex-start' : 'flex-end',
              maxWidth: '75%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: isAdminSender ? 'flex-start' : 'flex-end',
              gap: '4px',
            }}
          >
            {/* Bubble */}
            <div
              style={{
                background: isAdminSender
                  ? 'rgba(0, 255, 136, 0.05)'
                  : 'rgba(0, 196, 255, 0.05)',
                border: isAdminSender
                  ? '1px solid rgba(0, 255, 136, 0.3)'
                  : '1px solid rgba(0, 196, 255, 0.3)',
                boxShadow: isAdminSender
                  ? '0 0 10px rgba(0, 255, 136, 0.05)'
                  : '0 0 10px rgba(0, 196, 255, 0.05)',
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
              {isAdminSender && (
                <div style={{ fontSize: '9px', fontWeight: 800, color: '#00ff88', letterSpacing: '0.08em', marginBottom: '4px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <GameIcon name="sparkles" size={10} color="#00ff88" />
                  <span>Admin ({msg.senderName})</span>
                </div>
              )}
              {msg.body}
            </div>

            {/* Time badge */}
            <span style={{ fontSize: '9px', color: '#4b5563' }}>
              {msgDate}
            </span>
          </motion.div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}
