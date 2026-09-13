'use client';

import type { ActiveBan, BanRecord } from '@/services/api/adminClient';
import { GameIcon } from '@/components/icons';
import { getRemainingTimeText } from '../lib/format';

export function BanManagementSection({
  activeBans,
  bans,
  isTr,
  onIssueBan,
  onLiftBan,
}: {
  activeBans: ActiveBan[];
  bans: BanRecord[];
  isTr: boolean;
  onIssueBan: () => void;
  onLiftBan: (banId: string) => void;
}) {
  return (
    <section
      id="ban-management-section"
      style={{
        background: 'rgba(255, 255, 255, 0.01)',
        border: '1px solid rgba(147, 51, 234, 0.12)',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 800, letterSpacing: '0.1em', color: '#9333ea', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
          <GameIcon name="ban" size={14} color="#9333ea" />
          <span>{isTr ? 'BAN / KISITLAMA YÖNETİMİ' : 'BAN & RESTRICTION MANAGEMENT'}</span>
        </h3>
        <button
          onClick={onIssueBan}
          style={{
            background: 'rgba(147, 51, 234, 0.1)',
            border: '1px solid rgba(147, 51, 234, 0.3)',
            color: '#a855f7',
            fontSize: '11px',
            fontWeight: 700,
            padding: '6px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#9333ea';
            e.currentTarget.style.color = '#ffffff';
            e.currentTarget.style.boxShadow = '0 0 12px rgba(147, 51, 234, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(147, 51, 234, 0.1)';
            e.currentTarget.style.color = '#a855f7';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {isTr ? '+ YENİ BAN' : '+ ISSUE BAN'}
        </button>
      </div>

      {/* Active Restrictions Sub-List */}
      <div>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: 700, color: '#f87171', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
          {isTr ? 'Aktif Kısıtlamalar:' : 'Active Restrictions:'}
        </h4>
        {activeBans.length === 0 ? (
          <p style={{ margin: 0, fontSize: '12.5px', color: '#475569', fontStyle: 'italic' }}>
            {isTr ? 'Aktif kısıtlama bulunmuyor.' : 'No active restrictions.'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activeBans.map((ban) => {
              let typeLabel = '';
              let typeColor = '';
              switch (ban.ban_type) {
                case 'platform':
                  typeLabel = isTr ? 'Platform' : 'Platform';
                  typeColor = '#ef4444';
                  break;
                case 'tag':
                  typeLabel = isTr ? 'Tag' : 'Tag';
                  typeColor = '#fb923c';
                  break;
                case 'social':
                  typeLabel = isTr ? 'Sosyal' : 'Social';
                  typeColor = '#f59e0b';
                  break;
                case 'coop':
                  typeLabel = isTr ? 'Co-op' : 'Co-op';
                  typeColor = '#9333ea';
                  break;
              }

              return (
                <div
                  key={ban.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: 'rgba(255,255,255,0.01)',
                    border: '1px solid rgba(255,255,255,0.03)',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
                    <span style={{ color: typeColor, fontSize: '14px' }}>●</span>
                    <span style={{ fontWeight: 700, color: '#cbd5e1' }}>{typeLabel}</span>
                    <span style={{ color: '#475569' }}>—</span>
                    <span style={{ color: '#fbbf24', fontWeight: 600 }}>{getRemainingTimeText(ban.expires_at, isTr)}</span>
                    <span style={{ color: '#475569' }}>—</span>
                    <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>"{ban.reason}"</span>
                  </div>
                  <button
                    onClick={() => onLiftBan(ban.id)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.05)',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      color: '#ef4444',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#ef4444';
                      e.currentTarget.style.color = '#030712';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)';
                      e.currentTarget.style.color = '#ef4444';
                    }}
                  >
                    {isTr ? 'Kaldır' : 'Lift'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ban History Sub-List */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '16px' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '12px', fontWeight: 700, color: '#64748b', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
          {isTr ? 'Kısıtlama Geçmişi (Kaldırılmış/Süresi Dolmuş):' : 'Ban History (Lifted/Expired):'}
        </h4>
        {bans.filter((b) => !activeBans.some((ab) => ab.id === b.id)).length === 0 ? (
          <p style={{ margin: 0, fontSize: '12.5px', color: '#475569', fontStyle: 'italic' }}>
            {isTr ? 'Kayıtlı ban geçmişi bulunmuyor.' : 'No ban history records.'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
            {bans
              .filter((b) => !activeBans.some((ab) => ab.id === b.id))
              .map((ban) => {
                const issuedDate = new Date(ban.issued_at).toLocaleDateString(isTr ? 'tr-TR' : 'en-US');
                let statusText = '';
                if (ban.lifted_at) {
                  statusText = isTr ? `Engeli Kaldıran: ${ban.lifted_by?.slice(0, 8)}...` : `Lifted by: ${ban.lifted_by?.slice(0, 8)}...`;
                } else {
                  statusText = isTr ? 'Süresi Doldu' : 'Expired';
                }

                return (
                  <div
                    key={ban.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '12px',
                      color: '#94a3b8',
                    }}
                  >
                    <span style={{ color: '#475569' }}>○</span>
                    <span style={{ fontWeight: 700, color: '#cbd5e1', textTransform: 'capitalize' }}>{ban.ban_type}</span>
                    <span style={{ color: '#475569' }}>—</span>
                    <span>{issuedDate}</span>
                    <span style={{ color: '#475569' }}>—</span>
                    <span style={{ color: '#fb923c', fontWeight: 600 }}>{statusText}</span>
                    <span style={{ color: '#475569' }}>—</span>
                    <span style={{ fontStyle: 'italic' }}>"{ban.reason}"</span>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </section>
  );
}
