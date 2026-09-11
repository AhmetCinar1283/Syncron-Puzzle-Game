import type { T } from '@/contexts/LanguageContext';
import type { SupportTicket } from '@/services/firebase';

const labelStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 800,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: '#475569',
  display: 'block',
  marginBottom: '6px',
};

export function UserInfoPanel({ t, isTr, ticket }: { t: T; isTr: boolean; ticket: SupportTicket }) {
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
        {t('support.user_info')}
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
        <div>
          <span style={labelStyle}>{isTr ? 'Adı Soyadı / Mail' : 'Name / Email'}</span>
          <span style={{ color: '#f8fafc', fontWeight: 600, wordBreak: 'break-all' }}>{ticket.displayName}</span>
          <div style={{ color: '#64748b', fontSize: '11px', wordBreak: 'break-all', marginTop: '2px' }}>{ticket.email}</div>
        </div>

        <div>
          <span style={labelStyle}>TAG</span>
          <span style={{ color: '#fbbf24', fontWeight: 800 }}>
            {ticket.tag ? `#${ticket.tag}` : (isTr ? 'Atanmamış' : 'None')}
          </span>
        </div>

        <div>
          <span style={labelStyle}>UID</span>
          <span style={{ color: '#64748b', fontFamily: 'monospace', fontSize: '10px', wordBreak: 'break-all' }}>{ticket.uid}</span>
        </div>
      </div>
    </div>
  );
}
