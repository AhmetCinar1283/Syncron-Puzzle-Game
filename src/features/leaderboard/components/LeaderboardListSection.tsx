'use client';

import React from 'react';
import BadgeIcon from '@/components/common/BadgeIcon';
import { LeaderboardEntry } from '@/services/api/leaderboardClient';
import { CategoryId } from '../lib/constants';
import { ShowcaseBadge } from '../lib/types';

interface LeaderboardListSectionProps {
  listEntries: LeaderboardEntry[];
  selfUid?: string;
  activeCategoryId: CategoryId;
  formatScore: (val: number, cat: CategoryId) => string;
  onUserClick: (uid: string, name: string | null, tag: string | null, showcase: ShowcaseBadge[] | undefined, value: number) => void;
}

export default function LeaderboardListSection({ listEntries, selfUid, activeCategoryId, formatScore, onUserClick }: LeaderboardListSectionProps) {
  if (listEntries.length === 0) return null;

  return (
    <div
      style={{
        width: '100%',
        background: '#090d1640',
        border: '1px solid #111827',
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '20px',
      }}
    >
      {listEntries.map((entry, idx) => {
        const isSelf = selfUid === entry.uid;
        const nameText = entry.displayName || 'Player';

        return (
          <div
            key={entry.uid}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: idx === listEntries.length - 1 ? 'none' : '1px solid #111827',
              borderLeft: isSelf ? '3px solid #00ff88' : '3px solid transparent',
              background: isSelf ? 'rgba(0, 255, 136, 0.03)' : 'transparent',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isSelf
                ? 'rgba(0, 255, 136, 0.06)'
                : 'rgba(255, 255, 255, 0.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = isSelf
                ? 'rgba(0, 255, 136, 0.03)'
                : 'transparent';
            }}
          >
            {/* Left side: Rank + Username */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#6b7280',
                  width: '20px',
                }}
              >
                {entry.rank}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span
                  onClick={() => onUserClick(entry.uid, entry.displayName, entry.tag, entry.showcaseBadges, entry.value)}
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: isSelf ? '#00ff88' : '#e2e8f0',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
                >
                  {nameText}
                  {entry.tag && (
                    <span style={{ fontSize: '9.5px', color: '#6b7280', marginLeft: '4px' }}>
                      [{entry.tag}]
                    </span>
                  )}
                </span>

                {/* Showcase badges */}
                <div style={{ display: 'flex', gap: '3px', marginTop: '2px' }}>
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

            {/* Right side: Score */}
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: isSelf ? '#00ff88' : '#9ca3af',
              }}
            >
              {formatScore(entry.value, activeCategoryId)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
