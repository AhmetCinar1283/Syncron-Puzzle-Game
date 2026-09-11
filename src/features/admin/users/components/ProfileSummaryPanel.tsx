'use client';

import type { UserProfileData } from '../lib/types';

export function ProfileSummaryPanel({ profile, isTr }: { profile: UserProfileData; isTr: boolean }) {
  return (
    <section
      style={{
        background: 'rgba(255, 255, 255, 0.01)',
        border: '1px solid rgba(147, 51, 234, 0.18)',
        borderRadius: '16px',
        padding: '24px 32px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2), inset 0 0 15px rgba(147, 51, 234, 0.02)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '24px',
        position: 'relative',
      }}
    >
      {/* Decorative glowing gradient backdrop */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '120px',
          height: '100%',
          background: 'linear-gradient(to left, rgba(147, 51, 234, 0.04), transparent)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#00ff88',
              boxShadow: '0 0 8px #00ff88',
            }}
          />
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#f1f5f9' }}>
            {profile.displayName || (isTr ? 'İsimsiz Oyuncu' : 'Anonymous Player')}
          </h2>
          {profile.tag && (
            <span style={{ fontSize: '13px', color: '#9333ea', fontWeight: 800, background: 'rgba(147,51,234,0.1)', padding: '2px 8px', borderRadius: '6px' }}>
              #{profile.tag}
            </span>
          )}
        </div>
        <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>UID: {profile.uid}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: '10px', color: '#475569', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {isTr ? 'E-POSTA ADRESİ' : 'EMAIL ADDRESS'}
        </span>
        <span style={{ fontSize: '13px', color: '#94a3b8', textOverflow: 'ellipsis', overflow: 'hidden' }}>
          {profile.email || (isTr ? 'Anonim Giriş (E-posta yok)' : 'Anonymous Session (No Email)')}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: '10px', color: '#475569', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {isTr ? 'BAĞLANTI TÜRÜ' : 'AUTH PROVIDER'}
        </span>
        <span style={{ fontSize: '13px', color: '#fbbf24', textTransform: 'uppercase', fontWeight: 700 }}>⚡ {profile.authProvider}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: '10px', color: '#475569', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {isTr ? 'SİSTEM YETKİSİ' : 'SYSTEM ROLE'}
        </span>
        <span
          style={{
            fontSize: '13px',
            color: profile.role === 'admin' ? '#ec4899' : profile.role === 'moderator' ? '#00c4ff' : '#94a3b8',
            fontWeight: 800,
            textTransform: 'uppercase',
          }}
        >
          ✦ {profile.role}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: '10px', color: '#475569', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {isTr ? 'TOPLAM PUAN' : 'TOTAL SCORE'}
        </span>
        <span style={{ fontSize: '16px', color: '#00ff88', fontWeight: 900, textShadow: '0 0 8px rgba(0,255,136,0.3)' }}>
          🏆 {profile.totalScore}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: '10px', color: '#475569', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {isTr ? 'BİTEN SEVİYE' : 'COMPLETED LEVELS'}
        </span>
        <span style={{ fontSize: '16px', color: '#00c4ff', fontWeight: 900, textShadow: '0 0 8px rgba(0,196,255,0.3)' }}>
          🏁 {profile.completedCount}
        </span>
      </div>
    </section>
  );
}
