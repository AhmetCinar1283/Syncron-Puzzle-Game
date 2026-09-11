import type { T } from '@/contexts/LanguageContext';
import {
  type SupportTicket,
  type TicketStatus,
  type TicketPriority,
  STATUS_LABELS,
  PRIORITY_LABELS,
} from '@/services/firebase';

const labelStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 800,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: '#475569',
  display: 'block',
  marginBottom: '6px',
};

const inputSelectStyle: React.CSSProperties = {
  background: '#060d1a',
  border: '1px solid rgba(251, 191, 36, 0.25)',
  color: '#fbbf24',
  borderRadius: '8px',
  padding: '8px 12px',
  fontSize: '13px',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

export function TicketOperationsPanel({
  t,
  isTr,
  ticket,
  onStatusChange,
  onPriorityChange,
}: {
  t: T;
  isTr: boolean;
  ticket: SupportTicket;
  onStatusChange: (status: TicketStatus) => void;
  onPriorityChange: (priority: TicketPriority) => void;
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
        gap: '14px',
      }}
    >
      <h3 style={{ fontSize: '12px', fontWeight: 800, color: '#fbbf24', letterSpacing: '0.08em', margin: 0, borderBottom: '1px solid rgba(251, 191, 36, 0.12)', paddingBottom: '10px' }}>
        {isTr ? 'BİLET YÖNETİMİ' : 'TICKET OPERATIONS'}
      </h3>

      {/* Status Selector */}
      <div>
        <label htmlFor="status-select" style={labelStyle}>{t('support.status')}</label>
        <select
          id="status-select"
          value={ticket.status}
          onChange={(e) => onStatusChange(e.target.value as TicketStatus)}
          style={inputSelectStyle}
        >
          {(['open', 'in_progress', 'waiting_user', 'resolved', 'closed'] as TicketStatus[]).map((st) => (
            <option key={st} value={st} style={{ background: '#030712', color: '#e2e8f0' }}>
              {STATUS_LABELS[st][isTr ? 'tr' : 'en']}
            </option>
          ))}
        </select>
      </div>

      {/* Priority Selector */}
      <div>
        <label htmlFor="priority-select" style={labelStyle}>{t('support.priority')}</label>
        <select
          id="priority-select"
          value={ticket.priority}
          onChange={(e) => onPriorityChange(e.target.value as TicketPriority)}
          style={inputSelectStyle}
        >
          {(['low', 'normal', 'high', 'urgent'] as TicketPriority[]).map((pr) => (
            <option key={pr} value={pr} style={{ background: '#030712', color: '#e2e8f0' }}>
              {PRIORITY_LABELS[pr][isTr ? 'tr' : 'en']}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
