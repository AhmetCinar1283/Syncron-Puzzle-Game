/**
 * DOSYA AMACI: Ayarlar ekranının alt şeridi: varsayılanlara sıfırla düğmesi
 * (odaklanabilir) ve sürüm etiketi.
 */

'use client';

import React from 'react';
import { RotateCcw } from 'lucide-react';
import { useT } from '@/contexts/LanguageContext';
import { COLORS } from '../lib/styles';

export const RESET_FOCUS_ID = 'reset';

interface Props {
  focused: boolean;
  onFocus: (id: string) => void;
  onReset: () => void;
}

export function SettingsFooter({ focused, onFocus, onReset }: Props) {
  const t = useT();

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 }}>
      <button
        type="button"
        data-focus-id={RESET_FOCUS_ID}
        onClick={onReset}
        onMouseEnter={() => onFocus(RESET_FOCUS_ID)}
        style={{
          background: focused ? 'rgba(239, 68, 68, 0.18)' : 'rgba(239, 68, 68, 0.08)',
          border: focused ? `1px solid ${COLORS.danger}` : '1px solid rgba(239, 68, 68, 0.3)',
          color: COLORS.danger,
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 14px',
          borderRadius: 8,
          transition: 'all 0.15s ease',
          outline: 'none',
          boxShadow: focused ? '0 0 14px rgba(239, 68, 68, 0.3)' : 'none',
        }}
      >
        <RotateCcw size={13} />
        <span>{t('settings.reset_defaults')}</span>
      </button>

      <span style={{ fontSize: 11, color: '#475569', fontWeight: 600 }}>Syncron v0.3</span>
    </div>
  );
}
