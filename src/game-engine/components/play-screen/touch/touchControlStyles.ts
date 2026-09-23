import type { CSSProperties } from 'react';
import type { GameTheme } from '../../../themes/themeConfig';

/**
 * Ekran üstü dokunmatik tuşların tema başına görünümü. Tuşların yerleşimi/boyutu
 * tema-bağımsızdır (TouchControls); burada yalnızca "nasıl göründükleri" durur.
 */
export interface TouchPadSkin {
    /** Yön tuşu ikonu: `chevron` yumuşak temalar, `arrow` piksel/teknik temalar için. */
    glyph: 'chevron' | 'arrow';
    radius: string | number;
    /** Tuşun ana rengi (ikon + kenar); ikincil (undo/oda) tuşlar `secondary` kullanır. */
    accent: string;
    secondary: string;
    idle: CSSProperties;
    pressed: CSSProperties;
    /** Dpad ortasındaki dekoratif göbek. */
    hub: CSSProperties;
    iconStroke: number;
}

const idleBase: CSSProperties = { transition: 'transform 70ms ease-out, box-shadow 70ms ease-out, background 70ms ease-out' };

export const TOUCH_PAD_SKINS: Record<GameTheme, TouchPadSkin> = {
    legacy: {
        glyph: 'chevron',
        radius: 8,
        accent: '#38bdf8',
        secondary: '#94a3b8',
        iconStroke: 2.6,
        idle: {
            ...idleBase,
            background: 'linear-gradient(180deg, #14233a 0%, #0d1928 100%)',
            border: '2px solid rgba(59, 100, 190, 0.55)',
            boxShadow: '0 3px 0 rgba(6, 13, 26, 0.9), inset 0 1px 0 rgba(120, 160, 240, 0.18)',
        },
        pressed: {
            background: 'linear-gradient(180deg, #1c3556 0%, #14233a 100%)',
            border: '2px solid rgba(96, 165, 250, 0.9)',
            boxShadow: '0 0 0 rgba(0,0,0,0), 0 0 14px rgba(56, 189, 248, 0.35)',
            transform: 'translateY(3px) scale(0.97)',
        },
        hub: { background: '#0d1928', border: '2px solid rgba(59, 100, 190, 0.35)', borderRadius: 8 },
    },

    arcade: {
        glyph: 'arrow',
        radius: 0,
        accent: '#facc15',
        secondary: '#e4e4e7',
        iconStroke: 3.2,
        idle: {
            ...idleBase,
            background: '#27272a',
            border: '3px solid #09090b',
            boxShadow: 'inset 3px 3px 0 #71717a, inset -3px -3px 0 #09090b, 0 4px 0 #000',
        },
        pressed: {
            background: '#3f3f46',
            border: '3px solid #09090b',
            boxShadow: 'inset 3px 3px 0 #09090b, inset -3px -3px 0 #52525b, 0 0 0 #000, 0 0 14px rgba(250, 204, 21, 0.55)',
            transform: 'translateY(4px)',
        },
        hub: { background: '#09090b', border: '3px solid #27272a', borderRadius: 0 },
    },

    neon: {
        glyph: 'chevron',
        radius: 14,
        accent: '#00ff88',
        secondary: '#00c4ff',
        iconStroke: 2.8,
        idle: {
            ...idleBase,
            background: 'rgba(4, 12, 26, 0.85)',
            border: '1.5px solid rgba(0, 255, 136, 0.45)',
            boxShadow: '0 0 12px rgba(0, 255, 136, 0.18), inset 0 0 10px rgba(0, 255, 136, 0.07)',
        },
        pressed: {
            background: 'rgba(0, 255, 136, 0.16)',
            border: '1.5px solid #00ff88',
            boxShadow: '0 0 22px rgba(0, 255, 136, 0.65), inset 0 0 14px rgba(0, 255, 136, 0.25)',
            transform: 'scale(0.93)',
        },
        hub: { background: 'rgba(0, 196, 255, 0.06)', border: '1.5px solid rgba(0, 196, 255, 0.25)', borderRadius: 999 },
    },

    blueprint: {
        glyph: 'arrow',
        radius: 3,
        accent: '#7dd3fc',
        secondary: '#38bdf8',
        iconStroke: 2.2,
        idle: {
            ...idleBase,
            background: 'rgba(12, 39, 76, 0.85)',
            border: '1.5px dashed rgba(56, 189, 248, 0.75)',
            boxShadow: 'inset 0 0 10px rgba(56, 189, 248, 0.12)',
        },
        pressed: {
            background: 'rgba(56, 189, 248, 0.25)',
            border: '1.5px solid #7dd3fc',
            boxShadow: '0 0 16px rgba(56, 189, 248, 0.55), inset 0 0 12px rgba(125, 211, 252, 0.3)',
            transform: 'scale(0.94)',
        },
        hub: { background: 'transparent', border: '1.5px dashed rgba(56, 189, 248, 0.3)', borderRadius: 999 },
    },

    cosmic: {
        glyph: 'chevron',
        radius: '50%',
        accent: '#c4b5fd',
        secondary: '#a78bfa',
        iconStroke: 2.4,
        idle: {
            ...idleBase,
            background: 'radial-gradient(circle at 30% 25%, #1e1040 0%, #0e071e 75%)',
            border: '1.5px solid rgba(167, 139, 250, 0.4)',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.55), 0 0 12px rgba(139, 92, 246, 0.18)',
        },
        pressed: {
            background: 'radial-gradient(circle at 30% 25%, #3b1f7a 0%, #1a0d3a 75%)',
            border: '1.5px solid rgba(196, 181, 253, 0.9)',
            boxShadow: '0 0 24px rgba(139, 92, 246, 0.6), inset 0 0 12px rgba(196, 181, 253, 0.25)',
            transform: 'scale(0.92)',
        },
        hub: { background: 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 70%)', border: '1px solid rgba(167, 139, 250, 0.15)', borderRadius: '50%' },
    },
};
