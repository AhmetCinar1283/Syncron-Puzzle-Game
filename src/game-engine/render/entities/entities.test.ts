/**
 * DOSYA AMACI: Varlık katmanının SAF parçalarını kilitlemek — sprite
 * anahtarlarının 00-ilkeler §3.1 sözleşmesine uyması, `physicsWrapper`'dan
 * taşınan efekt seçim zincirinin SIRASI, iniş kilidi, ışınlanma tespiti ve toz
 * parçacıklarının uç değerleri.
 *
 * Tuvale çizim testi yok (00-ilkeler §6.1).
 */

import { describe, expect, it } from 'vitest';
import type { Entity } from '../../logic/entityTypes';
import type { BoardScene } from '../types';
import { boxSprite } from './box';
import { blinkClosedAt, playerSprite, pulsePhaseAt } from './player';
import { dustParticlesAt, iceDustSprite } from './dust';
import { createEntityMotionTracker, isTeleporting, isTrackActive } from '../entityMotion';

function entity(over: Partial<Entity> & { id: number }): Entity {
    return {
        type: 'player',
        position: { row: 0, col: 0, roomId: 'main' },
        physics: { direction: 'up', force: 0, z: 0 },
        def: { mass: 1, resistance: 0, isSolid: true },
        traits: new Set(),
        isElectrified: false,
        customData: {},
        ...over,
    } as Entity;
}

function scene(entities: Entity[], prevEntities: Entity[] | null, frameMs = 80): BoardScene {
    return {
        rooms: {},
        entities,
        prevEntities,
        roomPositions: {
            main: { left: 0, top: 0, width: 320, height: 320 },
            other: { left: 400, top: 0, width: 320, height: 320 },
        },
        totalWidth: 720,
        totalHeight: 320,
        theme: 'legacy',
        controlledRoomIds: undefined,
        ambientMode: 'on',
        frameMs,
        tickStartedAt: 0,
        isVictoryActive: false,
    };
}

describe('oyuncu sprite anahtarı', () => {
    const base = { theme: 'legacy', playerIndex: 0, mode: 'normal', locked: false, blinkClosed: false, pulsePhase: 0 } as const;

    it('aynı girdide aynıdır', () => {
        expect(playerSprite.key({ ...base })).toBe(playerSprite.key({ ...base }));
        expect(playerSprite.key({ ...base })).toBe('player|classic_arrow|0|normal|0|0|0');
    });

    it('görüntüyü etkileyen her alan için farklıdır', () => {
        const keys = new Set([
            playerSprite.key({ ...base }),
            playerSprite.key({ ...base, playerIndex: 1 }),
            playerSprite.key({ ...base, mode: 'reversed' }),
            playerSprite.key({ ...base, locked: true }),
            playerSprite.key({ ...base, blinkClosed: true }),
            playerSprite.key({ ...base, theme: 'neon' }),
            playerSprite.key({ ...base, theme: 'neon', pulsePhase: 5 }),
        ]);
        expect(keys.size).toBe(7);
    });

    it('fazladan alanları (kimlik, konum) yok sayar', () => {
        const noisy = { ...base, id: 12, row: 3, col: 9 } as never;
        expect(playerSprite.key(noisy)).toBe(playerSprite.key({ ...base }));
    });
});

describe('kutu sprite anahtarı', () => {
    const base = {
        theme: 'legacy', hex: '#f97316', rgb: '249,115,22',
        dimmed: false, powered: false, requiresPower: false, durability: null, colorDot: false,
    } as const;

    it('görüntüyü etkileyen her alan için farklıdır', () => {
        const keys = new Set([
            boxSprite.key({ ...base }),
            boxSprite.key({ ...base, theme: 'arcade' }),
            boxSprite.key({ ...base, hex: '#00ff88' }),
            boxSprite.key({ ...base, dimmed: true }),
            boxSprite.key({ ...base, powered: true }),
            boxSprite.key({ ...base, requiresPower: true }),
            boxSprite.key({ ...base, durability: 2 }),
            boxSprite.key({ ...base, colorDot: true }),
        ]);
        expect(keys.size).toBe(8);
    });
});

describe('toz parçacığı', () => {
    it('tek ve durumsuz bir anahtarı vardır', () => {
        expect(iceDustSprite.key({})).toBe('icedust');
    });

    it('döngü başında keyframe’in 0% değerinde, sonunda 100%’üne yaklaşır', () => {
        const [first] = dustParticlesAt('left', 0);
        expect(first.x).toBeCloseTo(16 + 3, 6);
        expect(first.y).toBeCloseTo(48 + 3, 6);
        expect(first.scale).toBeCloseTo(1, 6);
        expect(first.alpha).toBeCloseTo(0.8, 6);

        const [late] = dustParticlesAt('left', 219.9);
        expect(late.x).toBeGreaterThan(55);
        expect(late.scale).toBeLessThan(0.11);
        expect(late.alpha).toBeLessThan(0.01);
    });

    it('üç parçacık farklı gecikmelerle akar', () => {
        const at = dustParticlesAt('up', 0);
        expect(at).toHaveLength(3);
        expect(new Set(at.map(p => p.y)).size).toBe(3);
    });
});

describe('göz kırpma ve nabız', () => {
    it('periyodun büyük bölümünde göz açıktır', () => {
        expect(blinkClosedAt('legacy', 0)).toBe(false);
        expect(blinkClosedAt('legacy', 2000)).toBe(false);
        expect(blinkClosedAt('legacy', 4000 * 0.96)).toBe(true);
    });

    it('nabız yalnızca neon + ters modda akar', () => {
        expect(pulsePhaseAt('legacy', 'reversed', 650)).toBe(0);
        expect(pulsePhaseAt('neon', 'normal', 650)).toBe(0);
        expect(pulsePhaseAt('neon', 'reversed', 650)).toBe(6);
    });
});

describe('ışınlanma tespiti', () => {
    const here = entity({ id: 1, position: { row: 0, col: 4, roomId: 'main' } });

    it('bir hücrelik hareket ışınlanma değildir', () => {
        const prev = entity({ id: 1, position: { row: 0, col: 3, roomId: 'main' } });
        expect(isTeleporting(scene([here], [prev]), here, prev)).toBe(false);
    });

    it('bir hücreden fazla atlama ışınlanmadır', () => {
        const prev = entity({ id: 1, position: { row: 0, col: 1, roomId: 'main' } });
        expect(isTeleporting(scene([here], [prev]), here, prev)).toBe(true);
    });

    it('oda değişimi ışınlanmadır', () => {
        const prev = entity({ id: 1, position: { row: 0, col: 4, roomId: 'other' } });
        expect(isTeleporting(scene([here], [prev]), here, prev)).toBe(true);
    });
});

describe('efekt seçim zinciri', () => {
    function trackName(customData: Record<string, unknown>, prev: Entity | null = null, id = 1): string | null {
        const tracker = createEntityMotionTracker();
        const self = entity({ id, customData });
        tracker.update(scene([self], prev ? [prev] : null), 1000);
        return tracker.get(id)?.track?.name ?? null;
    }

    it('ölüm her şeyi ezer', () => {
        expect(trackName({ deathReason: 'crushed', isVictory: true, bumpDirection: 'up' })).toBe('death-crushed');
        expect(trackName({ deathReason: 'lava_edge' })).toBe('death-lava');
        expect(trackName({ deathReason: 'forbidden' })).toBe('death-forbidden');
        expect(trackName({ deathReason: 'trail' })).toBe('death-trail');
    });

    it('tanınmayan ölüm sebebi zinciri BİTİRİR', () => {
        expect(trackName({ deathReason: 'meteor', isVictory: true })).toBeNull();
    });

    it('zafer çarpmayı ezer', () => {
        expect(trackName({ isVictory: true, bumpDirection: 'left' })).toBe('victory-spin');
    });

    it('çarpma sebebine göre doğru keyframe seçilir', () => {
        expect(trackName({ bumpDirection: 'left' })).toBe('bump-left');
        expect(trackName({ bumpDirection: 'left', bumpReason: 'collision' })).toBe('collision-shake');
        expect(trackName({ bumpDirection: 'up', bumpReason: 'blocked_push' })).toBe('blocked-push-up');
        expect(trackName({ bumpDirection: 'down', bumpReason: 'conveyor' })).toBe('conveyor-reject-down');
    });

    it('ışınlanma çarpmanın ardından gelir', () => {
        const prev = entity({ id: 1, position: { row: 0, col: 0, roomId: 'other' } });
        expect(trackName({ bumpDirection: 'up' }, prev)).toBe('bump-up');
        expect(trackName({}, prev)).toBe('teleportInEffect');
    });

    it('iniş 220ms boyunca kilitli kalır ve baştan başlamaz', () => {
        const tracker = createEntityMotionTracker();
        const up = entity({ id: 1, physics: { direction: 'up', force: 0, z: 2 } });
        tracker.update(scene([up], null), 0);
        expect(tracker.get(1)?.track).toBeNull();

        const down = entity({ id: 1, physics: { direction: 'up', force: 0, z: 0 } });
        tracker.update(scene([down], [up]), 100);
        expect(tracker.get(1)?.track?.name).toBe('landingSquashEffect');
        expect(tracker.get(1)?.track?.startedAt).toBe(100);

        // Sonraki tick: efekt SÜRÜYOR, damga tazelenmemeli.
        tracker.update(scene([down], [down]), 200);
        expect(tracker.get(1)?.track?.startedAt).toBe(100);
        expect(isTrackActive(tracker.get(1), 200)).toBe(true);

        // 220ms dolunca kilit açılır.
        tracker.update(scene([down], [down]), 400);
        expect(tracker.get(1)?.track).toBeNull();
    });

    it('sahneden çıkan varlığın durumu atılır', () => {
        const tracker = createEntityMotionTracker();
        const self = entity({ id: 7 });
        tracker.update(scene([self], null), 0);
        expect(tracker.get(7)).toBeDefined();
        tracker.update(scene([], null), 10);
        expect(tracker.get(7)).toBeUndefined();
    });

    it('sonsuz zafer dönüşü her tick’te baştan başlamaz', () => {
        const tracker = createEntityMotionTracker();
        const self = entity({ id: 1, customData: { isVictory: true } });
        tracker.update(scene([self], null), 0);
        tracker.update(scene([self], [self]), 500);
        expect(tracker.get(1)?.track?.startedAt).toBe(0);
        expect(isTrackActive(tracker.get(1), 10_000)).toBe(true);
    });
});
