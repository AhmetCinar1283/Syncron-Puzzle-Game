'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  GameTheme, 
  ThemeDefinition, 
  getThemeConfig, 
  isValidTheme, 
  ALL_THEMES 
} from '../themes/themeConfig';

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

const STORAGE_KEY = 'know_and_conquer_game_theme';

export const GameThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<GameTheme>('arcade');

  useEffect(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEY);
    if (savedTheme && isValidTheme(savedTheme)) {
      setThemeState(savedTheme);
    }
  }, []);

  const setTheme = (newTheme: GameTheme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
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
