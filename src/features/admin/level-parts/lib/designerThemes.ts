import type { CSSProperties } from 'react';

export function getThemeBackground(mapTheme: string): CSSProperties {
  switch (mapTheme) {
    case 'star-nebula':
      return {
        background: 'radial-gradient(circle at 50% 50%, #0c1530 0%, #020617 100%)',
        boxShadow: 'inset 0 0 100px rgba(99, 102, 241, 0.15)'
      };
    case 'cosmic-vortex':
      return {
        background: 'radial-gradient(circle at 50% 50%, #200c3b 0%, #06020f 100%)',
        boxShadow: 'inset 0 0 100px rgba(168, 85, 247, 0.15)'
      };
    case 'retro-matrix':
      return {
        background: '#000',
        backgroundImage: 'linear-gradient(to right, rgba(34, 197, 94, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(34, 197, 94, 0.05) 1px, transparent 1px)',
        backgroundSize: '25px 25px'
      };
    case 'neon-abyss':
      return {
        background: 'linear-gradient(180deg, #0d0614 0%, #020005 100%)',
        boxShadow: 'inset 0 0 100px rgba(236, 72, 153, 0.12)'
      };
    case 'cyber-grid':
    default:
      return {
        background: '#030712',
        backgroundImage: 'linear-gradient(to right, rgba(0, 196, 255, 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 196, 255, 0.06) 1px, transparent 1px)',
        backgroundSize: '30px 30px'
      };
  }
}

export function getThemeColor(mapTheme: string): string {
  if (mapTheme === 'retro-matrix') return '#22c55e';
  if (mapTheme === 'neon-abyss') return '#ec4899';
  if (mapTheme === 'cosmic-vortex') return '#a855f7';
  if (mapTheme === 'star-nebula') return '#6366f1';
  return '#00c4ff';
}
