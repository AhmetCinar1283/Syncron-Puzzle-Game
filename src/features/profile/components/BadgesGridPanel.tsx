'use client';

import BadgeIcon from '@/components/common/BadgeIcon';
import { GameIcon } from '@/components/icons';
import { Badge } from '@/services/api/badgesClient';

interface Props {
  t: (key: string) => string;
  loadingBadges: boolean;
  badgesError: string | null;
  badges: Badge[];
}

export default function BadgesGridPanel({ t, loadingBadges, badgesError, badges }: Props) {
  return (
    <div
      style={{
        background: '#0a0f1a50',
        border: '1px solid #111827',
        borderRadius: '16px',
        padding: '20px 24px',
        boxSizing: 'border-box',
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
        {t('leaderboard.standing') === 'SENİN YERİN' ? 'TÜM ROZETLER' : 'ALL BADGES'}
      </h3>

      {loadingBadges ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
          <div
            style={{
              width: '20px',
              height: '20px',
              border: '2px solid rgba(255,255,255,0.1)',
              borderTopColor: '#00ff88',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
        </div>
      ) : badgesError ? (
        <p style={{ color: '#ff2d55', fontSize: '12px', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
          <GameIcon name="warning" size={14} color="#ff2d55" />
          <span>{badgesError}</span>
        </p>
      ) : badges.length > 0 ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))',
            gap: '12px',
            justifyItems: 'center',
          }}
        >
          {badges.map((badge) => (
            <div
              key={badge.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <BadgeIcon
                badgeType={badge.badgeType}
                periodId={badge.periodId}
                rank={badge.rank}
                size="md"
              />
              <span style={{ fontSize: '8px', color: '#4b5563', marginTop: '4px', fontWeight: 700 }}>
                {badge.periodId}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: '#4b5563', fontSize: '12px', fontStyle: 'italic', margin: 0 }}>
          {t('leaderboard.standing') === 'SENİN YERİN' ? 'Henüz kazanılmış rozet yok' : 'No badges earned yet'}
        </p>
      )}
    </div>
  );
}
