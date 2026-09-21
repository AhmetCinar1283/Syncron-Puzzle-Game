/**
 * DOSYA AMACI: Çapraz geçiş durumunun (`fades.ts`) saf davranışını kilitlemek —
 * geçişin ne zaman başladığı, süresi, easing'i, `snap` ve `KeepAlive` kaydı;
 * oda opaklığının 1 ↔ 0.4 geçişi.
 *
 * Tuvale çizim testi yok (00-ilkeler §6.1).
 */

import { describe, expect, it } from 'vitest';
import type { CellPaintInput } from './types';
import { ROOM_FADE_MS, UNCONTROLLED_ALPHA, createFades, roomAlphaOf } from './fades';
import { createKeepAlive } from './keepAlive';
import { EASE_CSS } from './motion';

const input = (label: string): CellPaintInput => ({ label }) as unknown as CellPaintInput;

function setup() {
    const holds = createKeepAlive();
    return { holds, fades: createFades(holds) };
}

describe('createFades — hücre', () => {
    it('ilk gözlem ve aynı hâl geçiş başlatmaz', () => {
        const { fades, holds } = setup();
        expect(fades.observeCell('a', 'empty', input('empty'), 0, 200, false)).toBe(false);
        expect(fades.observeCell('a', 'empty', input('empty'), 50, 200, false)).toBe(false);
        expect(fades.frame(60).cell('a')).toBeNull();
        expect(holds.active('static', 60)).toBe(false);
    });

    it('hâl değişince geçiş başlar; eski girdi ve ilerleme okunur', () => {
        const { fades } = setup();
        fades.observeCell('a', 'empty', input('empty'), 0, 200, false);
        expect(fades.observeCell('a', 'full', input('full'), 1000, 200, false)).toBe(true);

        const start = fades.frame(1000).cell('a');
        expect(start).toMatchObject({ e: 0, elapsedMs: 0 });
        expect(start?.from).toEqual(input('empty'));

        const mid = fades.frame(1100).cell('a');
        expect(mid?.elapsedMs).toBe(100);
        expect(mid?.e).toBeCloseTo(EASE_CSS(0.5), 10);

        // Süre dolunca geçiş biter: çizim doğrudan yeni hâle döner.
        expect(fades.frame(1200).cell('a')).toBeNull();
    });

    it('geçiş başlayınca varsayılan olarak static ve ambient bitişe kadar tutulur', () => {
        const { fades, holds } = setup();
        fades.observeCell('a', 'empty', input('empty'), 0, 600, false);
        fades.observeCell('a', 'full', input('full'), 1000, 600, false);

        expect(holds.active('static', 1599)).toBe(true);
        expect(holds.active('ambient', 1599)).toBe(true);
        expect(holds.active('static', 1600)).toBe(false);
        expect(holds.active('actors', 1100)).toBe(false);
    });

    it('`layers` verilirse yalnızca onları tutar (trambolin ezilmesi: static)', () => {
        const { fades, holds } = setup();
        fades.observeCell('t', 'act0', input('act0'), 0, 500, false, ['static']);
        fades.observeCell('t', 'act1', input('act1'), 100, 500, false, ['static']);
        expect(holds.active('static', 200)).toBe(true);
        expect(holds.active('ambient', 200)).toBe(false);
    });

    it('snap (yeni tur, tema değişimi) hâli yazar ama geçiş başlatmaz', () => {
        const { fades, holds } = setup();
        fades.observeCell('a', 'empty', input('empty'), 0, 200, false);
        expect(fades.observeCell('a', 'full', input('full'), 100, 200, true)).toBe(false);
        expect(fades.frame(110).cell('a')).toBeNull();
        expect(holds.active('static', 110)).toBe(false);

        // Snap hâli yazdı: aynı hâl tekrar gözlenirse geçiş yok.
        expect(fades.observeCell('a', 'full', input('full'), 120, 200, false)).toBe(false);
    });

    it('süre 0 ise (ör. trambolin SÖNERKEN) geçiş ve tutma yok', () => {
        const { fades, holds } = setup();
        fades.observeCell('t', 'act1', input('act1'), 0, 500, false);
        expect(fades.observeCell('t', 'act0', input('act0'), 600, 0, false)).toBe(false);
        expect(fades.frame(610).cell('t')).toBeNull();
        expect(holds.active('static', 610)).toBe(false);
    });

    it('negatif geçen süre (RAF damgası geriden gelir) 0\'a kenetlenir', () => {
        const { fades } = setup();
        fades.observeCell('a', 'x', input('x'), 0, 200, false);
        fades.observeCell('a', 'y', input('y'), 1000, 200, false);
        expect(fades.frame(990).cell('a')).toMatchObject({ e: 0, elapsedMs: 0 });
    });

    it('clear her şeyi unutur', () => {
        const { fades } = setup();
        fades.observeCell('a', 'x', input('x'), 0, 200, false);
        fades.observeCell('a', 'y', input('y'), 10, 200, false);
        fades.clear();
        expect(fades.frame(20).cell('a')).toBeNull();
        expect(fades.observeCell('a', 'z', input('z'), 30, 200, false)).toBe(false);
    });
});

describe('createFades — oda', () => {
    it('kontrol edilen → edilmeyen: opaklık 1\'den 0.4\'e CSS ease ile iner', () => {
        const { fades, holds } = setup();
        fades.observeRoom('main', true, 0, false);
        expect(fades.observeRoom('main', false, 1000, false)).toBe(true);

        expect(fades.frame(1000).roomAlpha('main', false)).toBeCloseTo(1, 10);
        const mid = fades.frame(1000 + ROOM_FADE_MS / 2).roomAlpha('main', false);
        expect(mid).toBeCloseTo(1 + (UNCONTROLLED_ALPHA - 1) * EASE_CSS(0.5), 10);
        expect(fades.frame(1000 + ROOM_FADE_MS).roomAlpha('main', false)).toBe(UNCONTROLLED_ALPHA);

        expect(holds.active('static', 1000 + ROOM_FADE_MS - 1)).toBe(true);
        expect(holds.active('static', 1000 + ROOM_FADE_MS)).toBe(false);
    });

    it('edilmeyen → edilen: opaklık 0.4\'ten 1\'e çıkar; çerçevenin eski hâli okunur', () => {
        const { fades } = setup();
        fades.observeRoom('main', false, 0, false);
        fades.observeRoom('main', true, 500, false);

        expect(fades.frame(500).roomAlpha('main', true)).toBeCloseTo(UNCONTROLLED_ALPHA, 10);
        expect(fades.frame(500).roomFade('main')).toEqual({ fromControlled: false, e: 0 });
        expect(fades.frame(500 + ROOM_FADE_MS).roomFade('main')).toBeNull();
    });

    it('ROOM_FADE_MS GameBoard\'daki transition: opacity 0.25s ile aynı', () => {
        expect(ROOM_FADE_MS).toBe(250);
    });

    it('snap geçiş başlatmaz; her odanın durumu ayrı tutulur', () => {
        const { fades } = setup();
        fades.observeRoom('a', true, 0, false);
        fades.observeRoom('b', true, 0, false);
        expect(fades.observeRoom('a', false, 10, true)).toBe(false);
        expect(fades.observeRoom('b', false, 10, false)).toBe(true);
        expect(fades.frame(10).roomFade('a')).toBeNull();
        expect(fades.frame(10).roomFade('b')).not.toBeNull();
    });
});

describe('roomAlphaOf', () => {
    it('geçiş bilgisi yoksa 1 / 0.4', () => {
        expect(roomAlphaOf(null, 'main', true)).toBe(1);
        expect(roomAlphaOf(null, 'main', false)).toBe(UNCONTROLLED_ALPHA);
    });
});
