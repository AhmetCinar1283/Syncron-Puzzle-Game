/**
 * DOSYA AMACI: Herhangi bir sayfaya veya HUD paneline kolayca yerleştirilebilen,
 * tıklandığında ayarlar modalını açan temaya duyarlı neon kısayol butonudur.
 */

'use client';

import React from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { useT } from '@/contexts/LanguageContext';
import { useGameTheme } from '@/game-engine/contexts/GameThemeContext';
import { soundEngine } from '@/services/audio';
import { useSettings } from '../hooks/useSettings';
import { hexToRgba } from '../lib/styles';

interface SettingsButtonProps {
  isCompact?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function SettingsButton({ isCompact = false, className = '', style = {} }: SettingsButtonProps) {
  const t = useT();
  const { openSettings } = useSettings();
  const { theme, themeConfig } = useGameTheme();

  const accent = themeConfig.accentColor || '#00c4ff';
  const glow = themeConfig.accentGlow || hexToRgba(accent, 0.4);
  const isArcade = theme === 'arcade';

  const size = isCompact ? 32 : 36;
  const iconSize = isCompact ? 15 : 18;

  const handleClick = () => {
    soundEngine.play('modal.open');
    openSettings();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={t('settings.title') || 'Ayarlar'}
      aria-label={t('settings.title') || 'Ayarlar'}
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: isArcade ? 0 : 8,
        border: `1px solid ${hexToRgba(accent, 0.3)}`,
        background: 'rgba(15, 23, 42, 0.65)',
        color: accent,
        boxShadow: `0 0 10px ${hexToRgba(accent, 0.15)}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        flexShrink: 0,
        outline: 'none',
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.06)';
        e.currentTarget.style.borderColor = accent;
        e.currentTarget.style.boxShadow = `0 0 14px ${glow}`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.borderColor = hexToRgba(accent, 0.3);
        e.currentTarget.style.boxShadow = `0 0 10px ${hexToRgba(accent, 0.15)}`;
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'scale(0.94)';
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'scale(1.06)';
      }}
    >
      <SettingsIcon size={iconSize} />
    </button>
  );
}
