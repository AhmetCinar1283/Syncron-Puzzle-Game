/**
 * DOSYA AMACI: Ayarlar ekranının alt şeridi: varsayılanlara sıfırla düğmesi
 * (taktiksel tehlike stili) ve oyun sürüm etiketi.
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
    <footer
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 8,
        width: '100%',
        boxSizing: 'border-box',
        gap: 12,
        flexWrap: 'wrap',
      }}
    >
      <button
        type="button"
        data-focus-id={RESET_FOCUS_ID}
        onClick={onReset}
        onMouseEnter={() => onFocus(RESET_FOCUS_ID)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 14px',
          minHeight: 38,
          borderRadius: 'var(--st-btn-radius, 8px)',
          cursor: 'pointer',
          fontSize: 11.5,
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          outline: 'none',
          transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
          background: focused ? 'rgba(239, 68, 68, 0.22)' : 'rgba(239, 68, 68, 0.08)',
          border: focused ? `1.5px solid ${COLORS.danger}` : '1px solid rgba(239, 68, 68, 0.28)',
          color: '#fca5a5',
          boxShadow: focused ? '0 0 16px rgba(239, 68, 68, 0.35)' : 'none',
          transform: focused ? 'scale(1.02)' : 'none',
        }}
      >
        <RotateCcw size={13} color="#fca5a5" />
        <span>{t('settings.reset_defaults')}</span>
      </button>

      <span
        style={{
          fontSize: 11,
          color: '#64748b',
          fontWeight: 700,
          letterSpacing: '0.08em',
          fontFamily: 'monospace',
          textTransform: 'uppercase',
        }}
      >
        SYNCRON // v0.3
      </span>
    </footer>
  );
}
