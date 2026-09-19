'use client';

import React, { memo } from 'react';
import { GameIcon } from '@/components/icons';
import { useGameTheme } from '@/game-engine/contexts/GameThemeContext';
import { useT } from '@/contexts/LanguageContext';

interface HomeTopBarProps {
  onOpenThemeModal: () => void;
}

/**
 * Başlık + hızlı tema değiştirici. Eski sürümde tahtanın içindeki "STAGE 00"
 * HUD şeridiydi; oradan çıkarıldı çünkü tahtanın tüm dikey alanı artık birincil
 * eylemin.
 */
function HomeTopBarBase({ onOpenThemeModal }: HomeTopBarProps) {
  const t = useT();
  const { themeConfig } = useGameTheme();

  return (
    <div className="home-topbar">
      <div>
        <h1 className="home-topbar__title">Syncron</h1>
        <p className="home-topbar__tagline">Grid Puzzle</p>
      </div>

      <button
        type="button"
        className="home-chip"
        onClick={onOpenThemeModal}
        title={t('home.change_theme')}
        aria-label={t('home.change_theme')}
      >
        <GameIcon name="palette" size={13} color={themeConfig.accentColor} />
        <span>{t(themeConfig.nameKey) || themeConfig.defaultName}</span>
      </button>
    </div>
  );
}

export const HomeTopBar = memo(HomeTopBarBase);
