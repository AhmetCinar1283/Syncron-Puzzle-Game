/**
 * DOSYA AMACI: Aç/kapa (toggle) ayar satırının görünümü.
 */

'use client';

import React from 'react';
import type { ToggleRow } from '../../lib/settingsModel';
import { COLORS } from '../../lib/styles';
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
          onClick={() => row.onChange(!on)}
          style={{
            flexShrink: 0,
            padding: '6px 14px',
            fontSize: 11,
            fontWeight: 700,
            borderRadius: 8,
            border: on ? '1px solid rgba(0, 255, 136, 0.4)' : '1px solid #374151',
            background: on ? 'rgba(0, 255, 136, 0.12)' : 'rgba(55, 65, 81, 0.25)',
            color: on ? COLORS.accent : '#9ca3af',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            outline: 'none',
          }}
        >
          {on ? row.onLabel : row.offLabel}
        </button>
      }
    />
  );
}
