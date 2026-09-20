/**
 * DOSYA AMACI: `components/entities/BoxGraphic.tsx`'in canvas rasterleyicisi —
 * fiziksel sandık gövdesi, ortadaki `▣` simgesi ve üç rozet (güç, dayanıklılık,
 * renk filtresi).
 *
 * DİKKAT: `BoxGraphic` `themeConfig.box` jetonlarını KULLANMIYOR; beş temanın
 * değerlerini kendi içinde `theme` üzerinden dallandırıyor. `styleType` ile
 * tema birebir eşleştiği için anahtarda tema adı kullanıldı (bkz. 05-rapor §2).
 *
 * "Elektriklenme" burada animasyon DEĞİL: `electricSpark` keyframe'i
 * `.box-container-active` sınıfına bağlı ve o sınıfı kimse vermiyor. Güçlenmiş
 * kutunun tek farkı kenar rengi ve rozet parlaması — ikisi de durağan.
 */

import type { GameTheme } from '../../themes/themeConfig';
import { getPlayerColor } from '../../components/playerColors';
import type { Entity } from '../../logic/entityTypes';
import type { SpritePainter } from '../types';
import { NATIVE_CELL_SIZE } from '../types';
import { getIcon } from '../icons';
import { outerGlow, paintBox } from '../paintTokens';
import type { Box } from '../paintTokens';
import { drawText, outerPad } from '../cells/common';
import { MONO_STACK } from './player';

/** Sandık gövdesi 52x52, 64'lük kutunun ortasında. */
const BODY_SIZE = 52;
const BODY_OFFSET = (NATIVE_CELL_SIZE - BODY_SIZE) / 2;
const SYMBOL_SIZE = 18;
const BOLT_SIZE = 12;

/** `colorFilterEnabled` kapalıyken kullanılan varsayılan turuncu. */
const DEFAULT_HEX = '#f97316';
const DEFAULT_RGB = '249,115,22';

export interface BoxSpriteInput {
    theme: GameTheme;
    hex: string;
    rgb: string;
    dimmed: boolean;
    powered: boolean;
    requiresPower: boolean;
    /** Rozette yazan sayı; dayanıklılık kapalıysa `null`. */
    durability: number | null;
    /** Sol üstteki renk filtresi noktası çizilsin mi. */
    colorDot: boolean;
}

interface BoxStyle {
    background: string;
    borderRadius: number;
    border: string;
    boxShadow: string;
}

function boxStyle(input: BoxSpriteInput): BoxStyle {
    const { theme, dimmed, powered, hex, rgb } = input;

    let background = dimmed ? 'rgba(26, 36, 50, 0.9)' : 'rgba(15, 23, 35, 0.95)';
    let borderRadius = 6;
    if (theme === 'arcade') {
        background = dimmed ? '#18181b' : '#27272a';
        borderRadius = 0;
    } else if (theme === 'neon') {
        background = dimmed ? 'rgba(8, 16, 28, 0.9)' : 'rgba(10, 22, 38, 0.95)';
        borderRadius = 4;
    } else if (theme === 'blueprint') {
        background = dimmed ? '#071526' : '#0c274c';
        borderRadius = 2;
    } else if (theme === 'cosmic') {
        background = dimmed ? '#0a0516' : '#140924';
        borderRadius = 6;
    }

    const borderColor = dimmed ? '#475569' : powered ? '#fbbf24' : hex;
    const boxShadow = dimmed
        ? 'inset 2px 2px 0 rgba(255,255,255,0.08), inset -2px -2px 0 #000'
        : `inset 2px 2px 0 rgba(255,255,255,0.22), inset -2px -2px 0 #000, 0 0 10px rgba(${rgb}, 0.4), 0 3px 6px rgba(0,0,0,0.5)`;

    return { background, borderRadius, border: `2px solid ${borderColor}`, boxShadow };
}

function boxPad(input: BoxSpriteInput): number {
    return Math.max(0, Math.ceil(BODY_SIZE / 2 + outerPad(boxStyle(input).boxShadow) - NATIVE_CELL_SIZE / 2));
}

export const boxSprite: SpritePainter<BoxSpriteInput> = {
    key(input) {
        return `box|${input.theme}|${input.hex}|${input.dimmed ? 1 : 0}|${input.powered ? 1 : 0}`
            + `|${input.requiresPower ? 1 : 0}|${input.durability ?? '-'}|${input.colorDot ? 1 : 0}`;
    },

    size(input) {
        const pad = boxPad(input);
        return { w: NATIVE_CELL_SIZE + pad * 2, h: NATIVE_CELL_SIZE + pad * 2 };
    },

    draw(ctx, input) {
        const style = boxStyle(input);
        const pad = boxPad(input);
        const body: Box = { x: BODY_OFFSET, y: BODY_OFFSET, w: BODY_SIZE, h: BODY_SIZE };

        ctx.save();
        ctx.translate(pad, pad);
        paintBox(ctx, body, style);

        drawText(ctx, '▣', NATIVE_CELL_SIZE / 2, NATIVE_CELL_SIZE / 2, {
            size: SYMBOL_SIZE,
            color: input.dimmed ? '#475569' : input.hex,
            weight: 900,
            textShadow: input.dimmed ? undefined : `0 0 8px rgba(${input.rgb}, 0.85)`,
        });

        let cacheable = true;

        // Güç rozeti: sağ üstte `top: 3, right: 3`.
        if (input.requiresPower) {
            const color = input.powered ? '#fbbf24' : '#64748b';
            const icon = getIcon('lightning', BOLT_SIZE, color);
            if (!icon) {
                cacheable = false;
            } else {
                const x = BODY_OFFSET + BODY_SIZE - 3 - BOLT_SIZE;
                const y = BODY_OFFSET + 3;
                const blit = () => ctx.drawImage(icon, x, y, BOLT_SIZE, BOLT_SIZE);
                if (input.powered) outerGlow(ctx, blit, 'rgba(251,191,36,0.9)', 6);
                blit();
            }
        }

        // Dayanıklılık: sağ altta `bottom: 2, right: 4`, 12px monospace.
        if (input.durability !== null) {
            drawText(ctx, String(input.durability), BODY_OFFSET + BODY_SIZE - 4, BODY_OFFSET + BODY_SIZE - 2 - 6, {
                size: 12,
                color: input.dimmed ? '#64748b' : input.hex,
                weight: 900,
                family: MONO_STACK,
                textShadow: '0 0 4px rgba(0,0,0,0.9)',
                align: 'right',
            });
        }

        // Renk filtresi noktası: sol üstte `top: 3, left: 3`, 7px.
        if (input.colorDot) {
            const cx = BODY_OFFSET + 3 + 3.5;
            const dot = () => {
                ctx.beginPath();
                ctx.arc(cx, cx, 3.5, 0, Math.PI * 2);
                ctx.fill();
            };
            ctx.fillStyle = input.hex;
            outerGlow(ctx, dot, input.hex, 5);
            dot();
        }

        ctx.restore();
        return cacheable;
    },
};

/** Sahnedeki bir kutudan sprite girdisi — `BoxGraphic`'in başındaki okuma. */
export function boxInputOf(theme: GameTheme, entity: Entity): BoxSpriteInput {
    const { customData } = entity;
    const requiresPower = (customData.requiresPower as boolean) ?? false;
    const powered = entity.isElectrified;
    const durabilityEnabled = (customData.durabilityEnabled as boolean) ?? false;
    const colorFilterEnabled = (customData.colorFilterEnabled as boolean) ?? false;
    const colorFilterIndex = (customData.colorFilterIndex as number) ?? 0;
    const scheme = colorFilterEnabled ? getPlayerColor(colorFilterIndex) : null;

    return {
        theme,
        hex: scheme?.hex ?? DEFAULT_HEX,
        rgb: scheme?.rgb ?? DEFAULT_RGB,
        dimmed: requiresPower && !powered,
        powered,
        requiresPower,
        durability: durabilityEnabled ? ((customData.durability as number) ?? 3) : null,
        colorDot: colorFilterEnabled,
    };
}
