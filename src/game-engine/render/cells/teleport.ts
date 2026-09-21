/**
 * DOSYA AMACI: `teleport` (portal) hücresinin canvas rasterleyicileri.
 *
 *   - `teleportCellSprite`    → DURAĞAN gövde. Hücre animasyonlu DEĞİLKEN
 *                               süsleri (halka + iki girdap + etiketler) DE içerir.
 *   - `teleportAmbientSprite` → animasyonlu hâldeki süslerin tamamı, 12 faza
 *                               örneklenip `ambient` katmanına blit edilir.
 *
 * Kaynak: `components/cells/teleportCellRenderer.tsx` ve `animationStyles.ts`
 * (`portalPulse 0.8s ease-out`, `rotatePortal 4.2s linear`,
 * `rotatePortalReverse 2.2s linear`).
 *
 * ANAHTARA GİREN ALANLAR: `customData.group` ve `customData.isIn`. Faz planı §2
 * "group yalnızca eşleştirme içinse anahtara girmez, RENK belirliyorsa girer —
 * koda bak" diyor: kaynak dosyada `GROUP_COLOR[group]` hücrenin bütün renklerini
 * üretiyor, dolayısıyla anahtara GİRER. `isIn` hem renk yoğunluklarını hem de
 * iki simgeyi (`⟿`/`⟾`, `↑`/`↓`) değiştiriyor.
 *
 * ÜÇ SÜS, TEK PERİYOT (faz planı §2.2'nin açık talimatı): nabız halkası 0.8 s,
 * dış girdap 4.2 s, iç girdap 2.2 s. Örnekleme periyodu `portal-vortex`e
 * sabitlendi: 4200 ms. 4200 / 800 = 5.25 ve 4200 / 2200 = 1.909… tam sayı
 * olmadığı için halka ve iç girdap 12 fazlık örneklemede kendi hızlarında değil,
 * 4.2 s'de kapanan bir çevrimde görünür (aliasing). Bkz. raporlar/03-rapor.md §3.
 *
 * GEÇİŞ (Faz 10 §2.4): DOM'daki 600 ms'lik `transition`lar (arka plan/kenar/gölge
 * ve girdapların `scale`i/opaklığı) `TELEPORT_FADE_MS` boyunca iki sprite hâlinin
 * `globalAlpha` ile çapraz geçişidir (`cells/index.ts`). Girdapların `scale`i
 * (1 → 1.4, `cubic-bezier(0.16, 1, 0.3, 1)`) AYRI bir eğriyle akmaz; yaklaşık
 * olarak süsün solup belirmesiyle karşılanır. Aktiflik durumunun kendisi
 * `cells/activity.ts`'te tutulur.
 */

import type { GameTheme } from '../../themes/themeConfig';
import type { CellPaintInput, SpritePainter } from '../types';
import { NATIVE_CELL_SIZE, PHASES } from '../types';
import { outerGlow, paintBox } from '../paintTokens';
import { CELL_BOX, CELL_CENTER, clipCell, cssBezier, drawText, outerPad, strokeArc } from './common';
import { BASE_PHASE } from './ice';

/** `rotatePortal 4.2s` — üç süsün ortak örnekleme periyodu (yukarıdaki gerekçe). */
export const TELEPORT_VORTEX_MS = 4200;

/** `teleportCellRenderer.tsx`: `transition: background-color 600ms ease, border-color 600ms ease, box-shadow 600ms ease`. */
export const TELEPORT_FADE_MS = 600;
const RING_MS = 800;
const INNER_MS = 2200;

type TeleportGroup = 'A' | 'B' | 'C';

const GROUP_COLOR: Record<TeleportGroup, string> = {
    A: '#ec4899',   // Pembe
    B: '#f97316',   // Turuncu
    C: '#14b8a6',   // Teal
};

const DEG = Math.PI / 180;
const BORDER = 2;

/** Nabız halkası: 48×48 kutu, 2px kenar. */
const RING_RADIUS = (48 - BORDER) / 2;
/** Dış girdap: 44×44 sarmalayıcı, 2px kesik kenar. */
const OUTER_RADIUS = (44 - BORDER) / 2;
/** İç girdap: 28×28 sarmalayıcı, 2px noktalı kenar. */
const INNER_RADIUS = (28 - BORDER) / 2;
/** Etkin hâlde iki girdabın sarmalayıcısı `scale(1.4)` alıyor. */
const ACTIVE_SCALE = 1.4;
/** `filter: drop-shadow(0 0 12px color)` — yalnızca etkin dış girdapta. */
const OUTER_GLOW_BLUR = 12;

/** `line-height: normal` ≈ 1.15em (Arial); yükseklik hesapları için. */
const NORMAL_LINE_HEIGHT = 1.15;

/**
 * Dikey yığınların merkezleri. DOM'da iki `<span>` bir flex sütununda
 * ortalanıyor; `textBaseline: 'middle'` ile kutu merkezine çizmek aynı yere
 * denk gelir (bkz. raporlar/03-rapor.md §5).
 */
function stackCenters(h1: number, h2: number, gap: number): [number, number] {
    const total = h1 + gap + h2;
    const top = CELL_CENTER - total / 2;
    return [top + h1 / 2, top + h1 + gap + h2 / 2];
}

/** legacy: 14px/lh1 + marginTop 1 + 12px/lh1 → 25.5 ve 39.5. */
const [LEGACY_Y1, LEGACY_Y2] = stackCenters(14, 12, 1);
/** temalı: 13px/lh1 + marginTop 2 + 9px/lh normal. */
const [LABEL_Y1, LABEL_Y2] = stackCenters(13, 9 * NORMAL_LINE_HEIGHT, 2);

function hexToRgb(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r},${g},${b}`;
}

function groupOf(customData: Record<string, unknown>): TeleportGroup {
    const value = customData.group;
    return value === 'B' || value === 'C' ? value : 'A';
}

function isInOf(customData: Record<string, unknown>): boolean {
    const value = customData.isIn;
    return typeof value === 'boolean' ? value : true;
}

function radiusFor(theme: GameTheme): string {
    return theme === 'arcade' ? '0px' : theme === 'blueprint' ? '2px' : '12px';
}

function themedBoxShadow(rgb: string, isIn: boolean, isActive: boolean): string {
    if (isActive) return `inset 0 0 24px rgba(${rgb}, 0.7), 0 0 16px rgba(${rgb}, 0.5)`;
    return isIn
        ? `inset 0 0 16px rgba(${rgb}, 0.3), 0 0 10px rgba(${rgb}, 0.2)`
        : `inset 0 0 12px rgba(${rgb}, 0.15), 0 0 4px rgba(${rgb}, 0.1)`;
}

/** CSS `ease-out` = `cubic-bezier(0, 0, 0.58, 1)`. */
function easeOut(t: number): number {
    return cssBezier(0, 0.58, 0, 1, t);
}

/** Fazın periyot içindeki zaman karşılığı (ms). */
function phaseMs(phase: number): number {
    const step = ((phase % PHASES) + PHASES) % PHASES;
    return (step / PHASES) * TELEPORT_VORTEX_MS;
}

/**
 * `@keyframes portalPulse`: transform 0→100% tek aralık (0.65 → 1.35),
 * opacity iki aralık (0.8 → 0.45 → 0); her aralığa `ease-out` uygulanır.
 */
function ringAt(phase: number): { scale: number; opacity: number } {
    // `animation: none`: öğe satır içi stilinde durur.
    if (phase === BASE_PHASE) return { scale: 1, opacity: 1 };
    const p = (phaseMs(phase) % RING_MS) / RING_MS;
    const opacity = p < 0.5
        ? 0.8 + (0.45 - 0.8) * easeOut(p / 0.5)
        : 0.45 - 0.45 * easeOut((p - 0.5) / 0.5);
    return { scale: 0.65 + 0.7 * easeOut(p), opacity };
}

/** `rotatePortal` (ileri) ve `rotatePortalReverse` (geri) — ikisi de `linear`. */
function vortexAngles(phase: number): { outer: number; inner: number } {
    if (phase === BASE_PHASE) return { outer: 0, inner: 0 };
    const t = phaseMs(phase);
    return {
        outer: (t / TELEPORT_VORTEX_MS) * 360 * DEG,
        inner: -((t % INNER_MS) / INNER_MS) * 360 * DEG,
    };
}

interface DecorInput {
    rgb: string;
    color: string;
    group: TeleportGroup;
    isIn: boolean;
    isActive: boolean;
    phase: number;
}

function drawRing(ctx: CanvasRenderingContext2D, { rgb, isActive, phase }: DecorInput): void {
    const { scale, opacity } = ringAt(phase);
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(CELL_CENTER, CELL_CENTER);
    ctx.scale(scale, scale);
    ctx.lineWidth = BORDER;
    ctx.strokeStyle = `rgba(${rgb}, ${isActive ? 0.95 : 0.4})`;
    ctx.beginPath();
    ctx.arc(0, 0, RING_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

/**
 * Dış girdap: `border-top-color`/`border-bottom-color` saydam olduğu için
 * çemberden yalnızca SAĞ (−45°..45°) ve SOL (135°..225°) kenar dilimleri kalır.
 */
function drawOuterVortex(ctx: CanvasRenderingContext2D, { rgb, color, isActive, phase }: DecorInput): void {
    const scale = isActive ? ACTIVE_SCALE : 1;
    ctx.save();
    ctx.globalAlpha = isActive ? 1 : 0.65;
    ctx.translate(CELL_CENTER, CELL_CENTER);
    ctx.scale(scale, scale);
    ctx.rotate(vortexAngles(phase).outer);
    const stroke = () => {
        const style = { width: BORDER, color: `rgba(${rgb}, 0.7)`, dash: 'dashed' as const };
        strokeArc(ctx, 0, 0, OUTER_RADIUS, -45 * DEG, 45 * DEG, style);
        strokeArc(ctx, 0, 0, OUTER_RADIUS, 135 * DEG, 225 * DEG, style);
    };
    // `drop-shadow` sarmalayıcının yerel uzayında uygulanıp SONRA ölçekleniyor;
    // canvas gölgesi de CTM ile ölçeklendiği için yarıçap olduğu gibi verilir.
    if (isActive) outerGlow(ctx, stroke, color, OUTER_GLOW_BLUR);
    else stroke();
    ctx.restore();
}

/**
 * İç girdap: `border-left-color` saydam → SOL dilim (135°..225°) düşer, geriye
 * 225°'den 495°'ye kesintisiz 270°'lik yay kalır.
 */
function drawInnerVortex(ctx: CanvasRenderingContext2D, { rgb, isActive, phase }: DecorInput): void {
    const scale = isActive ? ACTIVE_SCALE : 1;
    ctx.save();
    ctx.globalAlpha = isActive ? 1 : 0.45;
    ctx.translate(CELL_CENTER, CELL_CENTER);
    ctx.scale(scale, scale);
    ctx.rotate(vortexAngles(phase).inner);
    strokeArc(ctx, 0, 0, INNER_RADIUS, 225 * DEG, 495 * DEG, {
        width: BORDER, color: `rgba(${rgb}, 0.5)`, dash: 'dotted',
    });
    ctx.restore();
}

/** Ortadaki etiketler DOM'da `zIndex: 2` — girdapların ÜSTÜNE çizilir. */
function drawLabels(ctx: CanvasRenderingContext2D, { color, group, isIn }: DecorInput): void {
    drawText(ctx, group, CELL_CENTER, LABEL_Y1, {
        size: 13, weight: 'bold', color, textShadow: `0 0 6px ${color}`,
    });
    ctx.save();
    ctx.globalAlpha = 0.8;
    drawText(ctx, isIn ? '↑' : '↓', CELL_CENTER, LABEL_Y2, {
        size: 9, weight: 'bold', color, textShadow: `0 0 4px ${color}`,
    });
    ctx.restore();
}

/** Halka + iki girdap + etiketler; DOM'daki yığma sırasıyla. */
function drawDecor(ctx: CanvasRenderingContext2D, input: DecorInput): void {
    drawRing(ctx, input);
    drawOuterVortex(ctx, input);
    drawInnerVortex(ctx, input);
    drawLabels(ctx, input);
}

function decorInput({ cell, isActive }: CellPaintInput, phase: number): DecorInput {
    const group = groupOf(cell.customData);
    const color = GROUP_COLOR[group];
    return { rgb: hexToRgb(color), color, group, isIn: isInOf(cell.customData), isActive, phase };
}

export const teleportCellSprite: SpritePainter<CellPaintInput> = {
    key: ({ cell, theme, isActive }) => {
        const id = `${groupOf(cell.customData)}|in${isInOf(cell.customData) ? 1 : 0}`;
        if (theme === 'legacy') return `teleport|legacy|${id}`;
        return `teleport|${theme}|${id}|act${isActive ? 1 : 0}`;
    },

    size: ({ cell, theme, isActive }) => {
        const rgb = hexToRgb(GROUP_COLOR[groupOf(cell.customData)]);
        const isIn = isInOf(cell.customData);
        const pad = theme === 'legacy'
            ? outerPad(isIn ? `inset 0 0 14px rgba(${rgb}, 0.2), 0 0 8px rgba(${rgb}, 0.15)` : undefined)
            : outerPad(themedBoxShadow(rgb, isIn, isActive));
        return { w: NATIVE_CELL_SIZE + pad * 2, h: NATIVE_CELL_SIZE + pad * 2 };
    },

    draw: (ctx, input) => {
        const { cell, theme } = input;
        const group = groupOf(cell.customData);
        const color = GROUP_COLOR[group];
        const rgb = hexToRgb(color);
        const isIn = isInOf(cell.customData);

        if (theme === 'legacy') {
            const shadow = isIn
                ? `inset 0 0 14px rgba(${rgb}, 0.2), 0 0 8px rgba(${rgb}, 0.15)`
                : `inset 0 0 10px rgba(${rgb}, 0.12)`;
            const pad = outerPad(shadow);
            ctx.save();
            ctx.translate(pad, pad);
            paintBox(ctx, CELL_BOX, {
                background: isIn ? `rgba(${rgb}, 0.12)` : `rgba(${rgb}, 0.06)`,
                border: `2px solid rgba(${rgb}, ${isIn ? 0.6 : 0.4})`,
                boxShadow: shadow,
                borderRadius: '0px',
            });
            drawText(ctx, isIn ? '⟿' : '⟾', CELL_CENTER, LEGACY_Y1, {
                size: 14, color, textShadow: `0 0 8px ${color}`,
            });
            drawText(ctx, group, CELL_CENTER, LEGACY_Y2, {
                size: 12, weight: 'bold', color, textShadow: `0 0 6px ${color}`,
            });
            ctx.restore();
            return;
        }

        const radius = radiusFor(theme);
        const shadow = themedBoxShadow(rgb, isIn, input.isActive);
        const pad = outerPad(shadow);
        ctx.save();
        ctx.translate(pad, pad);
        paintBox(ctx, CELL_BOX, {
            background: input.isActive
                ? (isIn ? 'rgba(236, 72, 153, 0.25)' : 'rgba(20, 184, 166, 0.25)')
                : 'rgba(15, 23, 42, 0.7)',
            border: `2px solid rgba(${rgb}, ${input.isActive ? 1.0 : isIn ? 0.7 : 0.4})`,
            boxShadow: shadow,
            borderRadius: radius,
        });

        if (!teleportIsAnimated(input)) {
            clipCell(ctx, radius);   // DOM'daki `overflow: hidden`
            drawDecor(ctx, decorInput(input, BASE_PHASE));
        }
        ctx.restore();
        // Animasyonluysa süslerin tamamı `ambient` katmanına ait.
    },
};

export const teleportAmbientSprite: SpritePainter<CellPaintInput> = {
    key: ({ cell, theme, phase }) =>
        `teleport|${theme}|${groupOf(cell.customData)}|in${isInOf(cell.customData) ? 1 : 0}|p${phase}`,

    size: () => ({ w: NATIVE_CELL_SIZE, h: NATIVE_CELL_SIZE }),

    draw: (ctx, input) => {
        ctx.save();
        clipCell(ctx, radiusFor(input.theme));   // DOM'daki `overflow: hidden`
        drawDecor(ctx, decorInput(input, input.phase));
        ctx.restore();
    },
};

/**
 * Süsler yalnızca ETKİN ışınlanma penceresinde animasyonlu; dışında satır içi
 * stillerinde durur ve `static` katmanına girer. `legacy`'de süs hiç yoktur.
 */
export function teleportIsAnimated({ theme, isActive }: CellPaintInput): boolean {
    return theme !== 'legacy' && isActive;
}
