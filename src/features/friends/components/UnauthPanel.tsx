'use client';

import { useT } from '@/contexts/LanguageContext';

export function UnauthPanel({ onSignIn }: { onSignIn: () => void }) {
  const t = useT();
  return (
    <div
      style={{
        background: 'linear-gradient(to bottom, #0a0f1a, #070a12)',
        border: '1px solid rgba(236, 72, 153, 0.2)',
        borderRadius: '16px',
        padding: '40px 24px',
        textAlign: 'center',
        boxShadow: '0 0 30px rgba(236, 72, 153, 0.03)',
      }}
    >
      <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>👥</span>
      <p style={{ fontSize: '15px', color: '#9ca3af', marginBottom: '24px' }}>
        {t('friends.login_required')}
      </p>
      <button
        onClick={onSignIn}
        style={{
          padding: '12px 28px',
          fontSize: '14px',
          fontWeight: 700,
          borderRadius: '8px',
          border: '1px solid #ec4899',
          background: 'rgba(236, 72, 153, 0.15)',
          color: '#ec4899',
          cursor: 'pointer',
          boxShadow: '0 0 14px rgba(236, 72, 153, 0.2)',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#ec4899';
          e.currentTarget.style.color = '#030712';
          e.currentTarget.style.boxShadow = '0 0 20px rgba(236, 72, 153, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(236, 72, 153, 0.15)';
          e.currentTarget.style.color = '#ec4899';
          e.currentTarget.style.boxShadow = '0 0 14px rgba(236, 72, 153, 0.2)';
        }}
      >
        {t('auth.sign_in')}
      </button>
    </div>
  );
}

export default UnauthPanel;
