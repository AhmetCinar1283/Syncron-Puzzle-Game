/**
 * DOSYA AMACI: Herhangi bir sayfaya veya HUD paneline kolayca yerleştirilebilen,
 * tıklandığında ayarlar modalını açan neon stilinde kısayol butonudur.
 */

'use client';

import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { useT } from '@/contexts/LanguageContext';
import { useSettings } from '../hooks/useSettings';

interface SettingsButtonProps {
  isCompact?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function SettingsButton({ isCompact = false, className = '', style = {} }: SettingsButtonProps) {
  const t = useT();
  const { openSettings } = useSettings();

  const size = isCompact ? 32 : 36;
  const iconSize = isCompact ? 15 : 18;

  return (
    <button
      type="button"
      onClick={openSettings}
      title={t('settings.title') || 'Ayarlar'}
      aria-label={t('settings.title') || 'Ayarlar'}
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        border: '1px solid rgba(0, 255, 136, 0.25)',
        background: 'rgba(255, 255, 255, 0.03)',
        color: '#00ff88',
        boxShadow: '0 0 8px rgba(0, 255, 136, 0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        flexShrink: 0,
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.06)';
        e.currentTarget.style.borderColor = '#00ff88';
        e.currentTarget.style.boxShadow = '0 0 12px rgba(0, 255, 136, 0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.borderColor = 'rgba(0, 255, 136, 0.25)';
        e.currentTarget.style.boxShadow = '0 0 8px rgba(0, 255, 136, 0.12)';
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'scale(0.95)';
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'scale(1.06)';
      }}
    >
      <SettingsIcon size={iconSize} />
    </button>
  );
}
