'use client';

import { motion } from 'framer-motion';
import { GameIcon } from '@/components/icons';
import type { AdminUserProfile as UserProfile } from '@/services/firebase/adminUsers';

export function UserDirectoryCard({
  u,
  idx,
  isTr,
  onClick,
}: {
  u: UserProfile;
  idx: number;
  isTr: boolean;
  onClick: () => void;
}) {
  const dateStr = new Date(u.createdAt).toLocaleDateString(isTr ? 'tr-TR' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <motion.div
      key={u.uid}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: idx * 0.02 }}
      onClick={onClick}
      style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(147, 51, 234, 0.15)',
        borderRadius: '12px',
        padding: '20px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: 'all 0.2s ease-in-out',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.border = '1px solid rgba(147, 51, 234, 0.5)';
        el.style.boxShadow = '0 0 20px rgba(147, 51, 234, 0.12), 0 8px 24px rgba(0,0,0,0.3)';
        el.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.border = '1px solid rgba(147, 51, 234, 0.15)';
        el.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        el.style.transform = 'translateY(0)';
      }}
    >
      {/* Identity Line */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '15px', fontWeight: 800, color: '#f1f5f9' }}>
            {u.displayName || (isTr ? 'İsimsiz Oyuncu' : 'Anonymous Player')}
          </span>
          <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
            UID: {u.uid.slice(0, 10)}...{u.uid.slice(-6)}
          </span>
        </div>

        {/* Gamer Tag Badge */}
        {u.tag && (
          <span
            style={{
              background: 'rgba(147, 51, 234, 0.1)',
              border: '1px solid rgba(147, 51, 234, 0.3)',
              color: '#9333ea',
              fontSize: '10px',
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: '6px',
              textShadow: '0 0 5px rgba(147, 51, 234, 0.3)',
            }}
          >
            #{u.tag}
          </span>
        )}
      </div>

      {/* Email or Anonymous Notice */}
      <div style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <GameIcon name="mail" size={12} color="#94a3b8" />
        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
          {u.email || (isTr ? 'Anonim Giriş (E-posta yok)' : 'Anonymous Session (No Email)')}
        </span>
      </div>

      <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.05)', margin: '4px 0' }} />

      {/* Badges and Metrics */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
        {/* Role Badge */}
        <span
          style={{
            fontSize: '10px',
            fontWeight: 900,
            textTransform: 'uppercase',
            padding: '2px 6px',
            borderRadius: '5px',
            border:
              u.role === 'admin'
                ? '1px solid rgba(236, 72, 153, 0.4)'
                : u.role === 'moderator'
                ? '1px solid rgba(6, 182, 212, 0.4)'
                : '1px solid rgba(100, 116, 139, 0.25)',
            color: u.role === 'admin' ? '#ec4899' : u.role === 'moderator' ? '#06b6d4' : '#94a3b8',
            background:
              u.role === 'admin'
                ? 'rgba(236, 72, 153, 0.06)'
                : u.role === 'moderator'
                ? 'rgba(6, 182, 212, 0.06)'
                : 'rgba(255, 255, 255, 0.01)',
          }}
        >
          {u.role}
        </span>

        {/* Auth Provider Badge */}
        <span
          style={{
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
            padding: '2px 6px',
            borderRadius: '5px',
            background:
              u.authProvider === 'google'
                ? 'rgba(59, 130, 246, 0.1)'
                : u.authProvider === 'email'
                ? 'rgba(16, 185, 129, 0.1)'
                : 'rgba(245, 158, 11, 0.1)',
            border:
              u.authProvider === 'google'
                ? '1px solid rgba(59, 130, 246, 0.3)'
                : u.authProvider === 'email'
                ? '1px solid rgba(16, 185, 129, 0.3)'
                : '1px solid rgba(245, 158, 11, 0.3)',
            color: u.authProvider === 'google' ? '#60a5fa' : u.authProvider === 'email' ? '#34d399' : '#fbbf24',
          }}
        >
          {u.authProvider}
        </span>

        {/* Score and Completion Metrics */}
        <span style={{ fontSize: '11px', color: '#64748b', marginLeft: 'auto', display: 'flex', gap: '10px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <GameIcon name="trophy" size={11} color="#00ff88" />
            <b>{u.totalScore}</b>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <GameIcon name="flag" size={11} color="#00c4ff" />
            <b>{u.completedCount}</b>
          </span>
        </span>
      </div>

      {/* Joined Date Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: '#475569' }}>
        <span>{isTr ? `Kayıt: ${dateStr}` : `Registered: ${dateStr}`}</span>
        <span style={{ color: '#9333ea', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span>{isTr ? 'GÖRÜNTÜLE' : 'VIEW WORKSPACE'}</span>
          <GameIcon name="arrow-right" size={10} color="#9333ea" />
        </span>
      </div>
    </motion.div>
  );
}
