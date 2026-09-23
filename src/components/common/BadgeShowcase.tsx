'use client';

import React from 'react';
import BadgeIcon from './BadgeIcon';
import { useT } from '@/contexts/LanguageContext';
import { GameIcon } from '@/components/icons';
import { useGameTheme } from '@/game-engine/contexts/GameThemeContext';

export interface BadgeShowcaseProps {
  uid?: string;
  isOwner: boolean;
  showcaseBadges?: Array<{
    id: string;
    badgeType?: string;
    badge_type?: string;
    periodId?: string;
    period_id?: string;
    rank: number;
  }>;
  onEditClick?: () => void;
}

export default function BadgeShowcase({
  isOwner,
  showcaseBadges = [],
  onEditClick,
}: BadgeShowcaseProps) {
  const t = useT();
  const { themeConfig } = useGameTheme();

  return (
    <div className="profile-card">
      <div className="profile-card__scan" aria-hidden="true" />
      <div className="profile-card__bracket profile-card__bracket--tl" aria-hidden="true" />
      <div className="profile-card__bracket profile-card__bracket--tr" aria-hidden="true" />
      <div className="profile-card__bracket profile-card__bracket--bl" aria-hidden="true" />
      <div className="profile-card__bracket profile-card__bracket--br" aria-hidden="true" />

      <div className="profile-card__content">
        {/* Header */}
        <div className="profile-panel-header">
          <h3 className="profile-panel-title">
            <GameIcon name="medal" size={14} color={themeConfig.accentColor} />
            <span>
              {t('leaderboard.standing') === 'SENİN YERİN' ? 'ROZET VİTRİNİ' : 'BADGE SHOWCASE'}
            </span>
          </h3>

          {isOwner && (
            <button
              type="button"
              onClick={onEditClick}
              className="profile-action-btn"
              style={{
                padding: '6px 14px',
                fontSize: '11px',
                minHeight: '34px',
                borderRadius: '6px',
              }}
            >
              <GameIcon name="tools" size={12} color={themeConfig.accentColor} />
              <span>{t('list.edit').toUpperCase()}</span>
            </button>
          )}
        </div>

        {/* Vitrin Yuvaları */}
        <div className="profile-showcase-slots">
          {showcaseBadges.length > 0 ? (
            showcaseBadges.map((badge, idx) => (
              <div
                key={badge.id || idx}
                className="profile-showcase-slot"
                style={{
                  border: `1.5px solid ${themeConfig.accentColor}40`,
                  boxShadow: `0 0 12px ${themeConfig.accentGlow}`,
                }}
              >
                <BadgeIcon
                  badgeType={badge.badgeType || badge.badge_type || ''}
                  periodId={badge.periodId || badge.period_id || ''}
                  rank={badge.rank}
                  size="md"
                />
              </div>
            ))
          ) : (
            <div
              style={{
                padding: '16px',
                width: '100%',
                border: '1px dashed rgba(255, 255, 255, 0.15)',
                borderRadius: '8px',
                textAlign: 'center',
                boxSizing: 'border-box',
                background: 'rgba(255, 255, 255, 0.01)',
              }}
            >
              <p
                style={{
                  fontSize: '12px',
                  color: '#94a3b8',
                  fontStyle: 'italic',
                  margin: 0,
                  letterSpacing: '0.04em',
                }}
              >
                {isOwner
                  ? (t('leaderboard.standing') === 'SENİN YERİN'
                      ? 'Vitrine yerleştirmek için sağ üstteki "DÜZENLE"ye tıklayın'
                      : 'Click "EDIT" to showcase your favorite badges')
                  : (t('leaderboard.standing') === 'SENİN YERİN'
                      ? 'Sergilenen rozet bulunmuyor'
                      : 'No badges showcased yet')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
