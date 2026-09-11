'use client';

import { useT } from '@/contexts/LanguageContext';
import BadgeIcon from '@/components/common/BadgeIcon';
import { Friend } from '@/services/api/friendsClient';

interface BlockedPanelProps {
  blocked: Friend[];
  loadingBlocked: boolean;
  actionBusy: Record<string, boolean>;
  onUnblockUser: (uid: string) => void;
}

export function BlockedPanel({ blocked, loadingBlocked, actionBusy, onUnblockUser }: BlockedPanelProps) {
  const t = useT();
  return (
    <div
      style={{
        background: '#0a0f1a50',
        border: '1px solid #111827',
        borderRadius: '16px',
        padding: '20px 24px',
      }}
    >
      <details style={{ width: '100%' }}>
        <summary
          style={{
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.15em',
            color: '#4b5563',
            textTransform: 'uppercase',
            cursor: 'pointer',
            userSelect: 'none',
            listStyle: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>👁️</span>
            <span>{t('friends.blocked_title')} ({blocked.length})</span>
          </div>
          <span style={{ fontSize: '10px' }}>▼</span>
        </summary>

        <div style={{ marginTop: '16px' }}>
          {loadingBlocked ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
              <div
                style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255,255,255,0.1)',
                  borderTopColor: '#ec4899',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
            </div>
          ) : blocked.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {blocked.map((blockedUser) => {
                const isBusy = actionBusy[blockedUser.uid];
                return (
                  <div
                    key={blockedUser.uid}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px solid #111827',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: '#e2e8f0',
                        }}
                      >
                        {blockedUser.displayName}
                        {blockedUser.tag && (
                          <span style={{ fontSize: '9.5px', color: '#6b7280', marginLeft: '4px' }}>
                            [{blockedUser.tag}]
                          </span>
                        )}
                      </span>
                      <div style={{ display: 'flex', gap: '3px', marginTop: '2px' }}>
                        {blockedUser.showcaseBadges && blockedUser.showcaseBadges.length > 0 ? (
                          blockedUser.showcaseBadges.map((badge, bIdx) => (
                            <BadgeIcon
                              key={badge.id || bIdx}
                              badgeType={badge.badgeType}
                              periodId={badge.periodId}
                              rank={badge.rank}
                              size="sm"
                            />
                          ))
                        ) : null}
                      </div>
                    </div>

                    <button
                      onClick={() => onUnblockUser(blockedUser.uid)}
                      disabled={isBusy}
                      style={{
                        padding: '6px 12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: 'rgba(0, 196, 255, 0.06)',
                        border: '1px solid rgba(0, 196, 255, 0.3)',
                        color: '#00c4ff',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#00c4ff';
                        e.currentTarget.style.color = '#030712';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 196, 255, 0.06)';
                        e.currentTarget.style.color = '#00c4ff';
                      }}
                    >
                      {isBusy ? '...' : t('friends.unblock_friend')}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ color: '#4b5563', fontSize: '12.5px', fontStyle: 'italic', margin: 0 }}>
              {t('friends.no_blocked_desc')}
            </p>
          )}
        </div>
      </details>
    </div>
  );
}

export default BlockedPanel;
