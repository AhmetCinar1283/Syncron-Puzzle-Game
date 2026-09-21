/**
 * DOSYA AMACI: "Şu katman şu ana kadar kirli kalsın" mekanizmasının sözleşmesini
 * kilitlemek: yalnızca istenen katmanlar tutulur, süre dolunca bırakılır, daha
 * kısa bir bitiş mevcut tutmayı kısaltmaz.
 */

import { describe, expect, it } from 'vitest';
import { createKeepAlive } from './keepAlive';

describe('createKeepAlive', () => {
    it('hiçbir şey tutulmadıkça hiçbir katman aktif değil', () => {
        const holds = createKeepAlive();
        for (const layer of ['static', 'ambient', 'actors'] as const) {
            expect(holds.active(layer, 0)).toBe(false);
        }
    });

    it('yalnızca istenen katmanı bitiş damgasına KADAR tutar', () => {
        const holds = createKeepAlive();
        holds.hold(['static'], 300);

        expect(holds.active('static', 0)).toBe(true);
        expect(holds.active('static', 299)).toBe(true);
        expect(holds.active('static', 300)).toBe(false);
        expect(holds.active('ambient', 0)).toBe(false);
        expect(holds.active('actors', 0)).toBe(false);
    });

    it('birden çok katmanı aynı anda tutabilir', () => {
        const holds = createKeepAlive();
        holds.hold(['static', 'ambient', 'actors'], 300);
        expect(holds.active('static', 100)).toBe(true);
        expect(holds.active('ambient', 100)).toBe(true);
        expect(holds.active('actors', 100)).toBe(true);
    });

    it('daha erken bir bitiş mevcut tutmayı KISALTMAZ, daha geç olan uzatır', () => {
        const holds = createKeepAlive();
        holds.hold(['static'], 600);
        holds.hold(['static'], 200);
        expect(holds.active('static', 500)).toBe(true);

        holds.hold(['static'], 900);
        expect(holds.active('static', 800)).toBe(true);
        expect(holds.active('static', 900)).toBe(false);
    });

    it('clear her şeyi bırakır', () => {
        const holds = createKeepAlive();
        holds.hold(['static', 'ambient', 'actors'], 1e9);
        holds.clear();
        expect(holds.active('static', 0)).toBe(false);
        expect(holds.active('ambient', 0)).toBe(false);
        expect(holds.active('actors', 0)).toBe(false);
    });
});
