/**
 * DOSYA AMACI: `motion.ts`'in saf davranışını kilitlemek — easing eğrilerinin
 * uç değerleri ve yönü, `EASE_MOVE`'un kasıtlı aşımı (yaylanma) ve keyframe
 * yorumlayıcısının durak/ara değer/tekrar kuralları.
 *
 * Tuvale çizim testi yok (00-ilkeler §6.1).
 */

import { describe, expect, it } from 'vitest';
import {
    EASE_IN, EASE_IN_OUT, EASE_MOVE, EASE_OUT, LINEAR, TRACKS, cssBezier, cubicBezier, sampleTrack,
} from './motion';
import type { Track } from './motion';

const MONOTONIC = { EASE_IN_OUT, EASE_OUT, EASE_IN, LINEAR };

describe('easing eğrileri', () => {
    const all = { ...MONOTONIC, EASE_MOVE };

    it('0 için 0, 1 için 1 verir', () => {
        for (const [name, ease] of Object.entries(all)) {
            expect(ease(0), name).toBeCloseTo(0, 5);
            expect(ease(1), name).toBeCloseTo(1, 5);
        }
    });

    it('aşım yapmayanlar monoton artar', () => {
        for (const [name, ease] of Object.entries(MONOTONIC)) {
            let prev = -Infinity;
            for (let i = 0; i <= 50; i++) {
                const value = ease(i / 50);
                expect(value, `${name} @ ${i}`).toBeGreaterThanOrEqual(prev - 1e-9);
                prev = value;
            }
        }
    });

    it('EASE_MOVE 1i aşar — yaylanma hissi buradan geliyor', () => {
        let peak = 0;
        for (let i = 0; i <= 100; i++) peak = Math.max(peak, EASE_MOVE(i / 100));
        expect(peak).toBeGreaterThan(1);
    });

    it('cubicBezier, taşınan cssBezier ile aynı sonucu verir', () => {
        const ease = cubicBezier(0.42, 0, 0.58, 1);
        for (const t of [0.1, 0.25, 0.5, 0.75, 0.9]) {
            expect(ease(t)).toBeCloseTo(cssBezier(0.42, 0.58, 0, 1, t), 10);
        }
    });
});

describe('TRACKS tablosu', () => {
    const expected = [
        'bump-up', 'bump-down', 'bump-left', 'bump-right',
        'blocked-push-up', 'blocked-push-down', 'blocked-push-left', 'blocked-push-right',
        'conveyor-reject-up', 'conveyor-reject-down', 'conveyor-reject-left', 'conveyor-reject-right',
        'collision-shake',
        'death-forbidden', 'death-crushed', 'death-lava', 'death-trail',
        'victory-spin', 'teleportInEffect', 'landingSquashEffect',
    ];

    it('animationStyles.ts’teki yirmi keyframe’in hepsini içerir', () => {
        for (const name of expected) expect(TRACKS[name], name).toBeDefined();
        expect(Object.keys(TRACKS).sort()).toEqual([...expected].sort());
    });

    it('her izin durakları sıralı ve 0..1 aralığında', () => {
        for (const [name, track] of Object.entries(TRACKS)) {
            let prev = -1;
            for (const stop of track.stops) {
                expect(stop.at, name).toBeGreaterThanOrEqual(0);
                expect(stop.at, name).toBeLessThanOrEqual(1);
                expect(stop.at, name).toBeGreaterThan(prev);
                prev = stop.at;
            }
        }
    });

    it('yön çevrimleri kaynak keyframe değerlerini taşır', () => {
        // `bump-up` 30%: translateY(-14px) scaleY(0.85) scaleX(1.08)
        expect(TRACKS['bump-up'].stops[1]).toMatchObject({ at: 0.3, ty: -14, sy: 0.85, sx: 1.08 });
        // `bump-left` 70%: translateX(3px) scaleX(1.05) scaleY(0.96)
        expect(TRACKS['bump-left'].stops[2]).toMatchObject({ at: 0.7, tx: 3, sx: 1.05, sy: 0.96 });
        // `blocked-push-right` 35%: translateX(7px) scaleX(0.75) scaleY(1.15)
        expect(TRACKS['blocked-push-right'].stops[1]).toMatchObject({ at: 0.35, tx: 7, sx: 0.75, sy: 1.15 });
        // `conveyor-reject-down` 75%: translateY(-10px) scaleY(1.05)
        expect(TRACKS['conveyor-reject-down'].stops[2]).toMatchObject({ at: 0.75, ty: -10, sy: 1.05, sx: 1 });
    });

    it('ölüm izleri son karede kalır, zafer döner', () => {
        for (const name of ['death-forbidden', 'death-crushed', 'death-lava', 'death-trail']) {
            expect(TRACKS[name].repeat, name).toBe('hold-last');
            expect(TRACKS[name].durationMs, name).toBe(800);
        }
        expect(TRACKS['victory-spin'].repeat).toBe('loop');
    });
});

describe('sampleTrack', () => {
    const linearTrack: Track = {
        stops: [
            { at: 0, tx: 0, sx: 1, alpha: 1 },
            { at: 0.5, tx: 10, sx: 2, alpha: 0.5 },
            { at: 1, tx: 30, sx: 3, alpha: 0 },
        ],
        durationMs: 100,
        easing: LINEAR,
        repeat: 'hold-last',
    };

    it('durak noktalarında tam değeri verir', () => {
        expect(sampleTrack(linearTrack, 0)).toMatchObject({ tx: 0, sx: 1, alpha: 1 });
        expect(sampleTrack(linearTrack, 50)).toMatchObject({ tx: 10, sx: 2, alpha: 0.5 });
        expect(sampleTrack(linearTrack, 100)).toMatchObject({ tx: 30, sx: 3, alpha: 0 });
    });

    it('duraklar arasında doğrusal ara değer üretir', () => {
        expect(sampleTrack(linearTrack, 25).tx).toBeCloseTo(5, 6);
        expect(sampleTrack(linearTrack, 75).tx).toBeCloseTo(20, 6);
    });

    it('eksik alanlar birim değerdedir', () => {
        const t = sampleTrack({ ...linearTrack, stops: [{ at: 0 }, { at: 1 }] }, 50);
        expect(t).toEqual({ tx: 0, ty: 0, sx: 1, sy: 1, rot: 0, alpha: 1, skewX: 0, skewY: 0 });
    });

    it('derece cinsinden dönüşü radyana çevirir', () => {
        // `loop` olduğu için 800ms'de başa sarar; yarı yolda tam 180°.
        expect(sampleTrack(TRACKS['victory-spin'], 400).rot).toBeCloseTo(Math.PI, 6);
        expect(sampleTrack(TRACKS['victory-spin'], 800).rot).toBeCloseTo(0, 6);
    });

    it('hold-last süre dolunca son değerde kalır', () => {
        expect(sampleTrack(linearTrack, 100_000)).toMatchObject({ tx: 30, sx: 3, alpha: 0 });
    });

    it('loop süre dolunca baştan başlar', () => {
        const loop: Track = { ...linearTrack, repeat: 'loop' };
        expect(sampleTrack(loop, 125).tx).toBeCloseTo(sampleTrack(loop, 25).tx, 6);
    });

    it('durationMs parametresi frameMs ile oynatılan efektlerin süresini ezer', () => {
        expect(sampleTrack(linearTrack, 30, 60).tx).toBeCloseTo(10, 6);
    });

    it('negatif geçen süreyi ilk durakta sabitler', () => {
        expect(sampleTrack(linearTrack, -50)).toMatchObject({ tx: 0, sx: 1, alpha: 1 });
    });
});
