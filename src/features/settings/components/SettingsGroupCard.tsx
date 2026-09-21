/**
 * DOSYA AMACI: Bir ayar grubunu (başlık, açıklama, ikon ve satırları) kart
 * olarak çizer.
 */

'use client';

import React from 'react';
import type { SettingsGroup } from '../lib/settingsModel';
import { COLORS } from '../lib/styles';
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
      aria-labelledby={`settings-group-${group.id}`}
      style={{
        background: COLORS.cardBg,
        border: `1px solid ${COLORS.cardBorder}`,
        borderRadius: 14,
        padding: compact ? '14px 12px' : '18px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px 6px' }}>
        <Icon size={18} color={COLORS.accent} />
        <div>
          <h2
            id={`settings-group-${group.id}`}
            style={{ margin: 0, fontSize: 13, fontWeight: 700, color: COLORS.text, letterSpacing: '0.03em' }}
          >
            {group.title}
          </h2>
          {group.description && (
            <p style={{ margin: 0, fontSize: 11, color: COLORS.textDim }}>{group.description}</p>
          )}
        </div>
      </header>

      {group.rows.map((row) => (
        <SettingRowView key={row.id} row={row} focused={focusId === row.id} onFocus={onFocus} />
      ))}
    </section>
  );
}
