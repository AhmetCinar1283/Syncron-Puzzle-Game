/**
 * DOSYA AMACI: `canUseCanvas2d`'nin — `BoardCanvas`'ın `GameBoard`'a düşme
 * kararının — `getContext('2d')` null döndüğünde (çok eski WebView, GPU sorunu)
 * ve fırlattığında doğru çalıştığını kanıtlamak (faz planı §2.4); ayrıca
 * `surfaceBytes`'ın tuval belleğini doğru topladığını (Faz 08 §2.5b) ve payın
 * katman özelliği olduğunu, katmanların yine de hizalı kaldığını (09-kapanis §2.1).
 */

import { describe, expect, it } from 'vitest';
import { BOARD_BLEED_BASE, boardBleedFor, canUseCanvas2d, layerBleed, layerGeometry, surfaceBytes, type Surfaces } from './surface';
import type { LayerName } from './types';

const docWith = (getContext: () => unknown) =>
    ({ createElement: () => ({ getContext }) }) as unknown as Pick<Document, 'createElement'>;

describe('canUseCanvas2d', () => {
    it('bağlam alınabiliyorsa true', () => {
        expect(canUseCanvas2d(docWith(() => ({})))).toBe(true);
    });

    it("getContext('2d') null dönerse false → GameBoard'a düşülür", () => {
        expect(canUseCanvas2d(docWith(() => null))).toBe(false);
    });

    it('getContext fırlatırsa çökmez, false döner', () => {
        expect(canUseCanvas2d(docWith(() => { throw new Error('GPU'); }))).toBe(false);
    });

    it('document yoksa (SSR) false', () => {
        expect(canUseCanvas2d(null)).toBe(false);
    });
});

const surfacesWith = (w: number, h: number, names: LayerName[] = ['static', 'ambient', 'actors']): Surfaces =>
    ({
        names,
        layers: Object.fromEntries(names.map(name => [name, { canvas: { width: w, height: h } }])),
    }) as unknown as Surfaces;

describe('surfaceBytes', () => {
    it('üç katmanın piksellerini toplar (4 bayt/piksel)', () => {
        expect(surfaceBytes(surfacesWith(100, 50))).toBe(100 * 50 * 4 * 3);
    });

    it('boş yüzeyde sıfır', () => {
        expect(surfaceBytes(surfacesWith(0, 0))).toBe(0);
    });

    it("kurulmamış katmanı saymaz (lite kademede `ambient` yok)", () => {
        expect(surfaceBytes(surfacesWith(100, 50, ['static', 'actors']))).toBe(100 * 50 * 4 * 2);
    });

    it("lite kademe full'den daha az tuval belleği ister", () => {
        // 512x512 tahta, DPR 2: tuval kenarı (512 + 2*pay) * 2.
        const bytesFor = (bleed: number) => {
            const side = (512 + bleed * 2) * 2;
            return surfaceBytes(surfacesWith(side, side));
        };
        expect(bytesFor(boardBleedFor('lite'))).toBeLessThan(bytesFor(boardBleedFor('full')));
    });
});

describe('katman başına pay (09-kapanis §2.1)', () => {
    it("static ve ambient 32, actors kademenin payı", () => {
        for (const tier of ['lite', 'full'] as const) {
            const actors = boardBleedFor(tier);
            expect(layerBleed('static', actors)).toBe(BOARD_BLEED_BASE);
            expect(layerBleed('ambient', actors)).toBe(BOARD_BLEED_BASE);
            expect(layerBleed('actors', actors)).toBe(actors);
        }
        expect(BOARD_BLEED_BASE).toBe(32);
    });

    it("üç katmanda tahtanın (0,0)'ı aynı ekran noktasına düşer", () => {
        for (const dpr of [1, 1.5, 2]) {
            for (const tier of ['lite', 'full'] as const) {
                const geos = (['static', 'ambient', 'actors'] as const)
                    .map(name => layerGeometry(name, 512, 384, dpr, boardBleedFor(tier)));
                for (const g of geos) {
                    // CSS konumu + dönüşüm kaydırması (CSS pikseline çevrilmiş) = tahta (0,0).
                    expect(g.left + g.tx / dpr).toBe(0);
                    expect(g.top + g.ty / dpr).toBe(0);
                    // Tuval tahtayı her yönde kendi payıyla sarar.
                    expect(g.fullW).toBe(512 + g.bleed * 2);
                    expect(g.fullH).toBe(384 + g.bleed * 2);
                }
            }
        }
    });

    it("static/ambient actors'tan küçük tuval ister", () => {
        const s = layerGeometry('static', 512, 512, 2, boardBleedFor('full'));
        const a = layerGeometry('actors', 512, 512, 2, boardBleedFor('full'));
        expect(s.pxW).toBeLessThan(a.pxW);
    });
});
