'use client';

import React from 'react';
import BadgeIcon from '@/components/common/BadgeIcon';
import { CategoryId } from '../lib/constants';
import { ShowcaseBadge } from '../lib/types';
import { StandingSection as StandingSectionState } from '../hooks/useLeaderboardPage';

interface StandingSectionProps {
  t: (key: string) => string;
  standingSection: StandingSectionState;
  selfUid?: string;
  activeCategoryId: CategoryId;
  formatScore: (val: number, cat: CategoryId) => string;
  onUserClick: (uid: string, name: string | null, tag: string | null, showcase: ShowcaseBadge[] | undefined, value: number) => void;
  onSignIn: () => void;
  onPlayClick: () => void;
}

export default function StandingSection({
  t,
  standingSection,
  selfUid,
  activeCategoryId,
  formatScore,
  onUserClick,
  onSignIn,
  onPlayClick,
}: StandingSectionProps) {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: '600px',
        marginTop: '28px',
        borderTop: '1px solid #111827',
        paddingTop: '24px',
        boxSizing: 'border-box',
      }}
    >
      <h3
        style={{
          fontSize: '11px',
          fontWeight: 800,
          letterSpacing: '0.15em',
          color: '#4b5563',
          marginBottom: '12px',
          textTransform: 'uppercase',
        }}
      >
        {t('leaderboard.standing')}
      </h3>

      {standingSection.status === 'unauthenticated' && (
        /* User not logged in */
        <div
          style={{
            width: '100%',
            padding: '16px 20px',
            borderRadius: '8px',
            background: '#11182740',
            border: '1px dashed #374151',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '13px', color: '#9ca3af' }}>
            {t('leaderboard.login_required')}
          </span>
          <button
            onClick={onSignIn}
            style={{
              padding: '6px 14px',
              fontSize: '11px',
              fontWeight: 700,
              borderRadius: '6px',
              border: '1px solid #00ff88',
              background: 'rgba(0, 255, 136, 0.05)',
              color: '#00ff88',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#00ff88';
              e.currentTarget.style.color = '#030712';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0, 255, 136, 0.05)';
              e.currentTarget.style.color = '#00ff88';
            }}
          >
            {t('auth.sign_in')}
          </button>
        </div>
      )}

      {standingSection.status === 'loading' && (
        /* Loading */
        <div
          style={{
            width: '100%',
            height: '52px',
            background: '#11182730',
            border: '1px solid #111827',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '16px',
              height: '16px',
              border: '2px solid rgba(255,255,255,0.1)',
              borderTopColor: '#9ca3af',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
        </div>
      )}

      {standingSection.status === 'no_score' && (
        /* Score is null / 0 */
        <div
          style={{
            width: '100%',
            padding: '16px 20px',
            borderRadius: '8px',
            background: '#11182740',
            border: '1px dashed #374151',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '13px', color: '#9ca3af' }}>
            {t('leaderboard.no_score')}
          </span>
          <button
            onClick={onPlayClick}
            style={{
              padding: '6px 14px',
              fontSize: '11px',
              fontWeight: 700,
              borderRadius: '6px',
              border: '1px solid #ffd700',
              background: 'rgba(255, 215, 0, 0.05)',
              color: '#ffd700',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ffd700';
              e.currentTarget.style.color = '#030712';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 215, 0, 0.05)';
              e.currentTarget.style.color = '#ffd700';
            }}
          >
            {t('home.play').toUpperCase()}
          </button>
        </div>
      )}

      {standingSection.status === 'ranked' && standingSection.entries && (
        /* Surrounding List */
        <div
          style={{
            width: '100%',
            background: '#090d1650',
            border: '1px solid #111827',
            borderRadius: '10px',
            overflow: 'hidden',
          }}
        >
          {standingSection.entries.map((entry, idx) => {
            const isSelf = selfUid === entry.uid;
            const nameText = entry.displayName || 'Player';

            return (
              <div
                key={`standing-${entry.uid}-${idx}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 16px',
                  borderBottom: idx === standingSection.entries!.length - 1 ? 'none' : '1px solid #111827',
                  borderLeft: isSelf ? '3px solid #00ff88' : '3px solid transparent',
                  background: isSelf ? 'rgba(0, 255, 136, 0.04)' : 'transparent',
                  opacity: isSelf ? 1 : 0.55,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#6b7280', width: '20px' }}>
                    {entry.rank}
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span
                      onClick={() => onUserClick(entry.uid, entry.displayName, entry.tag, entry.showcaseBadges, entry.value)}
                      style={{
                        fontSize: '12.5px',
                        fontWeight: 700,
                        color: isSelf ? '#00ff88' : '#e2e8f0',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
                    >
                      {nameText}
                      {entry.tag && (
                        <span style={{ fontSize: '9px', color: '#6b7280', marginLeft: '4px' }}>
                          [{entry.tag}]
                        </span>
                      )}
                    </span>

                    {/* Showcase badges */}
                    <div style={{ display: 'flex', gap: '2px', marginTop: '1px' }}>
                      {entry.showcaseBadges && entry.showcaseBadges.length > 0 ? (
                        entry.showcaseBadges.map((badge: ShowcaseBadge, bIdx: number) => (
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
                </div>

                <span style={{ fontSize: '11.5px', fontWeight: 700, color: isSelf ? '#00ff88' : '#9ca3af' }}>
                  {formatScore(entry.value, activeCategoryId)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
