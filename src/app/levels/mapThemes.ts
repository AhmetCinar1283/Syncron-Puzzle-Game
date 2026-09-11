/**
 * DOSYA AMACI: Kampanya harita temalarının (arkaplan, ızgara rengi, aktif renk) TEK kaynağı.
 * Önceden bu bilgiler page.tsx içinde 3 farklı switch-case olarak kopyalanmıştı; artık
 * hem HUD hem harita hem de kart bileşenleri buradan okur.
 */

export type MapThemeId =
  | 'cyber-grid'
  | 'star-nebula'
  | 'cosmic-vortex'
  | 'retro-matrix'
  | 'neon-abyss';

export interface MapTheme {
  id: MapThemeId;
  /** Sayfa arkaplanı (CSS background kısayolu) */
  background: string;
  /** İnce ızgara çizgisi rengi (rgba) — büyük görsel efektler kaldırıldığı için sade tutulur */
  gridColor: string;
  /** Aktif/tamamlanan yol ve düğüm rengi */
  activeColor: string;
}

const THEMES: Record<MapThemeId, MapTheme> = {
  'cyber-grid': {
    id: 'cyber-grid',
    background: '#030712',
    gridColor: 'rgba(0, 255, 136, 0.05)',
    activeColor: '#00ff88',
  },
  'star-nebula': {
    id: 'star-nebula',
    background: 'radial-gradient(circle at 50% 30%, #0c1530 0%, #020617 100%)',
    gridColor: 'rgba(99, 102, 241, 0.05)',
    activeColor: '#6366f1',
  },
  'cosmic-vortex': {
    id: 'cosmic-vortex',
    background: 'radial-gradient(circle at 50% 30%, #200c3b 0%, #06020f 100%)',
    gridColor: 'rgba(168, 85, 247, 0.05)',
    activeColor: '#a855f7',
  },
  'retro-matrix': {
    id: 'retro-matrix',
    background: '#000',
    gridColor: 'rgba(34, 197, 94, 0.06)',
    activeColor: '#22c55e',
  },
  'neon-abyss': {
    id: 'neon-abyss',
    background: 'linear-gradient(180deg, #0d0614 0%, #020005 100%)',
    gridColor: 'rgba(236, 72, 153, 0.05)',
    activeColor: '#ec4899',
  },
};

export const DEFAULT_MAP_THEME: MapThemeId = 'cyber-grid';

export function getMapTheme(id?: string | null): MapTheme {
  return THEMES[(id as MapThemeId) ?? ''] ?? THEMES[DEFAULT_MAP_THEME];
}

export const DIFFICULTY_COLORS: Record<number, string> = {
  1: '#00ff88',
  2: '#fbbf24',
  3: '#f97316',
  4: '#ef4444',
};
