// src/game-engine/themes/themeConfig.ts
// Comprehensive, unified theme configuration system for Syncron

export type GameTheme = 
    | 'legacy' 
    | 'arcade' 
    | 'neon' 
    | 'blueprint' 
    | 'cosmic';

export interface ThemeDefinition {
    id: GameTheme;
    nameKey: string;
    defaultName: string;
    descriptionKey: string;
    defaultDescription: string;
    icon: string;
    accentColor: string;
    accentGlow: string;
    bgDark: string;
    
    // Board container styling
    board: {
        border: (isControlled: boolean) => string;
        boxShadow: (isControlled: boolean) => string;
        background?: string;
        borderRadius?: number;
    };

    // Normal empty cell
    normalCell: {
        background: string;
        border: string;
        boxShadow?: string;
        borderRadius?: string;
    };

    // Obstacle block cell (concentric "kare içinde kare" structure)
    obstacleCell: {
        background: string;
        border: string;
        boxShadow?: string;
        borderRadius?: string;
        innerBg: string;
        innerBorder: string;
        markColor?: string;
        styleType: 'classic' | 'brick' | 'tech_plate' | 'blueprint_hatch' | 'obsidian';
    };

    // Forbidden hazard cell
    forbiddenCell: {
        background: string;
        border: string;
        boxShadow?: string;
        symbolColor: string;
        hazardType: 'skull' | 'pixel_skull' | 'cross';
    };

    // Box entity styling
    box: {
        borderRadius: number;
        border: (hex: string, dimmed: boolean, isPowered: boolean) => string;
        boxShadow: (rgb: string, dimmed: boolean, isPowered: boolean) => string;
        background: (rgb: string, dimmed: boolean) => string;
        styleType: 'classic_square' | 'arcade_block' | 'neon_rect' | 'blueprint_draft' | 'cosmic_crate';
    };

    // Player styling
    player: {
        styleType: 'classic_arrow' | 'arcade_sprite' | 'neon_crosshair' | 'blueprint_reticle' | 'cosmic_orb';
    };
}

export const THEME_CONFIGS: Record<GameTheme, ThemeDefinition> = {
    // 1. CLASSIC RETRO (Highest priority, user's favorite baseline)
    legacy: {
        id: 'legacy',
        nameKey: 'theme.legacy',
        defaultName: 'Classic Retro',
        descriptionKey: 'theme.legacy_desc',
        defaultDescription: 'Minimalist ve sakin klasik tahta',
        icon: 'retro-block',
        accentColor: '#00c4ff',
        accentGlow: 'rgba(0,196,255,0.5)',
        bgDark: '#060d1a',
        board: {
            border: () => '3px solid rgba(30, 58, 138, 0.5)',
            boxShadow: () => '0 0 30px rgba(0, 0, 0, 0.8)',
            background: '#060d1a',
            borderRadius: 4,
        },
        normalCell: {
            background: '#0d1928',
            border: '1px solid rgba(30, 58, 138, 0.25)',
            borderRadius: '0px',
        },
        obstacleCell: {
            background: 'linear-gradient(135deg, #152238 0%, #0d1726 100%)',
            border: '1px solid rgba(100, 130, 200, 0.4)',
            boxShadow: 'inset 0 1px 0 rgba(100,130,200,0.15)',
            borderRadius: '2px',
            innerBg: 'linear-gradient(135deg, #1f3350 0%, #152438 100%)',
            innerBorder: '1px solid rgba(120, 160, 240, 0.3)',
            styleType: 'classic',
        },
        forbiddenCell: {
            background: 'rgba(220, 20, 50, 0.18)',
            border: '1px solid rgba(255, 30, 60, 0.5)',
            boxShadow: 'inset 0 0 14px rgba(255, 0, 50, 0.25)',
            symbolColor: 'rgba(255, 60, 80, 0.85)',
            hazardType: 'skull',
        },
        box: {
            borderRadius: 6,
            border: (hex, dimmed) => dimmed ? '2px solid rgba(71, 85, 105, 0.5)' : `2px solid ${hex}`,
            boxShadow: (rgb, dimmed) => dimmed ? 'none' : `0 0 10px rgba(${rgb},0.5), 0 0 20px rgba(${rgb},0.2)`,
            background: (_rgb, dimmed) => dimmed ? 'rgba(30, 40, 55, 0.9)' : 'rgba(15, 23, 35, 0.95)',
            styleType: 'classic_square',
        },
        player: {
            styleType: 'classic_arrow',
        },
    },

    // 2. RETRO ARCADE 8-BIT
    arcade: {
        id: 'arcade',
        nameKey: 'theme.arcade',
        defaultName: 'Retro Arcade 8-Bit',
        descriptionKey: 'theme.arcade_desc',
        defaultDescription: 'Pikselli arcade salonu & CRT konsol',
        icon: 'joystick',
        accentColor: '#facc15',
        accentGlow: 'rgba(250, 204, 21, 0.65)',
        bgDark: '#050505',
        board: {
            border: (isControlled) => isControlled ? '3px solid #facc15' : '3px solid #3f3f46',
            boxShadow: (isControlled) => isControlled 
                ? '0 0 0 2px #000, 0 0 16px rgba(250, 204, 21, 0.7)' 
                : '0 0 0 2px #000',
            background: '#09090b',
            borderRadius: 0,
        },
        normalCell: {
            background: '#0d0f17',
            border: '1px solid #1f2438',
            borderRadius: '0px',
        },
        obstacleCell: {
            background: '#18181b',
            border: '2px solid #52525b',
            boxShadow: 'inset 2px 2px 0 #71717a, inset -2px -2px 0 #09090b',
            borderRadius: '0px',
            innerBg: '#27272a',
            innerBorder: '2px solid #3f3f46',
            markColor: '#a1a1aa',
            styleType: 'brick',
        },
        forbiddenCell: {
            background: '#2b0707',
            border: '2px solid #ef4444',
            boxShadow: 'inset 2px 2px 0 #f87171, inset -2px -2px 0 #450a0a',
            symbolColor: '#fca5a5',
            hazardType: 'pixel_skull',
        },
        box: {
            borderRadius: 0,
            border: (hex, dimmed, isPowered) => `2px solid ${dimmed ? '#3f3f46' : isPowered ? '#facc15' : hex}`,
            boxShadow: (rgb, dimmed, isPowered) => dimmed ? 'none' : isPowered ? '0 0 10px #facc15' : `inset 2px 2px 0 rgba(${rgb},0.8), inset -2px -2px 0 rgba(0,0,0,0.8)`,
            background: (_rgb, dimmed) => dimmed ? '#18181b' : '#27272a',
            styleType: 'arcade_block',
        },
        player: {
            styleType: 'arcade_sprite',
        },
    },

    // 3. NEON CYBER (Refined to Classic-like clarity with sleek neon rims)
    neon: {
        id: 'neon',
        nameKey: 'theme.neon',
        defaultName: 'Neon Cyber',
        descriptionKey: 'theme.neon_desc',
        defaultDescription: 'Siber reaktör & parlak neon ızgarası',
        icon: 'lightning',
        accentColor: '#00ff88',
        accentGlow: 'rgba(0,255,136,0.65)',
        bgDark: '#030712',
        board: {
            border: (isControlled) => isControlled ? '2px solid rgba(0, 196, 255, 0.4)' : '2px solid transparent',
            boxShadow: (isControlled) => isControlled 
                ? '0 0 24px rgba(0, 196, 255, 0.5), inset 0 0 12px rgba(0, 196, 255, 0.25)' 
                : 'none',
            background: '#040914',
            borderRadius: 6,
        },
        normalCell: {
            background: '#080f1a',
            border: '1px solid rgba(0, 196, 255, 0.15)',
            boxShadow: 'inset 0 0 6px rgba(0,0,0,0.5)',
            borderRadius: '2px',
        },
        obstacleCell: {
            background: 'linear-gradient(135deg, #0d1a2d 0%, #080f1c 100%)',
            border: '1.5px solid rgba(0, 255, 136, 0.35)',
            boxShadow: '0 2px 6px rgba(0,0,0,0.5), 0 0 8px rgba(0,255,136,0.15)',
            borderRadius: '4px',
            innerBg: 'linear-gradient(135deg, #132742 0%, #0c1829 100%)',
            innerBorder: '1.5px solid rgba(0, 255, 136, 0.5)',
            markColor: '#00ff88',
            styleType: 'tech_plate',
        },
        forbiddenCell: {
            background: 'rgba(20, 10, 20, 0.85)',
            border: '1.5px solid #ef4444',
            boxShadow: 'inset 0 0 14px rgba(239,68,68,0.3), 0 0 8px rgba(239,68,68,0.25)',
            symbolColor: '#f87171',
            hazardType: 'cross',
        },
        box: {
            borderRadius: 6,
            border: (hex, dimmed, isPowered) => `2px solid ${dimmed ? `rgba(100,116,139,0.4)` : isPowered ? '#fbbf24' : hex}`,
            boxShadow: (rgb, dimmed, isPowered) => dimmed ? 'none' : isPowered ? '0 0 14px rgba(251,191,36,0.8)' : `0 0 10px rgba(${rgb},0.5), inset 0 0 4px rgba(${rgb},0.2)`,
            background: (rgb, dimmed) => dimmed ? 'rgba(15,23,35,0.9)' : `rgba(15,23,35,0.95)`,
            styleType: 'neon_rect',
        },
        player: {
            styleType: 'neon_crosshair',
        },
    },

    // 4. BLUEPRINT DRAFT (Prussian navy, clean CAD lines, no cluttered graph paper)
    blueprint: {
        id: 'blueprint',
        nameKey: 'theme.blueprint',
        defaultName: 'Blueprint Draft',
        descriptionKey: 'theme.blueprint_desc',
        defaultDescription: 'Teknik mimari pafta & net çizimler',
        icon: 'ruler',
        accentColor: '#38bdf8',
        accentGlow: 'rgba(56, 189, 248, 0.65)',
        bgDark: '#07182e',
        board: {
            border: (isControlled) => isControlled ? '2px dashed #38bdf8' : '2px solid rgba(56, 189, 248, 0.3)',
            boxShadow: (isControlled) => isControlled 
                ? '0 0 22px rgba(56, 189, 248, 0.4), inset 0 0 12px rgba(56, 189, 248, 0.15)' 
                : 'inset 0 0 10px rgba(0,0,0,0.8)',
            background: '#07172b',
            borderRadius: 2,
        },
        normalCell: {
            background: '#091b33',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            boxShadow: 'inset 0 0 4px rgba(0,0,0,0.3)',
            borderRadius: '0px',
        },
        obstacleCell: {
            background: '#0c274c',
            border: '1.5px solid #38bdf8',
            boxShadow: 'inset 0 0 8px rgba(56,189,248,0.2)',
            borderRadius: '2px',
            innerBg: '#10325e',
            innerBorder: '1px dashed #7dd3fc',
            markColor: '#e0f2fe',
            styleType: 'blueprint_hatch',
        },
        forbiddenCell: {
            background: 'rgba(40, 15, 25, 0.85)',
            border: '1.5px dashed #f43f5e',
            boxShadow: 'inset 0 0 14px rgba(244,63,94,0.3)',
            symbolColor: '#fecdd3',
            hazardType: 'cross',
        },
        box: {
            borderRadius: 2,
            border: (hex, dimmed, isPowered) => `2px solid ${dimmed ? '#1e3a8a' : isPowered ? '#fef08a' : hex}`,
            boxShadow: (rgb, dimmed, isPowered) => dimmed ? 'none' : isPowered ? '0 0 12px #fef08a' : `0 0 10px rgba(${rgb},0.4), inset 0 0 4px rgba(${rgb},0.2)`,
            background: (_rgb, dimmed) => dimmed ? '#07182e' : '#0c274c',
            styleType: 'blueprint_draft',
        },
        player: {
            styleType: 'blueprint_reticle',
        },
    },

    // 5. COSMIC VOID (Deep dark space void, clean obsidian, gentle starlight, non-neon)
    cosmic: {
        id: 'cosmic',
        nameKey: 'theme.cosmic',
        defaultName: 'Cosmic Void',
        descriptionKey: 'theme.cosmic_desc',
        defaultDescription: 'Derin uzay boşluğu & sessiz obsidyen',
        icon: 'galaxy',
        accentColor: '#a78bfa',
        accentGlow: 'rgba(167, 139, 250, 0.5)',
        bgDark: '#05030a',
        board: {
            border: (isControlled) => isControlled ? '2px solid rgba(167, 139, 250, 0.45)' : '2px solid rgba(120, 80, 200, 0.2)',
            boxShadow: (isControlled) => isControlled 
                ? '0 0 24px rgba(139, 92, 246, 0.35), inset 0 0 12px rgba(167, 139, 250, 0.15)' 
                : '0 0 15px rgba(0, 0, 0, 0.8)',
            background: '#07040f',
            borderRadius: 6,
        },
        normalCell: {
            background: '#090514',
            border: '1px solid rgba(139, 92, 246, 0.18)',
            boxShadow: 'inset 0 0 6px rgba(0,0,0,0.7)',
            borderRadius: '2px',
        },
        obstacleCell: {
            background: '#0e071e',
            border: '1.5px solid rgba(167, 139, 250, 0.35)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.6)',
            borderRadius: '4px',
            innerBg: '#160b2e',
            innerBorder: '1px solid rgba(196, 181, 253, 0.25)',
            markColor: '#c4b5fd',
            styleType: 'obsidian',
        },
        forbiddenCell: {
            background: 'rgba(25, 8, 20, 0.85)',
            border: '1.5px solid #f43f5e',
            boxShadow: 'inset 0 0 14px rgba(244,63,94,0.3)',
            symbolColor: '#fb7185',
            hazardType: 'cross',
        },
        box: {
            borderRadius: 6,
            border: (hex, dimmed, isPowered) => `2px solid ${dimmed ? 'rgba(100,80,140,0.3)' : isPowered ? '#fef08a' : hex}`,
            boxShadow: (rgb, dimmed, isPowered) => dimmed ? 'none' : isPowered ? '0 0 14px #fef08a' : `0 0 10px rgba(${rgb},0.4), inset 0 0 4px rgba(${rgb},0.15)`,
            background: (_rgb, dimmed) => dimmed ? '#0a0516' : '#120824',
            styleType: 'cosmic_crate',
        },
        player: {
            styleType: 'cosmic_orb',
        },
    },
};

export const ALL_THEMES: ThemeDefinition[] = [
    THEME_CONFIGS.arcade,
    THEME_CONFIGS.legacy,
    THEME_CONFIGS.neon,
    THEME_CONFIGS.blueprint,
    THEME_CONFIGS.cosmic,
];

export function getThemeConfig(theme: GameTheme): ThemeDefinition {
    return THEME_CONFIGS[theme] || THEME_CONFIGS.arcade;
}

export function isValidTheme(theme: string): theme is GameTheme {
    return Object.prototype.hasOwnProperty.call(THEME_CONFIGS, theme);
}
