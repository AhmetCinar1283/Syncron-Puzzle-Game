/**
 * DOSYA AMACI: `power` (güç kaynağı) hücresinin canvas rasterleyicisi.
 *
 * Kaynak: `components/cells/powerCellRenderer.tsx`. O dosya değerlerini kendi
 * içinde sabit yazıyor (`themeConfig` okumuyor), burası da onu izler.
 *
 * DİKKAT — `cell.isElectrified` ANAHTARA GİRMEZ: faz planı §2 tablosu bu alanın
 * görünümü değiştirdiğini söylüyor, ama kaynak DOM dosyası onu HİÇ okumuyor.
 * 00-ilkeler §4 gereği görüntünün kaynağı DOM dosyasıdır; alan eklenseydi
 * canvas DOM'dan ayrılır ve önbellek boşuna ikiye katlanırdı. Aynı sebeple
 * `power-ring-active` / `power-bolt-active` süsleri de ÇİZİLMEZ: o sınıflar
 * `animationStyles.ts`'te tanımlı ama hiçbir çizici onları vermiyor, yani
 * bugün ekranda görünmüyorlar. Bkz. raporlar/03-rapor.md §4.
 */

import type { GameTheme } from '../../themes/themeConfig';
import type { CellPaintInput, SpritePainter } from '../types';
import { NATIVE_CELL_SIZE } from '../types';
import { getIcon } from '../icons';
import { paintBox } from '../paintTokens';
import { CELL_BOX, CELL_CENTER, clipCell, drawIconGlow, outerPad } from './common';

const LEGACY_SHADOW = 'inset 0 0 12px rgba(251, 191, 36, 0.25)';
const LEGACY_GLOW = 'rgba(251,191,36,0.9)';
const ICON_GLOW = 8;
const RING = { x: 10, y: 10, w: 44, h: 44 };

interface PowerStyle {
    color: string;
    activeColor: string;
    borderRadius: string;
}

function powerStyle(theme: GameTheme): PowerStyle {
    if (theme === 'cosmic') return { color: '#a78bfa', activeColor: '#ede9fe', borderRadius: '8px' };
    if (theme === 'blueprint') return { color: '#38bdf8', activeColor: '#bae6fd', borderRadius: '2px' };
    if (theme === 'arcade') return { color: '#facc15', activeColor: '#ffffff', borderRadius: '0px' };
    return { color: '#fbbf24', activeColor: '#fef08a', borderRadius: '8px' };
}

function boxShadowOf(style: PowerStyle, isOccupied: boolean): string {
    return isOccupied
        ? `inset 0 0 24px ${style.color}80, 0 0 16px ${style.color}60`
        : `inset 0 0 16px ${style.color}40, 0 0 10px ${style.color}30`;
}

function drawLegacy(ctx: CanvasRenderingContext2D): boolean {
    paintBox(ctx, CELL_BOX, {
        background: 'rgba(251, 191, 36, 0.12)',
        border: '1px solid rgba(251, 191, 36, 0.5)',
        boxShadow: LEGACY_SHADOW,
        borderRadius: '0px',
    });
    const icon = getIcon('lightning', 20, '#fbbf24');
    if (!icon) return false;
    drawIconGlow(ctx, icon, CELL_CENTER, CELL_CENTER, 20, LEGACY_GLOW, ICON_GLOW);
    return true;
}

function drawThemed(ctx: CanvasRenderingContext2D, theme: GameTheme, isOccupied: boolean): boolean {
    const style = powerStyle(theme);
    paintBox(ctx, CELL_BOX, {
        background: isOccupied ? 'rgba(15, 23, 42, 0.9)' : 'rgba(15, 23, 42, 0.75)',
        border: `2px solid ${isOccupied ? style.activeColor : style.color}`,
        boxShadow: boxShadowOf(style, isOccupied),
        borderRadius: style.borderRadius,
    });

    const icon = getIcon('lightning', 24, isOccupied ? style.activeColor : style.color);
    if (!icon) return false;

    ctx.save();
    clipCell(ctx, style.borderRadius);   // DOM'daki `overflow: hidden`
    paintBox(ctx, RING, {
        border: `1.5px solid ${style.color}${isOccupied ? 'dd' : '55'}`,
        borderRadius: theme === 'arcade' ? 0 : '50%',
    });
    drawIconGlow(ctx, icon, CELL_CENTER, CELL_CENTER, 24, style.color, ICON_GLOW);
    ctx.restore();
    return true;
}

function padFor(theme: GameTheme, isOccupied: boolean): number {
    if (theme === 'legacy') return 0;
    return outerPad(boxShadowOf(powerStyle(theme), isOccupied));
}

export const powerCellSprite: SpritePainter<CellPaintInput> = {
    key: ({ theme, isOccupied }) => (theme === 'legacy' ? 'power|legacy' : `power|${theme}|occ${isOccupied ? 1 : 0}`),

    size: ({ theme, isOccupied }) => {
        const pad = padFor(theme, isOccupied);
        return { w: NATIVE_CELL_SIZE + pad * 2, h: NATIVE_CELL_SIZE + pad * 2 };
    },

    draw: (ctx, { theme, isOccupied }) => {
        const pad = padFor(theme, isOccupied);
        ctx.save();
        ctx.translate(pad, pad);
        const drawn = theme === 'legacy' ? drawLegacy(ctx) : drawThemed(ctx, theme, isOccupied);
        ctx.restore();
        return drawn;
    },
};
