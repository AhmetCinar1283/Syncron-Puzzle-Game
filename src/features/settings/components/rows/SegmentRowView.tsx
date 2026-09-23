/**
 * DOSYA AMACI: Çoklu seçenek (segment) ayar satırının taktiksel oyun görünümü.
 * `inline` yerleşimde oyun çiplerini, `grid` yerleşimde (tema seçici gibi)
 * temaların kendi renk rozetlerini içeren interaktif kart ızgarası çizer.
 */

'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { GameIcon } from '@/components/icons';
import { soundEngine } from '@/services/audio';
import type { SegmentRow } from '../../lib/settingsModel';
import { COLORS, choiceStyle, hexToRgba } from '../../lib/styles';
import { SettingRowShell } from './SettingRowShell';

interface Props {
  row: SegmentRow;
  focused: boolean;
  onFocus: (id: string) => void;
}

export function SegmentRowView({ row, focused, onFocus }: Props) {
  const isGrid = row.layout === 'grid';

  const handleSelect = (value: string) => {
    soundEngine.play('ui.navigate');
    row.onChange(value);
    onFocus(row.id);
  };

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
            ? {
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(115px, 1fr))',
                gap: 8,
              }
            : {
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))',
                gap: 8,
              }
        }
      >
        {row.options.map((option) => {
          const selected = option.value === row.value;
          const optionAccent = option.accent;

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => handleSelect(option.value)}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: isGrid ? 'space-between' : 'center',
                gap: 8,
                padding: isGrid ? '10px 12px' : '9px 12px',
                minHeight: 42,
                borderRadius: 'var(--st-btn-radius, 8px)',
                cursor: 'pointer',
                transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                outline: 'none',
                textAlign: 'left',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.02em',
                boxSizing: 'border-box',
                ...(optionAccent
                  ? {
                      border: selected
                        ? `1.5px solid ${optionAccent}`
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      background: selected
                        ? hexToRgba(optionAccent, 0.16)
                        : 'rgba(15, 23, 42, 0.55)',
                      color: selected ? optionAccent : COLORS.textMuted,
                      boxShadow: selected
                        ? `0 0 14px ${hexToRgba(optionAccent, 0.35)}`
                        : 'none',
                    }
                  : choiceStyle(selected)),
                transform: selected ? 'scale(1.02)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                {/* Tema renk noktası (tema kartları için) */}
                {optionAccent && (
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: optionAccent,
                      boxShadow: selected ? `0 0 8px ${optionAccent}` : 'none',
                      flexShrink: 0,
                    }}
                  />
                )}
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {option.label}
                </span>
              </div>

              {/* İkon veya Onay işareti */}
              {isGrid && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  {option.icon && (
                    <GameIcon
                      name={option.icon}
                      size={15}
                      color={selected ? (optionAccent || 'var(--st-accent, #00ff88)') : COLORS.textMuted}
                    />
                  )}
                  {selected && (
                    <Check
                      size={14}
                      color={optionAccent || 'var(--st-accent, #00ff88)'}
                      strokeWidth={3}
                    />
                  )}
                </div>
              )}

              {!isGrid && selected && (
                <Check
                  size={13}
                  color="var(--st-accent, #00ff88)"
                  strokeWidth={2.8}
                  style={{ flexShrink: 0 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </SettingRowShell>
  );
}
