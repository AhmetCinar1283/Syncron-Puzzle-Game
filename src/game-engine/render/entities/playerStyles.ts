/**
 * DOSYA AMACI: `PlayerGraphic`'in beş `styleType`'ının DEĞER tablosu ve jetonun
 * arkasına çizilen süsler (neon halkası, blueprint köşe çentikleri, kozmik
 * yörünge). Değerler kaynak dosyadan BİREBİR okundu (00-ilkeler §4).
 *
 * NEDEN `player.ts`'ten ayrı: tek dosya ~250 satır sınırını aşıyordu
 * (00-ilkeler §1). Burada yalnızca veri ve süs çizimi var; sprite sözleşmesi
 * (`key`/`size`/`draw`) `player.ts`'te.
 */

import type { GameTheme } from '../../themes/themeConfig';
import { getThemeConfig } from '../../themes/themeConfig';
import { getPlayerColor } from '../../components/playerColors';
import { NATIVE_CELL_SIZE, PHASES } from '../types';
import { outerGlow } from '../paintTokens';
import { strokeArc } from '../cells/common';

const CENTER = NATIVE_CELL_SIZE / 2;

/** `classic_arrow`'un yüksek kontrastlı yüz rengi tablosu. */
const CLASSIC_TEXT_COLORS = ['#003320', '#002233', '#1a0033', '#3a1000', '#330018', '#332500'];

export interface PlayerSpriteInput {
    theme: GameTheme;
    playerIndex: number;
    mode: 'normal' | 'reversed';
    locked: boolean;
    /** Göz kapağı kapalı mı. Kilitliyken göz çizilmediği için daima `false`. */
    blinkClosed: boolean;
    /** `playerPulse` fazı (0..PHASES-1); nabzı olmayan hâllerde 0. */
    pulsePhase: number;
}

export interface PlayerStyle {
    token: { size: number; radius: string; background: string; border?: string; boxShadow: string };
    eye: { size: number; color: string; glow?: string; square?: boolean };
    mouth: { color: string; shadow?: string };
    /** Göz sırasının `marginBottom`'u. */
    eyeGapBottom: number;
    lockColor: string;
    /** Jetonun ARKASINA çizilen süs (halka, köşe çentikleri, yörünge). */
    decor?: (ctx: CanvasRenderingContext2D, input: PlayerSpriteInput, primary: string) => void;
}

/** `playerPulse`: `0%,100% → scale(1)`, `50% → scale(1.05)`, `linear`. */
function pulseScale(phase: number): number {
    const t = (((phase % PHASES) + PHASES) % PHASES) / PHASES;
    return 1 + 0.05 * (t < 0.5 ? t / 0.5 : (1 - t) / 0.5);
}

/** Neon temasının kesikli dış halkası (`1px dashed`, 52x52). */
function neonRing(ctx: CanvasRenderingContext2D, input: PlayerSpriteInput, primary: string): void {
    const reversed = input.mode === 'reversed';
    ctx.save();
    ctx.globalAlpha = reversed ? 0.9 : 0.45;
    if (reversed) {
        ctx.translate(CENTER, CENTER);
        ctx.scale(pulseScale(input.pulsePhase), pulseScale(input.pulsePhase));
        ctx.translate(-CENTER, -CENTER);
    }
    strokeArc(ctx, CENTER, CENTER, 25.5, 0, Math.PI * 2, { width: 1, color: primary, dash: 'dashed' });
    ctx.restore();
}

/** Blueprint'in köşe çentikleri: 52x52 viewBox, hücrenin (6,6)'sına oturur. */
function blueprintTicks(ctx: CanvasRenderingContext2D, _input: PlayerSpriteInput, primary: string): void {
    ctx.save();
    ctx.translate(6, 6);
    ctx.globalAlpha = 0.8;
    ctx.strokeStyle = primary;
    ctx.lineWidth = 2;
    ctx.stroke(new Path2D('M2 10V2h8M42 2h8v8M50 42v8h-8M10 50H2v-8'));
    ctx.restore();
}

/** Kozmik yörünge: kesikli halka + tek parlayan nokta. */
function cosmicOrbit(ctx: CanvasRenderingContext2D, _input: PlayerSpriteInput, primary: string): void {
    ctx.save();
    ctx.globalAlpha = 0.65;
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = primary;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, 23, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = primary;
    outerGlow(ctx, () => {
        ctx.beginPath();
        ctx.arc(6 + 47, 6 + 21, 2, 0, Math.PI * 2);
        ctx.fill();
    }, primary, 4);
    ctx.restore();
}

export function playerStyle(input: PlayerSpriteInput): PlayerStyle {
    const { primary, glow } = getPlayerColor(input.playerIndex);
    const styleType = getThemeConfig(input.theme).player.styleType;

    if (styleType === 'classic_arrow') {
        const text = CLASSIC_TEXT_COLORS[input.playerIndex % CLASSIC_TEXT_COLORS.length] ?? '#002233';
        return {
            token: { size: 46, radius: '50%', background: primary, boxShadow: `0 0 12px ${primary}, 0 0 24px ${glow}` },
            eye: { size: 5, color: text },
            mouth: { color: text },
            eyeGapBottom: 2.5,
            lockColor: text,
        };
    }
    if (styleType === 'arcade_sprite') {
        return {
            token: {
                size: 44,
                radius: '0px',
                background: primary,
                boxShadow: '0 0 0 2px #000, inset 3px 3px 0 rgba(255,255,255,0.8), inset -3px -3px 0 rgba(0,0,0,0.8)',
            },
            eye: { size: 4, color: '#000000', square: true },
            mouth: { color: '#000000' },
            eyeGapBottom: 2,
            lockColor: '#000000',
        };
    }
    if (styleType === 'neon_crosshair') {
        return {
            token: {
                size: 44,
                radius: '50%',
                background: 'rgba(8, 16, 28, 0.95)',
                border: `2px solid ${primary}`,
                boxShadow: `0 0 10px ${primary}, inset 0 0 8px ${glow}`,
            },
            eye: { size: 5, color: '#ffffff', glow: `0 0 4px ${primary}` },
            mouth: { color: '#ffffff', shadow: `0 0 6px ${primary}` },
            eyeGapBottom: 2.5,
            lockColor: '#cbd5e1',
            decor: neonRing,
        };
    }
    if (styleType === 'blueprint_reticle') {
        return {
            token: {
                size: 44,
                radius: '50%',
                background: '#07182e',
                border: `2.5px solid ${primary}`,
                boxShadow: `0 0 12px ${primary}, inset 0 0 8px ${glow}`,
            },
            eye: { size: 4.5, color: primary, glow: `0 0 3px ${primary}` },
            mouth: { color: '#ffffff' },
            eyeGapBottom: 2.5,
            lockColor: '#cbd5e1',
            decor: blueprintTicks,
        };
    }
    return {
        token: {
            size: 44,
            radius: '50%',
            background: 'radial-gradient(circle, #1a0f30 0%, #080412 100%)',
            border: `2.5px solid ${primary}`,
            boxShadow: `0 0 14px ${primary}, inset 0 0 8px ${glow}`,
        },
        eye: { size: 5, color: '#ffffff', glow: `0 0 4px #ffffff, 0 0 8px ${primary}` },
        mouth: { color: '#ffffff', shadow: `0 0 6px ${primary}` },
        eyeGapBottom: 2.5,
        lockColor: '#cbd5e1',
        decor: cosmicOrbit,
    };
}

