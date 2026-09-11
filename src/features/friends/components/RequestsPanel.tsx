'use client';

import { useT } from '@/contexts/LanguageContext';
import BadgeIcon from '@/components/common/BadgeIcon';
import { FriendRequest } from '@/services/api/friendsClient';

interface RequestsPanelProps {
  requests: FriendRequest[];
  loadingRequests: boolean;
  actionBusy: Record<string, boolean>;
  onFriendClick: (friend: FriendRequest) => void;
  onAcceptRequest: (uid: string) => void;
  onRejectRequest: (uid: string) => void;
}

export function RequestsPanel({
  requests,
  loadingRequests,
  actionBusy,
  onFriendClick,
  onAcceptRequest,
  onRejectRequest,
}: RequestsPanelProps) {
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
      <h3
        style={{
          fontSize: '11px',
          fontWeight: 800,
          letterSpacing: '0.15em',
          color: '#4b5563',
          textTransform: 'uppercase',
          margin: '0 0 16px 0',
        }}
      >
        {t('friends.pending_requests')}
      </h3>

      {loadingRequests ? (
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
      ) : requests.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {requests.map((req) => {
            const isBusy = actionBusy[req.uid];
            return (
              <div
                key={req.uid}
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
                    onClick={() => onFriendClick(req)}
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#e2e8f0',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                  >
                    {req.displayName}
                    {req.tag && (
                      <span style={{ fontSize: '9px', color: '#6b7280', marginLeft: '4px' }}>
                        [{req.tag}]
                      </span>
                    )}
                  </span>

                  <div style={{ display: 'flex', gap: '3px', marginTop: '2px' }}>
                    {req.showcaseBadges && req.showcaseBadges.length > 0 ? (
                      req.showcaseBadges.map((badge, bIdx) => (
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

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => onAcceptRequest(req.uid)}
                    disabled={isBusy}
                    style={{
                      padding: '5px 12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      background: 'rgba(0, 255, 136, 0.08)',
                      border: '1px solid rgba(0, 255, 136, 0.3)',
                      color: '#00ff88',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#00ff88';
                      e.currentTarget.style.color = '#030712';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(0, 255, 136, 0.08)';
                      e.currentTarget.style.color = '#00ff88';
                    }}
                  >
                    {isBusy ? '...' : t('friends.accept')}
                  </button>
                  <button
                    onClick={() => onRejectRequest(req.uid)}
                    disabled={isBusy}
                    style={{
                      padding: '5px 12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      background: 'rgba(255, 45, 85, 0.08)',
                      border: '1px solid rgba(255, 45, 85, 0.3)',
                      color: '#ff2d55',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#ff2d55';
                      e.currentTarget.style.color = '#030712';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 45, 85, 0.08)';
                      e.currentTarget.style.color = '#ff2d55';
                    }}
                  >
                    {isBusy ? '...' : t('friends.reject')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p style={{ color: '#4b5563', fontSize: '12.5px', fontStyle: 'italic', margin: 0 }}>
          {t('friends.no_requests')}
        </p>
      )}
    </div>
  );
}

export default RequestsPanel;
