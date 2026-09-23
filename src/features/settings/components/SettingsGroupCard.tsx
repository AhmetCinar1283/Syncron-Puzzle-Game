/**
 * DOSYA AMACI: Seçili ayar grubunu (başlık, açıklama, tema renkli rozet ikon ve satırları)
 * taktiksel bir Oyun HUD kartı olarak çizer.
 */

'use client';

import React from 'react';
import type { SettingsGroup } from '../lib/settingsModel';
import { SettingRowView } from './rows/SettingRowView';

interface Props {
  group: SettingsGroup;
  focusId: string | null;
  onFocus: (id: string) => void;
  compact: boolean;
}

export function SettingsGroupCard({ group, focusId, onFocus, compact }: Props) {
  const Icon = group.icon;

  return (
    <section
      id={`settings-group-${group.id}`}
      aria-labelledby={`settings-group-title-${group.id}`}
      style={{
        position: 'relative',
        background: 'rgba(10, 18, 32, 0.78)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 'var(--st-card-radius, 16px)',
        padding: compact ? '14px 12px' : '18px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.07)',
        boxSizing: 'border-box',
        width: '100%',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '2px 6px 12px 6px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
          marginBottom: 4,
        }}
      >
        {/* Tema aydınlatmalı rozet kabuğu */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 'var(--st-btn-radius, 10px)',
            background: 'var(--st-accent-soft, rgba(0, 255, 136, 0.14))',
            border: '1px solid var(--st-accent, #00ff88)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 12px var(--st-accent-glow, rgba(0, 255, 136, 0.3))',
            flexShrink: 0,
          }}
        >
          <Icon size={18} color="var(--st-accent, #00ff88)" />
        </div>

        <div style={{ minWidth: 0, flex: 1 }}>
          <h2
            id={`settings-group-title-${group.id}`}
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: '#ffffff',
            }}
          >
            {group.title}
          </h2>
          {group.description && (
            <p
              style={{
                margin: '2px 0 0',
                fontSize: 11.5,
                color: '#94a3b8',
                lineHeight: 1.4,
              }}
            >
              {group.description}
            </p>
          )}
        </div>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {group.rows.map((row) => (
          <SettingRowView
            key={row.id}
            row={row}
            focused={focusId === row.id}
            onFocus={onFocus}
          />
        ))}
      </div>
    </section>
  );
}
