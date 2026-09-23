/**
 * DOSYA AMACI: Aç/kapa (toggle) ayar satırının taktiksel oyun anahtarı görünümü.
 * Kayar LED indikatörü ve aktif oyun temasına duyarlı neon ışıma sunar.
 */

'use client';

import React from 'react';
import type { ToggleRow } from '../../lib/settingsModel';
import { changeToggle } from '../../lib/rowActions';
import { SettingRowShell } from './SettingRowShell';

interface Props {
  row: ToggleRow;
  focused: boolean;
  onFocus: (id: string) => void;
}

export function ToggleRowView({ row, focused, onFocus }: Props) {
  const on = row.value;

  return (
    <SettingRowShell
      id={row.id}
      label={row.label}
      description={row.description}
      focused={focused}
      onFocus={onFocus}
      control={
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={row.label}
          onClick={() => changeToggle(row, !on)}
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: on ? 'flex-start' : 'flex-end',
            width: 78,
            height: 32,
            padding: '2px 8px',
            borderRadius: 'var(--st-btn-radius, 8px)',
            cursor: 'pointer',
            outline: 'none',
            flexShrink: 0,
            border: on
              ? '1.5px solid var(--st-accent, #00ff88)'
              : '1px solid rgba(255, 255, 255, 0.12)',
            background: on
              ? 'linear-gradient(135deg, var(--st-accent-soft, rgba(0, 255, 136, 0.18)) 0%, rgba(15, 23, 42, 0.8) 100%)'
              : 'rgba(15, 23, 42, 0.65)',
            boxShadow: on
              ? '0 0 14px var(--st-accent-glow, rgba(0, 255, 136, 0.3)), inset 0 0 8px var(--st-accent-soft, rgba(0, 255, 136, 0.1))'
              : 'none',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Metin etiketi */}
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 800,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: on ? 'var(--st-accent, #00ff88)' : '#94a3b8',
              marginRight: on ? 24 : 0,
              marginLeft: on ? 0 : 24,
              transition: 'all 0.2s ease',
              userSelect: 'none',
            }}
          >
            {on ? row.onLabel : row.offLabel}
          </span>

          {/* Kayar LED anahtar düğmesi */}
          <span
            style={{
              position: 'absolute',
              top: 4,
              left: on ? 52 : 4,
              width: 22,
              height: 22,
              borderRadius: 'var(--st-radius, 6px)',
              background: on
                ? 'var(--st-accent, #00ff88)'
                : 'linear-gradient(135deg, #475569 0%, #334155 100%)',
              boxShadow: on
                ? '0 0 10px var(--st-accent, #00ff88), 0 0 4px #ffffff'
                : '0 1px 3px rgba(0,0,0,0.5)',
              transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* LED iç çekirdek parlaması */}
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: on ? '#ffffff' : '#1e293b',
                boxShadow: on ? '0 0 4px #ffffff' : 'none',
              }}
            />
          </span>
        </button>
      }
    />
  );
}
