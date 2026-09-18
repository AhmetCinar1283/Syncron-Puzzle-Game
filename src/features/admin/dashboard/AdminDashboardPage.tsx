'use client';

import { motion } from 'framer-motion';
import { GameIcon } from '@/components/icons';
import { AdminCard } from './components/AdminCard';
import { useAdminDashboard } from './hooks/useAdminDashboard';

export default function AdminDashboardPage() {
  const { router, role, loading, particles, unreadTicketsCount } = useAdminDashboard();

  if (loading || role !== 'admin') {
    return (
      <main style={{ minHeight: '100dvh', background: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#00ff88', fontSize: 12, letterSpacing: '0.1em' }}>LOADING...</span>
      </main>
    );
  }

  const adminModules = [
    {
      path: '/admin/level-parts',
      label: 'Level Parts',
      sub: 'Manage level groups & structure',
      icon: 'grid',
      color: '#00c4ff' // Cyan
    },
    {
      path: '/admin/daily-calendar',
      label: 'Daily Puzzle',
      sub: 'Plan & approve daily puzzles',
      icon: 'star',
      color: '#ffd700' // Gold
    },
    {
      path: '/admin/pending-request-levels',
      label: 'Requests',
      sub: 'Review user submitted levels',
      icon: 'hourglass',
      color: '#ffd700' // Gold
    },
    {
      path: '/admin/support',
      label: 'Support',
      sub: 'Manage support tickets',
      icon: 'mail',
      color: '#fbbf24', // Amber/Orange
      unreadCount: unreadTicketsCount
    },
    {
      path: '/admin/reports',
      label: 'Reports',
      sub: 'Check level complaints & issues',
      icon: 'warning',
      color: '#ec4899' // Pink
    },
    {
      path: '/admin/level-analytics',
      label: 'Analytics',
      sub: 'Monitor level quality & telemetry',
      icon: 'bar-chart',
      color: '#10b981' // Emerald
    },
    {
      path: '/admin/users',
      label: 'Users',
      sub: 'Manage accounts & bans',
      icon: 'user',
      color: '#9333ea' // Purple
    }
  ];

  return (
    <>
      {/* Background Particles */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            style={{
              position: 'absolute',
              top: 0, left: 0,
              width: p.size, height: p.size,
              borderRadius: p.borderRadius,
              background: p.color,
              boxShadow: p.glow,
            }}
            animate={{
              x: [p.startX, p.startX + p.driftX],
              y: [p.startY, -50],
              opacity: [0, p.opacity, p.opacity, 0],
            }}
            transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'linear' }}
          />
        ))}
      </div>

      <main
        style={{
          position: 'relative',
          zIndex: 1,
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '48px 24px',
          boxSizing: 'border-box',
          gap: 48,
        }}
      >
        {/* Header Section */}
        <div style={{ width: '100%', maxWidth: 500, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <button
            onClick={() => router.push('/')}
            style={{
              alignSelf: 'flex-start',
              background: 'transparent',
              border: '1px solid #00ff8840',
              color: '#00ff88',
              padding: '8px 16px',
              borderRadius: 8,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.1em',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#00ff8815';
              e.currentTarget.style.boxShadow = '0 0 12px #00ff8830';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <GameIcon name="arrow-left" size={12} color="#00ff88" />
            <span>BACK TO HOME</span>
          </button>

          <div>
            <h1
              style={{
                fontSize: 32,
                fontWeight: 900,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: '#fff',
                textShadow: '0 0 20px rgba(255,255,255,0.3)',
                margin: '0 0 8px 0',
              }}
            >
              System <span style={{ color: '#00ff88', textShadow: '0 0 20px rgba(0,255,136,0.5)' }}>Admin</span>
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#4b5563', fontSize: 12, letterSpacing: '0.15em' }}>
              <span style={{ color: '#00ff88' }}>●</span>
              <span>CONNECTION SECURE</span>
            </div>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div
          style={{
            width: '100%',
            maxWidth: 500,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 20
          }}
        >
          {adminModules.map((mod) => (
            <AdminCard
              key={mod.path}
              label={mod.label}
              sub={mod.sub}
              icon={mod.icon}
              color={mod.color}
              onClick={() => router.push(mod.path)}
              unreadCount={mod.unreadCount}
            />
          ))}
        </div>
      </main>
    </>
  );
}
