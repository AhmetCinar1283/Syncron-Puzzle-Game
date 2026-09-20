/**
 * DOSYA AMACI: `control_switch` (kontrol anahtarı) hücresinin canvas
 * rasterleyicisi. Süsü yoktur.
 *
 * Kaynak: `components/cells/controlSwitchCellRenderer.tsx`.
 *
 * ANAHTARA GİREN ALAN: `customData.action` — hücrenin ALT KENARINDAKİ etiket
 * onun metnidir, yani görüntüyü değiştirir. Faz planının §2 tablosu bu alanı
 * saymıyor ama 00-ilkeler §3.1 "aynı görüntüyü veren her girdi aynı anahtar"
 * diyor; anahtara girmezse iki farklı etiket aynı sprite'ı paylaşırdı.
 */

import type { GameTheme } from '../../themes/themeConfig';
import type { CellPaintInput, SpritePainter } from '../types';
import { NATIVE_CELL_SIZE } from '../types';
import { getIcon } from '../icons';
import { paintBox } from '../paintTokens';
import { CELL_BOX, CELL_CENTER, clipCell, drawIconGlow, drawText, outerPad } from './common';

const ICON_SIZE = 20;
const ICON_GLOW = 8;
const GLOW_COLOR = 'rgba(168,85,247,0.7)';
const LABEL_SIZE = 6;
/**
 * Etiket kutusunun merkezi. `position:absolute; bottom:2` DOLGU kutusuna göre
 * ölçülür (2px kenarın içi), yani alt kenarı y=60; satır yüksekliği `normal`
 * (≈1.15em) olduğundan kutu 6.9 px ve merkezi 56.55'tir.
 */
const LABEL_CENTER_Y = 56.55;
const LABEL_SPACING = LABEL_SIZE * 0.04;   // `letter-spacing: 0.04em`

function radiusFor(theme: GameTheme): string {
    return theme === 'arcade' ? '0px' : theme === 'blueprint' ? '2px' : '10px';
}

function themedBoxShadow(isOccupied: boolean): string {
    return isOccupied
        ? 'inset 0 0 24px rgba(168,85,247,0.75), 0 0 16px rgba(168,85,247,0.5)'
        : 'inset 0 0 16px rgba(168,85,247,0.25), 0 0 10px rgba(168,85,247,0.2)';
}

function actionOf(customData: Record<string, unknown>): string {
    const value = customData.action;
    return typeof value === 'string' ? value : 'cycle';
}

export const controlSwitchCellSprite: SpritePainter<CellPaintInput> = {
    key: ({ cell, theme, isOccupied }) => (theme === 'legacy'
        ? 'control_switch|legacy'
        : `control_switch|${theme}|occ${isOccupied ? 1 : 0}|${actionOf(cell.customData)}`),

    size: ({ theme, isOccupied }) => {
        const pad = theme === 'legacy' ? 0 : outerPad(themedBoxShadow(isOccupied));
        return { w: NATIVE_CELL_SIZE + pad * 2, h: NATIVE_CELL_SIZE + pad * 2 };
    },

    draw: (ctx, { cell, theme, isOccupied }) => {
        if (theme === 'legacy') {
            paintBox(ctx, CELL_BOX, {
                background: 'rgba(192, 132, 252, 0.12)',
                border: '1px solid rgba(192, 132, 252, 0.5)',
                boxShadow: 'inset 0 0 12px rgba(168, 85, 247, 0.3)',
                borderRadius: '0px',
            });
            const icon = getIcon('switch', ICON_SIZE, '#c084fc');
            if (!icon) return false;
            drawIconGlow(ctx, icon, CELL_CENTER, CELL_CENTER, ICON_SIZE, GLOW_COLOR, ICON_GLOW);
            return true;
        }

        const iconColor = isOccupied ? '#e9d5ff' : '#c084fc';
        const icon = getIcon('switch', ICON_SIZE, iconColor);
        if (!icon) return false;

        const radius = radiusFor(theme);
        const pad = outerPad(themedBoxShadow(isOccupied));
        ctx.save();
        ctx.translate(pad, pad);
        paintBox(ctx, CELL_BOX, {
            background: isOccupied ? 'rgba(15, 23, 42, 0.9)' : 'rgba(15, 23, 42, 0.7)',
            border: isOccupied ? '2px solid #e9d5ff' : '2px solid #a855f7',
            boxShadow: themedBoxShadow(isOccupied),
            borderRadius: radius,
        });

        clipCell(ctx, radius);   // DOM'daki `overflow: hidden`
        drawIconGlow(ctx, icon, CELL_CENTER, CELL_CENTER, ICON_SIZE, GLOW_COLOR, ICON_GLOW);
        ctx.globalAlpha = 0.6;
        drawText(ctx, actionOf(cell.customData).toUpperCase(), CELL_CENTER, LABEL_CENTER_Y, {
            size: LABEL_SIZE,
            weight: 'bold',
            color: isOccupied ? '#e9d5ff' : '#a855f7',
            letterSpacing: LABEL_SPACING,
        });
        ctx.restore();
        return true;
    },
};
