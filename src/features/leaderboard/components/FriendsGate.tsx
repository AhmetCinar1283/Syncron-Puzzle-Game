'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { GameIcon } from '@/components/icons';

interface FriendsGateProps {
  t: (key: string) => string;
  activeColor: string;
  variant: 'unauthenticated' | 'no_friends';
  onSignIn: () => void;
}

export default function FriendsGate({ t, activeColor, variant, onSignIn }: FriendsGateProps) {
  const router = useRouter();

  if (variant === 'unauthenticated') {
    return (
      <div
        style={{
          width: '100%',
          padding: '40px 24px',
          textAlign: 'center',
          border: `1px solid ${activeColor}25`,
          background: '#11182740',
          borderRadius: '16px',
          boxShadow: `0 0 24px ${activeColor}05`,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <GameIcon name="friends" size={44} color={activeColor} />
        </div>
        <p style={{ fontSize: '15px', color: '#9ca3af', marginBottom: '20px' }}>
          {t('leaderboard.login_required')}
        </p>
        <button
          onClick={onSignIn}
          style={{
            padding: '10px 24px',
            fontSize: '13px',
            fontWeight: 700,
            borderRadius: '8px',
            border: `1px solid ${activeColor}`,
            background: `${activeColor}15`,
            color: activeColor,
            cursor: 'pointer',
            boxShadow: `0 0 14px ${activeColor}20`,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = activeColor;
            e.currentTarget.style.color = '#030712';
            e.currentTarget.style.boxShadow = `0 0 20px ${activeColor}50`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = `${activeColor}15`;
            e.currentTarget.style.color = activeColor;
            e.currentTarget.style.boxShadow = `0 0 14px ${activeColor}20`;
          }}
        >
          {t('auth.sign_in')}
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        padding: '40px 24px',
        textAlign: 'center',
        border: `1px solid ${activeColor}25`,
        background: '#11182740',
        borderRadius: '16px',
        boxShadow: `0 0 24px ${activeColor}05`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
        <GameIcon name="friends" size={44} color={activeColor} />
      </div>
      <p style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '20px' }}>
        {t('leaderboard.no_friends')}
      </p>
      <button
        onClick={() => router.push('/friends')}
        style={{
          padding: '10px 20px',
          fontSize: '12px',
          fontWeight: 700,
          borderRadius: '8px',
          border: '1px solid #1f2937',
          background: '#111827',
          color: '#e2e8f0',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#1f2937';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#111827';
        }}
      >
        {t('leaderboard.go_to_friends')}
      </button>
    </div>
  );
}
