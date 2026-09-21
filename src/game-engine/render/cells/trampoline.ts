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
 * yay ezilmesi 12 faza örneklenmez; aktif hâl, ezilme dışında animasyonun
 * BİTTİĞİ görünümle (`scale(1,1)`) çizilir. Bkz. raporlar/03-rapor.md §4.
 *
 * EZİLME (Faz 10 §2.3): DOM'da yalnızca YAY (`<svg>`) ezilir, hücre kutusu
 * ezilmez. Bu yüzden ezilme süresince tam sprite yerine `gövde` + `yay`
 * sprite'ları ayrı blit edilir ve yay `trampolineLaunch` izinden (`motion.ts`)
 * örneklenen ölçekle, `transform-origin: bottom center`de çizilir. Tam sprite
 * (gövde + yay) değişmedi; ezilme dışında hâlâ o kullanılır. Yalnızca `static`
 * katmanı ve yalnızca 500 ms boyunca `KeepAlive` ile uyanık kalır.
 */

import type { GameTheme } from '../../themes/themeConfig';
import type { CellPaintInput, SpritePainter } from '../types';
import { NATIVE_CELL_SIZE } from '../types';
import { outerGlow, paintBox } from '../paintTokens';
import type { SpriteCache } from '../spriteCache';
import { TRACKS, sampleTrack } from '../motion';
import { blitFogged } from './fogBlit';
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

/** Hücre kutusu: arka plan, kenar, gölgeler. Bağlam `(pad, pad)`e ötelenmiş olmalı. */
function paintBody(ctx: CanvasRenderingContext2D, { theme, isActive }: CellPaintInput): void {
    if (theme === 'legacy') {
        paintBox(ctx, CELL_BOX, {
            background: 'rgba(34, 211, 238, 0.12)',
            border: '2px solid rgba(34, 211, 238, 0.6)',
            boxShadow: LEGACY_SHADOW,
            borderRadius: '0px',
        });
        return;
    }
    const color = bounceColor(theme);
    paintBox(ctx, CELL_BOX, {
        background: isActive ? 'rgba(15, 23, 42, 0.9)' : 'rgba(15, 23, 42, 0.7)',
        border: `2px solid ${isActive ? '#ffffff' : color}`,
        boxShadow: themedBoxShadow(color, isActive),
        borderRadius: radiusFor(theme),
    });
}

/** Yay ve parlaması. Temalı hücrede DOM'daki `overflow: hidden` gibi kutuya kırpılır. */
function paintSpring(ctx: CanvasRenderingContext2D, { cell, theme, isActive }: CellPaintInput): void {
    const direction = directionOf(cell.customData);
    if (theme === 'legacy') {
        drawSpring(ctx, LEGACY_SVG, direction, '#22d3ee', 2.5, { color: 'rgba(34,211,238,0.8)', blur: 6 });
        return;
    }
    clipCell(ctx, radiusFor(theme));
    drawSpring(
        ctx, THEMED_SVG, direction,
        isActive ? '#e0f7fa' : '#22d3ee',
        isActive ? 3.2 : 2.5,
        isActive ? { color: 'rgba(34,211,238,1)', blur: 12 } : { color: 'rgba(34,211,238,0.85)', blur: 6 },
    );
}

/** Üç sprite'ın ortak anahtarı; yalnızca önek farklı. */
function keyOf(prefix: string, { cell, theme, isActive }: CellPaintInput): string {
    const dir = DIR_LETTER[directionOf(cell.customData)];
    return theme === 'legacy' ? `${prefix}|legacy|${dir}` : `${prefix}|${theme}|act${isActive ? 1 : 0}|${dir}`;
}

function bodySize({ theme, isActive }: CellPaintInput): { w: number; h: number } {
    const pad = padFor(theme, isActive);
    return { w: NATIVE_CELL_SIZE + pad * 2, h: NATIVE_CELL_SIZE + pad * 2 };
}

/** Gövde + yay. Ezilme DIŞINDAKİ her karede bu kullanılır. */
export const trampolineCellSprite: SpritePainter<CellPaintInput> = {
    key: input => keyOf('trampoline', input),

    size: bodySize,

    draw: (ctx, input) => {
        const pad = padFor(input.theme, input.isActive);
        ctx.save();
        ctx.translate(pad, pad);
        paintBody(ctx, input);
        paintSpring(ctx, input);
        ctx.restore();
    },
};

/** Yalnızca gövde — ezilme sırasında yayın ALTINA çizilir. */
export const trampolineBodySprite: SpritePainter<CellPaintInput> = {
    key: input => keyOf('trampoline-body', input),

    size: bodySize,

    draw: (ctx, input) => {
        const pad = padFor(input.theme, input.isActive);
        ctx.save();
        ctx.translate(pad, pad);
        paintBody(ctx, input);
        ctx.restore();
    },
};

/** Yalnızca yay — 64×64 (parlama kutuya kırpılı, dolayısıyla taşma payı yok). */
export const trampolineSpringSprite: SpritePainter<CellPaintInput> = {
    key: input => keyOf('trampoline-spring', input),

    size: () => ({ w: NATIVE_CELL_SIZE, h: NATIVE_CELL_SIZE }),

    draw: (ctx, input) => {
        ctx.save();
        paintSpring(ctx, input);
        ctx.restore();
    },
};

/** `<svg>` 38×38 ve `transform-origin: bottom center` (`trampolineCellRenderer.tsx`). */
const SPRING_HALF = THEMED_SVG / 2;

/**
 * Ezilme sürerken hücre: gövde sabit, yay `trampolineLaunch`in ölçeğiyle ezilir.
 *
 * Yay sprite'ı yönü kendi içinde döndürülmüş taşıyor; ezilme ekseni ise DOM'da
 * DÖNDÜRÜLMÜŞ sarmalayıcının içinde (yay yönüne göre "alt-orta"). Bu yüzden
 * ölçek, dönüşün eşleniği içinde uygulanır: R · T(alt) · S · T(−alt) · R⁻¹.
 *
 * @param elapsedMs Ezilmenin başlangıcından bu yana geçen süre (`fades.cell(...).elapsedMs`).
 */
export function drawTrampolineSquash(
    ctx: CanvasRenderingContext2D,
    cache: SpriteCache,
    input: CellPaintInput,
    x: number,
    y: number,
    lit: number,
    elapsedMs: number,
): void {
    const squash = sampleTrack(TRACKS.trampolineLaunch, elapsedMs);
    const angle = (ROTATION[directionOf(input.cell.customData)] * Math.PI) / 180;

    blitFogged(ctx, cache, trampolineBodySprite, input, x, y, lit);

    ctx.save();
    ctx.translate(x + CELL_CENTER, y + CELL_CENTER);
    ctx.rotate(angle);
    ctx.translate(0, SPRING_HALF);
    ctx.scale(squash.sx, squash.sy);
    ctx.translate(0, -SPRING_HALF);
    ctx.rotate(-angle);
    blitFogged(ctx, cache, trampolineSpringSprite, input, -CELL_CENTER, -CELL_CENTER, lit);
    ctx.restore();
}
