import type { GameTheme } from '@/game-engine/themes/themeConfig';
import type { LevelThemeDefinition } from './types';

export const LEVEL_THEMES: Record<GameTheme, LevelThemeDefinition> = {
  // 1. CLASSIC RETRO (Minimalist ve sakin klasik tahta)
  legacy: {
    id: 'legacy',
    name: 'Classic Retro',
    accentColor: '#00c4ff',
    accentGlow: 'rgba(0, 196, 255, 0.5)',
    bgDark: '#060d1a',
    cell: {
      base: {
        background: '#0d1928',
        border: '1px solid rgba(30, 58, 138, 0.45)',
        borderRadius: '8px',
        color: '#93c5fd',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
      },
      locked: {
        background: '#080f1a',
        border: '1px solid rgba(30, 58, 138, 0.2)',
        color: '#334155',
        opacity: 0.6,
      },
      current: {
        background: 'linear-gradient(135deg, #0d2744 0%, #0d1928 100%)',
        border: '2px solid #00c4ff',
        color: '#ffffff',
        boxShadow: '0 0 16px rgba(0, 196, 255, 0.45), inset 0 0 8px rgba(0, 196, 255, 0.2)',
      },
      completed: {
        background: 'linear-gradient(135deg, #102238 0%, #0c1828 100%)',
        border: '1px solid rgba(0, 196, 255, 0.5)',
        color: '#e0f2fe',
        boxShadow: '0 2px 8px rgba(0, 196, 255, 0.15)',
      },
      skipped: {
        background: '#131926',
        border: '1.5px dashed #f59e0b',
        color: '#fcd34d',
        boxShadow: '0 0 10px rgba(245, 158, 11, 0.2)',
      },
      focused: {
        outline: '2.5px solid #38bdf8',
        outlineOffset: '2px',
        transform: 'scale(1.04)',
      },
    },
    stars: {
      filledColor: '#38bdf8',
      emptyColor: 'rgba(56, 189, 248, 0.15)',
      glow: '0 0 8px rgba(56, 189, 248, 0.6)',
    },
    chapterPill: {
      activeBg: 'rgba(0, 196, 255, 0.12)',
      activeBorder: 'rgba(0, 196, 255, 0.6)',
      activeText: '#38bdf8',
      inactiveBg: 'rgba(15, 23, 42, 0.6)',
      inactiveBorder: 'rgba(255, 255, 255, 0.08)',
      inactiveText: '#64748b',
      progressBar: '#00c4ff',
    },
    lockShield: {
      border: 'rgba(0, 196, 255, 0.3)',
      background: 'rgba(6, 13, 26, 0.85)',
      glow: 'rgba(0, 196, 255, 0.15)',
    },
    conduit: {
      activeStroke: '#00c4ff',
      activeGlow: 'rgba(0, 196, 255, 0.6)',
      inactiveStroke: 'rgba(30, 58, 138, 0.3)',
      pulseParticleColor: '#38bdf8',
    },
    nodeOrb: {
      activeRingColor: '#00c4ff',
      activeRingGlow: '0 0 16px rgba(0, 196, 255, 0.7)',
      completedBorder: '#00c4ff',
      completedGlow: '0 0 12px rgba(0, 196, 255, 0.35)',
      lockedBackground: '#080f1a',
      lockedBorder: 'rgba(30, 58, 138, 0.4)',
    },
    fontClass: 'font-mono',
  },

  // 2. RETRO ARCADE (8-bit piksel atari salonu)
  arcade: {
    id: 'arcade',
    name: 'Retro Arcade',
    accentColor: '#facc15',
    accentGlow: 'rgba(250, 204, 21, 0.65)',
    bgDark: '#050505',
    cell: {
      base: {
        background: '#18181b',
        border: '2px solid #3f3f46',
        borderRadius: '2px',
        color: '#d4d4d8',
        boxShadow: 'inset 2px 2px 0 #27272a, inset -2px -2px 0 #09090b',
      },
      locked: {
        background: '#0d0d0f',
        border: '2px solid #27272a',
        color: '#52525b',
        opacity: 0.5,
      },
      current: {
        background: '#27272a',
        border: '2px solid #facc15',
        color: '#fef08a',
        boxShadow: '0 0 14px rgba(250, 204, 21, 0.6), inset 2px 2px 0 #71717a',
      },
      completed: {
        background: 'linear-gradient(135deg, #27272a 0%, #1c1917 100%)',
        border: '2px solid #eab308',
        color: '#fef9c3',
        boxShadow: '0 2px 8px rgba(234, 179, 8, 0.25)',
      },
      skipped: {
        background: '#1c1917',
        border: '2px dashed #f97316',
        color: '#fdba74',
        boxShadow: '0 0 8px rgba(249, 115, 22, 0.3)',
      },
      focused: {
        outline: '3px solid #facc15',
        outlineOffset: '2px',
        transform: 'scale(1.05)',
      },
    },
    stars: {
      filledColor: '#facc15',
      emptyColor: 'rgba(250, 204, 21, 0.2)',
      glow: '0 0 10px rgba(250, 204, 21, 0.8)',
    },
    chapterPill: {
      activeBg: 'rgba(250, 204, 21, 0.15)',
      activeBorder: '#facc15',
      activeText: '#facc15',
      inactiveBg: 'rgba(24, 24, 27, 0.8)',
      inactiveBorder: 'rgba(63, 63, 70, 0.6)',
      inactiveText: '#71717a',
      progressBar: '#facc15',
    },
    lockShield: {
      border: 'rgba(250, 204, 21, 0.4)',
      background: 'rgba(9, 9, 11, 0.92)',
      glow: 'rgba(250, 204, 21, 0.2)',
    },
    conduit: {
      activeStroke: '#facc15',
      activeGlow: 'rgba(250, 204, 21, 0.75)',
      inactiveStroke: 'rgba(63, 63, 70, 0.35)',
      pulseParticleColor: '#fef08a',
    },
    nodeOrb: {
      activeRingColor: '#facc15',
      activeRingGlow: '0 0 18px rgba(250, 204, 21, 0.8)',
      completedBorder: '#eab308',
      completedGlow: '0 0 12px rgba(250, 204, 21, 0.4)',
      lockedBackground: '#18181b',
      lockedBorder: '#3f3f46',
    },
    fontClass: 'font-mono tracking-wider',
  },

  // 3. NEON CYBER (Siber reaktör & fütüristik parıltı)
  neon: {
    id: 'neon',
    name: 'Neon Cyber',
    accentColor: '#00ff88',
    accentGlow: 'rgba(0, 255, 136, 0.65)',
    bgDark: '#030712',
    cell: {
      base: {
        background: 'rgba(8, 15, 26, 0.75)',
        border: '1.5px solid rgba(0, 255, 136, 0.25)',
        borderRadius: '12px',
        color: '#a7f3d0',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
      },
      locked: {
        background: 'rgba(3, 7, 18, 0.75)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        color: '#334155',
        opacity: 0.5,
      },
      current: {
        background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.18) 0%, rgba(6, 78, 59, 0.25) 100%)',
        border: '2px solid #00ff88',
        color: '#ffffff',
        boxShadow: '0 0 20px rgba(0, 255, 136, 0.5), inset 0 0 10px rgba(0, 255, 136, 0.2)',
      },
      completed: {
        background: 'linear-gradient(135deg, rgba(6, 78, 59, 0.3) 0%, rgba(8, 15, 26, 0.8) 100%)',
        border: '1.5px solid rgba(0, 255, 136, 0.6)',
        color: '#6ee7b7',
        boxShadow: '0 0 12px rgba(0, 255, 136, 0.2)',
      },
      skipped: {
        background: 'rgba(20, 14, 8, 0.8)',
        border: '1.5px dashed #f59e0b',
        color: '#fde68a',
        boxShadow: '0 0 12px rgba(245, 158, 11, 0.3)',
      },
      focused: {
        outline: '2.5px solid #00ff88',
        outlineOffset: '2px',
        transform: 'scale(1.05)',
      },
    },
    stars: {
      filledColor: '#00ff88',
      emptyColor: 'rgba(0, 255, 136, 0.15)',
      glow: '0 0 12px rgba(0, 255, 136, 0.7)',
    },
    chapterPill: {
      activeBg: 'rgba(0, 255, 136, 0.12)',
      activeBorder: '#00ff88',
      activeText: '#00ff88',
      inactiveBg: 'rgba(8, 15, 26, 0.7)',
      inactiveBorder: 'rgba(255, 255, 255, 0.08)',
      inactiveText: '#64748b',
      progressBar: '#00ff88',
    },
    lockShield: {
      border: 'rgba(0, 255, 136, 0.4)',
      background: 'rgba(3, 7, 18, 0.9)',
      glow: 'rgba(0, 255, 136, 0.2)',
    },
    conduit: {
      activeStroke: '#00ff88',
      activeGlow: 'rgba(0, 255, 136, 0.8)',
      inactiveStroke: 'rgba(0, 255, 136, 0.12)',
      pulseParticleColor: '#6ee7b7',
    },
    nodeOrb: {
      activeRingColor: '#00ff88',
      activeRingGlow: '0 0 22px rgba(0, 255, 136, 0.85)',
      completedBorder: '#00ff88',
      completedGlow: '0 0 14px rgba(0, 255, 136, 0.4)',
      lockedBackground: 'rgba(3, 7, 18, 0.85)',
      lockedBorder: 'rgba(255, 255, 255, 0.1)',
    },
  },

  // 4. BLUEPRINT DRAFT (Teknik mimari pafta & net çizimler)
  blueprint: {
    id: 'blueprint',
    name: 'Blueprint Draft',
    accentColor: '#38bdf8',
    accentGlow: 'rgba(56, 189, 248, 0.65)',
    bgDark: '#07182e',
    cell: {
      base: {
        background: '#07172b',
        border: '1px solid rgba(56, 189, 248, 0.3)',
        borderRadius: '6px',
        color: '#7dd3fc',
        boxShadow: 'inset 0 0 8px rgba(0, 0, 0, 0.6)',
      },
      locked: {
        background: '#040d1a',
        border: '1px dashed rgba(56, 189, 248, 0.15)',
        color: '#1e3a5f',
        opacity: 0.55,
      },
      current: {
        background: 'linear-gradient(135deg, #0f2c4f 0%, #07172b 100%)',
        border: '2px solid #38bdf8',
        color: '#ffffff',
        boxShadow: '0 0 16px rgba(56, 189, 248, 0.5), inset 0 0 8px rgba(56, 189, 248, 0.25)',
      },
      completed: {
        background: '#0c223d',
        border: '1.5px solid rgba(56, 189, 248, 0.6)',
        color: '#bae6fd',
        boxShadow: '0 2px 10px rgba(56, 189, 248, 0.2)',
      },
      skipped: {
        background: '#121e33',
        border: '1.5px dashed #fbbf24',
        color: '#fde68a',
        boxShadow: '0 0 8px rgba(251, 191, 36, 0.25)',
      },
      focused: {
        outline: '2.5px solid #38bdf8',
        outlineOffset: '2px',
        transform: 'scale(1.04)',
      },
    },
    stars: {
      filledColor: '#38bdf8',
      emptyColor: 'rgba(56, 189, 248, 0.15)',
      glow: '0 0 8px rgba(56, 189, 248, 0.6)',
    },
    chapterPill: {
      activeBg: 'rgba(56, 189, 248, 0.15)',
      activeBorder: '#38bdf8',
      activeText: '#38bdf8',
      inactiveBg: 'rgba(7, 24, 46, 0.75)',
      inactiveBorder: 'rgba(56, 189, 248, 0.2)',
      inactiveText: '#60a5fa',
      progressBar: '#38bdf8',
    },
    lockShield: {
      border: 'rgba(56, 189, 248, 0.4)',
      background: 'rgba(7, 24, 46, 0.92)',
      glow: 'rgba(56, 189, 248, 0.2)',
    },
    conduit: {
      activeStroke: '#38bdf8',
      activeGlow: 'rgba(56, 189, 248, 0.65)',
      inactiveStroke: 'rgba(56, 189, 248, 0.2)',
      pulseParticleColor: '#bae6fd',
    },
    nodeOrb: {
      activeRingColor: '#38bdf8',
      activeRingGlow: '0 0 16px rgba(56, 189, 248, 0.7)',
      completedBorder: '#38bdf8',
      completedGlow: '0 0 10px rgba(56, 189, 248, 0.35)',
      lockedBackground: '#07182e',
      lockedBorder: 'rgba(56, 189, 248, 0.3)',
    },
    fontClass: 'font-mono',
  },

  // 5. COSMIC VOID (Derin uzay & takımyıldızı)
  cosmic: {
    id: 'cosmic',
    name: 'Cosmic Void',
    accentColor: '#a855f7',
    accentGlow: 'rgba(168, 85, 247, 0.65)',
    bgDark: '#080314',
    cell: {
      base: {
        background: 'rgba(21, 10, 38, 0.8)',
        border: '1.5px solid rgba(168, 85, 247, 0.3)',
        borderRadius: '12px',
        color: '#d8b4fe',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6)',
      },
      locked: {
        background: 'rgba(10, 4, 18, 0.8)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        color: '#473160',
        opacity: 0.5,
      },
      current: {
        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.25) 0%, rgba(60, 15, 90, 0.4) 100%)',
        border: '2px solid #c084fc',
        color: '#ffffff',
        boxShadow: '0 0 22px rgba(192, 132, 252, 0.6), inset 0 0 10px rgba(168, 85, 247, 0.3)',
      },
      completed: {
        background: 'linear-gradient(135deg, rgba(88, 28, 135, 0.35) 0%, rgba(21, 10, 38, 0.85) 100%)',
        border: '1.5px solid rgba(192, 132, 252, 0.65)',
        color: '#f3e8ff',
        boxShadow: '0 0 14px rgba(168, 85, 247, 0.3)',
      },
      skipped: {
        background: 'rgba(28, 15, 30, 0.85)',
        border: '1.5px dashed #f59e0b',
        color: '#fef08a',
        boxShadow: '0 0 10px rgba(245, 158, 11, 0.3)',
      },
      focused: {
        outline: '2.5px solid #c084fc',
        outlineOffset: '2px',
        transform: 'scale(1.05)',
      },
    },
    stars: {
      filledColor: '#e879f9',
      emptyColor: 'rgba(232, 121, 249, 0.18)',
      glow: '0 0 12px rgba(232, 121, 249, 0.8)',
    },
    chapterPill: {
      activeBg: 'rgba(168, 85, 247, 0.18)',
      activeBorder: '#c084fc',
      activeText: '#e879f9',
      inactiveBg: 'rgba(21, 10, 38, 0.7)',
      inactiveBorder: 'rgba(255, 255, 255, 0.08)',
      inactiveText: '#94a3b8',
      progressBar: '#a855f7',
    },
    lockShield: {
      border: 'rgba(168, 85, 247, 0.4)',
      background: 'rgba(10, 4, 18, 0.92)',
      glow: 'rgba(168, 85, 247, 0.25)',
    },
    conduit: {
      activeStroke: '#c084fc',
      activeGlow: 'rgba(192, 132, 252, 0.75)',
      inactiveStroke: 'rgba(168, 85, 247, 0.15)',
      pulseParticleColor: '#f3e8ff',
    },
    nodeOrb: {
      activeRingColor: '#e879f9',
      activeRingGlow: '0 0 24px rgba(232, 121, 249, 0.85)',
      completedBorder: '#c084fc',
      completedGlow: '0 0 16px rgba(168, 85, 247, 0.45)',
      lockedBackground: 'rgba(10, 4, 18, 0.85)',
      lockedBorder: 'rgba(168, 85, 247, 0.2)',
    },
  },
};

export const DEFAULT_LEVEL_THEME: GameTheme = 'legacy';

export function getLevelTheme(themeId?: string | null): LevelThemeDefinition {
  return LEVEL_THEMES[(themeId as GameTheme) ?? ''] ?? LEVEL_THEMES[DEFAULT_LEVEL_THEME];
}
