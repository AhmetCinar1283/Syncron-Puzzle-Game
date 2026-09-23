/**
 * DOSYA AMACI: Bağımsız ayarlar sayfasının üst barı: temaya duyarlı geri düğmesi,
 * başlık ve alt başlık.
 */

'use client';

import React from 'react';
import { ArrowLeft, Settings as SettingsIcon } from 'lucide-react';
import { useT } from '@/contexts/LanguageContext';
import { soundEngine } from '@/services/audio';

export const BACK_FOCUS_ID = 'back';

interface Props {
  focused: boolean;
  onFocus: (id: string) => void;
  onBack: () => void;
}

export function SettingsHeader({ focused, onFocus, onBack }: Props) {
  const t = useT();

  const handleBack = () => {
    soundEngine.play('ui.back');
    onBack();
  };

  return (
    <header style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 6, width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <button
          type="button"
          data-focus-id={BACK_FOCUS_ID}
          onClick={handleBack}
          onMouseEnter={() => onFocus(BACK_FOCUS_ID)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            minHeight: 40,
            borderRadius: 'var(--st-btn-radius, 10px)',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            outline: 'none',
            transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            border: focused
              ? '1.5px solid var(--st-accent, #00ff88)'
              : '1px solid var(--st-accent-soft, rgba(0, 255, 136, 0.25))',
            background: focused
              ? 'linear-gradient(135deg, var(--st-accent-soft, rgba(0, 255, 136, 0.25)) 0%, rgba(15, 23, 42, 0.8) 100%)'
              : 'var(--st-accent-soft, rgba(0, 255, 136, 0.08))',
            color: 'var(--st-accent, #00ff88)',
            boxShadow: focused
              ? '0 0 18px var(--st-accent-glow, rgba(0, 255, 136, 0.4))'
              : '0 0 8px var(--st-accent-soft, rgba(0, 255, 136, 0.08))',
            transform: focused ? 'scale(1.02)' : 'none',
          }}
        >
          <ArrowLeft size={15} />
          <span>{t('common.back_menu') || 'Geri'}</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 'var(--st-btn-radius, 8px)',
              background: 'var(--st-accent-soft, rgba(0, 255, 136, 0.14))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SettingsIcon size={18} color="var(--st-accent, #00ff88)" />
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 900,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--st-accent, #00ff88)',
              textShadow: '0 0 12px var(--st-accent-glow, rgba(0, 255, 136, 0.4))',
            }}
          >
            {t('settings.title')}
          </h1>
        </div>
      </div>

      <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', lineHeight: 1.45 }}>
        {t('settings.subtitle')}
      </p>
    </header>
  );
}
