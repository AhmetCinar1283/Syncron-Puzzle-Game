/**
 * DOSYA AMACI: Oda çerçevesi (arka plan, kenarlık, dış/iç gölge) ve oda başlığı —
 * `GameBoard.tsx`'teki oda `<div>`'inin ve `room.name` etiketinin portu.
 *
 * Çerçeve SPRITE'tır (04b §2.3): `static` her oyuncu adımında yeniden çiziliyor,
 * `0 0 30px` gölge ana yolda hesaplanmamalı. Anahtar odanın ölçüsünü (hücre
 * sayısı) taşır, kimliğini değil; aynı boyuttaki odalar sprite paylaşır.
 * `opacity: isControlled ? 1 : 0.4` sprite'a girmez, blit'te `globalAlpha` ile
 * oda başına `save()/restore()` içinde verilir; katmanın tamamına verilseydi diğer odalar da
 * soluklaşırdı.
 *
 * ÇÖZÜMSÜZ: DOM'da `opacity` odanın TÜM içeriğine grup olarak uygulanıyor;
 * burada arka plan, kenarlık ve gölge ayrı ayrı 0.4 alfa ile çiziliyor. Üst üste
 * binen bölgelerde (kenarlığın arka planla örtüştüğü 2–3px) renk hafif farklı
 * çıkabilir.
 *
 * GEÇİŞ (Faz 10 §2.4): `transition: opacity 0.25s, box-shadow 0.25s` iki parçadır.
 * `opacity` odanın her çizimine `alpha` olarak gelir (`fades.roomAlpha`); çerçeve
 * `box-shadow`u ise eski/yeni çerçeve sprite'ının çapraz geçişidir. DOM'da
 * `border-color` geçişe girmez (anında değişir); sprite kenarı da gölgeyle
 * birlikte solduğundan kenar rengi bu 250ms'de yumuşar — bilinen küçük fark.
 */

import { getThemeConfig } from '../../themes/themeConfig';
import type { BoardScene } from '../types';
import { paintBox } from '../paintTokens';
import type { SpriteCache } from '../spriteCache';
import type { GameTheme } from '../../themes/themeConfig';
import type { SpritePainter } from '../types';
import { drawText, measureText } from '../cells/common';
import type { TextStyle } from '../cells/common';
import type { FadeFrame, Fades } from '../fades';
import { drawAt, forEachRoom, isRoomControlled, roomPaddingBox } from './geometry';

/** `renderRoom` başlığı: `top: -20, left: 2, 10px/700, letter-spacing .08em`. */
const TITLE_SIZE = 10;
const TITLE_SPACING = TITLE_SIZE * 0.08;
const TITLE_TOP = -20;
const TITLE_LEFT = 2;
/** `line-height: normal` ≈ 1.15em; metin kutusunun merkezi bunun yarısı kadar aşağıda. */
const TITLE_CENTER = (TITLE_SIZE * 1.15) / 2;

/** Dış gölgenin (`0 0 30px`) taşması için sprite kutusunun her yöndeki payı. */
const FRAME_PAD = 40;

interface RoomFrameInput {
    cellsW: number;
    cellsH: number;
    /** Yalnızca kenar RENGİ için; opaklık blit'te verilir. */
    isControlled: boolean;
    theme: GameTheme;
    /** Kutunun CSS ölçüsü (kenarlık dahil); hücre sayısından türer, anahtara girmez. */
    width: number;
    height: number;
}

export const roomFrameSprite: SpritePainter<RoomFrameInput> = {
    key: ({ cellsW, cellsH, isControlled, theme }) =>
        `roomframe|${cellsW}x${cellsH}|${isControlled ? 1 : 0}|${theme}`,

    size: ({ width, height }) => ({ w: width + FRAME_PAD * 2, h: height + FRAME_PAD * 2 }),

    draw: (ctx, { isControlled, theme, width, height }) => {
        const board = getThemeConfig(theme).board;
        paintBox(ctx, { x: FRAME_PAD, y: FRAME_PAD, w: width, h: height }, {
            background: board.background,
            border: board.border(isControlled),
            boxShadow: board.boxShadow(isControlled),
            borderRadius: board.borderRadius ?? 6,
        });
    },
};

/**
 * Bir odanın kutusu: arka plan, kenarlık ve gölgeler. Hücrelerden ÖNCE çizilir.
 * Kontrol durumu değişmişse eski ve yeni çerçeve `alpha × (1 − e)` / `alpha × e`
 * ile çapraz geçer.
 */
export function drawRoomFrames(
    ctx: CanvasRenderingContext2D,
    scene: BoardScene,
    cache: SpriteCache,
    fades: FadeFrame | null = null,
): void {
    forEachRoom(scene, (room, offset, isControlled, alpha) => {
        const input: RoomFrameInput = {
            cellsW: room.width,
            cellsH: room.height,
            isControlled,
            theme: scene.theme,
            width: offset.width,
            height: offset.height,
        };
        const x = offset.left - FRAME_PAD;
        const y = offset.top - FRAME_PAD;
        const fade = fades?.roomFade(room.id) ?? null;

        ctx.save();
        if (fade) {
            ctx.globalAlpha = alpha * (1 - fade.e);
            drawAt(ctx, cache, roomFrameSprite, { ...input, isControlled: fade.fromControlled }, x, y);
            ctx.globalAlpha = alpha * fade.e;
        } else {
            ctx.globalAlpha = alpha;
        }
        drawAt(ctx, cache, roomFrameSprite, input, x, y);
        ctx.restore();
    }, fades);
}

/**
 * Odaların kontrol durumunu bildirir; değiştiyse 250ms'lik geçiş başlar.
 *
 * @param snap Yeni tur veya tema değişimi: durumu yazar, geçiş BAŞLATMAZ.
 * @returns Yeni bir geçiş başladıysa `true` — çağıran katmanları kirletmeli.
 */
export function observeRoomFades(scene: BoardScene, fades: Fades, now: number, snap: boolean): boolean {
    let started = false;
    for (const room of Object.values(scene.rooms)) {
        if (fades.observeRoom(room.id, isRoomControlled(scene, room.id), now, snap)) started = true;
    }
    return started;
}

/**
 * `ctx.letterSpacing` varsa tek çağrı; yoksa (eski WebView) harf harf çizilir.
 * Harf harf yol, her harfin kendi ölçüsünü kullandığı için kerning'i yitirir.
 */
function drawSpacedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, style: TextStyle): void {
    if ('letterSpacing' in ctx) {
        drawText(ctx, text, x, y, style);
        return;
    }
    let cursor = x;
    for (const char of text) {
        drawText(ctx, char, cursor, y, { ...style, letterSpacing: undefined });
        cursor += measureText(ctx, char, style) + (style.letterSpacing ?? 0);
    }
}

/** Oda adı; kenarlığın DIŞINDA, üst-sol köşede. `static` katmanı. */
export function drawRoomTitles(ctx: CanvasRenderingContext2D, scene: BoardScene, fades: FadeFrame | null = null): void {
    forEachRoom(scene, (room, offset, isControlled, alpha) => {
        const pb = roomPaddingBox(scene, offset);
        ctx.save();
        ctx.globalAlpha = alpha;
        drawSpacedText(ctx, room.name.toUpperCase(), pb.left + TITLE_LEFT, pb.top + TITLE_TOP + TITLE_CENTER, {
            size: TITLE_SIZE,
            weight: 'bold',
            color: isControlled ? '#00c4ff' : '#475569',
            letterSpacing: TITLE_SPACING,
            align: 'left',
        });
        ctx.restore();
    }, fades);
}
