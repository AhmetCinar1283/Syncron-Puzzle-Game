/**
 * DOSYA AMACI: Ölüm/çarpışma efektinin renk ve parlama katmanlarını kilitlemek —
 * ağırlıkların çizim planına çevrilmesi (`planEffects`), varyant anahtarları ve
 * `TRACKS`'teki `filter` verisinin kaynak keyframe'lerle tutarlılığı.
 *
 * Tuvale çizim testi yok (00-ilkeler §6.1).
 */

import { describe, expect, it } from 'vitest';
import type { EffectLayer } from '../motion';
import { LINEAR, TRACKS, sampleTrack } from '../motion';
import type { SpritePainter } from '../types';
import { filterVariantOf, haloVariantOf } from '../variants';
import { planEffects } from './effects';

const tint = (filter: string): EffectLayer => ({ kind: 'tint', filter });
const halo = (color: string, blur: number): EffectLayer => ({ kind: 'halo', color, blur });

describe('planEffects', () => {
    it('efekt yoksa yalnızca temel sprite tam opaklıkta', () => {
        expect(planEffects(undefined, undefined)).toEqual({ halos: [], body: [{ layer: null, alpha: 1 }] });
        expect(planEffects([tint('a')], [0])).toEqual({ halos: [], body: [{ layer: null, alpha: 1 }] });
    });

    it('tek renk katmanı: temel sprite üstüne ağırlığı kadar', () => {
        const plan = planEffects([tint('a')], [0.5]);
        expect(plan.body).toEqual([{ layer: null, alpha: 1 }, { layer: 0, alpha: 0.5 }]);
    });

    it('ağırlık 1 ise temel sprite hiç çizilmez (yarı saydam varlıkta sızmasın)', () => {
        expect(planEffects([tint('a')], [1]).body).toEqual([{ layer: 0, alpha: 1 }]);
    });

    it('iki renk katmanı ardışık üstüne çizmeyle DOĞRUSAL karışım verir', () => {
        // 0.4 A + 0.6 B: A tam, B ağırlığı / toplam = 0.6 / 1.
        const plan = planEffects([tint('a'), tint('b')], [0.4, 0.6]);
        expect(plan.body).toEqual([{ layer: 0, alpha: 1 }, { layer: 1, alpha: 0.6 }]);

        // 0.2 A + 0.3 B + 0.5 temel: temel 1; A 0.2/0.7; B 0.3/1.
        const three = planEffects([tint('a'), tint('b')], [0.2, 0.3]);
        expect(three.body[0]).toEqual({ layer: null, alpha: 1 });
        expect(three.body[1].alpha).toBeCloseTo(0.2 / 0.7, 10);
        expect(three.body[2].alpha).toBeCloseTo(0.3 / 1, 10);
    });

    it('parlama gövdeden AYRIDIR: kendi ağırlığıyla, gövdenin arkasında', () => {
        const plan = planEffects([tint('a'), halo('#f00', 12)], [1, 0.5]);
        expect(plan.halos).toEqual([{ layer: 1, alpha: 0.5 }]);
        expect(plan.body).toEqual([{ layer: 0, alpha: 1 }]);
    });

    it('yalnızca parlama varsa gövde filtresiz temel sprite', () => {
        const plan = planEffects([halo('#0f8', 12)], [0.7]);
        expect(plan.halos).toEqual([{ layer: 0, alpha: 0.7 }]);
        expect(plan.body).toEqual([{ layer: null, alpha: 1 }]);
    });

    it('toplam 1\'i aşarsa oranlanır; ağırlıklar [0,1]e kenetlenir', () => {
        const plan = planEffects([tint('a'), tint('b')], [0.8, 0.8]);
        expect(plan.body).toEqual([{ layer: 0, alpha: 1 }, { layer: 1, alpha: 0.5 }]);
        expect(planEffects([tint('a')], [5]).body).toEqual([{ layer: 0, alpha: 1 }]);
    });

    it('önemsiz ağırlıklar (< 0.01) çizilmez', () => {
        const plan = planEffects([tint('a'), halo('#f00', 12)], [0.005, 0.005]);
        expect(plan).toEqual({ halos: [], body: [{ layer: null, alpha: 1 }] });
    });
});

describe('TRACKS — filter verisi', () => {
    const withLayers = ['collision-shake', 'death-forbidden', 'death-crushed', 'death-lava', 'death-trail'];

    it('yalnızca ölüm ve çarpışma izleri katman taşır', () => {
        const names = Object.entries(TRACKS).filter(([, t]) => t.layers).map(([n]) => n).sort();
        expect(names).toEqual([...withLayers].sort());
    });

    it('her durağın fx dizisi katman sayısını aşmaz, ağırlıklar [0,1]', () => {
        for (const name of withLayers) {
            const track = TRACKS[name];
            for (const stop of track.stops) {
                expect(stop.fx?.length ?? 0, name).toBeLessThanOrEqual(track.layers?.length ?? 0);
                for (const w of stop.fx ?? []) {
                    expect(w, name).toBeGreaterThanOrEqual(0);
                    expect(w, name).toBeLessThanOrEqual(1);
                }
            }
        }
    });

    it('lav ölümü: 40% durağında kızarma ve kırmızı parlama tam ağırlıkta (kaynak keyframe)', () => {
        const lava = { ...TRACKS['death-lava'], easing: LINEAR };
        expect(sampleTrack(lava, 0).fx).toBeUndefined();
        expect(sampleTrack(lava, 320).fx).toEqual([1, 0, 1]);          // 40%
        expect(sampleTrack(lava, 800).fx).toEqual([0, 1, 0]);          // 100%: parlama yok
        expect(TRACKS['death-lava'].layers?.[2]).toEqual({ kind: 'halo', color: '#ef4444', blur: 12 });
    });

    it('iz ölümü: 15% yeşil, 45% mavi parlama; iki parlama arasında geçiş', () => {
        const trail = { ...TRACKS['death-trail'], easing: LINEAR };
        expect(sampleTrack(trail, 120).fx).toEqual([1, 0, 0, 1, 0]);   // 15%
        expect(sampleTrack(trail, 360).fx).toEqual([0, 1, 0, 0, 1]);   // 45%
        const between = sampleTrack(trail, 240).fx ?? [];              // 30%: yarı yol
        expect(between[3]).toBeCloseTo(0.5, 10);
        expect(between[4]).toBeCloseTo(0.5, 10);
        expect(TRACKS['death-trail'].layers?.[3]).toEqual({ kind: 'halo', color: '#00ff88', blur: 12 });
        expect(TRACKS['death-trail'].layers?.[4]).toEqual({ kind: 'halo', color: '#00c4ff', blur: 6 });
    });

    it('ezilme: gri tonlaması ve kararma 25%\'te, tam siyah-beyaz 100%\'de', () => {
        const crushed = { ...TRACKS['death-crushed'], easing: LINEAR };
        expect(sampleTrack(crushed, 200).fx).toEqual([1, 0]);
        expect(sampleTrack(crushed, 800).fx).toEqual([0, 1]);
    });

    it('çarpışma: brightness(1.2) 15–30%\'da tam, sonra 100%\'e doğru doğrusal söner', () => {
        const hit = { ...TRACKS['collision-shake'], easing: LINEAR };
        expect(sampleTrack(hit, 15, 100).fx).toEqual([1]);
        expect(sampleTrack(hit, 30, 100).fx).toEqual([1]);
        expect(sampleTrack(hit, 65, 100).fx?.[0]).toBeCloseTo(0.5, 2);   // (0.65 − 0.30) / 0.70
        expect(sampleTrack(hit, 100, 100).fx?.[0] ?? 0).toBeCloseTo(0, 10);
    });
});

describe('sprite varyantları', () => {
    const base: SpritePainter<{ id: string }> = {
        key: ({ id }) => `base|${id}`,
        size: () => ({ w: 64, h: 64 }),
        draw: () => undefined,
    };

    it('filtreli varyant: anahtar temel + ek, boyut aynı, aynı nesne döner', () => {
        const spec = { filter: 'grayscale(1)', suffix: 'fx:grayscale(1)' };
        const v = filterVariantOf(base, spec);
        expect(v.key({ id: 'x' })).toBe('base|x|fx:grayscale(1)');
        expect(v.size({ id: 'x' })).toEqual({ w: 64, h: 64 });
        expect(filterVariantOf(base, spec)).toBe(v);
    });

    it('farklı filtreler farklı anahtar üretir', () => {
        const a = filterVariantOf(base, { filter: 'a', suffix: 'fx:a' });
        const b = filterVariantOf(base, { filter: 'b', suffix: 'fx:b' });
        expect(a.key({ id: 'x' })).not.toBe(b.key({ id: 'x' }));
    });

    it('parlama varyantı her yönde blur kadar büyür; renk ve yarıçap anahtarda', () => {
        const v = haloVariantOf(base, { color: '#ef4444', blur: 12 });
        expect(v.size({ id: 'x' })).toEqual({ w: 64 + 24, h: 64 + 24 });
        expect(v.key({ id: 'x' })).toBe('base|x|halo:#ef4444:12');
        expect(haloVariantOf(base, { color: '#ef4444', blur: 12 })).toBe(v);
        expect(haloVariantOf(base, { color: '#ef4444', blur: 6 }).key({ id: 'x' })).not.toBe(v.key({ id: 'x' }));
    });
});
