/**
 * DOSYA AMACI: Overlay sprite anahtarlarının 00-ilkeler §3.1 sözleşmesine
 * uyduğunu (aynı görüntü → aynı anahtar, farklı görüntü → farklı anahtar,
 * `cell.id`/konum/ilgisiz `customData` GİRMEZ) ve saf zaman/yerleşim
 * fonksiyonlarının doğruluğunu kanıtlamak. Tuvale çizim testi yok (00-ilkeler §6.1).
 */

import { describe, expect, it } from 'vitest';
import { cableNodeSprite, cableStripSprite } from './cables';
import { edgeFlowSprite, edgeGlowSprite } from './edgeStrips';
import type { EdgeStripInput } from './edgeStrips';
import { edgeLabelSprite } from './edgeLabels';
import { portalGlowSprite } from './portalPaths';
import { trailArmSprite, trailNodeSprite } from './trails';
import { edgeLabelCenter, edgeStripRect, paddingBox } from './geometry';
import {
    CRAWL_DISTANCE, EDGE_TIMING, PORTAL_CRAWL_MS, crawlDashOffset, edgeFlowFraction,
    edgePulseOpacity, labelBreath, portalSpinAngle,
} from './timing';

describe('trail sprite anahtarları', () => {
    it('yalnızca oyuncu ve yöne bağlıdır', () => {
        expect(trailArmSprite.key({ playerIndex: 1, dir: 'left' })).toBe('trail|1|left');
        expect(trailNodeSprite.key({ playerIndex: 1 })).toBe('trailnode|1');
    });

    it('farklı oyuncu veya yön için farklıdır', () => {
        const keys = new Set([
            trailArmSprite.key({ playerIndex: 0, dir: 'left' }),
            trailArmSprite.key({ playerIndex: 1, dir: 'left' }),
            trailArmSprite.key({ playerIndex: 0, dir: 'up' }),
        ]);
        expect(keys.size).toBe(3);
    });

    it('fazladan alanları (hücre kimliği, konum) yok sayar', () => {
        const noisy = { playerIndex: 2, dir: 'down', cellId: 'c-9', row: 4, col: 7 } as never;
        expect(trailArmSprite.key(noisy)).toBe(trailArmSprite.key({ playerIndex: 2, dir: 'down' }));
    });
});

describe('cable sprite anahtarları', () => {
    it('üç sabit anahtar', () => {
        expect(cableStripSprite.key({ axis: 'h' })).toBe('cable|h');
        expect(cableStripSprite.key({ axis: 'v' })).toBe('cable|v');
        expect(cableNodeSprite.key({})).toBe('cablenode');
    });
});

describe('kenar sprite anahtarları', () => {
    const lava: EdgeStripInput = { kind: 'lava', horizontal: true, length: 320 };

    it('gradient ve parlama ayrı anahtarlar alır', () => {
        expect(edgeFlowSprite.key(lava)).not.toBe(edgeGlowSprite.key(lava));
    });

    it('tür, eksen ve uzunluğa bağlıdır', () => {
        const keys = new Set([
            edgeFlowSprite.key(lava),
            edgeFlowSprite.key({ ...lava, kind: 'portal' }),
            edgeFlowSprite.key({ ...lava, horizontal: false }),
            edgeFlowSprite.key({ ...lava, length: 384 }),
        ]);
        expect(keys.size).toBe(4);
    });

    it('aynı girdi aynı anahtarı verir', () => {
        expect(edgeFlowSprite.key({ ...lava })).toBe(edgeFlowSprite.key(lava));
    });

    it('etiket anahtarı yalnızca türe bağlıdır', () => {
        expect(edgeLabelSprite.key({ kind: 'lava' })).toBe('edgelabel|lava');
        expect(edgeLabelSprite.key({ kind: 'portal' })).toBe('edgelabel|portal');
    });
});

describe('portal yolu anahtarı', () => {
    const bounds = { minX: 0, minY: 0, maxX: 10, maxY: 10 };

    it('yolun şekline (d) bağlıdır — aynı bağlantı adı, farklı yerleşim', () => {
        const a = portalGlowSprite.key({ key: 'main:right--r2:left', d: 'M 0 0 L 10 0', bounds });
        const b = portalGlowSprite.key({ key: 'main:right--r2:left', d: 'M 0 0 L 20 0', bounds });
        expect(a).not.toBe(b);
    });

    it('sınırlar anahtara girmez (d onları zaten belirler)', () => {
        const d = 'M 0 0 L 10 0';
        const wide = { minX: 0, minY: 0, maxX: 99, maxY: 99 };
        expect(portalGlowSprite.key({ key: 'k', d, bounds })).toBe(portalGlowSprite.key({ key: 'k', d, bounds: wide }));
    });
});

describe('yerleşim', () => {
    const room = { left: 100, top: 50, width: 320, height: 192 };
    const pb = paddingBox(room, 2);

    it('padding box kenarlığı düşer', () => {
        expect(pb).toEqual({ left: 102, top: 52, right: 418, bottom: 240, width: 316, height: 188 });
    });

    it('şeritler padding box kenarlarına oturur, 4px kalınlığındadır', () => {
        expect(edgeStripRect('top', pb)).toEqual({ x: 102, y: 52, length: 316, horizontal: true });
        expect(edgeStripRect('bottom', pb)).toEqual({ x: 102, y: 236, length: 316, horizontal: true });
        expect(edgeStripRect('left', pb)).toEqual({ x: 102, y: 52, length: 188, horizontal: false });
        expect(edgeStripRect('right', pb)).toEqual({ x: 414, y: 52, length: 188, horizontal: false });
    });

    it('etiketler kenarın 28px dışında, kenar boyunca ortalı', () => {
        // 24px'lik dairenin dış kenarı -28, yani merkezi -16.
        expect(edgeLabelCenter('top', pb)).toEqual({ x: 260, y: 36 });
        expect(edgeLabelCenter('bottom', pb)).toEqual({ x: 260, y: 256 });
        expect(edgeLabelCenter('left', pb)).toEqual({ x: 86, y: 146 });
        expect(edgeLabelCenter('right', pb)).toEqual({ x: 434, y: 146 });
    });
});

describe('zaman fonksiyonları', () => {
    const { lava, portal } = EDGE_TIMING;

    it('kenar nabzı 0.85 ile 1 arasında salınır', () => {
        expect(edgePulseOpacity(0, lava.pulseMs)).toBeCloseTo(0.85, 6);
        expect(edgePulseOpacity(lava.pulseMs / 2, lava.pulseMs)).toBeCloseTo(1, 6);
        expect(edgePulseOpacity(lava.pulseMs, lava.pulseMs)).toBeCloseTo(0.85, 6);
    });

    it('akış üçgen dalgadır: 0 → 1 → 0, doğrusal', () => {
        expect(edgeFlowFraction(0, lava.flowMs)).toBe(0);
        expect(edgeFlowFraction(lava.flowMs / 4, lava.flowMs)).toBeCloseTo(0.5, 6);
        expect(edgeFlowFraction(lava.flowMs / 2, lava.flowMs)).toBeCloseTo(1, 6);
        expect(edgeFlowFraction((lava.flowMs * 3) / 4, lava.flowMs)).toBeCloseTo(0.5, 6);
        expect(edgeFlowFraction(portal.flowMs, portal.flowMs)).toBe(0);
    });

    it('etiket nefesi ölçek 1..1.15, opaklık 0.82..1', () => {
        const start = labelBreath(0);
        const peak = labelBreath(1250);
        expect(start.scale).toBeCloseTo(1, 6);
        expect(start.opacity).toBeCloseTo(0.82, 6);
        expect(peak.scale).toBeCloseTo(1.15, 6);
        expect(peak.opacity).toBeCloseTo(1, 6);
    });

    it('portal ikonu 6 sn\'de bir tam tur döner', () => {
        expect(portalSpinAngle(0)).toBe(0);
        expect(portalSpinAngle(3000)).toBeCloseTo(Math.PI, 6);
        expect(portalSpinAngle(6000)).toBe(0);
    });

    it('kesikli çizgi -20\'ye doğru akar, periyotta başa döner', () => {
        expect(crawlDashOffset(0)).toBeCloseTo(0, 9);
        expect(crawlDashOffset(PORTAL_CRAWL_MS / 2)).toBeCloseTo(-CRAWL_DISTANCE / 2, 6);
        expect(crawlDashOffset(PORTAL_CRAWL_MS)).toBeCloseTo(0, 9);
    });
});
