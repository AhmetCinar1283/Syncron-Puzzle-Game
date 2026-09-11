'use client';

import { BUTTONS_MAP } from '../lib/constants';

export function GamepadTester({
  t,
  isConnected,
  gamepad,
  axes,
  activeButtons,
}: {
  t: (key: string, params?: Record<string, string | number>) => string;
  isConnected: boolean;
  gamepad: Gamepad | null;
  axes: number[];
  activeButtons: Record<number, boolean>;
}) {
  return (
    <div
      style={{
        background: 'rgba(15, 23, 42, 0.35)',
        border: '1px solid rgba(251, 191, 36, 0.2)',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 840,
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <h2
        style={{
          fontSize: 16,
          fontWeight: 800,
          color: '#fbbf24',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          margin: '0 0 8px 0',
        }}
      >
        {t('controls.tester_title')}
      </h2>
      <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 24px 0' }}>
        {t('controls.tester_desc')}
      </p>

      {/* Gamepad Connection status banner */}
      <div
        style={{
          padding: '12px 18px',
          borderRadius: 8,
          background: isConnected ? 'rgba(0, 255, 136, 0.06)' : 'rgba(251, 191, 36, 0.06)',
          border: `1px solid ${isConnected ? 'rgba(0, 255, 136, 0.2)' : 'rgba(251, 191, 36, 0.2)'}`,
          color: isConnected ? '#00ff88' : '#fbbf24',
          fontSize: 12,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
          boxShadow: isConnected ? '0 0 10px rgba(0,255,136,0.05)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: isConnected ? '#00ff88' : '#fbbf24',
              boxShadow: isConnected ? '0 0 8px #00ff88' : '0 0 8px #fbbf24',
            }}
          />
          <span>
            {isConnected
              ? t('controls.gamepad_connected', { name: gamepad?.id || 'Controller' })
              : t('controls.gamepad_disconnected')}
          </span>
        </div>
        {isConnected && (
          <span style={{ fontSize: 9, opacity: 0.6, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            INDEX #{gamepad?.index}
          </span>
        )}
      </div>

      {/* Visual Tester Components */}
      {isConnected && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 2fr',
            gap: 24,
            alignItems: 'start',
          }}
        >
          {/* Left Column: Analog Stick Display */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'rgba(0,0,0,0.15)',
              padding: 20,
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
              Left Stick
            </span>

            {/* Joystick container */}
            <div
              style={{
                position: 'relative',
                width: 100,
                height: 100,
                borderRadius: '50%',
                background: '#111827',
                border: '2px solid rgba(255, 255, 255, 0.15)',
                boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              {/* Grid Lines inside stick */}
              <div style={{ position: 'absolute', width: '100%', height: 1, background: 'rgba(255,255,255,0.03)' }} />
              <div style={{ position: 'absolute', width: 1, height: '100%', background: 'rgba(255,255,255,0.03)' }} />

              {/* Floating Thumb Stick */}
              <div
                style={{
                  position: 'absolute',
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, #374151 0%, #1f2937 100%)',
                  border: '2px solid #4b5563',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.4), inset 0 2px 2px rgba(255,255,255,0.1)',
                  transform: `translate(${axes[0] * 30}px, ${axes[1] * 30}px)`,
                  transition: 'transform 0.05s ease-out',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Glowing center indicator */}
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: (Math.abs(axes[0]) > 0.1 || Math.abs(axes[1]) > 0.1) ? '#00ff88' : '#64748b',
                    boxShadow: (Math.abs(axes[0]) > 0.1 || Math.abs(axes[1]) > 0.1) ? '0 0 8px #00ff88' : 'none',
                  }}
                />
              </div>
            </div>

            {/* Coordinate Readouts */}
            <div style={{ display: 'flex', gap: 12, fontSize: 10, fontFamily: 'monospace', color: '#64748b' }}>
              <span>X: <span style={{ color: Math.abs(axes[0]) > 0.1 ? '#00ff88' : '#94a3b8' }}>{axes[0].toFixed(2)}</span></span>
              <span>Y: <span style={{ color: Math.abs(axes[1]) > 0.1 ? '#00ff88' : '#94a3b8' }}>{axes[1].toFixed(2)}</span></span>
            </div>
          </div>

          {/* Right Column: Button indicators */}
          <div
            style={{
              background: 'rgba(0,0,0,0.15)',
              padding: 20,
              borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <span style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>
              Button States
            </span>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                gap: 8,
              }}
            >
              {BUTTONS_MAP.map((btn) => {
                const active = !!activeButtons[btn.index];
                let color = 'rgba(255, 255, 255, 0.03)';
                let border = '1px solid rgba(255, 255, 255, 0.08)';
                let textColor = '#64748b';
                let glow = 'none';

                if (active) {
                  glow = '0 0 10px rgba(0, 255, 136, 0.4)';
                  color = 'rgba(0, 255, 136, 0.12)';
                  border = '1px solid #00ff88';
                  textColor = '#00ff88';
                } else if (btn.role === 'move') {
                  border = '1px solid rgba(0, 196, 255, 0.15)';
                  textColor = '#00c4ff80';
                } else if (btn.role === 'restart') {
                  border = '1px solid rgba(251, 191, 36, 0.15)';
                  textColor = '#fbbf2480';
                } else if (btn.role === 'menu') {
                  border = '1px solid rgba(249, 115, 22, 0.15)';
                  textColor = '#f9731680';
                }

                return (
                  <div
                    key={btn.index}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 8,
                      background: color,
                      border: border,
                      color: textColor,
                      textAlign: 'center',
                      fontSize: 10,
                      fontWeight: active ? 700 : 500,
                      boxShadow: glow,
                      transition: 'all 0.08s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 3,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <span style={{ fontSize: 9, opacity: 0.5, fontStyle: 'italic' }}>#{btn.index}</span>
                    <span style={{ whiteSpace: 'nowrap' }}>{btn.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
