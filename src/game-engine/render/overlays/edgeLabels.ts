/**
 * DOSYA AMACI: Kenar etiketleri — `GameBoard.tsx`'teki `renderEdgeLabel`'in portu.
 * 24x24 daire + ikon (`skull` lav, `portal` portal), `label-breath` nefesi ve
 * portalda ek `portal-spin` dönüşü.
 *
 * SPRITE: daire + ikon TEK sprite, iki varyant (`edgelabel|lava`, `edgelabel|portal`).
 * Nefes ve dönüş kare döngüsünde `translate/scale/rotate` + `globalAlpha` ile.
 * Dönüş tüm sprite'a uygulanır; daire ve parlaması dönme simetrik olduğu için
 * yalnızca ikonun dönüşü görünür — DOM'da da dönen tek şey ikon.
 *
 * ÇÖZÜMSÜZ (küçük): DOM'da ikon `vertical-align: middle` ile satır kutusunda
 * duruyor; burada dairenin tam merkezine konuyor (yarım piksel farkı olabilir).
 * `text-shadow` DOM'da ikon (SVG) üzerinde etkisiz, o yüzden çizilmiyor.
 */

import type { BoardScene, SpritePainter } from '../types';
import type { SpriteCache } from '../spriteCache';
import type { FadeFrame } from '../fades';
import { getIcon } from '../icons';
import { paintBox } from '../paintTokens';
import { outerPad } from '../cells/common';
import { EDGE_SIDES, edgeLabelCenter, forEachRoom, roomPaddingBox } from './geometry';
import { labelBreath, portalSpinAngle } from './timing';

export type LabelKind = 'lava' | 'portal';
export interface EdgeLabelInput { kind: LabelKind }

const SIZE = 24;
const ICON_SIZE = 20;

const STYLE: Record<LabelKind, { background: string; border: string; shadow: string; icon: string; iconColor: string }> = {
    lava: {
        background: 'rgba(239, 68, 68, 0.15)',
        border: '1px solid rgba(239, 68, 68, 0.4)',
        shadow: '0 0 10px rgba(239, 68, 68, 0.1)',
        icon: 'skull',
        iconColor: '#ff2d55',
    },
    portal: {
        background: 'rgba(168, 85, 247, 0.15)',
        border: '1px solid rgba(168, 85, 247, 0.4)',
        shadow: '0 0 10px rgba(168, 85, 247, 0.1)',
        icon: 'portal',
        iconColor: '#00f5d4',
    },
};

const PAD = outerPad(STYLE.lava.shadow);
const BOX = SIZE + PAD * 2;

export const edgeLabelSprite: SpritePainter<EdgeLabelInput> = {
    key: ({ kind }) => `edgelabel|${kind}`,

    size: () => ({ w: BOX, h: BOX }),

    draw: (ctx, { kind }) => {
        const style = STYLE[kind];
        paintBox(ctx, { x: PAD, y: PAD, w: SIZE, h: SIZE }, {
            background: style.background,
            border: style.border,
            boxShadow: style.shadow,
            borderRadius: '50%',
        });

        const icon = getIcon(style.icon, ICON_SIZE, style.iconColor);
        // İkon henüz yüklenmedi: sprite ÖNBELLEĞE ALINMAZ (01-rapor §6.5).
        if (!icon) return false;
        ctx.drawImage(icon, PAD + (SIZE - ICON_SIZE) / 2, PAD + (SIZE - ICON_SIZE) / 2, ICON_SIZE, ICON_SIZE);
    },
};

/**
 * `lava`/`portal` kenarlarının etiketleri.
 *
 * @param now `null` = `ambientMode === 'off'` taban hâli (ölçek 1, opaklık 1, dönüş 0).
 * @returns Animasyonlu bir etiket çizildiyse `true`.
 */
export function drawEdgeLabels(
    ctx: CanvasRenderingContext2D,
    scene: BoardScene,
    cache: SpriteCache,
    now: number | null,
    fades: FadeFrame | null = null,
): boolean {
    let drawn = false;
    const breath = now === null ? { scale: 1, opacity: 1 } : labelBreath(now);

    forEachRoom(scene, (room, offset, _isControlled, alpha) => {
        const pb = roomPaddingBox(scene, offset);
        for (const side of EDGE_SIDES) {
            const kind = room.edges[side]?.type;
            if (kind !== 'lava' && kind !== 'portal') continue;
            drawn = true;

            const { x, y } = edgeLabelCenter(side, pb);
            ctx.save();
            ctx.globalAlpha = alpha * breath.opacity;
            ctx.translate(x, y);
            ctx.scale(breath.scale, breath.scale);
            if (kind === 'portal' && now !== null) ctx.rotate(portalSpinAngle(now));
            ctx.drawImage(cache.get(edgeLabelSprite, { kind }), -BOX / 2, -BOX / 2, BOX, BOX);
            ctx.restore();
        }
    }, fades);

    return drawn;
}
