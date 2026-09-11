'use client';

import { useT } from '@/contexts/LanguageContext';
import BadgeIcon from '@/components/common/BadgeIcon';
import { Friend } from '@/services/api/friendsClient';

interface FriendsListPanelProps {
  friends: Friend[];
  loadingFriends: boolean;
  actionBusy: Record<string, boolean>;
  onFriendClick: (friend: Friend) => void;
  onRemoveFriend: (uid: string) => void;
  onBlockUser: (uid: string) => void;
}

export function FriendsListPanel({
  friends,
  loadingFriends,
  actionBusy,
  onFriendClick,
  onRemoveFriend,
  onBlockUser,
}: FriendsListPanelProps) {
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
        {t('friends.my_friends', { n: friends.length })}
      </h3>

      {loadingFriends ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
          <div
            style={{
              width: '20px',
              height: '20px',
              border: '2px solid rgba(255,255,255,0.1)',
              borderTopColor: '#ec4899',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
        </div>
      ) : friends.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {friends.map((friend) => {
            const isBusy = actionBusy[friend.uid];
            return (
              <div
                key={friend.uid}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: 'rgba(255,255,255,0.01)',
                  border: '1px solid #111827',
                  borderRadius: '8px',
                  transition: 'border-color 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(236,72,153,0.25)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#111827')}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span
                    onClick={() => onFriendClick(friend)}
                    style={{
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#e2e8f0',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                  >
                    {friend.displayName}
                    {friend.tag && (
                      <span style={{ fontSize: '9.5px', color: '#6b7280', marginLeft: '4px' }}>
                        [{friend.tag}]
                      </span>
                    )}
                  </span>

                  {/* Showcase Badges */}
                  <div style={{ display: 'flex', gap: '3px', marginTop: '2px' }}>
                    {friend.showcaseBadges && friend.showcaseBadges.length > 0 ? (
                      friend.showcaseBadges.map((badge, bIdx) => (
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

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => {
                      if (window.confirm(t('levels.delete_title') === 'Emin misiniz?' ? 'Bu arkadaşı silmek istediğinize emin misiniz?' : 'Are you sure you want to remove this friend?')) {
                        onRemoveFriend(friend.uid);
                      }
                    }}
                    disabled={isBusy}
                    style={{
                      padding: '6px 12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      background: 'rgba(255, 45, 85, 0.06)',
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
                      e.currentTarget.style.background = 'rgba(255, 45, 85, 0.06)';
                      e.currentTarget.style.color = '#ff2d55';
                    }}
                  >
                    {isBusy ? '...' : t('friends.remove_friend')}
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(t('friends.block_confirm'))) {
                        onBlockUser(friend.uid);
                      }
                    }}
                    disabled={isBusy}
                    style={{
                      padding: '6px 12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      background: 'rgba(239, 68, 68, 0.06)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#ef4444',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#ef4444';
                      e.currentTarget.style.color = '#030712';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(239, 68, 68, 0.06)';
                      e.currentTarget.style.color = '#ef4444';
                    }}
                  >
                    {isBusy ? '...' : t('friends.block_friend')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p style={{ color: '#4b5563', fontSize: '13px', fontStyle: 'italic', margin: 0 }}>
          {t('friends.no_friends_desc')}
        </p>
      )}
    </div>
  );
}

export default FriendsListPanel;
