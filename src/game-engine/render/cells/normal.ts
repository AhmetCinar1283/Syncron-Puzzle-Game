/**
 * DOSYA AMACI: `normal` (boş zemin) hücresinin canvas rasterleyicisi.
 *
 * Kaynak: `components/cells/normalCellRenderer.tsx`. O dosya tüm değerlerini
 * `themeConfig.normalCell`'den okuduğu için burası da öyle yapar — tema
 * değişikliği iki yolu birden günceller (00-ilkeler §5).
 *
 * Bu hücrenin görünümü `isOccupied` veya `phase`'ten ETKİLENMEZ; anahtar bu
 * yüzden yalnızca tip + temadır (tüm oyunda en fazla 5 sprite).
 */

import { getThemeConfig } from '../../themes/themeConfig';
import type { CellPaintInput, SpritePainter } from '../types';
import { NATIVE_CELL_SIZE } from '../types';
import { paintBox } from '../paintTokens';
import type { Box } from '../paintTokens';

const CELL_BOX: Box = { x: 0, y: 0, w: NATIVE_CELL_SIZE, h: NATIVE_CELL_SIZE };

export const normalCellSprite: SpritePainter<CellPaintInput> = {
    key: ({ theme }) => `normal|${theme}`,

    size: () => ({ w: NATIVE_CELL_SIZE, h: NATIVE_CELL_SIZE }),

    draw: (ctx, { theme }) => {
        const { normalCell } = getThemeConfig(theme);
        paintBox(ctx, CELL_BOX, {
            background: normalCell.background,
            border: normalCell.border,
            boxShadow: normalCell.boxShadow,
            borderRadius: normalCell.borderRadius ?? '0px',
        });
    },
};
