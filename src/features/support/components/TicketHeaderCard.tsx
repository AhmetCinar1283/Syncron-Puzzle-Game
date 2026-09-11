'use client';

import { CATEGORY_LABELS, STATUS_LABELS, STATUS_COLORS, type SupportTicket } from '@/services/firebase';

export function TicketHeaderCard({ ticket, isTr }: { ticket: SupportTicket; isTr: boolean }) {
  return (
    <div
      style={{
        background: 'rgba(10, 15, 26, 0.65)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(0, 196, 255, 0.15)',
        borderRadius: '12px',
        padding: '16px 20px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#f3f4f6', margin: 0 }}>
          {ticket.subject}
        </h2>
        <span
          style={{
            fontSize: '11px',
            color: STATUS_COLORS[ticket.status],
            background: `${STATUS_COLORS[ticket.status]}0d`,
            border: `1px solid ${STATUS_COLORS[ticket.status]}35`,
            borderRadius: '6px',
            padding: '3px 8px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.04em'
          }}
        >
          {STATUS_LABELS[ticket.status][isTr ? 'tr' : 'en']}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: '#6b7280' }}>
        <span>
          {isTr ? 'Kategori' : 'Category'}:{' '}
          <strong style={{ color: '#94a3b8' }}>
            {CATEGORY_LABELS[ticket.category][isTr ? 'tr' : 'en']}
          </strong>
        </span>
        <span>•</span>
        <span>
          {isTr ? 'Açılış' : 'Opened'}:{' '}
          <strong style={{ color: '#94a3b8' }}>
            {new Date(ticket.createdAt).toLocaleDateString(isTr ? 'tr-TR' : 'en-US')}
          </strong>
        </span>
      </div>
    </div>
  );
}
