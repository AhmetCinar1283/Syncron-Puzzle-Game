import { motion } from 'framer-motion';
import {
  type SupportTicket,
  CATEGORY_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
} from '@/services/firebase';

export function TicketListItem({
  ticket,
  idx,
  isTr,
  onClick,
}: {
  ticket: SupportTicket;
  idx: number;
  isTr: boolean;
  onClick: () => void;
}) {
  const lastUpdateStr = new Date(ticket.updatedAt).toLocaleString(isTr ? 'tr-TR' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.02 }}
      onClick={onClick}
      style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: ticket.hasUnreadAdmin
          ? '1px solid rgba(251, 191, 36, 0.45)'
          : '1px solid rgba(30, 58, 95, 0.35)',
        borderRadius: '8px',
        padding: '16px 20px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        position: 'relative',
        transition: 'all 0.15s ease-in-out',
        boxShadow: ticket.hasUnreadAdmin
          ? '0 0 15px rgba(251, 191, 36, 0.06)'
          : 'none',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.border = ticket.hasUnreadAdmin
          ? '1px solid rgba(251, 191, 36, 0.8)'
          : '1px solid rgba(251, 191, 36, 0.4)';
        el.style.boxShadow = ticket.hasUnreadAdmin
          ? '0 0 20px rgba(251, 191, 36, 0.18), 0 4px 20px rgba(0,0,0,0.4)'
          : '0 0 20px rgba(251, 191, 36, 0.08), 0 4px 20px rgba(0,0,0,0.4)';
        el.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.border = ticket.hasUnreadAdmin
          ? '1px solid rgba(251, 191, 36, 0.45)'
          : '1px solid rgba(30, 58, 95, 0.35)';
        el.style.boxShadow = ticket.hasUnreadAdmin
          ? '0 0 15px rgba(251, 191, 36, 0.06)'
          : 'none';
        el.style.transform = 'translateY(0)';
      }}
    >
      {/* Top line: subject, user tag */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {ticket.hasUnreadAdmin && (
            <span
              style={{
                width: '8px',
                height: '8px',
                background: '#fbbf24',
                borderRadius: '50%',
                display: 'inline-block',
                boxShadow: '0 0 8px #fbbf24, 0 0 16px #fbbf24',
                flexShrink: 0
              }}
            />
          )}
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9' }}>
            {ticket.subject}
          </span>
        </div>

        <div style={{ fontSize: '11px', color: '#64748b' }}>
          <span style={{ color: '#fbbf24', fontWeight: 600 }}>{ticket.displayName}</span>
          {ticket.tag && <span style={{ color: '#475569' }}> #{ticket.tag}</span>}
        </div>
      </div>

      {/* Badges line: Category, Status, Priority, last update */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
        {/* Category */}
        <span style={{ fontSize: '10px', color: '#94a3b8', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '5px', padding: '2px 6px' }}>
          {CATEGORY_LABELS[ticket.category][isTr ? 'tr' : 'en']}
        </span>

        {/* Status */}
        <span
          style={{
            fontSize: '10px',
            color: STATUS_COLORS[ticket.status],
            background: `${STATUS_COLORS[ticket.status]}0d`,
            border: `1px solid ${STATUS_COLORS[ticket.status]}35`,
            borderRadius: '5px',
            padding: '2px 6px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em'
          }}
        >
          {STATUS_LABELS[ticket.status][isTr ? 'tr' : 'en']}
        </span>

        {/* Priority */}
        <span
          style={{
            fontSize: '10px',
            color: PRIORITY_COLORS[ticket.priority],
            background: `${PRIORITY_COLORS[ticket.priority]}0d`,
            border: `1px solid ${PRIORITY_COLORS[ticket.priority]}35`,
            borderRadius: '5px',
            padding: '2px 6px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em'
          }}
        >
          {PRIORITY_LABELS[ticket.priority][isTr ? 'tr' : 'en']}
        </span>

        {/* Unread admin text */}
        {ticket.hasUnreadAdmin && (
          <span style={{ fontSize: '10px', color: '#fbbf24', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', textShadow: '0 0 6px rgba(251,191,36,0.3)' }}>
            {isTr ? '● CÜMLE BEKLENİYOR' : '● RESPOND NOW'}
          </span>
        )}

        {/* Last update */}
        <span style={{ fontSize: '11px', color: '#475569', marginLeft: 'auto' }}>
          {lastUpdateStr}
        </span>
      </div>
    </motion.div>
  );
}
