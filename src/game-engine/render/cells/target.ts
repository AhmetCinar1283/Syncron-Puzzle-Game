/**
 * DOSYA AMACI: `target` (hedef) hücresinin canvas rasterleyicileri.
 *
 *   - `targetCellSprite`    → DURAĞAN gövde (kutu). `legacy`'de simgeyi DE içerir.
 *   - `targetAmbientSprite` → dönen kesik halka + nabız atan `◎` simgesi.
 *
 * Kaynak: `components/cells/targetCellRenderer.tsx`, `animationStyles.ts`
 * (`targetPulse 2.2s ease-in-out`, `targetRotate 8s linear`).
 *
 * ANAHTARA GİREN ALAN: `customData.playerIndex` — rengi belirliyor.
 *
 * `legacy` ANİMASYONSUZ: oradaki simge `target-pulse-blue` sınıfını alıyor ama
 * o sınıfın `@keyframes` gövdesi HİÇBİR YERDE tanımlı değil, yani DOM'da da
 * durağan. `target-pulse-green` de hiç kullanılmıyor.
 *
 * İKİ SÜS, TEK PERİYOT (00-ilkeler §3.2 + faz planı §2.2'nin aynı gerekçesi):
 * nabız 2.2 s, halka 8 s. Örnekleme periyodu NABZA sabitlendi (2200 ms) ve
 * halka her periyotta tam 90° dönüyor (etkin periyot 8.8 s, DOM'dan %10 yavaş).
 * Halkanın tire deseni çember/kare üzerine 4'ün katı sayıda oturtulduğu için
 * 90°'lik adım dikişsizdir. Bkz. raporlar/03-rapor.md §3.
 */

import { getPlayerColor } from '../../components/playerColors';
import type { GameTheme } from '../../themes/themeConfig';
import type { CellPaintInput, SpritePainter } from '../types';
import { NATIVE_CELL_SIZE, PHASES } from '../types';
import { paintBox } from '../paintTokens';
import { CELL_BOX, CELL_CENTER, clipCell, drawText, outerPad, strokeArc, strokeDashedRect } from './common';
import { BASE_PHASE, easeInOut } from './ice';

/** `targetPulse 2.2s` — örnekleme periyodu (yukarıdaki gerekçe). */
export const TARGET_PULSE_MS = 2200;
/** Periyot başına halka dönüşü; 8 s'lik DOM dönüşünün en yakın 90°'lik adımı. */
const RING_STEP_DEG = 90;

const SYMBOL = '◎';
const RING_BORDER = 1.5;
const RING_SIZE = 48;
/** Tire sayıları 4'ün katı: 90°'lik adımda desen kendine oturur. */
const RING_DASH_PERIODS_CIRCLE = 16;
const RING_DASH_PERIODS_RECT = 20;

function playerIndexOf(customData: Record<string, unknown>): number {
    const value = customData.playerIndex;
    return typeof value === 'number' ? value : 0;
}

function radiusFor(theme: GameTheme): string {
    return theme === 'arcade' ? '0px' : theme === 'blueprint' ? '2px' : '10px';
}

function themedBoxShadow(rgb: string): string {
    return `inset 0 0 16px rgba(${rgb}, 0.25), 0 0 10px rgba(${rgb}, 0.2)`;
}

/** `@keyframes targetPulse`: 0%/100% → scale .9 opacity .7, 50% → scale 1.08 opacity 1. */
function pulseAt(phase: number): { scale: number; opacity: number } {
    // `animation: none` (ambient kapalı): öğe satır içi stilinde durur.
    if (phase === BASE_PHASE) return { scale: 1, opacity: 1 };
    const t = ((((phase % PHASES) + PHASES) % PHASES)) / PHASES;
    const u = t < 0.5 ? easeInOut(t / 0.5) : 1 - easeInOut((t - 0.5) / 0.5);
    return { scale: 0.9 + 0.18 * u, opacity: 0.7 + 0.3 * u };
}

function ringAngleRad(phase: number): number {
    if (phase === BASE_PHASE) return 0;
    const step = ((phase % PHASES) + PHASES) % PHASES;
    return ((step / PHASES) * RING_STEP_DEG * Math.PI) / 180;
}

function drawRing(ctx: CanvasRenderingContext2D, theme: GameTheme, rgb: string, phase: number, cheer = false): void {
    const color = `rgba(${rgb}, ${cheer ? 0.9 : 0.45})`;
    ctx.save();
    ctx.translate(CELL_CENTER, CELL_CENTER);
    ctx.rotate(ringAngleRad(phase));
    if (theme === 'arcade') {
        const half = (RING_SIZE - RING_BORDER) / 2;
        strokeDashedRect(ctx, { x: -half, y: -half, w: half * 2, h: half * 2 }, {
            width: RING_BORDER, color, dashPeriods: RING_DASH_PERIODS_RECT,
        });
    } else {
        strokeArc(ctx, 0, 0, (RING_SIZE - RING_BORDER) / 2, 0, Math.PI * 2, {
            width: RING_BORDER, color, dash: 'dashed', dashPeriods: RING_DASH_PERIODS_CIRCLE,
        });
    }
    ctx.restore();
}

function drawSymbol(ctx: CanvasRenderingContext2D, hex: string, rgb: string, size: number, pulse: { scale: number; opacity: number }): void {
    ctx.save();
    ctx.globalAlpha = pulse.opacity;
    ctx.translate(CELL_CENTER, CELL_CENTER);
    ctx.scale(pulse.scale, pulse.scale);
    drawText(ctx, SYMBOL, 0, 0, { size, color: hex, textShadow: `0 0 ${10 / pulse.scale}px rgba(${rgb}, 0.8)` });
    ctx.restore();
}

export const targetCellSprite: SpritePainter<CellPaintInput> = {
    key: ({ cell, theme }) => `target|${theme}|p${playerIndexOf(cell.customData)}`,

    size: ({ cell, theme }) => {
        if (theme === 'legacy') return { w: NATIVE_CELL_SIZE, h: NATIVE_CELL_SIZE };
        const pad = outerPad(themedBoxShadow(getPlayerColor(playerIndexOf(cell.customData)).rgb));
        return { w: NATIVE_CELL_SIZE + pad * 2, h: NATIVE_CELL_SIZE + pad * 2 };
    },

    draw: (ctx, { cell, theme }) => {
        const { hex, rgb } = getPlayerColor(playerIndexOf(cell.customData));

        if (theme === 'legacy') {
            paintBox(ctx, CELL_BOX, {
                background: `rgba(${rgb}, 0.07)`,
                border: `2px solid rgba(${rgb}, 0.55)`,
                boxShadow: `inset 0 0 16px rgba(${rgb}, 0.2)`,
                borderRadius: '0px',
            });
            // `target-pulse-blue` sınıfının keyframe'i yok → simge durağan.
            drawText(ctx, SYMBOL, CELL_CENTER, CELL_CENTER, { size: NATIVE_CELL_SIZE * 0.38, color: hex });
            return;
        }

        const pad = outerPad(themedBoxShadow(rgb));
        ctx.save();
        ctx.translate(pad, pad);
        paintBox(ctx, CELL_BOX, {
            background: 'rgba(15, 23, 42, 0.65)',
            border: `2px solid rgba(${rgb}, 0.65)`,
            boxShadow: themedBoxShadow(rgb),
            borderRadius: radiusFor(theme),
        });
        ctx.restore();
        // Halka ve simge animasyonlu → `ambient` katmanına ait.
    },
};

export const targetAmbientSprite: SpritePainter<CellPaintInput> = {
    key: ({ cell, theme, phase, isActive }) => `target|${theme}|p${playerIndexOf(cell.customData)}|ph${phase}${isActive ? '|cheer' : ''}`,

    size: () => ({ w: NATIVE_CELL_SIZE, h: NATIVE_CELL_SIZE }),

    draw: (ctx, { cell, theme, phase, isActive }) => {
        const { hex, rgb } = getPlayerColor(playerIndexOf(cell.customData));
        ctx.save();
        clipCell(ctx, radiusFor(theme));   // DOM'daki `overflow: hidden`
        drawRing(ctx, theme, rgb, phase, isActive);
        const pulse = pulseAt(phase);
        // Sevinç (bir oyuncu üstüne kilitlendi): simge büyür ve tam parlaklıkta kalır.
        drawSymbol(ctx, hex, rgb, NATIVE_CELL_SIZE * 0.42, isActive ? { scale: pulse.scale * 1.3, opacity: 1 } : pulse);
        ctx.restore();
    },
};

/** `legacy` dışındaki temalarda halka ve simge her zaman animasyonludur. */
export function targetIsAnimated({ theme }: CellPaintInput): boolean {
    return theme !== 'legacy';
}
