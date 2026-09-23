'use client';

import React from 'react';
import { BUTTONS_MAP } from '../lib/constants';
import { GameIcon } from '@/components/icons';

interface GamepadTesterProps {
  t: (key: string, params?: Record<string, string | number>) => string;
  isConnected: boolean;
  gamepad: Gamepad | null;
  axes: number[];
  activeButtons: Record<number, boolean>;
}

export function GamepadTester({
  t,
  isConnected,
  gamepad,
  axes,
  activeButtons,
}: GamepadTesterProps) {
  const stickX = axes[0] ?? 0;
  const stickY = axes[1] ?? 0;
  const isStickActive = Math.abs(stickX) > 0.1 || Math.abs(stickY) > 0.1;

  return (
    <div
      style={{
        background: 'rgba(10, 18, 32, 0.75)',
        border: '1px solid var(--ctrl-accent-soft, rgba(251, 191, 36, 0.2))',
        borderRadius: 'var(--ctrl-card-radius, 16px)',
        padding: 'clamp(16px, 4vw, 24px)',
        width: '100%',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(16px)',
        boxSizing: 'border-box',
      }}
    >
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <GameIcon name="lightning" size={20} color="var(--ctrl-accent, #fbbf24)" />
        <h2
          style={{
            fontSize: 'clamp(15px, 3.5vw, 17px)',
            fontWeight: 900,
            color: 'var(--ctrl-accent, #fbbf24)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          {t('controls.tester_title')}
        </h2>
      </div>

      <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 18px 0', lineHeight: 1.5 }}>
        {t('controls.tester_desc')}
      </p>

      {/* Gamepad Connection status banner */}
      <div
        style={{
          padding: '10px 16px',
          borderRadius: 'var(--ctrl-radius, 10px)',
          background: isConnected
            ? 'var(--ctrl-accent-soft, rgba(0, 255, 136, 0.1))'
            : 'rgba(255, 255, 255, 0.04)',
          border: isConnected
            ? '1.5px solid var(--ctrl-accent, #00ff88)'
            : '1px solid rgba(255, 255, 255, 0.1)',
          color: isConnected ? 'var(--ctrl-accent, #00ff88)' : '#94a3b8',
          fontSize: 12,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 20,
          boxShadow: isConnected
            ? '0 0 14px var(--ctrl-accent-glow, rgba(0, 255, 136, 0.25))'
            : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: isConnected ? 'var(--ctrl-accent, #00ff88)' : '#64748b',
              boxShadow: isConnected
                ? '0 0 8px var(--ctrl-accent, #00ff88)'
                : 'none',
            }}
          />
          <span>
            {isConnected
              ? t('controls.gamepad_connected', { name: gamepad?.id ? gamepad.id.slice(0, 36) : 'Controller' })
              : t('controls.gamepad_disconnected')}
          </span>
        </div>
        {isConnected && (
          <span style={{ fontSize: 9, opacity: 0.75, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'monospace' }}>
            PORT #{gamepad?.index ?? 0}
          </span>
        )}
      </div>

      {/* Visual Tester Components */}
      {isConnected ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 18,
            alignItems: 'start',
          }}
        >
          {/* Column 1: Analog Stick Calibration Radar */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '18px 14px',
              borderRadius: 'var(--ctrl-radius, 12px)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <span
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 16,
              }}
            >
              {t('controls.analog_stick')}
            </span>

            {/* Joystick Radar Circle */}
            <div
              style={{
                position: 'relative',
                width: 110,
                height: 110,
                borderRadius: '50%',
                background: 'radial-gradient(circle, #0f172a 0%, #030712 100%)',
                border: isStickActive
                  ? '2px solid var(--ctrl-accent, #00ff88)'
                  : '2px solid rgba(255, 255, 255, 0.15)',
                boxShadow: isStickActive
                  ? '0 0 16px var(--ctrl-accent-glow, rgba(0, 255, 136, 0.3)), inset 0 2px 10px rgba(0,0,0,0.8)'
                  : 'inset 0 2px 10px rgba(0,0,0,0.8)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14,
                transition: 'border-color 0.1s ease, box-shadow 0.1s ease',
              }}
            >
              {/* Radar Crosshair lines */}
              <div style={{ position: 'absolute', width: '100%', height: 1, background: 'rgba(255, 255, 255, 0.08)' }} />
              <div style={{ position: 'absolute', width: 1, height: '100%', background: 'rgba(255, 255, 255, 0.08)' }} />
              <div
                style={{
                  position: 'absolute',
                  width: 55,
                  height: 55,
                  borderRadius: '50%',
                  border: '1px dashed rgba(255, 255, 255, 0.06)',
                }}
              />

              {/* Floating Thumb Stick */}
              <div
                style={{
                  position: 'absolute',
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, #334155 0%, #0f172a 100%)',
                  border: isStickActive ? '2px solid var(--ctrl-accent, #00ff88)' : '2px solid #475569',
                  boxShadow: isStickActive
                    ? '0 0 10px var(--ctrl-accent-glow, rgba(0, 255, 136, 0.4)), inset 0 1px 2px rgba(255,255,255,0.2)'
                    : '0 4px 10px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.1)',
                  transform: `translate(${stickX * 32}px, ${stickY * 32}px)`,
                  transition: 'transform 0.04s ease-out',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Glowing center pip */}
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: isStickActive ? 'var(--ctrl-accent, #00ff88)' : '#64748b',
                    boxShadow: isStickActive ? '0 0 8px var(--ctrl-accent, #00ff88)' : 'none',
                  }}
                />
              </div>
            </div>

            {/* Coordinate Readouts */}
            <div
              style={{
                display: 'flex',
                gap: 14,
                fontSize: 11,
                fontFamily: 'monospace',
                background: 'rgba(0, 0, 0, 0.4)',
                padding: '4px 12px',
                borderRadius: 6,
                border: '1px solid rgba(255, 255, 255, 0.05)',
              }}
            >
              <span>
                X:{' '}
                <strong style={{ color: Math.abs(stickX) > 0.1 ? 'var(--ctrl-accent, #00ff88)' : '#94a3b8' }}>
                  {stickX.toFixed(2)}
                </strong>
              </span>
              <span>
                Y:{' '}
                <strong style={{ color: Math.abs(stickY) > 0.1 ? 'var(--ctrl-accent, #00ff88)' : '#94a3b8' }}>
                  {stickY.toFixed(2)}
                </strong>
              </span>
            </div>
          </div>

          {/* Column 2: Button Status Matrix */}
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '18px 14px',
              borderRadius: 'var(--ctrl-radius, 12px)',
              border: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <span
              style={{
                display: 'block',
                fontSize: 10,
                fontWeight: 800,
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 14,
              }}
            >
              {t('controls.button_states')}
            </span>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))',
                gap: 6,
              }}
            >
              {BUTTONS_MAP.map((btn) => {
                const active = !!activeButtons[btn.index];
                let bg = 'rgba(255, 255, 255, 0.03)';
                let border = '1px solid rgba(255, 255, 255, 0.08)';
                let textColor = '#64748b';
                let glow = 'none';

                if (active) {
                  glow = '0 0 12px var(--ctrl-accent-glow, rgba(0, 255, 136, 0.5))';
                  bg = 'var(--ctrl-accent, #00ff88)';
                  border = '1.5px solid #ffffff';
                  textColor = '#000000';
                } else if (btn.role === 'move') {
                  border = '1px solid rgba(0, 196, 255, 0.2)';
                  textColor = '#00c4ffcc';
                } else if (btn.role === 'restart') {
                  border = '1px solid rgba(251, 191, 36, 0.2)';
                  textColor = '#fbbf24cc';
                } else if (btn.role === 'menu') {
                  border = '1px solid rgba(244, 63, 94, 0.2)';
                  textColor = '#f43f5ecc';
                }

                return (
                  <div
                    key={btn.index}
                    style={{
                      padding: '7px 4px',
                      borderRadius: 'var(--ctrl-btn-radius, 6px)',
                      background: bg,
                      border: border,
                      color: textColor,
                      textAlign: 'center',
                      fontSize: 10,
                      fontWeight: active ? 900 : 700,
                      boxShadow: glow,
                      transition: 'all 0.06s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 2,
                      alignItems: 'center',
                      justifyContent: 'center',
                      userSelect: 'none',
                    }}
                  >
                    <span style={{ fontSize: 8, opacity: active ? 0.8 : 0.45, fontFamily: 'monospace' }}>
                      #{btn.index}
                    </span>
                    <span style={{ whiteSpace: 'nowrap', letterSpacing: '0.02em' }}>{btn.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div
          style={{
            padding: '24px 16px',
            textAlign: 'center',
            color: '#64748b',
            fontSize: 12,
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: 'var(--ctrl-radius, 10px)',
            border: '1px dashed rgba(255, 255, 255, 0.08)',
          }}
        >
          {t('controls.gamepad_disconnected')}
        </div>
      )}
    </div>
  );
}
