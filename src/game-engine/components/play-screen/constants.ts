import type { Direction } from '../../logic/types';

/** PlayScreen sabitleri (önceden PlayScreen.tsx başındaydı; değerler birebir aynı). */

export const NATIVE_CELL_SIZE = 64;
export const HUD_HEIGHT = 60; // px — HUD'un sabit yüksekliği (ferah, dengeli dikey alan)
/** Kompakt (mobil) HUD eşiği — window.innerWidth < bu değer. */
export const COMPACT_BREAKPOINT = 850;
/** Oda yerleşiminde odalar arası boşluk (calculateRoomLayoutOffsets 3. argümanı). */
export const ROOM_LAYOUT_GAP = 40;
/**
 * Swipe'ın hamle sayılması için gereken minimum px. Hassasiyet 0-100:
 * 50 → ~22px (eski sabit 20'ye yakın), 100 → 8px, 0 → 36px.
 */
export function swipeThreshold(sensitivity: number): number {
    return Math.round(36 - 0.28 * sensitivity);
}
/** "Adım ileri" çözücü limitleri (derinlik, düğüm). */
export const STEP_SOLVER_MAX_DEPTH = 35;
export const STEP_SOLVER_MAX_NODES = 3000;

export const KEY_TO_DIRECTION: Record<string, Direction> = {
    ArrowUp:    'up',
    ArrowDown:  'down',
    ArrowLeft:  'left',
    ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right',
};

export const OPPOSITE_DIRECTION: Record<Direction, Direction> = {
    up: 'down', down: 'up', left: 'right', right: 'left',
};

export const TEXT_COLORS: Record<string, string> = {
    info:    '#00c4ff',
    warning: '#fbbf24',
    success: '#00ff88',
    error:   '#ef4444',
};

export const OBJECT_NEON: Record<number, { color: string; label: string; glow: string }> = {
    1: { color: '#00ff88', label: 'P1', glow: '0 0 6px rgba(0,255,136,0.7)' },
    2: { color: '#00c4ff', label: 'P2', glow: '0 0 6px rgba(0,196,255,0.7)' },
};

import { IconName } from '@/components/icons';

export type LostReason = 'forbidden' | 'lava_edge' | 'trail' | 'crushed';

export const REASON_KEYS: Record<LostReason, { icon: IconName; titleKey: string; msgKey: string }> = {
    forbidden: { icon: 'warning',   titleKey: 'lost.forbidden_title', msgKey: 'lost.forbidden_msg' },
    lava_edge: { icon: 'skull',     titleKey: 'lost.lava_title',     msgKey: 'lost.lava_msg' },
    trail:     { icon: 'close',     titleKey: 'lost.trail_title',    msgKey: 'lost.trail_msg' },
    crushed:   { icon: 'explosion', titleKey: 'lost.crushed_title', msgKey: 'lost.crushed_msg' },
};

export const STEP_DIRECTION_COLORS: Record<string, string> = {
    up: '#38bdf8',
    down: '#f43f5e',
    left: '#fbbf24',
    right: '#34d399',
    switch_room: '#a855f7',
};

export const STEP_DIRECTION_ARROWS: Record<string, string> = {
    up: '↑',
    down: '↓',
    left: '←',
    right: '→',
    switch_room: '❖',
};
