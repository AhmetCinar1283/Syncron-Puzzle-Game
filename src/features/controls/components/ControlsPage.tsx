'use client';

import React, { useMemo } from 'react';
import { useGameTheme } from '@/game-engine/contexts/GameThemeContext';
import { useControlsPage, type ControlsTab } from '../hooks/useControlsPage';
import { KeyboardCard } from './KeyboardCard';
import { GamepadMappingCard } from './GamepadMappingCard';
import { GamepadTester } from './GamepadTester';
import { TouchControlsCard } from './TouchControlsCard';
import { GameIcon } from '@/components/icons';

function hexToRgba(hex: string, alpha: number): string {
  if (!hex || !hex.startsWith('#')) return `rgba(0, 255, 136, ${alpha})`;
  let c = hex.slice(1);
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const num = parseInt(c, 16);
  if (Number.isNaN(num)) return `rgba(0, 255, 136, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function ControlsPage() {
  const { theme, themeConfig } = useGameTheme();
  const {
    t,
    activeButtons,
    axes,
    gamepad,
    isConnected,
    pressedKeys,
    activeTab,
    setActiveTab,
    activeInputMode,
    lastSwipeDir,
    handleTestSwipe,
    handleBack,
  } = useControlsPage();

  // Compute theme CSS custom variables
  const themeVars = useMemo(() => {
    const accent = themeConfig.accentColor || '#00c4ff';
    const glow = themeConfig.accentGlow || hexToRgba(accent, 0.4);
    const isArcade = theme === 'arcade';

    return {
      '--ctrl-accent': accent,
      '--ctrl-accent-glow': glow,
      '--ctrl-accent-soft': hexToRgba(accent, 0.15),
      '--ctrl-accent-mid': hexToRgba(accent, 0.35),
      '--ctrl-radius': isArcade ? '0px' : '12px',
      '--ctrl-card-radius': isArcade ? '0px' : '16px',
      '--ctrl-btn-radius': isArcade ? '0px' : '8px',
    } as React.CSSProperties;
  }, [theme, themeConfig]);

  const tabs: { id: ControlsTab; label: string; icon: 'grid' | 'keyboard' | 'gamepad' | 'joystick' }[] = [
    { id: 'all', label: t('controls.tab_all'), icon: 'grid' },
    { id: 'keyboard', label: t('controls.tab_keyboard'), icon: 'keyboard' },
    { id: 'gamepad', label: t('controls.tab_gamepad'), icon: 'gamepad' },
    { id: 'touch', label: t('controls.tab_touch'), icon: 'joystick' },
  ];

  return (
    <>
      {/* Head details for SEO */}
      <title>{`${t('controls.title')} | Syncron`}</title>
      <meta
        name="description"
        content="Learn how to play Syncron using Gamepad, Keyboard or Touch swipe. Interactive control scheme."
      />

      <main
        style={{
          ...themeVars,
          position: 'relative',
          zIndex: 1,
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: 'transparent',
          padding: 'clamp(16px, 4vw, 36px) clamp(10px, 3vw, 20px) 48px',
          boxSizing: 'border-box',
          color: '#ffffff',
          fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
          overflowY: 'auto',
        }}
      >
        {/* Outer Arcade HUD Shell */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 880,
            display: 'flex',
            flexDirection: 'column',
            gap: 'clamp(14px, 3vw, 24px)',
            background: themeConfig.board.background || 'rgba(6, 13, 26, 0.88)',
            border: `2px solid var(--ctrl-accent-mid, rgba(0, 196, 255, 0.35))`,
            borderRadius: 'var(--ctrl-card-radius, 16px)',
            padding: 'clamp(14px, 3.5vw, 28px)',
            boxShadow: `0 0 35px var(--ctrl-accent-glow, rgba(0, 196, 255, 0.2)), inset 0 0 28px rgba(0, 0, 0, 0.85)`,
            boxSizing: 'border-box',
          }}
        >
          {/* CRT scanline texture overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 0,
              borderRadius: 'inherit',
              overflow: 'hidden',
              pointerEvents: 'none',
              background: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.22) 50%)',
              backgroundSize: '100% 4px',
              opacity: theme === 'arcade' ? 0.35 : 0.15,
            }}
          />

          {/* Cyber Corner Decals (┌ ┐ └ ┘) */}
          <div
            style={{
              position: 'absolute',
              top: 6,
              left: 6,
              width: 12,
              height: 12,
              borderTop: '2px solid var(--ctrl-accent, #00c4ff)',
              borderLeft: '2px solid var(--ctrl-accent, #00c4ff)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
              width: 12,
              height: 12,
              borderTop: '2px solid var(--ctrl-accent, #00c4ff)',
              borderRight: '2px solid var(--ctrl-accent, #00c4ff)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 6,
              left: 6,
              width: 12,
              height: 12,
              borderBottom: '2px solid var(--ctrl-accent, #00c4ff)',
              borderLeft: '2px solid var(--ctrl-accent, #00c4ff)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 6,
              right: 6,
              width: 12,
              height: 12,
              borderBottom: '2px solid var(--ctrl-accent, #00c4ff)',
              borderRight: '2px solid var(--ctrl-accent, #00c4ff)',
              pointerEvents: 'none',
            }}
          />

          {/* Top Bar Navigation */}
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 10,
            }}
          >
            {/* Back Button */}
            <button
              onClick={handleBack}
              id="back-btn"
              type="button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--ctrl-accent-soft, rgba(0, 196, 255, 0.08))',
                border: '1px solid var(--ctrl-accent-mid, rgba(0, 196, 255, 0.3))',
                color: 'var(--ctrl-accent, #00c4ff)',
                padding: '8px 14px',
                borderRadius: 'var(--ctrl-btn-radius, 8px)',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                boxShadow: '0 0 12px var(--ctrl-accent-soft, rgba(0, 196, 255, 0.15))',
                transition: 'all 0.15s ease',
              }}
            >
              <GameIcon name="arrow-left" size={14} color="var(--ctrl-accent, #00c4ff)" />
              <span>{t('controls.back')}</span>
              {isConnected ? (
                <span
                  style={{
                    background: '#ef4444',
                    color: '#fff',
                    fontSize: 9,
                    fontWeight: 900,
                    borderRadius: '50%',
                    width: 16,
                    height: 16,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: 4,
                    boxShadow: '0 0 6px #ef4444',
                  }}
                >
                  B
                </span>
              ) : (
                <span
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: '#94a3b8',
                    fontSize: 8,
                    fontWeight: 700,
                    borderRadius: 3,
                    padding: '2px 4px',
                    marginLeft: 4,
                    fontFamily: 'monospace',
                  }}
                >
                  ESC
                </span>
              )}
            </button>

            {/* Active Input Status Pill */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(0, 0, 0, 0.45)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '5px 12px',
                borderRadius: 20,
                fontSize: 10,
                fontWeight: 700,
                color: '#94a3b8',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: 'var(--ctrl-accent, #00c4ff)',
                  boxShadow: '0 0 8px var(--ctrl-accent, #00c4ff)',
                }}
              />
              <span>
                {t('controls.active_input')}:{' '}
                <strong style={{ color: 'var(--ctrl-accent, #00c4ff)' }}>
                  {activeInputMode}
                </strong>
              </span>
            </div>
          </div>

          {/* Header Title & Subtitle */}
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              margin: '6px 0 10px',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 10,
                fontWeight: 900,
                color: 'var(--ctrl-accent, #00c4ff)',
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                opacity: 0.85,
              }}
            >
              <span>SYNCRON // INPUT SYSTEM</span>
              <span>•</span>
              <span>{theme.toUpperCase()}</span>
            </div>

            <h1
              style={{
                fontSize: 'clamp(24px, 5.5vw, 36px)',
                fontWeight: 900,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'var(--ctrl-accent, #00c4ff)',
                textShadow: '0 0 20px var(--ctrl-accent-glow, rgba(0, 196, 255, 0.5))',
                margin: 0,
                lineHeight: 1.1,
              }}
            >
              {t('controls.title')}
            </h1>

            <p
              style={{
                fontSize: 'clamp(11px, 2.5vw, 13px)',
                color: '#94a3b8',
                letterSpacing: '0.06em',
                margin: 0,
                maxWidth: 480,
              }}
            >
              {t('controls.subtitle')}
            </p>
          </div>

          {/* Segmented Filter Tabs */}
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: 6,
              padding: 4,
              background: 'rgba(0, 0, 0, 0.35)',
              borderRadius: 'var(--ctrl-radius, 10px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              width: '100%',
              maxWidth: 520,
              margin: '0 auto',
              boxSizing: 'border-box',
            }}
          >
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    flex: '1 1 auto',
                    minWidth: 70,
                    padding: '8px 12px',
                    borderRadius: 'var(--ctrl-btn-radius, 8px)',
                    background: active ? 'var(--ctrl-accent, #00c4ff)' : 'transparent',
                    border: active ? '1.5px solid #ffffff' : '1px solid transparent',
                    color: active ? '#000000' : '#94a3b8',
                    fontSize: 11,
                    fontWeight: active ? 900 : 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    boxShadow: active
                      ? '0 0 16px var(--ctrl-accent-glow, rgba(0, 196, 255, 0.5))'
                      : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <GameIcon
                    name={tab.icon}
                    size={14}
                    color={active ? '#000000' : '#94a3b8'}
                  />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Main Controls Content Grid */}
          <div
            style={{
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 'clamp(14px, 3vw, 24px)',
              width: '100%',
            }}
          >
            {/* Tab: ALL or KEYBOARD */}
            {(activeTab === 'all' || activeTab === 'keyboard') && (
              <KeyboardCard t={t} pressedKeys={pressedKeys} />
            )}

            {/* Tab: ALL or GAMEPAD */}
            {(activeTab === 'all' || activeTab === 'gamepad') && (
              <>
                <GamepadMappingCard
                  t={t}
                  activeButtons={activeButtons}
                  isConnected={isConnected}
                />
                <GamepadTester
                  t={t}
                  isConnected={isConnected}
                  gamepad={gamepad}
                  axes={axes}
                  activeButtons={activeButtons}
                />
              </>
            )}

            {/* Tab: ALL or TOUCH */}
            {(activeTab === 'all' || activeTab === 'touch') && (
              <TouchControlsCard
                t={t}
                lastSwipeDir={lastSwipeDir}
                onTestSwipe={handleTestSwipe}
              />
            )}
          </div>
        </div>
      </main>
    </>
  );
}
