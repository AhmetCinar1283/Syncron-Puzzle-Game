/**
 * DOSYA AMACI: Ayar bileşenlerinin ortak stil değişkenleri, dinamik tema token'ları
 * ve odak (focus) stilleri. Aktif oyun temasına (`useGameTheme`) göre uyarlanabilir.
 */

import type { CSSProperties } from 'react';
import type { GameTheme, ThemeDefinition } from '@/game-engine/themes/themeConfig';

export const COLORS = {
  accent: 'var(--st-accent, #00ff88)',
  accentSoft: 'var(--st-accent-soft, rgba(0, 255, 136, 0.14))',
  accentGlow: 'var(--st-accent-glow, rgba(0, 255, 136, 0.25))',
  info: '#38bdf8',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  textDim: '#64748b',
  cardBg: 'rgba(10, 18, 32, 0.72)',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  controlBg: 'rgba(15, 23, 42, 0.55)',
  controlBorder: 'rgba(255, 255, 255, 0.1)',
  danger: '#ef4444',
  dangerSoft: 'rgba(239, 68, 68, 0.15)',
} as const;

/** Hex rengi alfa kanallı rgba'ya çevirir. */
export function hexToRgba(hex: string, alpha: number): string {
  if (!hex || !hex.startsWith('#')) return `rgba(0, 255, 136, ${alpha})`;
  let c = hex.slice(1);
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const num = parseInt(c, 16);
  if (Number.isNaN(num)) return `rgba(0, 255, 136, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Aktif temadan CSS değişken haritası üretir. */
export function getSettingsThemeVars(theme: GameTheme, themeConfig: ThemeDefinition): CSSProperties {
  const accent = themeConfig.accentColor || '#00c4ff';
  const glow = themeConfig.accentGlow || hexToRgba(accent, 0.4);
  const isArcade = theme === 'arcade';

  return {
    '--st-accent': accent,
    '--st-accent-glow': glow,
    '--st-accent-soft': hexToRgba(accent, 0.15),
    '--st-accent-mid': hexToRgba(accent, 0.35),
    '--st-radius': isArcade ? '0px' : '12px',
    '--st-card-radius': isArcade ? '0px' : '16px',
    '--st-btn-radius': isArcade ? '0px' : '10px',
  } as CSSProperties;
}

/** Odaklı satır veya kartın çerçeve ve arka plan stili. */
export function focusStyle(focused: boolean, customAccent?: string): CSSProperties {
  const activeAccent = customAccent || COLORS.accent;
  return {
    border: focused ? `1.5px solid ${activeAccent}` : `1px solid ${COLORS.cardBorder}`,
    background: focused
      ? 'linear-gradient(90deg, var(--st-accent-soft, rgba(0, 255, 136, 0.12)) 0%, rgba(15, 23, 42, 0.6) 100%)'
      : 'rgba(15, 23, 42, 0.45)',
    boxShadow: focused ? '0 0 16px var(--st-accent-glow, rgba(0, 255, 136, 0.25))' : 'none',
  };
}

/** Seçilebilir düğmenin (segment seçeneği vb.) seçili/seçili değil stili. */
export function choiceStyle(selected: boolean, accent?: string): CSSProperties {
  const activeAccent = accent || COLORS.accent;
  const activeSoft = accent ? hexToRgba(accent, 0.16) : COLORS.accentSoft;
  const activeGlow = accent ? hexToRgba(accent, 0.35) : COLORS.accentGlow;

  return {
    border: selected ? `1.5px solid ${activeAccent}` : `1px solid ${COLORS.controlBorder}`,
    background: selected ? activeSoft : COLORS.controlBg,
    color: selected ? (accent || activeAccent) : COLORS.textMuted,
    boxShadow: selected ? `0 0 14px ${activeGlow}` : 'none',
  };
}
