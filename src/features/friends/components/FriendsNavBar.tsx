'use client';

import { useRouter } from 'next/navigation';
import { useT } from '@/contexts/LanguageContext';

export function FriendsNavBar({ isConnected }: { isConnected: boolean }) {
  const t = useT();
  const router = useRouter();
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
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
        {t('friends.back_menu')}
        {isConnected && (
          <span style={{
            background: '#ef4444',
            color: '#fff',
            fontSize: 9,
            fontWeight: 800,
            borderRadius: '50%',
            width: 14,
            height: 14,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginLeft: 6,
            boxShadow: '0 0 5px #ef4444'
          }}>
            B
          </span>
        )}
      </button>
    </div>
  );
}

export default FriendsNavBar;
