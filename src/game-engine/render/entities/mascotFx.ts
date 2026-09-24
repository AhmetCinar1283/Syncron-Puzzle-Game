/**
 * DOSYA AMACI: Maskotun gövde DIŞI süsleri (ünlem, soru, ter, zzz, parıltı,
 * kalp, yıldız, öfke işareti).
 *
 * İki parça:
 *   - `fxGlyphSprite`: her glif BİR KEZ rasterize edilir (parlama burada serbest);
 *     anahtar yalnızca glif adı — temaya/oyuncuya bağlı değil, önbellekte ≤8 girdi.
 *   - `fxInstances`: süs türü + süre → glif örneklerinin konum/ölçek/alfa/açısı.
 *     SAF; kare döngüsünde yalnızca `drawImage` + dönüşüm kullanılır.
 *
 * Koordinatlar jeton merkezine göre (CSS pikseli); jeton yarıçapı ~22.
 */

import type { FxKind, MascotFx } from '../../mascot/pose';
import type { SpritePainter } from '../types';
import type { SpriteCache } from '../spriteCache';
import { outerGlow } from '../paintTokens';
import { FONT_STACK } from '../cells/common';
import { heartPath } from './playerFace';

export type FxGlyph = '!' | '?' | 'z' | 'sparkle' | 'heart' | 'drop' | 'star' | 'anger';

export interface FxInstance {
    glyph: FxGlyph;
    x: number;
    y: number;
    scale: number;
    alpha: number;
    rot: number;
}

const GLYPH_BOX = 28;
const GC = GLYPH_BOX / 2;
const OUTLINE = 'rgba(2, 6, 23, 0.7)';

const GLYPH_COLOR: Record<FxGlyph, string> = {
    '!': '#facc15',
    '?': '#e2e8f0',
    z: '#bae6fd',
    sparkle: '#fef08a',
    heart: '#fb7185',
    drop: '#7dd3fc',
    star: '#fde047',
    anger: '#f87171',
};

function glyphPath(ctx: CanvasRenderingContext2D, glyph: FxGlyph): void {
    ctx.beginPath();
    switch (glyph) {
        case 'sparkle':
            ctx.moveTo(GC, GC - 8);
            ctx.quadraticCurveTo(GC, GC, GC + 8, GC);
            ctx.quadraticCurveTo(GC, GC, GC, GC + 8);
            ctx.quadraticCurveTo(GC, GC, GC - 8, GC);
            ctx.quadraticCurveTo(GC, GC, GC, GC - 8);
            break;
        case 'heart':
            heartPath(ctx, GC, GC, 7);
            break;
        case 'drop':
            ctx.moveTo(GC, GC - 7);
            ctx.quadraticCurveTo(GC + 6, GC + 1, GC + 4, GC + 4);
            ctx.arc(GC, GC + 3, 4.2, 0.2, Math.PI - 0.2);
            ctx.quadraticCurveTo(GC - 6, GC + 1, GC, GC - 7);
            break;
        case 'star':
            for (let i = 0; i < 10; i++) {
                const r = i % 2 === 0 ? 7 : 3;
                const a = -Math.PI / 2 + (i * Math.PI) / 5;
                ctx.lineTo(GC + Math.cos(a) * r, GC + Math.sin(a) * r);
            }
            ctx.closePath();
            break;
        case 'anger':
            // 💢: dört köşede dışa bükük kısa yay.
            for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
                ctx.moveTo(GC + sx * 2, GC + sy * 7);
                ctx.quadraticCurveTo(GC + sx * 2, GC + sy * 2, GC + sx * 7, GC + sy * 2);
            }
            break;
    }
}

/** Tek glif — 28x28, merkezde. */
export const fxGlyphSprite: SpritePainter<FxGlyph> = {
    key: glyph => `mascotfx|${glyph}`,
    size: () => ({ w: GLYPH_BOX, h: GLYPH_BOX }),
    draw(ctx, glyph) {
        const color = GLYPH_COLOR[glyph];
        ctx.fillStyle = color;
        ctx.strokeStyle = OUTLINE;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        if (glyph === '!' || glyph === '?' || glyph === 'z') {
            ctx.font = `900 ${glyph === 'z' ? 13 : 17}px ${FONT_STACK}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.lineWidth = 3;
            ctx.strokeText(glyph, GC, GC + 1);
            outerGlow(ctx, () => ctx.fillText(glyph, GC, GC + 1), color, 4);
            ctx.fillText(glyph, GC, GC + 1);
            return;
        }
        if (glyph === 'anger') {
            glyphPath(ctx, glyph);
            ctx.lineWidth = 4.5;
            ctx.stroke();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2.5;
            outerGlow(ctx, () => ctx.stroke(), color, 3);
            ctx.stroke();
            return;
        }
        glyphPath(ctx, glyph);
        ctx.lineWidth = 2;
        ctx.stroke();
        outerGlow(ctx, () => ctx.fill(), color, 4);
        ctx.fill();
    },
};

/** Geri esneyen "pop" — 0→1, hafif taşma. */
function pop(ms: number, dur = 160): number {
    if (ms >= dur) return 1;
    const t = ms / dur;
    const c = 2.2;
    return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
}

/** `period` aralıkla doğan, `life` yaşayan örneklerin yaşları (ms). */
function ages(ms: number, period: number, life: number, count: number, wrap: boolean): number[] {
    const out: number[] = [];
    for (let k = 0; k < count; k++) {
        let age = ms - k * period;
        if (wrap) age = ((age % life) + life) % life;
        if (age >= 0 && age < life) out.push(age);
    }
    return out;
}

const INSTANCES: Record<FxKind, (ms: number) => FxInstance[]> = {
    exclaim: ms => [{ glyph: '!', x: 15, y: -27 + Math.sin(ms / 110) * 1, scale: pop(ms), alpha: 1, rot: 0.18 }],

    question: ms => [{ glyph: '?', x: 16, y: -26, scale: pop(ms), alpha: 1, rot: Math.sin(ms / 220) * 0.28 }],

    sweat: ms => {
        const p = (ms % 900) / 900;
        return [{ glyph: 'drop', x: 18, y: -14 + p * 9, scale: 0.75, alpha: p < 0.8 ? 1 : (1 - p) / 0.2, rot: 0 }];
    },

    // Döngülü ifadeyle çalışır: yaşlar ömür modunda sarılır, döngü başında sıçrama olmaz.
    zzz: ms => ages(ms, 800, 2400, 3, true).map(age => {
        const p = age / 2400;
        return {
            glyph: 'z' as const,
            x: 12 + p * 12 + Math.sin(p * 7) * 2,
            y: -18 - p * 20,
            scale: 0.6 + p * 0.7,
            alpha: p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85,
            rot: -0.2,
        };
    }),

    sparkle: ms => [0, 1, 2, 3].map(i => {
        const a = -Math.PI / 2 + (i - 1.5) * 0.75;
        const tw = Math.sin((ms / 320 + i * 0.27) * Math.PI * 2);
        return { glyph: 'sparkle' as const, x: Math.cos(a) * 30, y: Math.sin(a) * 28, scale: Math.max(0, tw) * 0.8, alpha: 1, rot: 0 };
    }),

    hearts: ms => ages(ms, 320, 900, 1 + Math.floor(ms / 320), false).map(age => {
        const p = age / 900;
        const k = Math.round((ms - age) / 320);
        const side = [-14, 14, 0][k % 3];
        return { glyph: 'heart' as const, x: side + Math.sin(p * 6) * 2, y: -16 - p * 22, scale: 0.55 + p * 0.35, alpha: 1 - p, rot: 0 };
    }),

    stars: ms => [0, 1, 2].map(i => {
        const a = ms / 260 + (i * Math.PI * 2) / 3;
        const front = Math.sin(a) > 0;
        return { glyph: 'star' as const, x: Math.cos(a) * 20, y: -27 + Math.sin(a) * 5, scale: front ? 0.85 : 0.6, alpha: front ? 1 : 0.75, rot: a };
    }),

    anger: ms => [{ glyph: 'anger', x: 16, y: -18, scale: pop(ms, 120) * (1 + 0.12 * Math.sin(ms / 55)), alpha: 1, rot: 0 }],
};

/** Süsün bu andaki glif örnekleri (saf). */
export function fxInstances(fx: MascotFx): FxInstance[] {
    return INSTANCES[fx.kind](fx.ms).filter(i => i.scale > 0.01 && i.alpha > 0.01);
}

/** Süsü, dönüşümü jeton merkezinde olan `ctx`'e çizer. */
export function drawMascotFx(ctx: CanvasRenderingContext2D, cache: SpriteCache, fx: MascotFx): void {
    for (const inst of fxInstances(fx)) {
        const sprite = cache.get(fxGlyphSprite, inst.glyph);
        ctx.save();
        ctx.globalAlpha *= inst.alpha;
        ctx.translate(inst.x, inst.y);
        if (inst.rot) ctx.rotate(inst.rot);
        ctx.scale(inst.scale, inst.scale);
        ctx.drawImage(sprite, -GC, -GC, GLYPH_BOX, GLYPH_BOX);
        ctx.restore();
    }
}
