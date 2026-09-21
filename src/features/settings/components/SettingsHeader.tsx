/**
 * DOSYA AMACI: Bağımsız ayarlar sayfasının üst barı: geri düğmesi (odaklanabilir),
 * başlık ve alt başlık. Modalda kullanılmaz.
 */

'use client';

import React from 'react';
import { ArrowLeft, Settings as SettingsIcon } from 'lucide-react';
import { useT } from '@/contexts/LanguageContext';
import { COLORS } from '../lib/styles';

export const BACK_FOCUS_ID = 'back';

interface Props {
  focused: boolean;
  onFocus: (id: string) => void;
  onBack: () => void;
}

export function SettingsHeader({ focused, onFocus, onBack }: Props) {
  const t = useT();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          type="button"
          data-focus-id={BACK_FOCUS_ID}
          onClick={onBack}
          onMouseEnter={() => onFocus(BACK_FOCUS_ID)}
          style={{
            background: focused ? 'rgba(0, 255, 136, 0.15)' : 'rgba(0, 255, 136, 0.05)',
            border: focused ? `1px solid ${COLORS.accent}` : '1px solid rgba(0, 255, 136, 0.25)',
            color: COLORS.accent,
            padding: '8px 16px',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            boxShadow: focused ? '0 0 16px rgba(0, 255, 136, 0.3)' : '0 0 10px rgba(0, 255, 136, 0.06)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.2s ease',
            outline: 'none',
          }}
        >
          <ArrowLeft size={14} />
          <span>{t('common.back_menu') || 'Geri'}</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SettingsIcon size={18} color={COLORS.accent} />
          <h1
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: COLORS.accent,
              textShadow: '0 0 10px rgba(0, 255, 136, 0.4)',
            }}
          >
            {t('settings.title')}
          </h1>
        </div>
      </div>

      <p style={{ margin: 0, fontSize: 13, color: COLORS.textMuted, lineHeight: 1.4 }}>{t('settings.subtitle')}</p>
    </div>
  );
}
