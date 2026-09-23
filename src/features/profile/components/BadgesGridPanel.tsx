'use client';

import React from 'react';
import BadgeIcon from '@/components/common/BadgeIcon';
import { GameIcon } from '@/components/icons';
import { useGameTheme } from '@/game-engine/contexts/GameThemeContext';
import { Badge } from '@/services/api/badgesClient';

interface Props {
  t: (key: string) => string;
  loadingBadges: boolean;
  badgesError: string | null;
  badges: Badge[];
}

export default function BadgesGridPanel({ t, loadingBadges, badgesError, badges }: Props) {
  const { themeConfig } = useGameTheme();

  return (
    <div className="profile-card">
      <div className="profile-card__scan" aria-hidden="true" />
      <div className="profile-card__bracket profile-card__bracket--tl" aria-hidden="true" />
      <div className="profile-card__bracket profile-card__bracket--tr" aria-hidden="true" />
      <div className="profile-card__bracket profile-card__bracket--bl" aria-hidden="true" />
      <div className="profile-card__bracket profile-card__bracket--br" aria-hidden="true" />

      <div className="profile-card__content">
        <div className="profile-panel-header">
          <h3 className="profile-panel-title">
            <GameIcon name="trophy" size={14} color={themeConfig.accentColor} />
            <span>
              {t('leaderboard.standing') === 'SENİN YERİN' ? 'TÜM ROZETLER' : 'ALL BADGES'}
            </span>
          </h3>

          {badges.length > 0 && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                color: themeConfig.accentColor,
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '3px 8px',
                borderRadius: '999px',
                border: `1px solid ${themeConfig.accentColor}30`,
              }}
            >
              {badges.length}
            </span>
          )}
        </div>

        {loadingBadges ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
            <div
              style={{
                width: '24px',
                height: '24px',
                border: '2px solid rgba(255,255,255,0.1)',
                borderTopColor: themeConfig.accentColor,
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
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
              gridTemplateColumns: 'repeat(auto-fill, minmax(68px, 1fr))',
              gap: '12px',
              justifyItems: 'center',
              padding: '6px 0',
            }}
          >
            {badges.map((badge) => (
              <div
                key={badge.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: 'rgba(10, 16, 30, 0.5)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '8px',
                  padding: '8px 4px',
                  width: '100%',
                  boxSizing: 'border-box',
                  transition: 'transform 0.2s ease, border-color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = `${themeConfig.accentColor}50`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                }}
              >
                <BadgeIcon
                  badgeType={badge.badgeType}
                  periodId={badge.periodId}
                  rank={badge.rank}
                  size="md"
                />
                <span
                  style={{
                    fontSize: '9px',
                    color: '#94a3b8',
                    marginTop: '6px',
                    fontWeight: 800,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  {badge.periodId}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#64748b', fontSize: '12px', fontStyle: 'italic', margin: '8px 0', textAlign: 'center' }}>
            {t('leaderboard.standing') === 'SENİN YERİN'
              ? 'Henüz kazanılmış bir rozet bulunmuyor.'
              : 'No badges earned yet.'}
          </p>
        )}
      </div>
    </div>
  );
}
