/**
 * DOSYA AMACI: Ayarlar modalında oyunun görsel tema tercihlerini (arcade, legacy, neon,
 * blueprint, cosmic) listeleyen ve seçilen temayı uygulayan alt bileşendir.
 */

'use client';

import React from 'react';
import { ALL_THEMES, type GameTheme } from '@/game-engine/themes/themeConfig';
import { useT } from '@/contexts/LanguageContext';
import { GameIcon } from '@/components/icons';
import { useSettings } from '../hooks/useSettings';

export function ThemeSection() {
  const t = useT();
  const { settings, setTheme } = useSettings();
  const activeTheme = settings.theme;

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
          {t('settings.theme_title')}
        </h3>
        <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.4 }}>
          {t('settings.theme_desc')}
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 10,
        }}
      >
        {ALL_THEMES.map((themeDef) => {
          const isSelected = activeTheme === themeDef.id;
          const localizedName = t(themeDef.nameKey) || themeDef.defaultName;

          return (
            <button
              key={themeDef.id}
              type="button"
              onClick={() => setTheme(themeDef.id as GameTheme)}
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                border: isSelected
                  ? `1.5px solid ${themeDef.accentColor}`
                  : '1px solid rgba(255, 255, 255, 0.08)',
                background: isSelected
                  ? `linear-gradient(135deg, ${themeDef.bgDark} 0%, rgba(20, 30, 50, 0.9) 100%)`
                  : 'rgba(15, 23, 42, 0.55)',
                boxShadow: isSelected
                  ? `0 0 12px ${themeDef.accentGlow}`
                  : 'none',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: isSelected ? themeDef.accentColor : '#e2e8f0',
                  }}
                >
                  {localizedName}
                </span>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: themeDef.accentColor,
                    boxShadow: `0 0 6px ${themeDef.accentColor}`,
                  }}
                />
              </div>

              {/* Tema ikonu veya alt görsel ipucu */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.8 }}>
                <GameIcon name={themeDef.icon as any} size={14} color={isSelected ? themeDef.accentColor : '#94a3b8'} />
                <span style={{ fontSize: 10, color: '#64748b' }}>{themeDef.id}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
