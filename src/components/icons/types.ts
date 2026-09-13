import React from 'react';
import { GameTheme } from '@/game-engine/themes/themeConfig';

export type IconName =
  // Gameplay & Game Engine
  | 'trophy'
  | 'gamepad'
  | 'joystick'
  | 'star'
  | 'skull'
  | 'portal'
  | 'ice'
  | 'lightning'
  | 'switch'
  | 'box'
  | 'target'
  | 'clock'
  | 'timer'
  | 'hourglass'
  | 'footsteps'
  | 'flag'
  | 'party'
  | 'explosion'
  | 'plug'
  | 'key'
  | 'mountain'
  | 'medal'
  | 'architect'
  | 'crown'
  | 'retro-block'
  | 'galaxy'
  | 'ruler'
  // Navigation & UI controls
  | 'menu'
  | 'close'
  | 'arrow-right'
  | 'arrow-left'
  | 'arrow-up'
  | 'arrow-down'
  | 'search'
  | 'pin'
  | 'map'
  | 'fullscreen'
  | 'minimize'
  | 'refresh'
  | 'repeat'
  | 'backspace'
  | 'external-link'
  // Editor & Tools
  | 'pencil'
  | 'palette'
  | 'save'
  | 'plus'
  | 'trash'
  | 'copy'
  | 'clipboard'
  | 'erase'
  | 'import'
  | 'folder'
  | 'wood'
  | 'grid'
  | 'sparkles'
  | 'dot'
  | 'robot'
  | 'book'
  | 'template'
  | 'tools'
  // Social & Monetization
  | 'user'
  | 'friends'
  | 'chat'
  | 'mail'
  | 'heart'
  | 'shield'
  | 'award'
  | 'coffee'
  | 'thumbs-up'
  | 'thumbs-down'
  | 'credit-card'
  | 'tag'
  | 'globe'
  | 'coins'
  | 'keyboard'
  // System & Status
  | 'warning'
  | 'check'
  | 'error'
  | 'settings'
  | 'lock'
  | 'unlock'
  | 'volume-on'
  | 'volume-off'
  | 'eye'
  | 'eye-off'
  | 'bar-chart'
  | 'trend-up'
  | 'lightbulb'
  | 'ban'
  | 'loader';

export interface IconSvgProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  color?: string;
}

export type IconComponent = React.FC<IconSvgProps>;

export type ThemeIconMap = Partial<Record<IconName, IconComponent>>;

export interface GameIconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName | string;
  theme?: GameTheme | 'classic';
  size?: number | string;
  color?: string;
}
