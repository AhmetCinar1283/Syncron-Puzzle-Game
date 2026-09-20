/**
 * DOSYA AMACI: Faz 03'te eklenen sekiz hücre çizicisinin PAYLAŞTIĞI küçük
 * yardımcılar — metin/simge çizimi, taşan parlama payı, hücre kırpması, yön
 * döndürmesi, kesik/noktalı yay.
 *
 * NEDEN `paintTokens.ts`'te değil: faz planı §3 "paintTokens.ts'e yeni yardımcı
 * eklemek" i kapsam dışı sayıyor. Buradakiler tema jetonu ÇEVİRMEZ (o iş
 * `paintTokens`'ın); yalnızca sekiz dosyada tekrar eden birkaç satırı tek yere
 * toplar ve hepsi `paintTokens`'ın üstüne kurulur.
 */

import type { Direction } from '../../logic/types';
import { NATIVE_CELL_SIZE } from '../types';
import { outerGlow, parseBoxShadow, roundRectPath } from '../paintTokens';
import type { Box } from '../paintTokens';

export const CELL_BOX: Box = { x: 0, y: 0, w: NATIVE_CELL_SIZE, h: NATIVE_CELL_SIZE };
export const CELL_CENTER = NATIVE_CELL_SIZE / 2;

/** `globals.css`'teki `body { font-family: Arial, Helvetica, sans-serif }`. */
export const FONT_STACK = 'Arial, Helvetica, sans-serif';

/** `transform: rotate(Xdeg)` karşılığı; kaynak dosyalardaki `ROTATION` ile aynı. */
export const ROTATION: Record<Direction, number> = { up: 0, right: 90, down: 180, left: 270 };

/** `key()` için yönü tek harfe indirger. */
export const DIR_LETTER: Record<Direction, string> = { up: 'u', right: 'r', down: 'd', left: 'l' };

/** `customData.direction`; tanınmayan değer kaynak dosyalardaki gibi `'up'`. */
export function directionOf(customData: Record<string, unknown>): Direction {
    const value = customData.direction;
    return value === 'down' || value === 'left' || value === 'right' ? value : 'up';
}

/**
 * Kutunun DIŞINA taşan gölgelerin en uzak noktası. Sprite kutusu bu kadar
 * büyütülür (`cells/index.ts` blit'te ortalar), yoksa parlama kırpılır.
 */
export function outerPad(boxShadow: string | undefined): number {
    let pad = 0;
    for (const sh of parseBoxShadow(boxShadow)) {
        if (sh.inset) continue;
        pad = Math.max(pad, sh.blur + sh.spread + Math.max(Math.abs(sh.ox), Math.abs(sh.oy)));
    }
    return Math.ceil(pad);
}

/** DOM'daki `overflow: hidden` karşılığı: hücre kutusuna kırpar. */
export function clipCell(ctx: CanvasRenderingContext2D, radius: string | number): void {
    roundRectPath(ctx, CELL_BOX, radius);
    ctx.clip();
}

export interface TextStyle {
    size: number;
    color: string;
    weight?: 'normal' | 'bold';
    /** `text-shadow` dizgisi; yalnızca ofsetsiz (`0 0 Npx c`) katmanlar desteklenir. */
    textShadow?: string;
    /** px cinsinden; CSS `letter-spacing`. */
    letterSpacing?: number;
    align?: CanvasTextAlign;
}

/** `ctx.letterSpacing` her WebView'de yok; varsa kullanılır, yoksa yok sayılır. */
type SpacedContext = CanvasRenderingContext2D & { letterSpacing?: string };

function applyFont(ctx: CanvasRenderingContext2D, style: TextStyle): void {
    ctx.font = `${style.weight ?? 'normal'} ${style.size}px ${FONT_STACK}`;
    ctx.textAlign = style.align ?? 'center';
    ctx.textBaseline = 'middle';
    if (style.letterSpacing) (ctx as SpacedContext).letterSpacing = `${style.letterSpacing}px`;
}

/**
 * Bir metin/simge katmanı. `y` metin KUTUSUNUN merkezidir; DOM tarafında
 * `line-height: 1` ile dikey ortalanmış bir `<span>`'in merkezi ile aynı yere
 * denk gelir (bkz. raporlar/03-rapor.md — `textBaseline: 'middle'` yaklaşımı).
 */
export function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, style: TextStyle): void {
    ctx.save();
    applyFont(ctx, style);
    ctx.fillStyle = style.color;
    for (const sh of parseBoxShadow(style.textShadow)) {
        outerGlow(ctx, () => ctx.fillText(text, x, y), sh.color, sh.blur);
    }
    ctx.fillText(text, x, y);
    ctx.restore();
}

/** `drawText` ile aynı yazı tipinde ölçer — konumu genişliğe bağlı olanlar için. */
export function measureText(ctx: CanvasRenderingContext2D, text: string, style: TextStyle): number {
    ctx.save();
    applyFont(ctx, style);
    const width = ctx.measureText(text).width;
    ctx.restore();
    return width;
}

/** Bir ikon tuvalini ortalayıp `drop-shadow` parlamasıyla çizer. */
export function drawIconGlow(
    ctx: CanvasRenderingContext2D,
    icon: HTMLCanvasElement,
    x: number,
    y: number,
    size: number,
    glowColor: string,
    glowBlur: number,
): void {
    const half = size / 2;
    outerGlow(ctx, () => ctx.drawImage(icon, x - half, y - half, size, size), glowColor, glowBlur);
}

/**
 * CSS `cubic-bezier(x1, y1, x2, y2)` zamanlama eğrisi. Newton ile t→s çözülür.
 * `ease-in-out` = (0.42, 0, 0.58, 1), `ease-out` = (0, 0, 0.58, 1).
 *
 * NEDEN burada: 00-ilkeler §3'te easing'in evi `motion.ts` (Faz 05). O dosya
 * henüz yok; üç hücre (`ice`, `target`, `teleport`) aynı çözücüye ihtiyaç
 * duyduğu için üçüncü kopya yerine buraya alındı. Faz 05 taşımalı.
 */
export function cssBezier(x1: number, x2: number, y1: number, y2: number, t: number): number {
    const curve = (a: number, b: number, s: number) =>
        3 * a * s * (1 - s) * (1 - s) + 3 * b * s * s * (1 - s) + s * s * s;
    let s = t;
    for (let i = 0; i < 6; i++) {
        const x = curve(x1, x2, s) - t;
        const dx = 3 * x1 * (1 - s) * (1 - 3 * s) + 3 * x2 * s * (2 - 3 * s) + 3 * s * s;
        if (Math.abs(dx) < 1e-6) break;
        s -= x / dx;
    }
    return curve(y1, y2, Math.max(0, Math.min(1, s)));
}

/** CSS `dashed` kenarının tire/boşluk oranı — `paintTokens` ile aynı. */
const DASH_RATIO = 3;

/**
 * Daire üzerinde bir yay. `dotted`, Chromium'un yaptığı gibi çapı kenar
 * kalınlığına eşit yuvarlak noktalarla çizilir.
 *
 * `dashPeriods` verilirse tire deseni yayın TAMAMINA tam sayıda sığdırılır;
 * bu, dönen bir halkanın 12 faz örneklemesinde dikişsiz döngü yapmasını sağlar
 * (bkz. `target.ts`).
 */
export function strokeArc(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number, radius: number,
    from: number, to: number,
    style: { width: number; color: string; dash?: 'dashed' | 'dotted'; dashPeriods?: number },
): void {
    ctx.save();
    ctx.lineWidth = style.width;
    ctx.strokeStyle = style.color;
    if (style.dash === 'dotted') {
        ctx.lineCap = 'round';
        ctx.setLineDash([0.001, style.width * 2]);
    } else if (style.dash === 'dashed') {
        const period = style.dashPeriods
            ? (Math.abs(to - from) * radius) / style.dashPeriods
            : style.width * DASH_RATIO * 2;
        ctx.setLineDash([period / 2, period / 2]);
    }
    ctx.beginPath();
    ctx.arc(cx, cy, radius, from, to);
    ctx.stroke();
    ctx.restore();
}

/** `strokeArc`'ın dikdörtgen hâli (arcade temasında köşe yarıçapı 0). */
export function strokeDashedRect(
    ctx: CanvasRenderingContext2D,
    box: Box,
    style: { width: number; color: string; dashPeriods?: number },
): void {
    const perimeter = 2 * (box.w + box.h);
    const period = style.dashPeriods ? perimeter / style.dashPeriods : style.width * DASH_RATIO * 2;
    ctx.save();
    ctx.lineWidth = style.width;
    ctx.strokeStyle = style.color;
    ctx.setLineDash([period / 2, period / 2]);
    ctx.strokeRect(box.x, box.y, box.w, box.h);
    ctx.restore();
}
