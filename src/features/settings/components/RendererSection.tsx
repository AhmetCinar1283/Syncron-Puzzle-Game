/**
 * DOSYA AMACI: Ayarlar modalında oyun tahtasının çizim yolunu (Otomatik / Kalite
 * (DOM) / Performans (Canvas)) seçtiren alt bileşendir. Seçim anında uygulanır;
 * açık bir oyun ekranı bunu güvenli anda (hareket bitince) yakalar.
 */

'use client';

import React from 'react';
import { useT } from '@/contexts/LanguageContext';
import { useBoardRendererSetting, type BoardRendererSetting } from '@/game-engine/render/boardRenderer';

/** Seçenek sırası ve çeviri anahtarları; `SettingsPage` de aynısını kullanır. */
export const RENDERER_OPTIONS: { value: BoardRendererSetting; labelKey: string }[] = [
  { value: 'auto', labelKey: 'settings.renderer_auto' },
  { value: 'dom', labelKey: 'settings.renderer_dom' },
  { value: 'canvas', labelKey: 'settings.renderer_canvas' },
];

export function RendererSection() {
  const t = useT();
  const [setting, setSetting] = useBoardRendererSetting();

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
        <h3 style={{ margin: '0 0 4px 0', fontSize: 13, fontWeight: 700, color: '#f1f5f9', letterSpacing: '0.04em' }}>
          {t('settings.renderer_title')}
        </h3>
        <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', lineHeight: 1.4 }}>
          {t('settings.renderer_desc')}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {RENDERER_OPTIONS.map(({ value, labelKey }) => {
          const isSelected = setting === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setSetting(value)}
              style={{
                flex: '1 1 110px',
                padding: '9px 14px',
                fontSize: 12,
                fontWeight: 700,
                borderRadius: 8,
                border: isSelected ? '1px solid #00ff88' : '1px solid rgba(255, 255, 255, 0.1)',
                background: isSelected ? 'rgba(0, 255, 136, 0.12)' : 'rgba(15, 23, 42, 0.5)',
                color: isSelected ? '#00ff88' : '#94a3b8',
                boxShadow: isSelected ? '0 0 10px rgba(0, 255, 136, 0.2)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {t(labelKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
