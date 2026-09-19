import type { CSSProperties } from 'react';
import type { GameTheme } from '@/game-engine/themes/themeConfig';

export interface LevelCellThemeStyles {
  /** Hücre temel konteyner stili */
  base: CSSProperties;
  /** Kilitli hücre stili */
  locked: CSSProperties;
  /** Sıradaki oynanabilir hücre stili */
  current: CSSProperties;
  /** Tamamlanmış seviye stili */
  completed: CSSProperties;
  /** Ödüllü reklamla atlanmış hücre stili */
  skipped: CSSProperties;
  /** Klavye/Gamepad odaklanma stili */
  focused: CSSProperties;
}

export interface LevelThemeDefinition {
  id: GameTheme;
  name: string;
  accentColor: string;
  accentGlow: string;
  bgDark: string;

  /** Hücrelerin farklı durumlarındaki görsel stilleri */
  cell: LevelCellThemeStyles;

  /** Yıldız renk ve gölge yapılandırması */
  stars: {
    filledColor: string;
    emptyColor: string;
    glow: string;
  };

  /** Chapter çipleri (Pill) stilleri */
  chapterPill: {
    activeBg: string;
    activeBorder: string;
    activeText: string;
    inactiveBg: string;
    inactiveBorder: string;
    inactiveText: string;
    progressBar: string;
  };

  /** Kilit kalkanı stili */
  lockShield: {
    border: string;
    background: string;
    glow: string;
  };

  /** SVG Enerji Hattı (Conduit) stilleri */
  conduit: {
    activeStroke: string;
    activeGlow: string;
    inactiveStroke: string;
    pulseParticleColor: string;
  };

  /** Süzülen Kozmik Düğüm (Constellation Node) stilleri */
  nodeOrb: {
    activeRingColor: string;
    activeRingGlow: string;
    completedBorder: string;
    completedGlow: string;
    lockedBackground: string;
    lockedBorder: string;
  };

  /** Tipografi veya ek stil sınıfı (örn: font-mono vs.) */
  fontClass?: string;
}
