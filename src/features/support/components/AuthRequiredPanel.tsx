'use client';

import { motion } from 'framer-motion';
import { GameIcon } from '@/components/icons';

export function AuthRequiredPanel({
  isTr,
  errAnonText,
  signInLabel,
  onSignIn,
}: {
  isTr: boolean;
  errAnonText: string;
  signInLabel: string;
  onSignIn: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: 'rgba(10, 15, 26, 0.7)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(236, 72, 153, 0.25)',
        borderRadius: '16px',
        padding: '36px',
        textAlign: 'center',
        boxShadow: '0 0 30px rgba(236, 72, 153, 0.05), 0 10px 40px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
      }}
    >
      <GameIcon
        name="warning"
        size={48}
        color="#ec4899"
        style={{ filter: 'drop-shadow(0 0 16px rgba(236, 72, 153, 0.4))' }}
      />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#ec4899', margin: 0 }}>
          {isTr ? 'Üye Girişi Gerekli' : 'Authentication Required'}
        </h2>
        <p style={{ fontSize: '14px', color: '#9ca3af', margin: 0, lineHeight: 1.6, maxWidth: '400px' }}>
          {errAnonText}
        </p>
      </div>
      <button
        onClick={onSignIn}
        style={{
          background: 'rgba(236, 72, 153, 0.1)',
          border: '1px solid #ec4899',
          color: '#ec4899',
          padding: '12px 32px',
          fontSize: '14px',
          fontWeight: 700,
          borderRadius: '8px',
          cursor: 'pointer',
          letterSpacing: '0.05em',
          transition: 'all 0.2s',
          boxShadow: '0 0 15px rgba(236, 72, 153, 0.1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(236, 72, 153, 0.2)';
          e.currentTarget.style.boxShadow = '0 0 25px rgba(236, 72, 153, 0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(236, 72, 153, 0.1)';
          e.currentTarget.style.boxShadow = '0 0 15px rgba(236, 72, 153, 0.1)';
        }}
      >
        {signInLabel}
      </button>
    </motion.div>
  );
}
