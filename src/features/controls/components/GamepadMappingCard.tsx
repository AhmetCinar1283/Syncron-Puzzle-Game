'use client';

import React from 'react';
import { GameIcon } from '@/components/icons';

interface GamepadMappingCardProps {
  t: (key: string) => string;
  activeButtons?: Record<number, boolean>;
  isConnected?: boolean;
}

interface ControllerPillProps {
  label: string;
  active?: boolean;
  accent?: string;
  glow?: string;
}

function ControllerBadge({
  label,
  active = false,
  accent = 'var(--ctrl-accent, #00ff88)',
  glow = 'var(--ctrl-accent-glow, rgba(0, 255, 136, 0.4))',
}: ControllerPillProps) {
  return (
    <span
      style={{
        padding: '4px 10px',
        background: active ? accent : 'var(--ctrl-accent-soft, rgba(0, 255, 136, 0.08))',
        border: active ? `1.5px solid #ffffff` : `1px solid ${accent}`,
        borderRadius: 'var(--ctrl-btn-radius, 6px)',
        fontSize: 11,
        fontWeight: 800,
        color: active ? '#000000' : accent,
        boxShadow: active ? `0 0 14px ${glow}` : 'none',
        transform: active ? 'scale(1.08)' : 'scale(1)',
        transition: 'all 0.1s ease',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        letterSpacing: '0.04em',
        userSelect: 'none',
      }}
    >
      {label}
    </span>
  );
}

export function GamepadMappingCard({ t, activeButtons = {}, isConnected = false }: GamepadMappingCardProps) {
  // Check active state for mapped buttons
  const isMoveActive = !!(
    activeButtons[12] || activeButtons[13] || activeButtons[14] || activeButtons[15]
  );
  const isRestartY = !!activeButtons[3];
  const isRestartSelect = !!activeButtons[8];
  const isMenuB = !!activeButtons[1];
  const isMenuStart = !!activeButtons[9];

  return (
    <div
      style={{
        background: 'rgba(10, 18, 32, 0.75)',
        border: '1px solid var(--ctrl-accent-soft, rgba(0, 255, 136, 0.2))',
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
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--ctrl-accent-soft, rgba(0, 255, 136, 0.2))',
          paddingBottom: 12,
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <h2
          style={{
            fontSize: 'clamp(15px, 3.5vw, 18px)',
            fontWeight: 900,
            color: 'var(--ctrl-accent, #00ff88)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <GameIcon name="gamepad" size={22} color="var(--ctrl-accent, #00ff88)" />
          <span>{t('controls.gamepad')}</span>
        </h2>

        {/* Connection status badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '3px 8px',
            borderRadius: 12,
            background: isConnected ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            border: isConnected ? '1px solid #00ff88' : '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: 10,
            fontWeight: 700,
            color: isConnected ? '#00ff88' : '#64748b',
            boxShadow: isConnected ? '0 0 10px rgba(0, 255, 136, 0.3)' : 'none',
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: isConnected ? '#00ff88' : '#64748b',
              boxShadow: isConnected ? '0 0 6px #00ff88' : 'none',
            }}
          />
          <span>{isConnected ? 'ONLINE' : 'OFFLINE'}</span>
        </div>
      </div>

      {/* Movement Mapping */}
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.55)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 'var(--ctrl-radius, 12px)',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontWeight: 800, fontSize: 13, color: '#f8fafc', letterSpacing: '0.04em' }}>
            {t('controls.move')}
          </span>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <ControllerBadge label="LEFT STICK" active={isMoveActive} />
            <ControllerBadge label="D-PAD" active={isMoveActive} />
          </div>
        </div>
        <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
          {t('controls.move_desc')}
        </p>
      </div>

      {/* Action Mappings */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
        }}
      >
        {/* Restart */}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            <span style={{ fontWeight: 800, fontSize: 13, color: '#f8fafc' }}>{t('controls.restart')}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <ControllerBadge
                label="Y / △"
                active={isRestartY}
                accent="#fbbf24"
                glow="rgba(251, 191, 36, 0.5)"
              />
              <ControllerBadge
                label="SELECT"
                active={isRestartSelect}
                accent="#fbbf24"
                glow="rgba(251, 191, 36, 0.5)"
              />
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
            {t('controls.restart_desc')}
          </p>
        </div>

        {/* Menu / Back */}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
            <span style={{ fontWeight: 800, fontSize: 13, color: '#f8fafc' }}>{t('controls.menu')}</span>
            <div style={{ display: 'flex', gap: 4 }}>
              <ControllerBadge
                label="B / ◯"
                active={isMenuB}
                accent="#f43f5e"
                glow="rgba(244, 63, 94, 0.5)"
              />
              <ControllerBadge
                label="START"
                active={isMenuStart}
                accent="#f43f5e"
                glow="rgba(244, 63, 94, 0.5)"
              />
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
            {t('controls.menu_desc')}
          </p>
        </div>
      </div>
    </div>
  );
}
