/**
 * DOSYA AMACI: `forbidden` (tehlike) hücresinin canvas rasterleyicisi —
 * üç `hazardType`'ın hepsi.
 *
 * Kaynak: `components/cells/forbiddenCellRenderer.tsx`. O dosya değerlerini
 * `themeConfig.forbiddenCell`'den okuduğu için burası da öyle yapar.
 *
 * `hazardType` yalnızca iki şeyi değiştirir: köşe yarıçapı (`pixel_skull` → 0)
 * ve ikon (`skull`/`pixel_skull` → kafatası, `cross` → çarpı). Simgenin
 * `drop-shadow(0 0 8px …)` parlaması `outerGlow` ile veriliyor; sprite
 * rasterizasyonunda verildiği için Gauss bulanıklığı serbest (00-ilkeler §2.1).
 */

import { getThemeConfig } from '../../themes/themeConfig';
import type { CellPaintInput, SpritePainter } from '../types';
import { NATIVE_CELL_SIZE } from '../types';
import { getIcon } from '../icons';
import { outerGlow, paintBox, roundRectPath } from '../paintTokens';
import type { Box } from '../paintTokens';

const CELL_BOX: Box = { x: 0, y: 0, w: NATIVE_CELL_SIZE, h: NATIVE_CELL_SIZE };
const ICON_SIZE = 22;
const ICON_GLOW = 8;
const DEFAULT_SHADOW = 'inset 0 0 14px rgba(239,68,68,0.3)';

export const forbiddenCellSprite: SpritePainter<CellPaintInput> = {
    key: ({ theme }) => `forbidden|${theme}`,

    size: () => ({ w: NATIVE_CELL_SIZE, h: NATIVE_CELL_SIZE }),

    draw: (ctx, { theme }) => {
        const { forbiddenCell } = getThemeConfig(theme);
        const isSkull = forbiddenCell.hazardType === 'skull' || forbiddenCell.hazardType === 'pixel_skull';
        const radius = forbiddenCell.hazardType === 'pixel_skull' ? '0px' : '4px';

        paintBox(ctx, CELL_BOX, {
            background: forbiddenCell.background,
            border: forbiddenCell.border,
            boxShadow: forbiddenCell.boxShadow ?? DEFAULT_SHADOW,
            borderRadius: radius,
        });

        const icon = getIcon(isSkull ? 'skull' : 'close', ICON_SIZE, forbiddenCell.symbolColor);
        // İkon henüz yüklenmedi: sprite ÖNBELLEĞE ALINMAZ, bir sonraki karede
        // yeniden denenir (01-rapor §6.5).
        if (!icon) return false;

        const at = (NATIVE_CELL_SIZE - ICON_SIZE) / 2;
        ctx.save();
        // DOM'daki `overflow: hidden` karşılığı.
        roundRectPath(ctx, CELL_BOX, radius);
        ctx.clip();
        outerGlow(ctx, () => ctx.drawImage(icon, at, at, ICON_SIZE, ICON_SIZE), forbiddenCell.symbolColor, ICON_GLOW);
        ctx.restore();
    },
};
