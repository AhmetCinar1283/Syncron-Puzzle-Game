/**
 * DOSYA AMACI: Ayarlar modalında uygulama arayüz dili tercihlerini (TR / EN)
 * sunan ve seçimi güncelleyen alt bileşendir.
 */

'use client';

import React from 'react';
import { LANGS, type Lang } from '@/lib/i18n';
import { useT } from '@/contexts/LanguageContext';
import { useSettings } from '../hooks/useSettings';

export function LanguageSection() {
  const t = useT();
  const { settings, setLanguage } = useSettings();
  const activeLang = settings.language;

  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        padding: '16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div>
        <h3
          style={{
            margin: '0 0 4px 0',
            fontSize: 13,
            fontWeight: 700,
            color: '#f1f5f9',
            letterSpacing: '0.04em',
          }}
        >
          {t('settings.language_title')}
        </h3>
        <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.4 }}>
          {t('settings.language_desc')}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        {LANGS.map(({ code, label }) => {
          const isSelected = activeLang === code;
          return (
            <button
              key={code}
              type="button"
              onClick={() => setLanguage(code as Lang)}
              style={{
                flex: 1,
                padding: '9px 14px',
                fontSize: 12,
                fontWeight: 700,
                borderRadius: 8,
                border: isSelected
                  ? '1px solid #00ff88'
                  : '1px solid rgba(255, 255, 255, 0.1)',
                background: isSelected
                  ? 'rgba(0, 255, 136, 0.12)'
                  : 'rgba(15, 23, 42, 0.5)',
                color: isSelected ? '#00ff88' : '#94a3b8',
                boxShadow: isSelected ? '0 0 10px rgba(0, 255, 136, 0.2)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
