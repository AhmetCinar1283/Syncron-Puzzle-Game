/**
 * DOSYA AMACI: `conveyor` (taşıma bandı) hücresinin canvas rasterleyicileri.
 *
 *   - `conveyorCellSprite`        → DURAĞAN gövde; oklar animasyonlu değilken
 *                                   onları DA içerir.
 *   - `conveyorAmbientSprite`     → `conveyorChasing` ile yanıp sönen üç ok.
 *
 * Kaynak: `components/cells/conveyorCellRenderer.tsx` ve `animationStyles.ts`
 * (`conveyorChasing 0.5s linear`, gecikmeler 0 / 0.16 / 0.32 s).
 *
 * ANAHTARA GİREN ALANLAR: `customData.direction` (ok yönü) ve
 * `cell.isElectrified` (sönük görünüm) — ikisi de görüntüyü değiştiriyor.
 * `isActive` geçici "çalışıyor" hâli (800 ms); bkz. `cells/activity.ts`.
 */

import { getThemeConfig } from '../../themes/themeConfig';
import type { GameTheme } from '../../themes/themeConfig';
import type { CellPaintInput, SpritePainter } from '../types';
import { NATIVE_CELL_SIZE, PHASES } from '../types';
import { outerGlow, paintBox, parseCssColor, toCss } from '../paintTokens';
import { CELL_BOX, CELL_CENTER, DIR_LETTER, ROTATION, clipCell, directionOf, outerPad } from './common';
import { BASE_PHASE } from './ice';

/** `conveyorChasing 0.5s infinite linear`. */
export const CONVEYOR_CHASE_MS = 500;
const ARROW_DELAYS = [0, 160, 320];
const SVG_SIZE = 35;
const VIEW_BOX = 24;

const LEGACY_PATHS = ['M6 21l6-6 6 6', 'M6 14l6-6 6 6', 'M6 7l6-6 6 6'];
const THEMED_PATHS = ['M6 18l6-6 6 6', 'M6 12l6-6 6 6', 'M6 6l6-6 6 6'];
const THEMED_OPACITY = [0.4, 1.0, 0.4];

/** CSS `filter: grayscale(a)` matrisi (sRGB). Legacy'nin sönük hâli için. */
function grayscale(css: string, amount: number): string {
    const c = parseCssColor(css);
    if (!c) return css;
    const s = 1 - amount;
    const lum = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
    return toCss({
        r: Math.round(lum + s * (c.r - lum)),
        g: Math.round(lum + s * (c.g - lum)),
        b: Math.round(lum + s * (c.b - lum)),
        a: c.a,
    });
}

/** `0%,100% → 0.25`, `50% → 1`; `linear`, sonsuz, `delay` kadar geciken. */
function chaseOpacity(phase: number, delayMs: number): number {
    if (phase === BASE_PHASE) return -1;   // `animation: none` → satır içi opaklık
    const step = (((phase % PHASES) + PHASES) % PHASES);
    const t = step * (CONVEYOR_CHASE_MS / PHASES);
    const p = ((((t - delayMs) / CONVEYOR_CHASE_MS) % 1) + 1) % 1;
    return 0.25 + 0.75 * (p < 0.5 ? p / 0.5 : (1 - p) / 0.5);
}

interface ArrowStyle {
    stroke: string;
    width: number;
    /** `filter: drop-shadow(0 0 Npx c)`; yoksa `null`. */
    glow: { color: string; blur: number } | null;
}

/**
 * Üç oku çizer. DOM'da `drop-shadow` SVG'nin TAMAMINA uygulanıyor, bu yüzden
 * parlama üç yolun birleşiminden bir kez alınır.
 */
function drawArrows(
    ctx: CanvasRenderingContext2D,
    paths: string[],
    direction: keyof typeof ROTATION,
    style: ArrowStyle,
    opacities: number[],
): void {
    ctx.save();
    ctx.translate(CELL_CENTER, CELL_CENTER);
    ctx.rotate((ROTATION[direction] * Math.PI) / 180);
    ctx.scale(SVG_SIZE / VIEW_BOX, SVG_SIZE / VIEW_BOX);
    ctx.translate(-VIEW_BOX / 2, -VIEW_BOX / 2);
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = style.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const strokeAll = () => paths.forEach((d, i) => {
        ctx.globalAlpha = opacities[i];
        ctx.stroke(new Path2D(d));
    });
    // Parlama yarıçapı CSS pikselindedir; ölçeklenmiş bağlamda geri bölünür.
    if (style.glow) outerGlow(ctx, strokeAll, style.glow.color, style.glow.blur / (SVG_SIZE / VIEW_BOX));
    else strokeAll();
    ctx.restore();
}

function themedBoxShadow(accent: string, dimmed: boolean, isActive: boolean): string {
    if (dimmed) return 'inset 0 0 8px rgba(0,0,0,0.4)';
    return isActive
        ? `inset 0 0 20px ${accent}80, 0 0 14px ${accent}66`
        : `inset 0 0 12px ${accent}33, 0 0 8px ${accent}20`;
}

function drawLegacy(ctx: CanvasRenderingContext2D, dimmed: boolean, direction: keyof typeof ROTATION): void {
    // `filter: grayscale(0.5)` + `opacity: 0.4` KUTUNUN TAMAMINA uygulanıyor.
    const g = (css: string) => (dimmed ? grayscale(css, 0.5) : css);
    ctx.save();
    if (dimmed) ctx.globalAlpha = 0.4;
    paintBox(ctx, CELL_BOX, {
        background: g('rgba(139, 92, 246, 0.12)'),
        border: `1px solid ${g('rgba(139, 92, 246, 0.4)')}`,
        boxShadow: `inset 0 0 10px ${g('rgba(139, 92, 246, 0.15)')}`,
        borderRadius: '0px',
    });
    drawArrows(ctx, LEGACY_PATHS, direction, {
        stroke: g(dimmed ? '#6b4fa0' : '#c4b5fd'),
        width: 2.5,
        glow: dimmed ? null : { color: 'rgba(196,181,253,0.8)', blur: 5 },
    }, [1, 1, 1]);
    ctx.restore();
}

function themedArrowStyle(accent: string, dimmed: boolean, isActive: boolean): ArrowStyle {
    if (dimmed) return { stroke: '#475569', width: 2.5, glow: null };
    return isActive
        ? { stroke: '#ffffff', width: 3.2, glow: { color: accent, blur: 8 } }
        : { stroke: accent, width: 2.5, glow: { color: `${accent}aa`, blur: 6 } };
}

function drawThemedBody(
    ctx: CanvasRenderingContext2D,
    theme: GameTheme,
    dimmed: boolean,
    isActive: boolean,
    direction: keyof typeof ROTATION,
    withArrows: boolean,
): void {
    const accent = getThemeConfig(theme).accentColor;
    const radius = theme === 'arcade' ? 0 : 6;
    paintBox(ctx, CELL_BOX, {
        background: dimmed ? 'rgba(15,23,42,0.6)' : isActive ? `${accent}33` : `${accent}18`,
        border: `1px solid ${dimmed ? 'rgba(255,255,255,0.1)' : isActive ? accent : `${accent}66`}`,
        boxShadow: themedBoxShadow(accent, dimmed, isActive),
        borderRadius: radius,
    });
    if (!withArrows) return;

    ctx.save();
    clipCell(ctx, radius);   // DOM'daki `overflow: hidden`
    drawArrows(ctx, THEMED_PATHS, direction, themedArrowStyle(accent, dimmed, isActive), THEMED_OPACITY);
    ctx.restore();
}

function padFor(theme: GameTheme, dimmed: boolean, isActive: boolean): number {
    if (theme === 'legacy') return 0;
    return outerPad(themedBoxShadow(getThemeConfig(theme).accentColor, dimmed, isActive));
}

/** Bu hâlde oklar gerçekten animasyonlu mu? */
export function conveyorIsAnimated({ cell, theme, isActive }: CellPaintInput): boolean {
    return theme !== 'legacy' && cell.isElectrified && isActive;
}

export const conveyorCellSprite: SpritePainter<CellPaintInput> = {
    key: ({ cell, theme, isActive }) => {
        const dir = DIR_LETTER[directionOf(cell.customData)];
        const dim = cell.isElectrified ? 0 : 1;
        if (theme === 'legacy') return `conveyor|legacy|dim${dim}|${dir}`;
        // Sönükken "çalışıyor" hâli görüntüyü etkilemez: anahtara girmemeli.
        return `conveyor|${theme}|dim${dim}|act${dim === 1 ? 0 : isActive ? 1 : 0}|${dir}`;
    },

    size: ({ cell, theme, isActive }) => {
        const pad = padFor(theme, !cell.isElectrified, isActive);
        return { w: NATIVE_CELL_SIZE + pad * 2, h: NATIVE_CELL_SIZE + pad * 2 };
    },

    draw: (ctx, input) => {
        const { cell, theme, isActive } = input;
        const dimmed = !cell.isElectrified;
        const direction = directionOf(cell.customData);
        const pad = padFor(theme, dimmed, isActive);
        ctx.save();
        ctx.translate(pad, pad);
        if (theme === 'legacy') drawLegacy(ctx, dimmed, direction);
        // Oklar animasyonluysa `ambient` katmanına aittir.
        else drawThemedBody(ctx, theme, dimmed, isActive, direction, !conveyorIsAnimated(input));
        ctx.restore();
    },
};

export const conveyorAmbientSprite: SpritePainter<CellPaintInput> = {
    key: ({ cell, theme, phase }) => `conveyor|${theme}|${DIR_LETTER[directionOf(cell.customData)]}|p${phase}`,

    size: () => ({ w: NATIVE_CELL_SIZE, h: NATIVE_CELL_SIZE }),

    draw: (ctx, { cell, theme, phase }) => {
        const accent = getThemeConfig(theme).accentColor;
        const opacities = ARROW_DELAYS.map((delay, i) => {
            const value = chaseOpacity(phase, delay);
            return value < 0 ? THEMED_OPACITY[i] : value;
        });
        ctx.save();
        clipCell(ctx, theme === 'arcade' ? 0 : 6);
        drawArrows(ctx, THEMED_PATHS, directionOf(cell.customData), themedArrowStyle(accent, false, true), opacities);
        ctx.restore();
    },
};
