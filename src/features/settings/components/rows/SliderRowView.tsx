/**
 * DOSYA AMACI: Kaydırıcı (slider) ayar satırının taktiksel oyun görünümü.
 * Sayısal HUD göstergesi ve aktif oyun temasıyla aydınlatılan parlak iz çizgisi içerir.
 */

'use client';

import React from 'react';
import type { SliderRow } from '../../lib/settingsModel';
import { SettingRowShell } from './SettingRowShell';

interface Props {
  row: SliderRow;
  focused: boolean;
  onFocus: (id: string) => void;
}

export function SliderRowView({ row, focused, onFocus }: Props) {
  const disabled = !!row.disabled;
  // Kapalıyken çubuk boş görünür; değer ayarda korunur.
  const shown = disabled ? row.min : row.value;
  const percent = ((shown - row.min) / (row.max - row.min || 1)) * 100;

  return (
    <SettingRowShell
      id={row.id}
      label={row.label}
      description={row.description}
      focused={focused}
      onFocus={onFocus}
      dimmed={disabled}
      control={
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 48,
            padding: '3px 8px',
            borderRadius: 'var(--st-btn-radius, 6px)',
            background: disabled ? 'rgba(15, 23, 42, 0.4)' : 'rgba(15, 23, 42, 0.85)',
            border: disabled
              ? '1px solid rgba(255, 255, 255, 0.06)'
              : '1px solid var(--st-accent-soft, rgba(0, 255, 136, 0.3))',
            color: disabled ? '#64748b' : 'var(--st-accent, #00ff88)',
            fontSize: 12,
            fontWeight: 800,
            fontFamily: 'monospace',
            letterSpacing: '0.04em',
            boxShadow: disabled
              ? 'none'
              : '0 0 10px var(--st-accent-soft, rgba(0, 255, 136, 0.15))',
            transition: 'all 0.18s ease',
          }}
        >
          {shown}%
        </div>
      }
    >
      <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center', height: 24 }}>
        <input
          type="range"
          aria-label={row.label}
          min={row.min}
          max={row.max}
          step={row.step}
          value={shown}
          disabled={disabled}
          onChange={(e) => row.onChange(Number(e.target.value))}
          style={{
            width: '100%',
            height: 8,
            borderRadius: 'var(--st-radius, 4px)',
            appearance: 'none',
            outline: 'none',
            background: disabled
              ? '#1e293b'
              : `linear-gradient(to right, var(--st-accent, #00ff88) 0%, var(--st-accent, #00ff88) ${percent}%, #0f172a ${percent}%, #0f172a 100%)`,
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: disabled ? 'none' : 'inset 0 1px 3px rgba(0, 0, 0, 0.5)',
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        />
      </div>
    </SettingRowShell>
  );
}
