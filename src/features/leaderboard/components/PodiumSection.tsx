'use client';

import React from 'react';
import { motion } from 'framer-motion';
import BadgeIcon from '@/components/common/BadgeIcon';
import { LeaderboardEntry } from '@/services/api/leaderboardClient';
import { CategoryId } from '../lib/constants';
import { ShowcaseBadge } from '../lib/types';

interface PodiumSectionProps {
  podiumEntries: (LeaderboardEntry | null)[];
  selfUid?: string;
  activeCategoryId: CategoryId;
  activeColor: string;
  formatScore: (val: number, cat: CategoryId) => string;
  onUserClick: (uid: string, name: string | null, tag: string | null, showcase: ShowcaseBadge[] | undefined, value: number) => void;
}

export default function PodiumSection({ podiumEntries, selfUid, activeCategoryId, activeColor, formatScore, onUserClick }: PodiumSectionProps) {
  return (
    <div
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: '12px',
        marginBottom: '24px',
        minHeight: '220px',
        padding: '0 8px',
        boxSizing: 'border-box',
      }}
    >
      {podiumEntries.map((entry, idx) => {
        if (!entry) {
          // Empty spacer pedestal if we don't have enough entries
          return <div key={`empty-${idx}`} style={{ flex: 1 }} />;
        }

        const isFirst = entry.rank === 1;
        const isSecond = entry.rank === 2;
        const isThird = entry.rank === 3;

        let medalColor = '#ffd700'; // gold
        let pedestalHeight = '150px';
        let glowColor = 'rgba(255, 215, 0, 0.35)';

        if (isSecond) {
          medalColor = '#a8a29e'; // silver
          pedestalHeight = '115px';
          glowColor = 'rgba(168, 162, 158, 0.25)';
        } else if (isThird) {
          medalColor = '#b45309'; // bronze
          pedestalHeight = '85px';
          glowColor = 'rgba(180, 83, 9, 0.2)';
        }

        const nameText = entry.displayName || 'Player';
        const isSelf = selfUid === entry.uid;

        return (
          <motion.div
            key={entry.uid}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: idx * 0.1 }}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            {/* Avatar/Name Header Above Pedestal */}
            <div
              style={{
                textAlign: 'center',
                marginBottom: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '100%',
              }}
            >
              {isFirst && (
                <span style={{ fontSize: '20px', marginBottom: '-2px', filter: 'drop-shadow(0 0 6px #ffd700)' }}>
                  👑
                </span>
              )}
              <span
                onClick={() => onUserClick(entry.uid, entry.displayName, entry.tag, entry.showcaseBadges, entry.value)}
                style={{
                  fontSize: isFirst ? '14px' : '12px',
                  fontWeight: isFirst ? 800 : 700,
                  color: isSelf ? '#00ff88' : '#e2e8f0',
                  maxWidth: '90px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                }}
                title={nameText}
                onMouseEnter={(e) => { e.currentTarget.style.textDecoration = 'underline'; }}
                onMouseLeave={(e) => { e.currentTarget.style.textDecoration = 'none'; }}
              >
                {nameText}
                {entry.tag && (
                  <span style={{ fontSize: '9px', opacity: 0.6, marginLeft: '2px' }}>
                    [{entry.tag}]
                  </span>
                )}
              </span>

              {/* Showcase badges */}
              <div style={{ display: 'flex', gap: '3px', marginTop: '2px', minHeight: '12px' }}>
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
                ) : (
                  <span style={{ opacity: 0.15, fontSize: '9px' }}>-</span>
                )}
              </div>

              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: activeColor,
                  marginTop: '2px',
                }}
              >
                {formatScore(entry.value, activeCategoryId)}
              </span>
            </div>

            {/* Pedestal Structure */}
            <div
              style={{
                width: '100%',
                height: pedestalHeight,
                background: `linear-gradient(to top, #090d16, ${medalColor}12)`,
                border: `1px solid ${medalColor}40`,
                borderBottom: 'none',
                borderTopLeftRadius: '10px',
                borderTopRightRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 0 16px ${glowColor}`,
                position: 'relative',
              }}
            >
              <span
                style={{
                  fontSize: isFirst ? '32px' : '24px',
                  fontWeight: 900,
                  color: medalColor,
                  textShadow: `0 0 10px ${medalColor}70`,
                }}
              >
                {entry.rank}
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
