'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type GameTheme = 'neon' | 'legacy';

interface GameThemeContextType {
  theme: GameTheme;
  setTheme: (theme: GameTheme) => void;
  toggleTheme: () => void;
}

const GameThemeContext = createContext<GameThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'know_and_conquer_game_theme';

export const GameThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<GameTheme>('legacy');

  useEffect(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEY) as GameTheme | null;
    if (savedTheme === 'neon' || savedTheme === 'legacy') {
      setThemeState(savedTheme);
    }
  }, []);

  const setTheme = (newTheme: GameTheme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'neon' ? 'legacy' : 'neon';
    setTheme(nextTheme);
  };

  return (
    <GameThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </GameThemeContext.Provider>
  );
};

export const useGameTheme = () => {
  const context = useContext(GameThemeContext);
  if (!context) {
    // Return default fallback if used outside provider
    return {
      theme: 'legacy' as GameTheme,
      setTheme: () => {},
      toggleTheme: () => {},
    };
  }
  return context;
};
