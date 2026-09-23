/**
 * DOSYA AMACI: Tüm ayar satırlarının taktiksel oyun HUD çerçevesi.
 * Odaklandığında temaya özel neon parlama ve sol dikey indikatör çizgisi sunar.
 */

'use client';

import React from 'react';
import { COLORS, focusStyle } from '../../lib/styles';

interface Props {
  id: string;
  label: string;
  description?: string;
  focused: boolean;
  onFocus: (id: string) => void;
  /** Etiketin sağında duran kontrol (ör. aç/kapa düğmesi). */
  control?: React.ReactNode;
  /** Etiketin altında tam genişlikte duran içerik (ör. kaydırıcı, seçenekler). */
  children?: React.ReactNode;
  dimmed?: boolean;
}

export function SettingRowShell({
  id,
  label,
  description,
  focused,
  onFocus,
  control,
  children,
  dimmed,
}: Props) {
  return (
    <div
      data-focus-id={id}
      onMouseEnter={() => onFocus(id)}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: '12px 14px',
        borderRadius: 'var(--st-radius, 12px)',
        transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        opacity: dimmed ? 0.45 : 1,
        backdropFilter: 'blur(8px)',
        ...focusStyle(focused),
      }}
    >
      {/* Odaklandığında sol kenarda parlayan taktiksel dikey neon çizgi */}
      {focused && (
        <span
          style={{
            position: 'absolute',
            left: 0,
            top: 8,
            bottom: 8,
            width: 3,
            borderRadius: '0 3px 3px 0',
            background: 'var(--st-accent, #00ff88)',
            boxShadow: '0 0 10px var(--st-accent-glow, rgba(0, 255, 136, 0.6))',
          }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: focused ? '#ffffff' : COLORS.text,
              letterSpacing: '0.02em',
              transition: 'color 0.15s ease',
            }}
          >
            {label}
          </div>
          {description && (
            <p
              style={{
                margin: '3px 0 0',
                fontSize: 11.5,
                color: COLORS.textMuted,
                lineHeight: 1.45,
              }}
            >
              {description}
            </p>
          )}
        </div>
        {control}
      </div>

      {children}
    </div>
  );
}
