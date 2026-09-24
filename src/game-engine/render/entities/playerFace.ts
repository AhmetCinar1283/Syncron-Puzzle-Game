/**
 * DOSYA AMACI: Maskot yüzünün (`FacePose`) canvas çizimi — göz şekilleri, ağız
 * şekilleri, yanak. Yalnızca sprite rasterizasyonu sırasında çağrılır
 * (`playerSprite.draw`); parlama burada serbesttir (00-ilkeler §2.1).
 *
 * Nötr yüz (iki `dot` göz, `arrow` ağız, bakış 0, boy 1) eski `drawEyes` +
 * monospace ok ile BİREBİR aynı çizilir; yeni şekiller yalnızca ifadelerde görünür.
 *
 * Tüm ölçüler temanın göz boyuna (`style.eye.size`, 4–5px) göre; böylece beş
 * temada da oranlar korunur. Arcade (`square`) keskin uçlarla çizilir.
 */

import type { EyePose, FacePose } from '../../mascot/pose';
import { quantizeFace } from '../../mascot/pose';
import { NATIVE_CELL_SIZE } from '../types';
import { outerGlow, parseBoxShadow } from '../paintTokens';
import { drawText } from '../cells/common';
import type { PlayerStyle } from './playerStyles';

/** `fontFamily: 'monospace'` — ağız ve dayanıklılık rozetinde. */
export const MONO_STACK = 'monospace';

const CENTER = NATIVE_CELL_SIZE / 2;
const EYE_GAP = 6;
export const MOUTH_SIZE = 15;
/** Bakış yönünde gözlerin en fazla kayması (px); ağız bunun yarısı kadar. */
const LOOK_SHIFT = 1.6;
const BLUSH_COLOR = 'rgba(255, 110, 160, 0.55)';

type Mode = 'normal' | 'reversed';

/** Glow'u (varsa) ve asıl şekli çizer — her parça bu kalıbı kullanır. */
function withGlow(ctx: CanvasRenderingContext2D, css: string | undefined, draw: () => void): void {
    for (const sh of parseBoxShadow(css)) outerGlow(ctx, draw, sh.color, sh.blur);
    draw();
}

function starPath(ctx: CanvasRenderingContext2D, x: number, y: number, outer: number, inner: number, points: number): void {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
        const r = i % 2 === 0 ? outer : inner;
        const a = -Math.PI / 2 + (i * Math.PI) / points;
        ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath();
}

export function heartPath(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x, y + r * 0.9);
    ctx.bezierCurveTo(x - r * 1.4, y - r * 0.1, x - r * 0.7, y - r * 1.2, x, y - r * 0.4);
    ctx.bezierCurveTo(x + r * 0.7, y - r * 1.2, x + r * 1.4, y - r * 0.1, x, y + r * 0.9);
    ctx.closePath();
}

/**
 * Tek gözün yolu; merkez (0,0), `side` -1 sol / +1 sağ (asimetrik şekiller için).
 * @returns Yolun dolgu mu, çizgi mi, ikisi birden mi boyanacağı.
 */
function eyePath(ctx: CanvasRenderingContext2D, eye: EyePose, r: number, side: number, square: boolean): 'fill' | 'stroke' | 'both' {
    ctx.beginPath();
    switch (eye.shape) {
        case 'happy':
            ctx.moveTo(-r * 1.15, r * 0.55);
            if (square) ctx.lineTo(0, -r * 0.75);
            else ctx.quadraticCurveTo(0, -r * 1.6, r * 1.15, r * 0.55);
            if (square) ctx.lineTo(r * 1.15, r * 0.55);
            return 'stroke';
        case 'sad':
            // Göz + İÇ ucu kalkık kaş (dış uç alçak). Tersi kızgın okunur.
            if (square) ctx.rect(-r * 0.85, -r * 0.6, r * 1.7, r * 1.7);
            else ctx.arc(0, r * 0.25, r * 0.85, 0, Math.PI * 2);
            ctx.moveTo(side * r * 1.3, -r * 1.3);
            ctx.lineTo(-side * r * 1.1, -r * 2.3);
            return 'both';
        case 'x':
            ctx.moveTo(-r, -r); ctx.lineTo(r, r);
            ctx.moveTo(r, -r); ctx.lineTo(-r, r);
            return 'stroke';
        case 'wide':
            ctx.arc(0, 0, r * 1.1, 0, Math.PI * 2);
            ctx.moveTo(r * 0.5, 0);
            ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
            return 'both';
        case 'spiral': {
            const turns = 2.25;
            const max = r * 1.35;
            for (let i = 0; i <= 36; i++) {
                const p = i / 36;
                const a = side * p * turns * Math.PI * 2;
                ctx.lineTo(Math.cos(a) * max * p, Math.sin(a) * max * p);
            }
            return 'stroke';
        }
        case 'line':
            ctx.moveTo(-r * 1.2, 0); ctx.lineTo(r * 1.2, 0);
            return 'stroke';
        case 'heart':
            heartPath(ctx, 0, 0, r * 1.3);
            return 'fill';
        case 'star':
            starPath(ctx, 0, 0, r * 1.5, r * 0.62, 5);
            return 'fill';
        default:
            if (square) ctx.rect(-r, -r, r * 2, r * 2);
            else ctx.arc(0, 0, r, 0, Math.PI * 2);
            return 'fill';
    }
}

function drawEye(ctx: CanvasRenderingContext2D, style: PlayerStyle, eye: EyePose, x: number, y: number, r: number, side: number): void {
    const square = Boolean(style.eye.square);
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = style.eye.color;
    ctx.strokeStyle = style.eye.color;
    ctx.lineWidth = Math.max(1.1, style.eye.size * 0.34);
    ctx.lineCap = square ? 'square' : 'round';
    ctx.lineJoin = square ? 'miter' : 'round';
    withGlow(ctx, style.eye.glow, () => {
        // Yol ezilmiş dönüşümde KURULUR (`transformOrigin: 'center'` kırpması),
        // çizgi ezilmemiş dönüşümde BOYANIR — kırpmada çizgi kalınlığı incelmesin.
        ctx.save();
        if (eye.open !== 1) ctx.scale(1, eye.open);
        const paint = eyePath(ctx, eye, r, side, square);
        ctx.restore();
        if (paint !== 'stroke') ctx.fill();
        if (paint !== 'fill') ctx.stroke();
    });
    ctx.restore();
}

function drawMouth(ctx: CanvasRenderingContext2D, style: PlayerStyle, face: FacePose, mode: Mode, x: number, y: number): void {
    if (face.mouth === 'arrow') {
        drawText(ctx, mode === 'reversed' ? '▼' : '▲', x, y, {
            size: MOUTH_SIZE,
            color: style.mouth.color,
            weight: 900,
            family: MONO_STACK,
            textShadow: style.mouth.shadow,
        });
        return;
    }
    const square = Boolean(style.eye.square);
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = style.mouth.color;
    ctx.strokeStyle = style.mouth.color;
    ctx.lineWidth = 2;
    ctx.lineCap = square ? 'square' : 'round';
    ctx.lineJoin = square ? 'miter' : 'round';
    withGlow(ctx, style.mouth.shadow, () => {
        ctx.beginPath();
        switch (face.mouth) {
            case 'smile':
                ctx.arc(0, -3.5, 5, Math.PI * 0.18, Math.PI * 0.82);
                ctx.stroke();
                break;
            case 'grin':
                ctx.moveTo(-5.5, -2);
                ctx.lineTo(5.5, -2);
                ctx.arc(0, -2, 5.5, 0, Math.PI);
                ctx.fill();
                break;
            case 'open':
                ctx.ellipse(0, 0, 3, 4, 0, 0, Math.PI * 2);
                ctx.stroke();
                break;
            case 'frown':
                ctx.arc(0, 5, 5, Math.PI * 1.2, Math.PI * 1.8);
                ctx.stroke();
                break;
            case 'flat':
                ctx.moveTo(-4, 0);
                ctx.lineTo(4, 0);
                ctx.stroke();
                break;
            case 'wavy':
                for (let i = 0; i <= 16; i++) {
                    const px = -5.5 + (11 * i) / 16;
                    ctx.lineTo(px, Math.sin((i / 16) * Math.PI * 3) * 1.4);
                }
                ctx.stroke();
                break;
        }
    });
    ctx.restore();
}

function drawBlush(ctx: CanvasRenderingContext2D, style: PlayerStyle, y: number): void {
    ctx.save();
    ctx.fillStyle = BLUSH_COLOR;
    for (const sign of [-1, 1]) {
        ctx.beginPath();
        if (style.eye.square) ctx.rect(CENTER + sign * 11 - 3, y - 1.5, 6, 3);
        else ctx.ellipse(CENTER + sign * 11, y, 3.5, 2, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

/**
 * Yüzü jetonun üstüne çizer. Yerleşim eski DOM düzeniyle aynı: göz sırası +
 * `eyeGapBottom` + 15px ağız, dikeyde ortalanmış.
 */
export function drawFace(ctx: CanvasRenderingContext2D, style: PlayerStyle, rawFace: FacePose, mode: Mode): void {
    const face = quantizeFace(rawFace);
    const contentH = style.eye.size + style.eyeGapBottom + MOUTH_SIZE;
    const top = CENTER - contentH / 2;
    const eyeY = top + style.eye.size / 2 + face.lookY * LOOK_SHIFT;
    const eyeX = CENTER + face.lookX * LOOK_SHIFT;
    const dx = (EYE_GAP + style.eye.size) / 2;
    const r = (style.eye.size / 2) * face.eyeScale;

    if (face.blush) drawBlush(ctx, style, eyeY + style.eye.size / 2 + 3);
    drawEye(ctx, style, face.left, eyeX - dx, eyeY, r, -1);
    drawEye(ctx, style, face.right, eyeX + dx, eyeY, r, 1);

    const mouthX = CENTER + face.lookX * LOOK_SHIFT * 0.5;
    const mouthY = top + contentH - MOUTH_SIZE / 2 + face.lookY * LOOK_SHIFT * 0.5;
    drawMouth(ctx, style, face, mode, mouthX, mouthY);
}
