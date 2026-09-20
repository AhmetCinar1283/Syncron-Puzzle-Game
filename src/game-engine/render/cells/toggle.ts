/**
 * DOSYA AMACI: `toggle` (geçiş anahtarı) hücresinin canvas rasterleyicisi.
 *
 * Kaynak: `components/cells/toggleCellRenderer.tsx`.
 *
 * DİKKAT — SÜS YOK: faz planı §2 tablosu bu hücreye `toggle-symbol-active`
 * süsünü yazıyor, ama kaynak DOM çizicisi o sınıfı HİÇBİR koşulda vermiyor
 * (sınıf yalnızca `animationStyles.ts`'te tanımlı, kullanılmıyor). 00-ilkeler
 * §4 gereği DOM ne gösteriyorsa o çizilir; sembol durağandır.
 */

import type { GameTheme } from '../../themes/themeConfig';
import type { CellPaintInput, SpritePainter } from '../types';
import { NATIVE_CELL_SIZE } from '../types';
import { paintBox } from '../paintTokens';
import { CELL_BOX, CELL_CENTER, clipCell, drawText, outerPad } from './common';

const SYMBOL = '⇄';

function radiusFor(theme: GameTheme): string {
    return theme === 'arcade' ? '0px' : theme === 'blueprint' ? '2px' : '8px';
}

function boxShadowOf(isOccupied: boolean): string {
    return isOccupied
        ? 'inset 0 0 24px rgba(251,191,36,0.75), 0 0 16px rgba(251,191,36,0.5)'
        : 'inset 0 0 16px rgba(251,191,36,0.25), 0 0 10px rgba(251,191,36,0.2)';
}

function drawLegacy(ctx: CanvasRenderingContext2D): void {
    paintBox(ctx, CELL_BOX, {
        background: 'rgba(255, 215, 0, 0.07)',
        border: '1px solid rgba(255, 215, 0, 0.45)',
        boxShadow: 'inset 0 0 14px rgba(255, 215, 0, 0.18)',
        borderRadius: '0px',
    });
    drawText(ctx, SYMBOL, CELL_CENTER, CELL_CENTER, {
        size: 19,
        weight: 'bold',
        color: '#ffd700',
        textShadow: '0 0 8px rgba(255,215,0,0.7)',
    });
}

function drawThemed(ctx: CanvasRenderingContext2D, theme: GameTheme, isOccupied: boolean): void {
    const radius = radiusFor(theme);
    paintBox(ctx, CELL_BOX, {
        background: isOccupied ? 'rgba(15, 23, 42, 0.9)' : 'rgba(15, 23, 42, 0.7)',
        border: isOccupied ? '2px solid #fef08a' : '2px solid #fbbf24',
        boxShadow: boxShadowOf(isOccupied),
        borderRadius: radius,
    });

    ctx.save();
    clipCell(ctx, radius);   // DOM'daki `overflow: hidden`
    drawText(ctx, SYMBOL, CELL_CENTER, CELL_CENTER, {
        size: 22,
        weight: 'bold',
        color: isOccupied ? '#fef08a' : '#fbbf24',
        textShadow: '0 0 12px rgba(251,191,36,0.9), 0 0 24px rgba(251,191,36,0.5)',
    });
    ctx.restore();
}

function padFor(theme: GameTheme, isOccupied: boolean): number {
    return theme === 'legacy' ? 0 : outerPad(boxShadowOf(isOccupied));
}

export const toggleCellSprite: SpritePainter<CellPaintInput> = {
    key: ({ theme, isOccupied }) => (theme === 'legacy' ? 'toggle|legacy' : `toggle|${theme}|occ${isOccupied ? 1 : 0}`),

    size: ({ theme, isOccupied }) => {
        const pad = padFor(theme, isOccupied);
        return { w: NATIVE_CELL_SIZE + pad * 2, h: NATIVE_CELL_SIZE + pad * 2 };
    },

    draw: (ctx, { theme, isOccupied }) => {
        const pad = padFor(theme, isOccupied);
        ctx.save();
        ctx.translate(pad, pad);
        if (theme === 'legacy') drawLegacy(ctx);
        else drawThemed(ctx, theme, isOccupied);
        ctx.restore();
    },
};
