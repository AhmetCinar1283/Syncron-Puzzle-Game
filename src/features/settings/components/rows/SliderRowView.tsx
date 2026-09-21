/**
 * DOSYA AMACI: Kaydırıcı (slider) ayar satırının görünümü.
 */

'use client';

import React from 'react';
import type { SliderRow } from '../../lib/settingsModel';
import { COLORS } from '../../lib/styles';
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
        <span style={{ fontSize: 12, fontWeight: 800, color: disabled ? COLORS.textDim : COLORS.info }}>
          %{shown}
        </span>
      }
    >
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
          height: 7,
          borderRadius: 4,
          appearance: 'none',
          outline: 'none',
          background: `linear-gradient(to right, ${COLORS.info} 0%, ${COLORS.accent} ${percent}%, #1e293b ${percent}%, #1e293b 100%)`,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      />
    </SettingRowShell>
  );
}
