/**
 * DOSYA AMACI: `direction_deflector` (yön saptırıcı) hücresinin canvas
 * rasterleyicisi. Süsü yoktur.
 *
 * Kaynak: `components/cells/directionDeflectorCellRenderer.tsx`.
 *
 * ANAHTARA GİREN ALAN: `customData.mapping` — dört kenardaki okların hangi yönü
 * gösterdiğini, yani doğrudan görüntüyü belirliyor (faz planı §2: "yansıtma
 * ekseni anahtara girmeli"). `legacy` teması okları HİÇ çizmediği için orada
 * anahtara girmez.
 */

import type { Direction } from '../../logic/types';
import type { GameTheme } from '../../themes/themeConfig';
import type { CellPaintInput, SpritePainter } from '../types';
import { NATIVE_CELL_SIZE } from '../types';
import { paintBox } from '../paintTokens';
import { CELL_BOX, CELL_CENTER, DIR_LETTER, clipCell, drawText, measureText, outerPad } from './common';

const SYMBOL = '⤭';
const ARROWS: Record<Direction, string> = { up: '▲', down: '▼', left: '◄', right: '►' };
const DEFAULT_MAPPING: Record<Direction, Direction> = { up: 'right', right: 'down', down: 'left', left: 'up' };

const ARROW_STYLE = { size: 10, weight: 'bold' as const, color: '#f472b6' };
const BORDER = 2;
/** `top: 2` / `bottom: 2` DOLGU kutusuna göredir (2px kenarın içi), satır yüksekliği 10. */
const ARROW_TOP_Y = BORDER + 2 + ARROW_STYLE.size / 2;
const ARROW_BOTTOM_Y = NATIVE_CELL_SIZE - BORDER - 2 - ARROW_STYLE.size / 2;
/** `left: 4` / `right: 4`, dikeyde `top:50%` + `translateY(-50%)`. */
const ARROW_LEFT_X = BORDER + 4;
const ARROW_RIGHT_X = NATIVE_CELL_SIZE - BORDER - 4;

function radiusFor(theme: GameTheme): string {
    return theme === 'arcade' ? '0px' : theme === 'blueprint' ? '2px' : '8px';
}

function themedBoxShadow(isOccupied: boolean): string {
    return isOccupied
        ? 'inset 0 0 24px rgba(236,72,153,0.75), 0 0 16px rgba(236,72,153,0.5)'
        : 'inset 0 0 16px rgba(236,72,153,0.25), 0 0 10px rgba(236,72,153,0.2)';
}

function isDirection(value: unknown): value is Direction {
    return value === 'up' || value === 'down' || value === 'left' || value === 'right';
}

function mappingOf(customData: Record<string, unknown>): Record<Direction, Direction> {
    const raw = customData.mapping;
    if (!raw || typeof raw !== 'object') return DEFAULT_MAPPING;
    const source = raw as Record<string, unknown>;
    const out = { ...DEFAULT_MAPPING };
    for (const side of ['up', 'right', 'down', 'left'] as Direction[]) {
        if (isDirection(source[side])) out[side] = source[side];
    }
    return out;
}

function drawMappingArrows(ctx: CanvasRenderingContext2D, mapping: Record<Direction, Direction>): void {
    drawText(ctx, ARROWS[mapping.up], CELL_CENTER, ARROW_TOP_Y, ARROW_STYLE);
    drawText(ctx, ARROWS[mapping.down], CELL_CENTER, ARROW_BOTTOM_Y, ARROW_STYLE);
    // Yandakiler kendi genişliklerine göre yerleşiyor (`left`/`right` ofseti
    // kutunun kenarını verir, merkezini değil).
    const leftWidth = measureText(ctx, ARROWS[mapping.left], ARROW_STYLE);
    drawText(ctx, ARROWS[mapping.left], ARROW_LEFT_X + leftWidth / 2, CELL_CENTER, ARROW_STYLE);
    const rightWidth = measureText(ctx, ARROWS[mapping.right], ARROW_STYLE);
    drawText(ctx, ARROWS[mapping.right], ARROW_RIGHT_X - rightWidth / 2, CELL_CENTER, ARROW_STYLE);
}

export const directionDeflectorCellSprite: SpritePainter<CellPaintInput> = {
    key: ({ cell, theme, isOccupied }) => {
        if (theme === 'legacy') return 'direction_deflector|legacy';
        const m = mappingOf(cell.customData);
        const axes = DIR_LETTER[m.up] + DIR_LETTER[m.right] + DIR_LETTER[m.down] + DIR_LETTER[m.left];
        return `direction_deflector|${theme}|occ${isOccupied ? 1 : 0}|${axes}`;
    },

    size: ({ theme, isOccupied }) => {
        const pad = theme === 'legacy'
            ? outerPad('inset 0 0 14px rgba(236, 72, 153, 0.2), 0 0 8px rgba(236, 72, 153, 0.15)')
            : outerPad(themedBoxShadow(isOccupied));
        return { w: NATIVE_CELL_SIZE + pad * 2, h: NATIVE_CELL_SIZE + pad * 2 };
    },

    draw: (ctx, { cell, theme, isOccupied }) => {
        if (theme === 'legacy') {
            const shadow = 'inset 0 0 14px rgba(236, 72, 153, 0.2), 0 0 8px rgba(236, 72, 153, 0.15)';
            const pad = outerPad(shadow);
            ctx.save();
            ctx.translate(pad, pad);
            paintBox(ctx, CELL_BOX, {
                background: 'rgba(236, 72, 153, 0.12)',
                border: '2px solid rgba(236, 72, 153, 0.6)',
                boxShadow: shadow,
                borderRadius: '0px',
            });
            drawText(ctx, SYMBOL, CELL_CENTER, CELL_CENTER, {
                size: 20,
                weight: 'bold',
                color: '#ec4899',
                textShadow: '0 0 8px rgba(236,72,153,0.7)',
            });
            ctx.restore();
            return;
        }

        const radius = radiusFor(theme);
        const pad = outerPad(themedBoxShadow(isOccupied));
        ctx.save();
        ctx.translate(pad, pad);
        paintBox(ctx, CELL_BOX, {
            background: isOccupied ? 'rgba(15, 23, 42, 0.9)' : 'rgba(15, 23, 42, 0.7)',
            border: isOccupied ? '2px solid #fbcfe8' : '2px solid #ec4899',
            boxShadow: themedBoxShadow(isOccupied),
            borderRadius: radius,
        });

        clipCell(ctx, radius);   // DOM'daki `overflow: hidden`
        drawText(ctx, SYMBOL, CELL_CENTER, CELL_CENTER, {
            size: 22,
            weight: 'bold',
            color: isOccupied ? '#fbcfe8' : '#f472b6',
            textShadow: '0 0 10px rgba(236,72,153,0.9), 0 0 20px rgba(236,72,153,0.4)',
        });
        drawMappingArrows(ctx, mappingOf(cell.customData));
        ctx.restore();
    },
};
