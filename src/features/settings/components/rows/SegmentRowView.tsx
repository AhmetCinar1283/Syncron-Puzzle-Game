/**
 * DOSYA AMACI: Çoklu seçenek (segment) ayar satırının görünümü. `inline`
 * yerleşimde yan yana düğmeler, `grid` yerleşimde (tema gibi) kart ızgarası çizer.
 */

'use client';

import React from 'react';
import { GameIcon } from '@/components/icons';
import type { SegmentRow } from '../../lib/settingsModel';
import { COLORS, choiceStyle } from '../../lib/styles';
import { SettingRowShell } from './SettingRowShell';

interface Props {
  row: SegmentRow;
  focused: boolean;
  onFocus: (id: string) => void;
}

export function SegmentRowView({ row, focused, onFocus }: Props) {
  const isGrid = row.layout === 'grid';

  return (
    <SettingRowShell
      id={row.id}
      label={row.label}
      description={row.description}
      focused={focused}
      onFocus={onFocus}
    >
      <div
        role="radiogroup"
        aria-label={row.label}
        style={
          isGrid
            ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }
            : { display: 'flex', gap: 10, flexWrap: 'wrap' }
        }
      >
        {row.options.map((option) => {
          const selected = option.value === row.value;
          const accent = option.accent ?? COLORS.accent;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => {
                row.onChange(option.value);
                onFocus(row.id);
              }}
              style={{
                flex: isGrid ? undefined : '1 1 110px',
                padding: isGrid ? '10px 12px' : '10px 14px',
                fontSize: 12,
                fontWeight: 700,
                borderRadius: isGrid ? 10 : 8,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isGrid ? 'space-between' : 'center',
                gap: 8,
                textAlign: 'left',
                ...choiceStyle(selected, accent),
              }}
            >
              <span>{option.label}</span>
              {option.icon && (
                <GameIcon name={option.icon} size={14} color={selected ? accent : COLORS.textMuted} />
              )}
            </button>
          );
        })}
      </div>
    </SettingRowShell>
  );
}
