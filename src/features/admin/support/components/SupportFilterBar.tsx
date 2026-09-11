import {
  type TicketStatus,
  type TicketCategory,
  CATEGORY_LABELS,
  STATUS_LABELS,
} from '@/services/firebase';

export function SupportFilterBar({
  isTr,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  categoryFilter,
  setCategoryFilter,
}: {
  isTr: boolean;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  statusFilter: TicketStatus | 'all';
  setStatusFilter: (v: TicketStatus | 'all') => void;
  categoryFilter: TicketCategory | 'all';
  setCategoryFilter: (v: TicketCategory | 'all') => void;
}) {
  const filterSelectStyle: React.CSSProperties = {
    background: '#060d1a',
    border: '1px solid rgba(251, 191, 36, 0.3)',
    color: '#fbbf24',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '12px',
    outline: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
  };

  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(251, 191, 36, 0.12)',
        borderRadius: '10px',
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search Input */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={isTr ? 'Kullanıcı, konu veya ID ara...' : 'Search user, subject, or ID...'}
          style={{
            flex: 1,
            minWidth: '220px',
            background: '#060d1a',
            border: '1px solid rgba(30, 58, 95, 0.6)',
            color: '#94a3b8',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '12px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />

        {/* Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '10px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {isTr ? 'DURUM:' : 'STATUS:'}
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            style={filterSelectStyle}
          >
            <option value="all" style={{ background: '#030712' }}>{isTr ? 'Tümü' : 'All'}</option>
            {(['open', 'in_progress', 'waiting_user', 'resolved', 'closed'] as TicketStatus[]).map((st) => (
              <option key={st} value={st} style={{ background: '#030712' }}>
                {STATUS_LABELS[st][isTr ? 'tr' : 'en']}
              </option>
            ))}
          </select>
        </div>

        {/* Category Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '10px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {isTr ? 'KATEGORİ:' : 'CATEGORY:'}
          </span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            style={filterSelectStyle}
          >
            <option value="all" style={{ background: '#030712' }}>{isTr ? 'Tümü' : 'All'}</option>
            {(['general', 'bug', 'account', 'level', 'purchase', 'suggestion', 'data_deletion'] as TicketCategory[]).map((cat) => (
              <option key={cat} value={cat} style={{ background: '#030712' }}>
                {CATEGORY_LABELS[cat][isTr ? 'tr' : 'en']}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
