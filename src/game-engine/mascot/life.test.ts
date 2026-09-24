import { describe, expect, it } from 'vitest';
import type { Entity } from '../logic/entityTypes';
import type { RoomState } from '../logic/types';
import { createMascotController } from './controller';
import { createLife, LIFE, maxSleepers, targetGlance } from './life';

function rng(seed: number) {
    let s = seed;
    return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
}

function player(id: number, row: number, col: number, extra: Record<string, unknown> = {}): Entity {
    return { id, type: 'player', position: { roomId: 'main', row, col }, customData: { playerIndex: 0, ...extra } } as unknown as Entity;
}

function room(targets: { row: number; col: number; playerIndex?: number }[]): Record<string, RoomState> {
    const grid = Array.from({ length: 6 }, (_, row) => Array.from({ length: 6 }, (_, col) => {
        const t = targets.find(x => x.row === row && x.col === col);
        return { type: t ? 'target' : 'normal', position: { row, col }, customData: { playerIndex: t?.playerIndex ?? 0 } };
    }));
    return { main: { id: 'main', grid } } as unknown as Record<string, RoomState>;
}

const players = (n: number) => Array.from({ length: n }, (_, i) => player(i + 1, 0, i));

describe('targetGlance', () => {
    it('baskın eksene göre yön verir, yakınlığı bildirir', () => {
        const rooms = room([{ row: 0, col: 5 }]);
        expect(targetGlance(player(1, 0, 1), rooms)).toEqual({ emote: 'lookRight', near: false });
        expect(targetGlance(player(1, 4, 5), rooms)).toEqual({ emote: 'lookUp', near: false });
        expect(targetGlance(player(1, 1, 5), rooms)).toEqual({ emote: 'lookUp', near: true });
    });
    it('başka renkteki hedefe, üstünde durulan hedefe ve hedefsizliğe bakmaz', () => {
        expect(targetGlance(player(1, 0, 1), room([{ row: 0, col: 5, playerIndex: 2 }]))).toBeNull();
        expect(targetGlance(player(1, 0, 5), room([{ row: 0, col: 5 }]))).toBeNull();
        expect(targetGlance(player(1, 0, 1), room([]))).toBeNull();
    });
});

describe('createLife', () => {
    it('tur açılışında herkes uyumaz: uyuyan sayısı sınırı aşmaz', () => {
        for (let seed = 1; seed <= 40; seed++) {
            const ctl = createMascotController();
            const ents = players(6);
            createLife(ctl, rng(seed)).start({ entities: ents, rooms: room([]) }, 0);
            const asleep = ents.filter(e => ctl.active(e.id, 1)?.name === 'sleepy').length;
            expect(asleep).toBeLessThanOrEqual(maxSleepers(6));
        }
    });

    it('bazı turlar uykuyla başlar, bazıları başlamaz', () => {
        let some = 0;
        for (let seed = 1; seed <= 40; seed++) {
            const ctl = createMascotController();
            createLife(ctl, rng(seed)).start({ entities: players(2), rooms: room([]) }, 0);
            if (ctl.animating(1)) some++;
        }
        expect(some).toBeGreaterThan(5);
        expect(some).toBeLessThan(40);
    });

    it('uyuyanı hamle uyandırır: happy; tepkisi olan varsa uyku kesilir', () => {
        const ctl = createMascotController();
        const life = createLife(ctl, () => 0.01);          // herkes uyuyarak başlamak ister
        const ents = players(1);
        life.start({ entities: ents, rooms: room([]) }, 0);
        expect(ctl.active(1, 10)?.name).toBe('sleepy');
        life.wake({ entities: ents, rooms: room([]) }, 100, new Set());
        expect(ctl.active(1, 110)?.name).toBe('happy');

        const ctl2 = createMascotController();
        const life2 = createLife(ctl2, () => 0.01);
        life2.start({ entities: ents, rooms: room([]) }, 0);
        life2.wake({ entities: ents, rooms: room([]) }, 100, new Set([1]));
        expect(ctl2.active(1, 110)).toBeNull();
    });

    it('boşta zamanla uyuyakalır, sonra kendiliğinden uyanır (happy)', () => {
        const ctl = createMascotController();
        const life = createLife(ctl, rng(7));
        const ents = players(1);
        const ctx = { entities: ents, rooms: room([]) };
        life.start(ctx, 0);
        let slept = false; let woke = false;
        for (let t = 0; t < 120_000; t += 400) {
            life.step(ctx, t);
            const name = ctl.active(1, t)?.name;
            if (name === 'sleepy') slept = true;
            if (slept && name === 'happy') woke = true;
        }
        expect(slept).toBe(true);
        expect(woke).toBe(true);
    });

    it('iki oyuncu aynı anda uykuya dalmaz (en az boşluk) ve hep uyumazlar', () => {
        const ctl = createMascotController();
        const life = createLife(ctl, rng(3));
        const ents = players(4);
        const ctx = { entities: ents, rooms: room([]) };
        life.start(ctx, 0);
        const startedAt = new Map<number, number>();
        let sleepingSteps = 0; let steps = 0;
        for (let t = 0; t < 200_000; t += 400) {
            life.step(ctx, t);
            for (const e of ents) {
                const a = ctl.active(e.id, t);
                if (a?.name === 'sleepy') startedAt.set(e.id, a.startedAt);
            }
            steps++;
            if (ents.every(e => ctl.active(e.id, t)?.name === 'sleepy')) sleepingSteps++;
        }
        const starts = [...startedAt.values()];
        expect(starts.length).toBeGreaterThan(0);
        expect(sleepingSteps).toBe(0);
        expect(steps).toBeGreaterThan(0);
        expect(LIFE.minNapGapMs).toBeGreaterThan(0);
    });

    it('uyumayanlar zamanla farklı ifadeler oynatır', () => {
        const ctl = createMascotController();
        const life = createLife(ctl, rng(11));
        const ents = [player(1, 0, 0)];
        const ctx = { entities: ents, rooms: room([{ row: 0, col: 5 }]) };
        life.start(ctx, 0);
        const seen = new Set<string>();
        for (let t = 0; t < 200_000; t += 400) {
            life.step(ctx, t);
            const a = ctl.active(1, t);
            if (a) seen.add(a.name);
        }
        expect(seen.size).toBeGreaterThanOrEqual(4);
    });

    it('kilitli oyuncu uyumaz ve ifade oynatmaz', () => {
        const ctl = createMascotController();
        const life = createLife(ctl, () => 0.01);
        const ctx = { entities: [player(1, 0, 0, { isLocked: true })], rooms: room([]) };
        life.start(ctx, 0);
        for (let t = 0; t < 60_000; t += 400) life.step(ctx, t);
        expect(ctl.animating(60_000)).toBe(false);
    });
});

describe('seyreklik ve tekrar', () => {
    it('uyanık oyuncuya hamle happy VERMEZ', () => {
        const ctl = createMascotController();
        const life = createLife(ctl, () => 0.99);          // uyuyarak başlamaz
        const ents = players(2);
        life.start({ entities: ents, rooms: room([]) }, 0);
        life.wake({ entities: ents, rooms: room([]) }, 100, new Set());
        expect(ctl.animating(110)).toBe(false);
    });

    it('rastgele ifadeler seyrek: 10 dakikada oyuncu başına en fazla ~70 tetikleme', () => {
        const ctl = createMascotController();
        const life = createLife(ctl, rng(5));
        const ctx = { entities: [player(1, 0, 0)], rooms: room([]) };
        life.start(ctx, 0);
        let triggers = 0; let prev: number | null = null;
        for (let t = 0; t < 600_000; t += 400) {
            life.step(ctx, t);
            const a = ctl.active(1, t);
            if (a && a.startedAt !== prev) { triggers++; prev = a.startedAt; }
        }
        expect(triggers).toBeLessThan(70);
        expect(triggers).toBeGreaterThan(5);
    });

    it('iki oyuncunun rastgele ifadesi aynı anda başlamaz', () => {
        const ctl = createMascotController();
        const life = createLife(ctl, rng(9));
        const ents = players(3);
        const ctx = { entities: ents, rooms: room([]) };
        life.start(ctx, 0);
        const starts: number[] = [];
        const seen = new Set<string>();
        for (let t = 0; t < 300_000; t += 400) {
            life.step(ctx, t);
            for (const e of ents) {
                const a = ctl.active(e.id, t);
                if (a && a.name !== 'sleepy' && a.name !== 'happy' && !seen.has(`${e.id}@${a.startedAt}`)) { seen.add(`${e.id}@${a.startedAt}`); starts.push(a.startedAt); }
            }
        }
        starts.sort((a, b) => a - b);
        for (let i = 1; i < starts.length; i++) expect(starts[i] - starts[i - 1]).toBeGreaterThanOrEqual(LIFE.minActGapMs - 1);
    });
});

describe('controller repeat', () => {
    it('repeat=2 ifadeyi iki tur sürdürür ve ikinci turda baştan oynar', async () => {
        const { EMOTES } = await import('./emotes');
        const ctl = createMascotController();
        const d = EMOTES.wink.duration;
        ctl.trigger(1, 'wink', 0, { repeat: 2 });
        expect(ctl.active(1, d + 10)?.name).toBe('wink');
        expect(ctl.active(1, 2 * d - 1)?.name).toBe('wink');
        expect(ctl.active(1, 2 * d)).toBeNull();
        const a = ctl.poseOf(1, 10, ctl.poseOf(9, 0, { } as never).face);
        const b = ctl.poseOf(1, d + 10, a.face);
        expect(b.face).toEqual(a.face);
    });
});
