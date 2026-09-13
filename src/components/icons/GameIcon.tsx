'use client';

import React from 'react';
import { GameIconProps, IconName, ThemeIconMap } from './types';
import { resolveIconName } from './emojiMap';
import { classicIcons } from './themes/classic';
import { useGameTheme } from '@/game-engine/contexts/GameThemeContext';

// Theme icon registries registry. Extensible for new themes.
const THEMES: Record<string, ThemeIconMap> = {
  classic: classicIcons,
  legacy: classicIcons, // Alias for legacy/classic
  arcade: classicIcons,
};

export const GameIcon: React.FC<GameIconProps> = ({
  name,
  theme: themeProp,
  size = '1.15em',
  color = 'currentColor',
  className,
  style,
  ...rest
}) => {
  // Try to read theme from context if not explicitly provided
  let contextTheme = 'classic';
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const gameTheme = useGameTheme();
    if (gameTheme?.theme) {
      contextTheme = gameTheme.theme;
    }
  } catch {
    // Safe fallback if used outside provider
    contextTheme = 'classic';
  }

  const selectedTheme = themeProp || contextTheme || 'classic';

  // Resolve name if passed as emoji or canonical name
  const resolvedName: IconName = (resolveIconName(name) || name) as IconName;

  // Lookup in active theme, fallback to classic
  const themeMap = THEMES[selectedTheme] || THEMES.classic;
  const Component = themeMap[resolvedName] || classicIcons[resolvedName];

  if (!Component) {
    // Fallback if icon name is unknown: render nothing or simple box
    return null;
  }

  return (
    <Component
      size={size}
      color={color}
      className={className}
      style={style}
      aria-hidden="true"
      {...rest}
    />
  );
};

export default GameIcon;
