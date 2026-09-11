'use client';

import { useControlsPage } from '../hooks/useControlsPage';
import { BackgroundParticles } from './BackgroundParticles';
import { KeyboardCard } from './KeyboardCard';
import { GamepadMappingCard } from './GamepadMappingCard';
import { GamepadTester } from './GamepadTester';

export function ControlsPage() {
  const { t, router, particles, activeButtons, axes, gamepad, isConnected } = useControlsPage();

  return (
    <>
      {/* Head details for SEO */}
      <title>{`${t('controls.title')} | Syncron`}</title>
      <meta name="description" content="Learn how to play Syncron using Gamepad or Keyboard. View the interactive control scheme." />

      {/* Background Particles */}
      <BackgroundParticles particles={particles} />

      <main
        style={{
          position: 'relative',
          zIndex: 1,
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: '#030712',
          padding: '40px 16px',
          boxSizing: 'border-box',
          color: '#ffffff',
          fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
          overflowY: 'auto',
        }}
      >
        {/* Top Header */}
        <div style={{ width: '100%', maxWidth: 840, display: 'flex', justifyContent: 'flex-start', marginBottom: 24 }}>
          <button
            onClick={() => router.push('/')}
            id="back-btn"
            style={{
              background: 'rgba(0, 255, 136, 0.05)',
              border: '1px solid rgba(0, 255, 136, 0.25)',
              color: '#00ff88',
              padding: '8px 16px',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              boxShadow: '0 0 10px rgba(0,255,136,0.06)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 255, 136, 0.12)';
              e.currentTarget.style.boxShadow = '0 0 15px rgba(0,255,136,0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0, 255, 136, 0.05)';
              e.currentTarget.style.boxShadow = '0 0 10px rgba(0,255,136,0.06)';
            }}
          >
            {t('controls.back')}
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

        {/* Page Titles */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 900,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#00ff88',
              textShadow: '0 0 15px rgba(0,255,136,0.4)',
              margin: '0 0 8px 0',
            }}
          >
            {t('controls.title')}
          </h1>
          <p
            style={{
              fontSize: 12,
              color: '#64748b',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            {t('controls.subtitle')}
          </p>
        </div>

        {/* Main Grid: Keyboard & Gamepad Details */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: 24,
            width: '100%',
            maxWidth: 840,
            marginBottom: 32,
          }}
        >
          <KeyboardCard t={t} />
          <GamepadMappingCard t={t} />
        </div>

        {/* Live Gamepad Tester Card */}
        <GamepadTester t={t} isConnected={isConnected} gamepad={gamepad} axes={axes} activeButtons={activeButtons} />
      </main>
    </>
  );
}
