/**
 * DOSYA AMACI: `obstacle` (engel bloğu) hücresinin canvas rasterleyicisi —
 * beş `styleType`'ın hepsi.
 *
 * Kaynak: `components/cells/obstacleCellRenderer.tsx`. DİKKAT: o dosya
 * `themeConfig.obstacleCell`'i HİÇ okumaz, her temanın değerlerini kendi içinde
 * sabit yazar (ve bu değerler `themeConfig`'tekilerden farklıdır). 00-ilkeler
 * §4 "kaynak DOM dosyasındaki değer okunup birebir taşınır" dediği için burası
 * da DOM dosyasını izler; `themeConfig.obstacleCell` kullanılmaz.
 * Bu tutarsızlık kapsam dışı, raporlara not edildi.
 *
 * Yapı her temada aynı: 64x64 dış blok → 44x44 iç blok → ortadaki küçük işaret.
 * Tüm div'ler `box-sizing: border-box` (Tailwind preflight), bu yüzden 44x44
 * kutu kenarını İÇİNE alır ve ortalanmış konumu tam (10,10)'dur.
 */

import type { GameTheme } from '../../themes/themeConfig';
import type { CellPaintInput, SpritePainter } from '../types';
import { NATIVE_CELL_SIZE } from '../types';
import { paintBox } from '../paintTokens';
import type { Box } from '../paintTokens';

interface BoxStyle {
    box: Box;
    background?: string;
    border?: string;
    boxShadow?: string;
    borderRadius?: string | number;
}

interface ObstacleStyle {
    /** Dış bloğun taşan parlaması için sprite kenarına eklenen boşluk. */
    pad: number;
    layers: BoxStyle[];
    /** Kutularla anlatılamayan süs (blueprint'in CAD artısı). */
    extra?: (ctx: CanvasRenderingContext2D) => void;
}

const OUTER: Box = { x: 0, y: 0, w: NATIVE_CELL_SIZE, h: NATIVE_CELL_SIZE };
const INNER: Box = { x: 10, y: 10, w: 44, h: 44 };
const MARK_24: Box = { x: 20, y: 20, w: 24, h: 24 };
const MARK_22: Box = { x: 21, y: 21, w: 22, h: 22 };
const MARK_16: Box = { x: 24, y: 24, w: 16, h: 16 };

const STYLES: Record<GameTheme, ObstacleStyle> = {
    // 1. Classic Retro — tactile navy/steel beveled block
    legacy: {
        pad: 0,
        layers: [
            { box: OUTER, background: '#162338', border: '2px solid #293f61', boxShadow: 'inset 2px 2px 0 rgba(147, 197, 253, 0.25), inset -2px -2px 0 #070d17' },
            { box: INNER, background: '#1f3350', border: '1px solid #142236', boxShadow: 'inset 2px 2px 0 rgba(147, 197, 253, 0.2), inset -2px -2px 0 #0d1624' },
            { box: MARK_24, border: '1px solid rgba(147, 197, 253, 0.15)' },
        ],
    },

    // 2. Retro Arcade — stepped 8-bit pixel brick
    arcade: {
        pad: 0,
        layers: [
            { box: OUTER, background: '#18181b', border: '2px solid #52525b', boxShadow: 'inset 2px 2px 0 #71717a, inset -2px -2px 0 #09090b' },
            { box: INNER, background: '#27272a', border: '2px solid #3f3f46', boxShadow: 'inset 2px 2px 0 #52525b, inset -2px -2px 0 #18181b' },
            { box: MARK_16, background: '#18181b', boxShadow: 'inset 1px 1px 0 #000, 1px 1px 0 #52525b' },
        ],
    },

    // 3. Neon Cyber — beveled block with a neon rim; tek taşan parlama burada
    neon: {
        pad: 10,
        layers: [
            { box: OUTER, background: '#091322', border: '2px solid rgba(0, 255, 136, 0.4)', boxShadow: 'inset 2px 2px 0 rgba(0, 255, 136, 0.4), inset -2px -2px 0 #02060e, 0 0 10px rgba(0, 255, 136, 0.15)', borderRadius: '4px' },
            { box: INNER, background: '#0e1d33', border: '1.5px solid rgba(0, 255, 136, 0.3)', boxShadow: 'inset 2px 2px 0 rgba(0, 255, 136, 0.35), inset -2px -2px 0 #050b14', borderRadius: '2px' },
            { box: MARK_22, border: '1px solid rgba(0, 255, 136, 0.35)', boxShadow: 'inset 0 0 6px rgba(0, 255, 136, 0.15)' },
        ],
    },

    // 4. Blueprint Draft — CAD drafting block with a cross hairline
    blueprint: {
        pad: 0,
        layers: [
            { box: OUTER, background: '#0a2346', border: '2px solid #38bdf8', boxShadow: 'inset 2px 2px 0 rgba(125, 211, 252, 0.5), inset -2px -2px 0 #030d1a', borderRadius: '2px' },
            { box: INNER, background: '#0f3261', border: '1.5px solid #0284c7', boxShadow: 'inset 2px 2px 0 rgba(56, 189, 248, 0.5), inset -2px -2px 0 #061933' },
        ],
        // Artının konumu iç bloğun PADDING kutusuna göredir (mutlak konumlanmış
        // çocuklar kenarın içinden başlar): 10 + 1.5 = 11.5 orijin, 41x41 alan.
        extra: (ctx) => {
            ctx.fillStyle = 'rgba(125, 211, 252, 0.6)';
            ctx.fillRect(11.5 + 12, 11.5 + 21, 41 - 24, 1.5);
            ctx.fillRect(11.5 + 21, 11.5 + 12, 1.5, 41 - 24);
        },
    },

    // 5. Cosmic Void — obsidian monolith
    cosmic: {
        pad: 0,
        layers: [
            { box: OUTER, background: '#0d071b', border: '2px solid rgba(167, 139, 250, 0.45)', boxShadow: 'inset 2px 2px 0 rgba(196, 181, 253, 0.35), inset -2px -2px 0 #04010a', borderRadius: '4px' },
            { box: INNER, background: '#160b2b', border: '1.5px solid rgba(139, 92, 246, 0.35)', boxShadow: 'inset 2px 2px 0 rgba(167, 139, 250, 0.4), inset -2px -2px 0 #070310', borderRadius: '2px' },
            { box: MARK_22, background: 'radial-gradient(circle, #241144 0%, #120624 100%)', border: '1px solid rgba(196, 181, 253, 0.2)' },
        ],
    },
};

function styleFor(theme: GameTheme): ObstacleStyle {
    return STYLES[theme] ?? STYLES.cosmic;
}

export const obstacleCellSprite: SpritePainter<CellPaintInput> = {
    key: ({ theme }) => `obstacle|${theme}`,

    size: ({ theme }) => {
        const pad = styleFor(theme).pad;
        return { w: NATIVE_CELL_SIZE + pad * 2, h: NATIVE_CELL_SIZE + pad * 2 };
    },

    draw: (ctx, { theme }) => {
        const style = styleFor(theme);
        ctx.save();
        // Sprite hücreye ORTALI blit edilir (bkz. cells/index.ts); taşan parlama
        // için eklenen boşluk burada bir kez telafi edilir.
        ctx.translate(style.pad, style.pad);
        for (const layer of style.layers) paintBox(ctx, layer.box, layer);
        style.extra?.(ctx);
        ctx.restore();
    },
};
