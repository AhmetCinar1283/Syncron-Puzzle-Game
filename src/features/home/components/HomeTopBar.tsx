'use client';

import React, { memo, useCallback } from 'react';
import { GameIcon } from '@/components/icons';
import { useGameTheme } from '@/game-engine/contexts/GameThemeContext';
import { useLanguage, useT } from '@/contexts/LanguageContext';
import { useSoundManager } from '@/services/audio';

interface HomeTopBarProps {
  onOpenThemeModal: () => void;
}

/**
 * Başlık + hızlı tema değiştirici ve dil seçici.
 */
function HomeTopBarBase({ onOpenThemeModal }: HomeTopBarProps) {
  const t = useT();
  const { lang, setLang } = useLanguage();
  const { themeConfig } = useGameTheme();
  const { play: playSound } = useSoundManager('menu');

  const handleToggleLang = useCallback(() => {
    playSound('ui.confirm');
    setLang(lang === 'tr' ? 'en' : 'tr');
  }, [lang, playSound, setLang]);

  return (
    <div className="home-topbar">
      <div>
        <h1 className="home-topbar__title">Syncron</h1>
        <p className="home-topbar__tagline">Grid Puzzle</p>
      </div>

      <div className="home-topbar__actions">
        <button
          type="button"
          className="home-chip"
          onClick={onOpenThemeModal}
          onMouseEnter={() => playSound('ui.tick')}
          title={t('home.change_theme')}
          aria-label={t('home.change_theme')}
        >
          <GameIcon name="palette" size={13} color={themeConfig.accentColor} />
          <span>{t(themeConfig.nameKey) || themeConfig.defaultName}</span>
        </button>

        <button
          type="button"
          className="home-chip home-chip--lang"
          onClick={handleToggleLang}
          onMouseEnter={() => playSound('ui.tick')}
          title={t('home.change_language')}
          aria-label={t('home.change_language')}
        >
          <GameIcon name="globe" size={13} color={themeConfig.accentColor} />
          <span>{lang.toUpperCase()}</span>
        </button>
      </div>
    </div>
  );
}

export const HomeTopBar = memo(HomeTopBarBase);
