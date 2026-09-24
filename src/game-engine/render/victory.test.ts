/**
 * DOSYA AMACI: Zafer koreografisinin SAF parçalarını kilitlemek — üç aşamanın
 * eşikleri ve formülleri, hayalet iz halkasının bileşik küçülmesi, parçacık
 * uyanma eşiği, şok dalgası/süpernova değerleri, sprite anahtarları ve
 * takipçinin sıfırlama kuralı.
 *
 * Tuvale çizim testi yok (00-ilkeler §6.1); `drawVictory`nin yalnızca "bitti"
 * dalı test edilir, çünkü o dal bağlama hiç dokunmadan döner.
 */

import { describe, expect, it } from 'vitest';
import { BLINK_FACE, NEUTRAL_FACE } from '../mascot/pose';
import type { Entity } from '../logic/entityTypes';
import type { BoardScene } from './types';
import type { SpriteCache } from './spriteCache';
import {
    VICTORY_CELEBRATION_DURATION,
    advanceVictory,
    createVictoryState,
    createVictoryTracker,
    drawVictory,
} from './victory';
import {
    PARTICLE_COLORS,
    PARTICLE_SHAPES,
    victoryParticleSprite,
    victoryPlayerSprite,
    victoryVignetteBox,
    victoryVignetteSprite,
    VIGNETTE_RASTER,
} from './victorySprites';
import { blurPad } from './blur';
import { BOARD_BLEED_FULL, BOARD_BLEED_LITE, boardBleedFor } from './surface';

function player(id: number, row: number, col: number, over: Record<string, unknown> = {}): Entity {
    return {
        type: 'player',
        id,
        position: { row, col, roomId: 'main' },
        physics: { direction: 'up', force: 0, z: 0 },
        def: { mass: 1, resistance: 0, isSolid: true },
        traits: new Set(),
        isElectrified: false,
        customData: over,
    } as unknown as Entity;
}

function scene(entities: Entity[], isVictoryActive = true): BoardScene {
    return {
        rooms: {},
        entities,
        prevEntities: null,
        roomPositions: { main: { left: 0, top: 0, width: 640, height: 640 } },
        totalWidth: 640,
        totalHeight: 640,
        theme: 'legacy',
        controlledRoomIds: undefined,
        ambientMode: 'off',
        frameMs: 80,
        tickStartedAt: 0,
        isVictoryActive,
    };
}

describe('createVictoryState', () => {
    it('yok edilmiş oyuncuları ve oyuncu olmayanları dışarıda bırakır', () => {
        const box = { ...player(9, 0, 0), type: 'box' } as unknown as Entity;
        const state = createVictoryState(
            scene([player(1, 0, 0), player(2, 1, 1, { _destroyed: true }), box]),
            0,
        );
        expect(state.configs).toHaveLength(1);
    });

    it('başlangıç noktası hücrenin merkezi (offset + 64 * indeks + 32)', () => {
        const state = createVictoryState(scene([player(1, 2, 3)]), 0);
        expect(state.configs[0].startX).toBe(3 * 64 + 32);
        expect(state.configs[0].startY).toBe(2 * 64 + 32);
    });

    it('parçacık sayısı min(36, 18 + N * 4)', () => {
        const one = createVictoryState(scene([player(1, 0, 0)]), 0);
        expect(one.particles).toHaveLength(22);

        const five = createVictoryState(
            scene([player(1, 0, 0), player(2, 0, 1), player(3, 0, 2), player(4, 0, 3), player(5, 0, 4)]),
            0,
        );
        expect(five.particles).toHaveLength(36);
    });

    it('parçacık şekil ve rengi indeks sırasını izler', () => {
        const state = createVictoryState(scene([player(1, 0, 0)]), 0);
        state.particles.forEach((pt, i) => {
            expect(pt.shape).toBe(PARTICLE_SHAPES[i % PARTICLE_SHAPES.length]);
            expect(pt.color).toBe(PARTICLE_COLORS[i % PARTICLE_COLORS.length]);
        });
    });

    it('maxRadius 90 ile tabanlanır', () => {
        const small = { ...scene([player(1, 0, 0)]), totalWidth: 128, totalHeight: 128 };
        expect(createVictoryState(small, 0).maxRadius).toBe(90);
        expect(createVictoryState(scene([player(1, 0, 0)]), 0).maxRadius).toBeCloseTo(640 * 0.38, 6);
    });

    it('nabız donuk, yüz mutlu (kilit ikonu yerine) kurulur', () => {
        const state = createVictoryState(scene([player(1, 0, 0, { playerIndex: 3, mode: 'reversed', isLocked: true })]), 0);
        expect(state.configs[0].base).toMatchObject({
            playerIndex: 3, mode: 'reversed', locked: false, pulsePhase: 0,
            face: { left: { shape: 'happy' }, mouth: 'grin', blush: true },
        });
    });
});

describe('advanceVictory — aşama eşikleri', () => {
    const base = () => createVictoryState(scene([player(1, 0, 0), player(2, 4, 4)]), 0);

    it('0.18 öncesi aşama 1: p1 = 0 iken oyuncu hücresinde durur', () => {
        const state = base();
        advanceVictory(state, 0);
        expect(state.states[0].x).toBeCloseTo(state.configs[0].startX, 6);
        expect(state.states[0].y).toBeCloseTo(state.configs[0].startY, 6);
        expect(state.states[0].scale).toBeCloseTo(1, 6);
        expect(state.states[0].rotation).toBeCloseTo(0, 6);
    });

    it('aşama 1 sonunda oyuncu yörünge başlangıç noktasına varır', () => {
        const state = base();
        // 0.18'in hemen altı: easeP1 ≈ 1, zıplama yayı sin(π) ≈ 0.
        advanceVictory(state, 0.18 - 1e-9);
        const cfg = state.configs[0];
        expect(state.states[0].x).toBeCloseTo(state.cx + state.maxRadius * Math.cos(cfg.initialAngle), 4);
        expect(state.states[0].y).toBeCloseTo(state.cy + state.maxRadius * Math.sin(cfg.initialAngle), 4);
        expect(state.states[0].rotation).toBeCloseTo(120, 4);
    });

    it('aşama 2 başında yarıçap maxRadius + 14', () => {
        const state = base();
        advanceVictory(state, 0.18);
        const d = Math.hypot(state.states[0].x - state.cx, state.states[0].y - state.cy);
        expect(d).toBeCloseTo(state.maxRadius + 14, 4);
    });

    it('aşama 2 sonunda yarıçap 14\'e daralır', () => {
        const state = base();
        advanceVictory(state, 0.82 - 1e-9);
        const d = Math.hypot(state.states[0].x - state.cx, state.states[0].y - state.cy);
        expect(d).toBeCloseTo(14, 3);
    });

    it('aşama 3 opaklığı 1 - p3² ve ölçeği (1 - p3) * 1.2', () => {
        const state = base();
        advanceVictory(state, 0.82 + 0.18 * 0.5);
        expect(state.states[0].opacity).toBeCloseTo(1 - 0.25, 6);
        expect(state.states[0].scale).toBeCloseTo(0.6, 6);
    });

    it('aşama 3 dönüşü BİR ÖNCEKİ karenin üstüne eklenir', () => {
        const state = base();
        advanceVictory(state, 0.82);
        const first = state.states[0].rotation;
        advanceVictory(state, 0.91);
        expect(state.states[0].rotation).toBeCloseTo(first + 0.5 * 720, 6);
    });
});

describe('advanceVictory — hayalet izler', () => {
    it('en fazla TRAIL_SLOTS (3) iz tutulur ve opaklıkları 0.72 / 0.44 / 0.16', () => {
        const state = createVictoryState(scene([player(1, 0, 0)]), 0);
        for (let i = 0; i < 10; i++) advanceVictory(state, 0.3);
        const trails = state.states[0].trails;
        expect(trails).toHaveLength(3);
        expect(trails[0].opacity).toBeCloseTo(0.72, 6);
        expect(trails[1].opacity).toBeCloseTo(0.44, 6);
        expect(trails[2].opacity).toBeCloseTo(0.16, 6);
    });

    it('iz ölçeği her karede 0.92 ile BİLEŞİK küçülür', () => {
        const state = createVictoryState(scene([player(1, 0, 0)]), 0);
        advanceVictory(state, 0.3);
        advanceVictory(state, 0.3);
        advanceVictory(state, 0.3);
        const cur = state.states[0];
        // En yeni iz bir kez, en eskisi üç kez eskimiştir.
        expect(cur.trails[0].scale).toBeCloseTo(cur.scale * 0.82 * 0.92, 6);
        expect(cur.trails[2].scale).toBeCloseTo(cur.scale * 0.82 * Math.pow(0.92, 3), 6);
    });

    it('aşama 3\'te izler temizlenir', () => {
        const state = createVictoryState(scene([player(1, 0, 0)]), 0);
        for (let i = 0; i < 5; i++) advanceVictory(state, 0.3);
        expect(state.states[0].trails.length).toBeGreaterThan(0);
        advanceVictory(state, 0.9);
        expect(state.states[0].trails).toHaveLength(0);
    });
});

describe('advanceVictory — parçacıklar, şok dalgası, süpernova', () => {
    it('progress 0.1\'e kadar parçacıklar kıpırdamaz', () => {
        const state = createVictoryState(scene([player(1, 0, 0)]), 0);
        advanceVictory(state, 0.1);
        expect(state.particles[0].x).toBe(state.cx);
        expect(state.particles[0].opacity).toBe(0);

        advanceVictory(state, 0.11);
        expect(state.particles[0].x).toBeCloseTo(state.cx + state.particles[0].vx, 6);
        expect(state.particles[0].opacity).toBeCloseTo(0.08, 6);
    });

    it('parçacık opaklığı 0.9\'da doyar ve 0.7\'den sonra sıfıra iner', () => {
        const state = createVictoryState(scene([player(1, 0, 0)]), 0);
        for (let i = 0; i < 30; i++) advanceVictory(state, 0.5);
        expect(state.particles[0].opacity).toBeCloseTo(0.9, 6);

        advanceVictory(state, 0.85);
        expect(state.particles[0].opacity).toBeCloseTo(0.9 * 0.5, 6);
        advanceVictory(state, 1);
        expect(state.particles[0].opacity).toBe(0);
    });

    it('süpernova ve şok dalgası yalnızca aşama 3\'te uyanır', () => {
        const state = createVictoryState(scene([player(1, 0, 0)]), 0);
        advanceVictory(state, 0.81);
        expect(state.burst.active).toBe(false);

        advanceVictory(state, 0.82);
        expect(state.burst.active).toBe(true);
        expect(state.burst.scale).toBe(0);
        expect(state.burst.shockwaveOpacity).toBeCloseTo(0.85, 6);
    });

    it('şok dalgası yarıçapı p3^0.7 * min(w, h) * 0.7', () => {
        const state = createVictoryState(scene([player(1, 0, 0)]), 0);
        advanceVictory(state, 0.82 + 0.18 * 0.5);
        expect(state.burst.shockwaveRadius).toBeCloseTo(Math.pow(0.5, 0.7) * 640 * 0.7, 6);
        expect(state.burst.shockwaveOpacity).toBeCloseTo(0.5 * 0.85, 6);
    });
});

describe('drawVictory', () => {
    // Süre dolduğunda bağlama HİÇ dokunulmadan dönülür; bu dalı doğrulamak için
    // sahte bir bağlam yeterli (jsdom'da gerçek 2D bağlamı yok, 00-ilkeler §6.1).
    const noCtx = null as unknown as CanvasRenderingContext2D;
    const noCache = null as unknown as SpriteCache;

    it('süre dolunca false döner ve hiçbir şey çizmez', () => {
        const state = createVictoryState(scene([player(1, 0, 0)]), 1000);
        expect(drawVictory(noCtx, state, noCache, 1000 + VICTORY_CELEBRATION_DURATION)).toBe(false);
        expect(drawVictory(noCtx, state, noCache, 1000 + VICTORY_CELEBRATION_DURATION + 500)).toBe(false);
    });
});

describe('createVictoryTracker', () => {
    it('zafer aktif değilken durum yoktur', () => {
        const tracker = createVictoryTracker();
        tracker.update(scene([player(1, 0, 0)], false), 0);
        expect(tracker.state()).toBeNull();
    });

    it('aynı zaferde durumu KORUR, koreografiyi baştan başlatmaz', () => {
        const tracker = createVictoryTracker();
        const s = scene([player(1, 0, 0)]);
        tracker.update(s, 0);
        const first = tracker.state();
        tracker.update(s, 500);
        expect(tracker.state()).toBe(first);
    });

    it('oyuncu konumu değişince yeni durum kurar', () => {
        const tracker = createVictoryTracker();
        tracker.update(scene([player(1, 0, 0)]), 0);
        const first = tracker.state();
        tracker.update(scene([player(1, 1, 0)]), 0);
        expect(tracker.state()).not.toBe(first);
    });
});

describe('sprite anahtarları (00-ilkeler §3.1)', () => {
    const base = {
        theme: 'neon' as const, playerIndex: 0, mode: 'normal' as const,
        locked: false, face: NEUTRAL_FACE, pulsePhase: 0,
    };

    it('aynı girdi aynı anahtar', () => {
        expect(victoryPlayerSprite.key({ base, blur: 0 })).toBe(victoryPlayerSprite.key({ base, blur: 0 }));
    });

    it('bulanıklık, mod, kilit ve oyuncu indeksi anahtarı DEĞİŞTİRİR', () => {
        const k = victoryPlayerSprite.key({ base, blur: 0 });
        expect(victoryPlayerSprite.key({ base, blur: 1.5 })).not.toBe(k);
        expect(victoryPlayerSprite.key({ base: { ...base, mode: 'reversed' }, blur: 0 })).not.toBe(k);
        expect(victoryPlayerSprite.key({ base: { ...base, locked: true }, blur: 0 })).not.toBe(k);
        expect(victoryPlayerSprite.key({ base: { ...base, playerIndex: 1 }, blur: 0 })).not.toBe(k);
    });

    it('yüz anahtara girer, nabız GİRMEZ — koreografi boyunca donuk', () => {
        const k = victoryPlayerSprite.key({ base, blur: 0 });
        expect(victoryPlayerSprite.key({ base: { ...base, face: BLINK_FACE }, blur: 0 })).not.toBe(k);
        expect(victoryPlayerSprite.key({ base: { ...base, pulsePhase: 7 }, blur: 0 })).toBe(k);
    });

    it('parçacık anahtarı yalnızca şekil ve renge bağlı — boyut girmez', () => {
        expect(victoryParticleSprite.key({ shape: 'star', color: '#ffd700' }))
            .toBe(victoryParticleSprite.key({ shape: 'star', color: '#ffd700' }));
        expect(victoryParticleSprite.key({ shape: 'star', color: '#ffd700' }))
            .not.toBe(victoryParticleSprite.key({ shape: 'circle', color: '#ffd700' }));
    });

    it('vignette anahtarı tahta ölçüsüyle değişir, görünen kutusu her yönde 40 büyüktür', () => {
        expect(victoryVignetteSprite.key({ w: 640, h: 640 })).not.toBe(victoryVignetteSprite.key({ w: 640, h: 320 }));
        expect(victoryVignetteBox({ w: 640, h: 320 })).toEqual({ w: 720, h: 400 });
    });

    it('vignette yarı çözünürlükte rasterize edilir: sprite kutusu görünen kutunun yarısıdır (07-rapor §5)', () => {
        expect(VIGNETTE_RASTER).toBe(0.5);
        expect(victoryVignetteSprite.size({ w: 640, h: 640 })).toEqual({ w: 360, h: 360 });
        // 640x640, DPR 2: 360 * 2 = 720 px kenar → 720 * 720 * 4 = 2 073 600 bayt (~1,98 MiB).
        const side = victoryVignetteSprite.size({ w: 640, h: 640 }).w * 2;
        expect(side * side * 4).toBe(2_073_600);
    });
});

describe('taşma payı ve bulanıklık payı', () => {
    it('pay cihaz kademesine bağlı', () => {
        expect(boardBleedFor('lite')).toBe(BOARD_BLEED_LITE);
        expect(boardBleedFor('full')).toBe(BOARD_BLEED_FULL);
        expect(BOARD_BLEED_LITE).toBeLessThan(BOARD_BLEED_FULL);
    });

    it('blur payı ~3σ', () => {
        expect(blurPad(1.5)).toBe(5);
        expect(blurPad(3.5)).toBe(11);
        expect(blurPad(0)).toBe(0);
    });
});
