'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface LeaderboardHeaderProps {
  t: (key: string) => string;
  activeColor: string;
  activeGlow: string;
  isFriendsCategory: boolean;
  onRefresh: () => void;
}

export default function LeaderboardHeader({ t, activeColor, activeGlow, isFriendsCategory, onRefresh }: LeaderboardHeaderProps) {
  const router = useRouter();

  return (
    <>
      {/* Header Panel */}
      <div
        style={{
          width: '100%',
          maxWidth: '600px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '28px',
        }}
      >
        <button
          onClick={() => router.push('/')}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#9ca3af',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            padding: '8px 12px',
            borderRadius: '6px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#e5e7eb';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#9ca3af';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          {t('leaderboard.back')}
        </button>

        {/* Refresh button */}
        {!isFriendsCategory && (
          <button
            onClick={onRefresh}
            style={{
              background: 'transparent',
              border: `1px solid ${activeColor}30`,
              color: activeColor,
              fontSize: '12px',
              fontWeight: 700,
              padding: '6px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${activeColor}15`;
              e.currentTarget.style.borderColor = activeColor;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = `${activeColor}30`;
            }}
          >
            ⟳ {t('hud.restart')}
          </button>
        )}
      </div>

      {/* Main Glowing Title */}
      <h1
        style={{
          fontSize: '32px',
          fontWeight: 900,
          letterSpacing: '0.12em',
          textAlign: 'center',
          color: activeColor,
          textShadow: `0 0 16px ${activeGlow}, 0 0 32px ${activeColor}20`,
          margin: '0 0 24px 0',
          textTransform: 'uppercase',
          transition: 'color 0.3s, text-shadow 0.3s',
        }}
      >
        {t('leaderboard.title')}
      </h1>
    </>
  );
}
