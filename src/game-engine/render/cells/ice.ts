/**
 * DOSYA AMACI: `ice` (buz/kayma) hücresinin canvas rasterleyicileri. İki parça:
 *
 *   - `iceCellSprite`   → DURAĞAN gövde (arka plan, kenar, iç gölge). Animasyonlu
 *                         olmayan hallerde ikonu DA içerir.
 *   - `iceAmbientSprite`→ ANİMASYONLU ikon; 12 faza örneklenip `ambient`
 *                         katmanına blit edilir (00-ilkeler §3.2).
 *
 * Kaynak: `components/cells/iceCellRenderer.tsx` ve `ice-icon-animated`
 * sınıfının `effects/animationStyles.ts`'teki `icePulse` keyframe'i.
 *
 * DİKKAT — ikon ne zaman animasyonlu: `ice-icon-animated` sınıfı YALNIZCA
 * `legacy` DIŞINDAKİ temalarda ve YALNIZCA hücre doluyken veriliyor. Diğer
 * hallerde ikon durağandır ve bu yüzden `static` katmanına girer.
 *
 * ÇÖZÜMSÜZ: DOM kutusunda `backdrop-filter: blur(4px)` var; canvas'ta karşılığı
 * yok. Yok sayıldı — altındaki tahta zaten düz renk. Bkz. raporlar/02-rapor.md §4.
 */

import type { GameTheme } from '../../themes/themeConfig';
import type { CellPaintInput, SpritePainter } from '../types';
import { NATIVE_CELL_SIZE, PHASES } from '../types';
import { getIcon } from '../icons';
import { outerGlow, paintBox, roundRectPath } from '../paintTokens';
import type { Box } from '../paintTokens';
import { cssBezier } from './common';

const CELL_BOX: Box = { x: 0, y: 0, w: NATIVE_CELL_SIZE, h: NATIVE_CELL_SIZE };
const ICON_SIZE = 20;
const ICON_GLOW = 8;

/** `icePulse 1.2s infinite ease-in-out` — bir tam döngünün süresi. */
export const ICE_PULSE_MS = 1200;

/** `phase` yerine geçen taban değer: animasyon durdurulduğundaki görünüm. */
export const BASE_PHASE = -1;

interface IceStyle {
    background: string;
    border: string;
    boxShadow: string;
    borderRadius: string;
    iconColor: string;
    /** `drop-shadow` rengi; `legacy` dışında ikon rengiyle aynı. */
    glowColor: string;
    /** İkon `ice-icon-animated` sınıfını alıyor mu? */
    animated: boolean;
    /** DOM'da `overflow: hidden` var mı? */
    clipped: boolean;
}

function iceStyle(theme: GameTheme, isOccupied: boolean): IceStyle {
    if (theme === 'legacy') {
        return {
            background: 'rgba(147, 210, 255, 0.12)',
            border: '1px solid rgba(165, 243, 252, 0.45)',
            boxShadow: 'inset 0 0 10px rgba(165, 243, 252, 0.25)',
            borderRadius: '0px',
            iconColor: '#a5f3fc',
            glowColor: 'rgba(165,243,252,0.8)',
            animated: false,
            clipped: false,
        };
    }

    let background = isOccupied
        ? 'linear-gradient(135deg, rgba(165,243,252,0.45) 0%, rgba(147,210,255,0.25) 100%)'
        : 'linear-gradient(135deg, rgba(165,243,252,0.18) 0%, rgba(147,210,255,0.08) 100%)';
    let border = isOccupied ? '1.5px solid rgba(165,243,252,0.95)' : '1.5px solid rgba(165,243,252,0.5)';
    let iconColor = '#cffafe';
    let borderRadius = '6px';

    if (theme === 'arcade') {
        background = isOccupied ? '#1e293b' : '#0f172a';
        border = isOccupied ? '2px solid #38bdf8' : '2px solid #0284c7';
        iconColor = '#38bdf8';
        borderRadius = '0px';
    } else if (theme === 'cosmic') {
        background = isOccupied ? 'rgba(167,139,250,0.3)' : 'rgba(100,70,160,0.12)';
        border = isOccupied ? '1.5px solid #ddd6fe' : '1.5px solid rgba(167,139,250,0.45)';
        iconColor = '#ede9fe';
    } else if (theme === 'blueprint') {
        background = isOccupied ? 'rgba(56,189,248,0.3)' : 'rgba(56,189,248,0.1)';
        border = isOccupied ? '1.5px solid #bae6fd' : '1.5px dashed rgba(56,189,248,0.5)';
        borderRadius = '2px';
    }

    return {
        background,
        border,
        boxShadow: isOccupied
            ? 'inset 0 0 22px rgba(255,255,255,0.25), 0 0 12px rgba(0,0,0,0.4)'
            : 'inset 0 0 12px rgba(0,0,0,0.3)',
        borderRadius,
        iconColor,
        glowColor: iconColor,
        animated: isOccupied,
        clipped: true,
    };
}

/**
 * CSS `ease-in-out` (`cubic-bezier(0.42, 0, 0.58, 1)`).
 *
 * Faz 02'de bu dosyada açılmıştı; Faz 03'te `target` ve `teleport` de aynı
 * çözücüyü istediği için gövdesi `cells/common.ts`'e taşındı. 00-ilkeler §3'te
 * easing'in evi `motion.ts` (Faz 05) — oraya taşınması hâlâ bekliyor.
 */
export function easeInOut(t: number): number {
    return cssBezier(0.42, 0.58, 0, 1, t);
}

/** `@keyframes icePulse`: 0%/100% → scale(1) opacity .82, 50% → scale(1.15) opacity 1. */
function pulseAt(phase: number): { scale: number; opacity: number } {
    // `animation: none` (ambient kapalı): öğe kendi taban stilinde durur.
    if (phase === BASE_PHASE) return { scale: 1, opacity: 1 };
    const t = (((phase % PHASES) + PHASES) % PHASES) / PHASES;
    const u = t < 0.5 ? easeInOut(t / 0.5) : 1 - easeInOut((t - 0.5) / 0.5);
    return { scale: 1 + 0.15 * u, opacity: 0.82 + 0.18 * u };
}

function drawIcon(ctx: CanvasRenderingContext2D, style: IceStyle, scale: number, opacity: number): boolean {
    const icon = getIcon('ice', ICON_SIZE, style.iconColor);
    // İkon henüz yüklenmedi: sprite ÖNBELLEĞE ALINMAZ (01-rapor §6.5).
    if (!icon) return false;

    const center = NATIVE_CELL_SIZE / 2;
    ctx.save();
    if (style.clipped) {
        roundRectPath(ctx, CELL_BOX, style.borderRadius);
        ctx.clip();
    }
    ctx.globalAlpha = opacity;
    ctx.translate(center, center);
    ctx.scale(scale, scale);
    const half = ICON_SIZE / 2;
    outerGlow(ctx, () => ctx.drawImage(icon, -half, -half, ICON_SIZE, ICON_SIZE), style.glowColor, ICON_GLOW);
    ctx.restore();
    return true;
}

/** Durağan gövde. İkon yalnızca animasyonsuz hallerde buraya girer (§4.4). */
export const iceCellSprite: SpritePainter<CellPaintInput> = {
    key: ({ theme, isOccupied }) => (theme === 'legacy' ? 'ice|legacy' : `ice|${theme}|occ${isOccupied ? 1 : 0}`),

    size: () => ({ w: NATIVE_CELL_SIZE, h: NATIVE_CELL_SIZE }),

    draw: (ctx, { theme, isOccupied }) => {
        const style = iceStyle(theme, isOccupied);
        paintBox(ctx, CELL_BOX, style);
        if (style.animated) return;   // ikon `ambient` katmanına ait
        return drawIcon(ctx, style, 1, 1);
    },
};

/** Animasyonlu ikon — yalnızca `isAnimated` doğruyken çizilir (cells/index.ts). */
export const iceAmbientSprite: SpritePainter<CellPaintInput> = {
    key: ({ theme, isOccupied, phase }) => `ice|${theme}|occ${isOccupied ? 1 : 0}|p${phase}`,

    size: () => ({ w: NATIVE_CELL_SIZE, h: NATIVE_CELL_SIZE }),

    draw: (ctx, { theme, isOccupied, phase }) => {
        const style = iceStyle(theme, isOccupied);
        const { scale, opacity } = pulseAt(phase);
        return drawIcon(ctx, style, scale, opacity);
    },
};

/** Bu hücre şu anda gerçekten animasyonlu mu? */
export function iceIsAnimated({ theme, isOccupied }: CellPaintInput): boolean {
    return iceStyle(theme, isOccupied).animated;
}
