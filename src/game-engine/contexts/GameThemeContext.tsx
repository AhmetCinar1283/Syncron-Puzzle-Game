'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  GameTheme, 
  ThemeDefinition, 
  getThemeConfig, 
  isValidTheme, 
  ALL_THEMES 
} from '../themes/themeConfig';
import { settingsService } from '@/services/settings';

export type { GameTheme, ThemeDefinition };
export { getThemeConfig };

interface GameThemeContextType {
  theme: GameTheme;
  themeConfig: ThemeDefinition;
  setTheme: (theme: GameTheme) => void;
  toggleTheme: () => void;
  cycleTheme: () => void;
}

const GameThemeContext = createContext<GameThemeContextType | undefined>(undefined);

export const GameThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<GameTheme>(() => settingsService.getTheme());

  useEffect(() => {
    const unsubscribe = settingsService.subscribe((s) => {
      setThemeState(s.theme);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-game-theme', theme);
    }
  }, [theme]);

  const setTheme = (newTheme: GameTheme) => {
    setThemeState(newTheme);
    settingsService.setTheme(newTheme);
  };

  const cycleTheme = () => {
    const currentIndex = ALL_THEMES.findIndex(t => t.id === theme);
    const nextIndex = (currentIndex + 1) % ALL_THEMES.length;
    setTheme(ALL_THEMES[nextIndex].id);
  };

  const toggleTheme = cycleTheme;

  const themeConfig = getThemeConfig(theme);

  return (
    <GameThemeContext.Provider value={{ theme, themeConfig, setTheme, toggleTheme, cycleTheme }}>
      {children}
    </GameThemeContext.Provider>
  );
};

export const useGameTheme = () => {
  const context = useContext(GameThemeContext);
  if (!context) {
    // Return default fallback if used outside provider
    const defaultTheme: GameTheme = 'arcade';
    return {
      theme: defaultTheme,
      themeConfig: getThemeConfig(defaultTheme),
      setTheme: () => {},
      toggleTheme: () => {},
      cycleTheme: () => {},
    };
  }
  return context;
};
