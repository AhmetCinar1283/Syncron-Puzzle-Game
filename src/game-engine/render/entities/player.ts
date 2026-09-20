/**
 * DOSYA AMACI: `components/entities/PlayerGraphic.tsx`'in beş `styleType`'ının
 * canvas rasterleyicisi. Beş tema da aynı iskeleti kullanıyor (isteğe bağlı bir
 * süs + yuvarlak/kare jeton + göz sırası + monospace ağız); fark yalnızca
 * değerlerde, bu yüzden TEK bir çizici var. Değer tablosu ve süsler
 * `playerStyles.ts`'te (dosya başına ~250 satır sınırı, 00-ilkeler §1).
 *
 * Göz kırpma (`playerBlink`) iki durumlu çizilir — gerekçe `index.ts` başında.
 * Ters mod nabzı (`playerPulse`, yalnız neon) 12 faza örneklenir (00-ilkeler §3.2)
 * ve anahtara girer.
 */

import type { GameTheme } from '../../themes/themeConfig';
import { getThemeConfig } from '../../themes/themeConfig';
import { getPlayerColor } from '../../components/playerColors';
import type { SpritePainter } from '../types';
import { NATIVE_CELL_SIZE, PHASES } from '../types';
import { getIcon } from '../icons';
import { outerGlow, paintBox, parseBoxShadow } from '../paintTokens';
import type { Box } from '../paintTokens';
import { drawText, outerPad } from '../cells/common';
import { playerStyle } from './playerStyles';
import type { PlayerSpriteInput, PlayerStyle } from './playerStyles';

export type { PlayerSpriteInput } from './playerStyles';

/** `fontFamily: 'monospace'` — ağız ve dayanıklılık rozetinde. */
export const MONO_STACK = 'monospace';

/** `playerPulse 1.3s infinite linear` — yalnızca neon temasının dış halkası. */
export const PLAYER_PULSE_MS = 1300;

/** Tema başına `playerBlink` süresi (kaynak dosyadaki satır içi `animation`). */
const BLINK_MS: Record<GameTheme, number> = {
    legacy: 4000,
    arcade: 4000,
    neon: 4200,
    blueprint: 4400,
    cosmic: 4600,
};

/**
 * `@keyframes playerBlink`: `0%,92%,100% → scaleY(1)`, `96% → scaleY(0.1)`.
 * Gözün kapalı sayıldığı pencere (scaleY < 0.5) periyodun ~%3.6'sı.
 */
const BLINK_CLOSED_FROM = 0.942;
const BLINK_CLOSED_TO = 0.978;

const CENTER = NATIVE_CELL_SIZE / 2;
const EYE_GAP = 6;
const MOUTH_SIZE = 15;
const LOCK_SIZE = 20;

/** Taşan parlamanın sprite kutusuna eklediği pay. */
function playerPad(style: PlayerStyle): number {
    return Math.max(0, Math.ceil(style.token.size / 2 + outerPad(style.token.boxShadow) - CENTER));
}

function drawEyes(ctx: CanvasRenderingContext2D, style: PlayerStyle, cy: number, closed: boolean): void {
    const { size, color, glow, square } = style.eye;
    const dx = (EYE_GAP + size) / 2;
    const half = size / 2;

    ctx.save();
    // `transformOrigin: 'center'` — sıranın merkezi etrafında ezilir.
    ctx.translate(CENTER, cy);
    if (closed) ctx.scale(1, 0.1);
    ctx.fillStyle = color;
    for (const sign of [-1, 1]) {
        const draw = () => {
            ctx.beginPath();
            if (square) ctx.rect(sign * dx - half, -half, size, size);
            else ctx.arc(sign * dx, 0, half, 0, Math.PI * 2);
            ctx.fill();
        };
        for (const sh of parseBoxShadow(glow)) outerGlow(ctx, draw, sh.color, sh.blur);
        draw();
    }
    ctx.restore();
}

export const playerSprite: SpritePainter<PlayerSpriteInput> = {
    key(input) {
        const styleType = getThemeConfig(input.theme).player.styleType;
        return `player|${styleType}|${input.playerIndex}|${input.mode}|${input.locked ? 1 : 0}`
            + `|${input.blinkClosed ? 1 : 0}|${input.pulsePhase}`;
    },

    size(input) {
        const pad = playerPad(playerStyle(input));
        return { w: NATIVE_CELL_SIZE + pad * 2, h: NATIVE_CELL_SIZE + pad * 2 };
    },

    draw(ctx, input) {
        const style = playerStyle(input);
        const { primary } = getPlayerColor(input.playerIndex);
        const pad = playerPad(style);

        ctx.save();
        ctx.translate(pad, pad);

        style.decor?.(ctx, input, primary);

        const half = style.token.size / 2;
        const box: Box = { x: CENTER - half, y: CENTER - half, w: style.token.size, h: style.token.size };
        paintBox(ctx, box, {
            background: style.token.background,
            border: style.token.border,
            boxShadow: style.token.boxShadow,
            borderRadius: style.token.radius,
        });

        if (input.locked) {
            const icon = getIcon('lock', LOCK_SIZE, style.lockColor);
            // İkon henüz yüklenmedi: sprite ÖNBELLEĞE ALINMAZ (01-rapor §6.5).
            if (!icon) { ctx.restore(); return false; }
            ctx.drawImage(icon, CENTER - LOCK_SIZE / 2, CENTER - LOCK_SIZE / 2, LOCK_SIZE, LOCK_SIZE);
            ctx.restore();
            return true;
        }

        const contentH = style.eye.size + style.eyeGapBottom + MOUTH_SIZE;
        const top = CENTER - contentH / 2;
        drawEyes(ctx, style, top + style.eye.size / 2, input.blinkClosed);
        drawText(ctx, input.mode === 'reversed' ? '▼' : '▲', CENTER, top + contentH - MOUTH_SIZE / 2, {
            size: MOUTH_SIZE,
            color: style.mouth.color,
            weight: 900,
            family: MONO_STACK,
            textShadow: style.mouth.shadow,
        });

        ctx.restore();
        return true;
    },
};

/** `playerBlink` periyodunun kapalı penceresinde miyiz. */
export function blinkClosedAt(theme: GameTheme, now: number): boolean {
    const period = BLINK_MS[theme] ?? 4000;
    const t = (((now % period) + period) % period) / period;
    return t >= BLINK_CLOSED_FROM && t < BLINK_CLOSED_TO;
}

/** `playerPulse` fazı; nabız yalnızca neon + ters modda var. */
export function pulsePhaseAt(theme: GameTheme, mode: 'normal' | 'reversed', now: number): number {
    if (theme !== 'neon' || mode !== 'reversed') return 0;
    return Math.floor(((now % PLAYER_PULSE_MS) / PLAYER_PULSE_MS) * PHASES) % PHASES;
}

/** Sahnedeki bir varlıktan sprite girdisi. */
export function playerInputOf(
    theme: GameTheme,
    customData: Record<string, unknown>,
    now: number,
): PlayerSpriteInput {
    const playerIndex = (customData.playerIndex as number) ?? 0;
    const mode = (customData.mode as 'normal' | 'reversed') ?? 'normal';
    const locked = Boolean(customData.isLocked);
    return {
        theme,
        playerIndex,
        mode,
        locked,
        blinkClosed: locked ? false : blinkClosedAt(theme, now),
        pulsePhase: pulsePhaseAt(theme, mode, now),
    };
}
