/**
 * DOSYA AMACI: Ayar bileşenlerinin ortak renk sabitleri ve odak (focus) stili.
 * Satır bileşenleri aynı görünümü tek yerden alır.
 */

import type { CSSProperties } from 'react';

export const COLORS = {
  accent: '#00ff88',
  accentSoft: 'rgba(0, 255, 136, 0.14)',
  accentGlow: 'rgba(0, 255, 136, 0.25)',
  info: '#00c4ff',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  textDim: '#64748b',
  cardBg: 'rgba(255, 255, 255, 0.02)',
  cardBorder: 'rgba(255, 255, 255, 0.08)',
  controlBg: 'rgba(15, 23, 42, 0.5)',
  controlBorder: 'rgba(255, 255, 255, 0.1)',
  danger: '#ef4444',
} as const;

/** Odaklı satırın çerçeve ve arka plan stili. */
export function focusStyle(focused: boolean): CSSProperties {
  return {
    border: focused ? `1px solid ${COLORS.accent}` : '1px solid transparent',
    background: focused ? 'rgba(0, 255, 136, 0.04)' : 'transparent',
  };
}

/** Seçilebilir düğmenin (segment seçeneği vb.) seçili/seçili değil stili. */
export function choiceStyle(selected: boolean, accent: string = COLORS.accent): CSSProperties {
  return {
    border: selected ? `1.5px solid ${accent}` : `1px solid ${COLORS.controlBorder}`,
    background: selected ? COLORS.accentSoft : COLORS.controlBg,
    color: selected ? accent : COLORS.textMuted,
    boxShadow: selected ? `0 0 12px ${COLORS.accentGlow}` : 'none',
  };
}
