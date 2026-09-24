import { describe, expect, it } from 'vitest';
import type { Entity } from '../logic/entityTypes';
import { reactionsBetween, sleepyCandidates } from './reactions';
import { EMOTES } from './emotes';

function player(id: number, customData: Record<string, unknown> = {}, type: Entity['type'] = 'player'): Entity {
    return { id, type, customData } as unknown as Entity;
}

describe('reactionsBetween', () => {
    it('yeni turda (önceki yok) tepki vermez', () => {
        expect(reactionsBetween(null, [player(1, { isVictory: true })])).toEqual([]);
    });

    it('duvara çarpma → ouch, itilemeyen kutu → nervous, çarpışma → confused, konveyör → tepkisiz', () => {
        const prev = [player(1), player(2), player(3), player(4)];
        const next = [
            player(1, { bumpDirection: 'up', bumpReason: 'wall' }),
            player(2, { bumpDirection: 'up', bumpReason: 'blocked_push' }),
            player(3, { bumpDirection: 'up', bumpReason: 'collision' }),
            player(4, { bumpDirection: 'up', bumpReason: 'conveyor' }),
        ];
        expect(reactionsBetween(prev, next).map(r => [r.id, r.emote])).toEqual([[1, 'ouch'], [2, 'nervous'], [3, 'confused']]);
    });

    it('zafer ve ölüm yalnızca ilk karede, zorla tetiklenir', () => {
        const idle = [player(1), player(2)];
        const ended = [player(1, { isVictory: true }), player(2, { deathReason: 'trail' })];
        const rs = reactionsBetween(idle, ended);
        expect(rs).toEqual([
            { id: 1, emote: 'celebrate', force: true },
            { id: 2, emote: 'dizzy', force: true },
        ]);
        expect(reactionsBetween(ended, ended)).toEqual([]);
    });

    it('zafer, aynı karedeki hedefe varıştan önce gelir', () => {
        const rs = reactionsBetween([player(1)], [player(1, { isVictory: true, isLocked: true })]);
        expect(rs.map(r => r.emote)).toEqual(['celebrate']);
    });

    it('hedefe varış → happy, mod değişimi → surprised, değişmeyen durum tepkisiz', () => {
        expect(reactionsBetween([player(1)], [player(1, { isLocked: true })]).map(r => r.emote)).toEqual(['happy']);
        expect(reactionsBetween([player(1, { mode: 'normal' })], [player(1, { mode: 'reversed' })]).map(r => r.emote)).toEqual(['surprised']);
        expect(reactionsBetween([player(1, { mode: 'normal', isLocked: true })], [player(1, { mode: 'normal', isLocked: true })])).toEqual([]);
    });

    it('oyuncu olmayan varlıklara ve önceki karede olmayanlara tepki vermez', () => {
        expect(reactionsBetween([player(1)], [player(9, { bumpDirection: 'up' }, 'box')])).toEqual([]);
        // Önceki karede yoksa mod karşılaştırılamaz → surprised yok.
        expect(reactionsBetween([player(1)], [player(2, { mode: 'reversed' })])).toEqual([]);
    });

    it('her tepkinin ifadesi katalogda var', () => {
        const all = [
            player(1, { bumpDirection: 'u', bumpReason: 'wall' }),
            player(2, { bumpDirection: 'u', bumpReason: 'blocked_push' }),
            player(3, { bumpDirection: 'u', bumpReason: 'collision' }),
        ];
        for (const r of reactionsBetween([player(1), player(2), player(3)], all)) expect(EMOTES[r.emote]).toBeDefined();
    });
});

describe('sleepyCandidates', () => {
    it('kilitli, ölü ve kazanmış oyuncuları ve kutuları dışarıda bırakır', () => {
        const ids = sleepyCandidates([
            player(1),
            player(2, { isLocked: true }),
            player(3, { deathReason: 'trail' }),
            player(4, { isVictory: true }),
            player(5, {}, 'box'),
        ]);
        expect(ids).toEqual([1]);
    });
});
