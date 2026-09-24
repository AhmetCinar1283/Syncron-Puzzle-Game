/**
 * DOSYA AMACI: Oyuncu maskotunun beş `styleType`'ının canvas rasterleyicisi —
 * oyuncunun TEK çizicisi (DOM'da `MascotView` da bunu kullanır). Beş tema da aynı iskeleti kullanıyor (isteğe bağlı bir
 * süs + yuvarlak/kare jeton + göz sırası + monospace ağız); fark yalnızca
 * değerlerde, bu yüzden TEK bir çizici var. Değer tablosu ve süsler
 * `playerStyles.ts`'te (dosya başına ~250 satır sınırı, 00-ilkeler §1).
 *
 * YÜZ artık veri: `input.face` (`mascot/pose.ts`). Kırpma, bakınma ve ifadeler
 * aynı sprite'ın farklı yüz anahtarlarıdır; yüz parçalarının çizimi
 * `playerFace.ts`'te. Gövde dönüşümü (zıplama/ezilme) ve süsler sprite'a
 * PİŞİRİLMEZ — blit anında uygulanır (`mascot.ts`).
 * Ters mod nabzı (`playerPulse`, yalnız neon) 12 faza örneklenir (00-ilkeler §3.2)
 * ve anahtara girer.
 */

import type { GameTheme } from '../../themes/themeConfig';
import { getThemeConfig } from '../../themes/themeConfig';
import { getPlayerColor } from '../../components/playerColors';
import type { SpritePainter } from '../types';
import { NATIVE_CELL_SIZE, PHASES } from '../types';
import { getIcon } from '../icons';
import { paintBox } from '../paintTokens';
import type { Box } from '../paintTokens';
import { outerPad } from '../cells/common';
import type { FacePose } from '../../mascot/pose';
import { NEUTRAL_FACE, faceKey } from '../../mascot/pose';
import { playerStyle } from './playerStyles';
import type { PlayerSpriteInput, PlayerStyle } from './playerStyles';
import { drawFace } from './playerFace';

export type { PlayerSpriteInput } from './playerStyles';
export { MONO_STACK } from './playerFace';
export { blinkClosedAt } from '../../mascot/idle';

/** `playerPulse 1.3s infinite linear` — yalnızca neon temasının dış halkası. */
export const PLAYER_PULSE_MS = 1300;

const CENTER = NATIVE_CELL_SIZE / 2;
const LOCK_SIZE = 20;

/** Taşan parlamanın sprite kutusuna eklediği pay. */
function playerPad(style: PlayerStyle): number {
    return Math.max(0, Math.ceil(style.token.size / 2 + outerPad(style.token.boxShadow) - CENTER));
}

export const playerSprite: SpritePainter<PlayerSpriteInput> = {
    key(input) {
        const styleType = getThemeConfig(input.theme).player.styleType;
        // Kilitliyken yüz çizilmez: yüz anahtara girmez (gereksiz kopya sprite olmasın).
        return `player|${styleType}|${input.playerIndex}|${input.mode}|${input.locked ? 1 : 0}`
            + `|${input.locked ? '-' : faceKey(input.face)}|${input.pulsePhase}`;
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

        drawFace(ctx, style, input.face, input.mode);

        ctx.restore();
        return true;
    },
};

/** `playerPulse` fazı; nabız yalnızca neon + ters modda var. */
export function pulsePhaseAt(theme: GameTheme, mode: 'normal' | 'reversed', now: number): number {
    if (theme !== 'neon' || mode !== 'reversed') return 0;
    return Math.floor(((now % PLAYER_PULSE_MS) / PLAYER_PULSE_MS) * PHASES) % PHASES;
}

/**
 * Bu oyuncu BOŞTAYKEN animasyonlu mu: kilitsizse göz kırpar, neon ters modda
 * ayrıca dış halkası nabız atar. Kilitli oyuncu kırpmaz (kilit ikonu var).
 */
export function isIdleAnimated(theme: GameTheme, customData: Record<string, unknown>): boolean {
    if (!customData.isLocked) return true;
    return theme === 'neon' && customData.mode === 'reversed';
}

/**
 * Sahnedeki bir varlıktan sprite girdisi. `face` çağıranın işi: boştaki yüz
 * (`idleFaceAt`) ya da süren ifadenin yüzü (`MascotController.poseOf`).
 */
export function playerInputOf(
    theme: GameTheme,
    customData: Record<string, unknown>,
    now: number,
    face: FacePose = NEUTRAL_FACE,
): PlayerSpriteInput {
    const playerIndex = (customData.playerIndex as number) ?? 0;
    const mode = (customData.mode as 'normal' | 'reversed') ?? 'normal';
    const locked = Boolean(customData.isLocked);
    return {
        theme,
        playerIndex,
        mode,
        locked,
        face: locked ? NEUTRAL_FACE : face,
        pulsePhase: pulsePhaseAt(theme, mode, now),
    };
}
