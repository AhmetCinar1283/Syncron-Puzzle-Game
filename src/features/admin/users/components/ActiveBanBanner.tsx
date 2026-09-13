'use client';

import type { ActiveBan } from '@/services/api/adminClient';
import { GameIcon } from '@/components/icons';
import { getRemainingTimeText } from '../lib/format';

export function ActiveBanBanner({ activeBans, isTr }: { activeBans: ActiveBan[]; isTr: boolean }) {
  if (activeBans.length === 0) return null;

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.02) 100%)',
        border: '1px solid rgba(239, 68, 68, 0.35)',
        borderRadius: '16px',
        padding: '20px 24px',
        boxShadow: '0 4px 20px rgba(239, 68, 68, 0.1), inset 0 0 12px rgba(239, 68, 68, 0.02)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <GameIcon name="ban" size={18} color="#ef4444" />
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#f87171', letterSpacing: '0.05em' }}>
            {isTr ? 'BU HESAP KISITLIDIR:' : 'THIS ACCOUNT IS RESTRICTED:'}
          </h3>
        </div>
        <button
          onClick={() => document.getElementById('ban-management-section')?.scrollIntoView({ behavior: 'smooth' })}
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            fontSize: '11px',
            fontWeight: 700,
            padding: '4px 12px',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
          }}
        >
          <span>{isTr ? 'Banları Yönet' : 'Manage Bans'}</span>
          <GameIcon name="arrow-down" size={10} color="#f87171" />
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '28px' }}>
        {activeBans.map((ban) => {
          let typeLabel = '';
          let typeColor = '';
          switch (ban.ban_type) {
            case 'platform':
              typeLabel = isTr ? 'Platform Banı' : 'Platform Ban';
              typeColor = '#ef4444';
              break;
            case 'tag':
              typeLabel = isTr ? 'Tag Banı' : 'Tag Ban';
              typeColor = '#fb923c';
              break;
            case 'social':
              typeLabel = isTr ? 'Sosyal Ban' : 'Social Ban';
              typeColor = '#f59e0b';
              break;
            case 'coop':
              typeLabel = isTr ? 'Co-op Banı' : 'Co-op Ban';
              typeColor = '#9333ea';
              break;
          }

          return (
            <div key={ban.id} style={{ fontSize: '13px', color: '#cbd5e1', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 700, color: typeColor }}>{typeLabel}</span>
              <span style={{ color: '#64748b' }}>—</span>
              <span style={{ color: '#fbbf24', fontWeight: 600 }}>{getRemainingTimeText(ban.expires_at, isTr)}</span>
              <span style={{ color: '#64748b' }}>—</span>
              <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>"{ban.reason}"</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
