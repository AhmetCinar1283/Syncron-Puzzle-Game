/**
 * DOSYA AMACI: Trambolinin üç sprite'ının (tam, gövde, yay) anahtar sözleşmesini
 * kilitlemek. Ezilme sırasında gövde ve yay AYRI blit edilir (Faz 10 §2.3);
 * anahtarları çakışırsa biri diğerinin yerine döner.
 *
 * Tuvale çizim testi yok (00-ilkeler §6.1).
 */

import { describe, expect, it } from 'vitest';
import type { Cell } from '../../logic/cellTypes';
import type { CellPaintInput } from '../types';
import { trampolineBodySprite, trampolineCellSprite, trampolineSpringSprite } from './trampoline';

function input(theme: CellPaintInput['theme'], isActive: boolean, direction = 'up'): CellPaintInput {
    return {
        cell: { type: 'trampoline', customData: { direction } } as unknown as Cell,
        theme,
        isOccupied: false,
        isActive,
        phase: 0,
    };
}

describe('trambolin sprite anahtarları', () => {
    it('üç sprite aynı girdide birbirinden farklı anahtar üretir', () => {
        const i = input('neon', true);
        const keys = new Set([trampolineCellSprite.key(i), trampolineBodySprite.key(i), trampolineSpringSprite.key(i)]);
        expect(keys.size).toBe(3);
    });

    it('tam sprite\'ın anahtarı değişmedi (dev-cell-compare ve keys.test.ts buna dayanıyor)', () => {
        expect(trampolineCellSprite.key(input('neon', true, 'left'))).toBe('trampoline|neon|act1|l');
        expect(trampolineCellSprite.key(input('legacy', true))).toBe('trampoline|legacy|u');
    });

    it('yay ve gövde hem etkinliğe hem yöne duyarlı; legacy etkinliğe duyarsız', () => {
        for (const sprite of [trampolineBodySprite, trampolineSpringSprite]) {
            expect(sprite.key(input('neon', false))).not.toBe(sprite.key(input('neon', true)));
            expect(sprite.key(input('neon', false, 'up'))).not.toBe(sprite.key(input('neon', false, 'right')));
            expect(sprite.key(input('legacy', false))).toBe(sprite.key(input('legacy', true)));
        }
    });

    it('yay sprite\'ı 64×64 (parlama kutuya kırpılı), gövde ve tam sprite aynı boyutta', () => {
        const i = input('neon', true);
        expect(trampolineSpringSprite.size(i)).toEqual({ w: 64, h: 64 });
        expect(trampolineBodySprite.size(i)).toEqual(trampolineCellSprite.size(i));
    });
});
