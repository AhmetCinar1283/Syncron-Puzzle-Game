'use client';

import React from 'react';
import { GameIcon } from '@/components/icons';

interface KeyboardCardProps {
  t: (key: string) => string;
  pressedKeys?: Record<string, boolean>;
}

interface KeycapProps {
  label: string;
  sub?: string;
  isPressed?: boolean;
  accent?: string;
  glow?: string;
  width?: number | string;
}

function MechanicalKeycap({
  label,
  sub,
  isPressed = false,
  accent = 'var(--ctrl-accent, #00c4ff)',
  glow = 'var(--ctrl-accent-glow, rgba(0, 196, 255, 0.4))',
  width = 38,
}: KeycapProps) {
  return (
    <div
      style={{
        position: 'relative',
        minWidth: width,
        height: 38,
        padding: '0 8px',
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'var(--ctrl-btn-radius, 6px)',
        background: isPressed
          ? `linear-gradient(180deg, ${accent} 0%, rgba(15, 23, 42, 0.9) 100%)`
          : 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
        border: isPressed ? `1.5px solid ${accent}` : '1.5px solid rgba(255, 255, 255, 0.15)',
        borderBottom: isPressed ? `1.5px solid ${accent}` : '3.5px solid #090d16',
        color: isPressed ? '#ffffff' : '#f8fafc',
        fontFamily: 'monospace, var(--font-geist-sans), sans-serif',
        fontSize: 12,
        fontWeight: 800,
        boxShadow: isPressed
          ? `0 0 14px ${glow}, inset 0 2px 4px rgba(0,0,0,0.6)`
          : '0 3px 6px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
        transform: isPressed ? 'translateY(2px)' : 'translateY(0)',
        transition: 'transform 0.05s ease, background 0.08s ease, border-color 0.08s ease, box-shadow 0.08s ease',
        boxSizing: 'border-box',
        userSelect: 'none',
      }}
    >
      <span style={{ lineHeight: 1 }}>{label}</span>
      {sub && (
        <span style={{ fontSize: 8, opacity: 0.65, marginTop: 1, letterSpacing: '0.04em' }}>{sub}</span>
      )}
    </div>
  );
}

export function KeyboardCard({ t, pressedKeys = {} }: KeyboardCardProps) {
  // Check if any movement keys or function keys are pressed
  const isW = !!(pressedKeys['w'] || pressedKeys['keyw']);
  const isA = !!(pressedKeys['a'] || pressedKeys['keya']);
  const isS = !!(pressedKeys['s'] || pressedKeys['keys']);
  const isD = !!(pressedKeys['d'] || pressedKeys['keyd']);

  const isUp = !!(pressedKeys['arrowup']);
  const isLeft = !!(pressedKeys['arrowleft']);
  const isDown = !!(pressedKeys['arrowdown']);
  const isRight = !!(pressedKeys['arrowright']);

  const isR = !!(pressedKeys['r'] || pressedKeys['keyr']);
  const isEsc = !!(pressedKeys['escape']);

  const hasAnyKeyPressed = Object.keys(pressedKeys).length > 0;

  return (
    <div
      style={{
        background: 'rgba(10, 18, 32, 0.75)',
        border: '1px solid var(--ctrl-accent-soft, rgba(0, 196, 255, 0.2))',
        borderRadius: 'var(--ctrl-card-radius, 16px)',
        padding: 'clamp(16px, 4vw, 24px)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        boxSizing: 'border-box',
        width: '100%',
      }}
    >
      {/* Header with Live Detection Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--ctrl-accent-soft, rgba(0, 196, 255, 0.2))',
          paddingBottom: 12,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <h2
          style={{
            fontSize: 'clamp(15px, 3.5vw, 18px)',
            fontWeight: 900,
            color: 'var(--ctrl-accent, #00c4ff)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <GameIcon name="keyboard" size={22} color="var(--ctrl-accent, #00c4ff)" />
          <span>{t('controls.keyboard')}</span>
        </h2>

        {/* Live Feedback Pill */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 8px',
            borderRadius: 12,
            background: hasAnyKeyPressed ? 'var(--ctrl-accent-soft, rgba(0, 196, 255, 0.15))' : 'rgba(255, 255, 255, 0.05)',
            border: hasAnyKeyPressed ? '1px solid var(--ctrl-accent, #00c4ff)' : '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: 10,
            fontWeight: 700,
            color: hasAnyKeyPressed ? 'var(--ctrl-accent, #00c4ff)' : '#64748b',
            boxShadow: hasAnyKeyPressed ? '0 0 10px var(--ctrl-accent-glow, rgba(0, 196, 255, 0.3))' : 'none',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: hasAnyKeyPressed ? 'var(--ctrl-accent, #00c4ff)' : '#64748b',
              boxShadow: hasAnyKeyPressed ? '0 0 6px var(--ctrl-accent, #00c4ff)' : 'none',
            }}
          />
          <span>{t('controls.live_feedback')}</span>
        </div>
      </div>

      {/* Movement Section */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.55)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 'var(--ctrl-radius, 12px)',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <span style={{ fontWeight: 800, fontSize: 13, color: '#f8fafc', letterSpacing: '0.04em' }}>
          {t('controls.move')}
        </span>
        <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
          {t('controls.move_desc')}
        </p>

        {/* Tactile Key Clusters */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around',
            flexWrap: 'wrap',
            gap: 20,
            padding: '12px 6px',
            background: 'rgba(0, 0, 0, 0.25)',
            borderRadius: 'var(--ctrl-radius, 8px)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          {/* WASD Cross */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
              WASD
            </span>
            <MechanicalKeycap label="W" isPressed={isW} />
            <div style={{ display: 'flex', gap: 4 }}>
              <MechanicalKeycap label="A" isPressed={isA} />
              <MechanicalKeycap label="S" isPressed={isS} />
              <MechanicalKeycap label="D" isPressed={isD} />
            </div>
          </div>

          {/* Arrow Keys Cross */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
              ARROWS
            </span>
            <MechanicalKeycap label="▲" isPressed={isUp} />
            <div style={{ display: 'flex', gap: 4 }}>
              <MechanicalKeycap label="◀" isPressed={isLeft} />
              <MechanicalKeycap label="▼" isPressed={isDown} />
              <MechanicalKeycap label="▶" isPressed={isRight} />
            </div>
          </div>
        </div>
      </div>

      {/* Action Keys (Restart & Menu) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
        }}
      >
        {/* Restart Key */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.55)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 'var(--ctrl-radius, 12px)',
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, fontSize: 13, color: '#f8fafc' }}>{t('controls.restart')}</span>
            <MechanicalKeycap
              label="R"
              isPressed={isR}
              accent="#fbbf24"
              glow="rgba(251, 191, 36, 0.4)"
            />
          </div>
          <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
            {t('controls.restart_desc')}
          </p>
        </div>

        {/* Menu Key */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.55)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: 'var(--ctrl-radius, 12px)',
            padding: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, fontSize: 13, color: '#f8fafc' }}>{t('controls.menu')}</span>
            <MechanicalKeycap
              label="ESC"
              width={54}
              isPressed={isEsc}
              accent="#f43f5e"
              glow="rgba(244, 63, 94, 0.4)"
            />
          </div>
          <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
            {t('controls.menu_desc')}
          </p>
        </div>
      </div>
    </div>
  );
}
