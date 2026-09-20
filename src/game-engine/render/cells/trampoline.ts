/**
 * DOSYA AMACI: `trampoline` (zıplatıcı) hücresinin canvas rasterleyicisi.
 *
 * Kaynak: `components/cells/trampolineCellRenderer.tsx`.
 *
 * ANAHTARA GİREN ALANLAR: `customData.direction` (yay yönü) ve `isActive`
 * (varlık gelince 500 ms süren "zıplıyor" hâli; bkz. `cells/activity.ts`).
 *
 * SÜS YOK (faz planı §2): `trampoline-spring-active` 500 ms'lik TEK SEFERLİK
 * bir `forwards` animasyonu, `AMBIENT_CLASSES` listesinde de değil. Bu yüzden
 * yay ezilmesi örneklenmez; aktif hâl animasyonun BİTTİĞİ görünümle
 * (`scale(1,1)`) çizilir. Bkz. raporlar/03-rapor.md §4.
 */

import type { GameTheme } from '../../themes/themeConfig';
import type { CellPaintInput, SpritePainter } from '../types';
import { NATIVE_CELL_SIZE } from '../types';
import { outerGlow, paintBox } from '../paintTokens';
import { CELL_BOX, CELL_CENTER, DIR_LETTER, ROTATION, clipCell, directionOf, outerPad } from './common';

const VIEW_BOX = 24;
const LEGACY_SVG = 35;
const THEMED_SVG = 38;

const SPRING_PATHS = [
    'M12 22V12',
    'M12 12C12 12 17 16 19 12C21 8 12 2 12 2',
    'M12 12C12 12 7 16 5 12C3 8 12 2 12 2',
];
/** `<line x1="8" y1="22" x2="16" y2="22" />` */
const BASE_LINE = 'M8 22H16';

function bounceColor(theme: GameTheme): string {
    if (theme === 'arcade') return '#facc15';
    if (theme === 'cosmic') return '#a78bfa';
    if (theme === 'blueprint') return '#38bdf8';
    return '#22d3ee';
}

function radiusFor(theme: GameTheme): number {
    return theme === 'arcade' ? 0 : theme === 'blueprint' ? 2 : 6;
}

function themedBoxShadow(color: string, isActive: boolean): string {
    return isActive
        ? `inset 0 0 24px ${color}88, 0 0 16px ${color}66`
        : `inset 0 0 16px ${color}40, 0 0 10px ${color}25`;
}

const LEGACY_SHADOW = 'inset 0 0 14px rgba(34, 211, 238, 0.2), 0 0 8px rgba(34, 211, 238, 0.15)';

function drawSpring(
    ctx: CanvasRenderingContext2D,
    svgSize: number,
    direction: keyof typeof ROTATION,
    stroke: string,
    width: number,
    glow: { color: string; blur: number },
): void {
    const scale = svgSize / VIEW_BOX;
    ctx.save();
    ctx.translate(CELL_CENTER, CELL_CENTER);
    ctx.rotate((ROTATION[direction] * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.translate(-VIEW_BOX / 2, -VIEW_BOX / 2);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const strokeAll = () => {
        for (const d of [...SPRING_PATHS, BASE_LINE]) ctx.stroke(new Path2D(d));
    };
    // Parlama yarıçapı CSS pikselinde verilmiş; ölçeklenmiş bağlamda geri bölünür.
    outerGlow(ctx, strokeAll, glow.color, glow.blur / scale);
    ctx.restore();
}

function padFor(theme: GameTheme, isActive: boolean): number {
    return outerPad(theme === 'legacy' ? LEGACY_SHADOW : themedBoxShadow(bounceColor(theme), isActive));
}

export const trampolineCellSprite: SpritePainter<CellPaintInput> = {
    key: ({ cell, theme, isActive }) => {
        const dir = DIR_LETTER[directionOf(cell.customData)];
        return theme === 'legacy' ? `trampoline|legacy|${dir}` : `trampoline|${theme}|act${isActive ? 1 : 0}|${dir}`;
    },

    size: ({ theme, isActive }) => {
        const pad = padFor(theme, isActive);
        return { w: NATIVE_CELL_SIZE + pad * 2, h: NATIVE_CELL_SIZE + pad * 2 };
    },

    draw: (ctx, { cell, theme, isActive }) => {
        const direction = directionOf(cell.customData);
        const pad = padFor(theme, isActive);
        ctx.save();
        ctx.translate(pad, pad);

        if (theme === 'legacy') {
            paintBox(ctx, CELL_BOX, {
                background: 'rgba(34, 211, 238, 0.12)',
                border: '2px solid rgba(34, 211, 238, 0.6)',
                boxShadow: LEGACY_SHADOW,
                borderRadius: '0px',
            });
            drawSpring(ctx, LEGACY_SVG, direction, '#22d3ee', 2.5, { color: 'rgba(34,211,238,0.8)', blur: 6 });
            ctx.restore();
            return;
        }

        const color = bounceColor(theme);
        const radius = radiusFor(theme);
        paintBox(ctx, CELL_BOX, {
            background: isActive ? 'rgba(15, 23, 42, 0.9)' : 'rgba(15, 23, 42, 0.7)',
            border: `2px solid ${isActive ? '#ffffff' : color}`,
            boxShadow: themedBoxShadow(color, isActive),
            borderRadius: radius,
        });

        clipCell(ctx, radius);   // DOM'daki `overflow: hidden`
        drawSpring(
            ctx, THEMED_SVG, direction,
            isActive ? '#e0f7fa' : '#22d3ee',
            isActive ? 3.2 : 2.5,
            isActive ? { color: 'rgba(34,211,238,1)', blur: 12 } : { color: 'rgba(34,211,238,0.85)', blur: 6 },
        );
        ctx.restore();
    },
};
