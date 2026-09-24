/**
 * DOSYA AMACI: Maskot ifade çekirdeğinin sözleşmelerini kilitlemek —
 * katalog kuralları (her ifade nötre döner), örnekleyicinin determinizmi,
 * öncelik kuralı, boştaki yüzün eski `playerBlink` ile aynı olması ve
 * sprite önbelleğini şişirmeyecek kadar az yüz anahtarı üretilmesi.
 *
 * Tuvale çizim testi yok (00-ilkeler §6.1); süs yerleşimi saf fonksiyon olarak sınanır.
 */

import { describe, expect, it, vi } from 'vitest';
import { EMOTES, EMOTE_NAMES } from './emotes';
import { compiledEmote, createMascotController } from './controller';
import { emoteFinished, sampleEmote } from './timeline';
import { BLINK_FACE, NEUTRAL_BODY, NEUTRAL_FACE, faceKey, quantizeFace } from './pose';
import { blinkClosedAt, idleFaceAt } from './idle';
import { fxInstances } from '../render/entities/mascotFx';

const NEUTRAL_KEY = faceKey(NEUTRAL_FACE);

describe('ifade kataloğu', () => {
    it.each(EMOTE_NAMES.filter(n => !EMOTES[n].loop))('%s sonunda nötr yüze ve gövdeye döner', name => {
        const end = sampleEmote(compiledEmote(name), EMOTES[name].duration);
        expect(faceKey(end.face)).toBe(NEUTRAL_KEY);
        for (const [k, v] of Object.entries(NEUTRAL_BODY)) {
            expect(end.body[k as keyof typeof NEUTRAL_BODY]).toBeCloseTo(v, 6);
        }
    });

    it('her ifadenin ilk karesi 0 ms ve kareler süre içinde', () => {
        for (const name of EMOTE_NAMES) {
            const def = EMOTES[name];
            const ats = def.keys.map(k => k.at);
            expect(Math.min(...ats)).toBe(0);
            expect(Math.max(...ats)).toBeLessThanOrEqual(def.duration);
        }
    });

    it('bütün ifadeler × her 16 ms: yüz anahtarı sayısı önbelleği şişirmez', () => {
        const keys = new Set<string>();
        for (const name of EMOTE_NAMES) {
            const c = compiledEmote(name);
            for (let t = 0; t <= EMOTES[name].duration; t += 16) keys.add(faceKey(sampleEmote(c, t).face));
        }
        // Oyuncu × tema başına üst sınır; spriteCache WARN_AT_SIZE = 600.
        expect(keys.size).toBeLessThan(120);
    });
});

describe('örnekleyici', () => {
    it('aynı an → aynı poz (deterministik)', () => {
        const c = compiledEmote('happy');
        expect(sampleEmote(c, 333)).toEqual(sampleEmote(c, 333));
    });

    it('ayrık alanlar kare anında değişir', () => {
        const c = compiledEmote('surprised');
        expect(sampleEmote(c, 30).face.left.shape).toBe('dot');
        expect(sampleEmote(c, 60).face.left.shape).toBe('wide');
        expect(sampleEmote(c, 60).face.mouth).toBe('open');
    });

    it('step eğrisi ara değer üretmez (kutlamada tur geri sarılmaz)', () => {
        const c = compiledEmote('celebrate');
        expect(sampleEmote(c, 820.5).body.rot).toBeCloseTo(Math.PI * 2, 6);
        expect(sampleEmote(c, 821).body.rot).toBe(0);
        expect(sampleEmote(c, 1400).body.rot).toBe(0);
    });

    it('süs yalnızca kendi aralığında görünür', () => {
        const c = compiledEmote('surprised');
        expect(sampleEmote(c, 10).fx).toBeNull();
        expect(sampleEmote(c, 100).fx).toEqual({ kind: 'exclaim', ms: 60 });
        expect(sampleEmote(c, 900).fx).toBeNull();
    });

    it('döngülü ifade hiç bitmez ve periyotla tekrar eder', () => {
        const c = compiledEmote('sleepy');
        expect(emoteFinished(c, 1e7)).toBe(false);
        expect(sampleEmote(c, 500)).toEqual(sampleEmote(c, 500 + EMOTES.sleepy.duration * 3));
    });
});

describe('nicemleme', () => {
    it('kırpma (0.1) korunur, değerler sınırlara kırpılır', () => {
        const q = quantizeFace({ ...NEUTRAL_FACE, left: { shape: 'dot', open: 0.12 }, lookX: 3, eyeScale: 9 });
        expect(q.left.open).toBe(0.1);
        expect(q.lookX).toBe(1);
        expect(q.eyeScale).toBe(1.8);
    });
});

describe('denetleyici', () => {
    it('öncelik: düşük öncelikli ifade süreni kesemez, force keser', () => {
        const m = createMascotController();
        expect(m.trigger(1, 'celebrate', 0)).toBe(true);
        expect(m.trigger(1, 'blink', 100)).toBe(false);
        expect(m.active(1, 100)?.name).toBe('celebrate');
        expect(m.trigger(1, 'blink', 100, { force: true })).toBe(true);
        expect(m.active(1, 100)?.name).toBe('blink');
    });

    it('biten ifadenin yerine her ifade geçebilir; kimlikler bağımsız', () => {
        const m = createMascotController();
        m.trigger(1, 'celebrate', 0);
        m.trigger(2, 'blink', 0);
        expect(m.trigger(1, 'blink', EMOTES.celebrate.duration + 1)).toBe(true);
        expect(m.active(2, 50)?.name).toBe('blink');
    });

    it('ifade yokken boştaki yüzü verir; animating biter', () => {
        const m = createMascotController();
        expect(m.poseOf(1, 0, BLINK_FACE).face).toBe(BLINK_FACE);
        m.trigger(1, 'wink', 0);
        expect(m.animating(100)).toBe(true);
        expect(m.poseOf(1, 100, BLINK_FACE).face.right.shape).toBe('happy');
        expect(m.animating(EMOTES.wink.duration)).toBe(false);
    });

    it('stop döngülü ifadeyi bitirir; abonelere haber verir', () => {
        const m = createMascotController();
        const spy = vi.fn();
        const off = m.subscribe(spy);
        m.trigger(1, 'sleepy', 0);
        expect(m.animating(1e6)).toBe(true);
        m.stop(1, 'wink');
        expect(m.animating(1e6)).toBe(true);
        m.stop(1);
        expect(m.animating(1e6)).toBe(false);
        expect(spy).toHaveBeenCalledTimes(2);
        off();
        m.trigger(1, 'happy', 0);
        expect(spy).toHaveBeenCalledTimes(2);
    });
});

describe('boştaki yüz', () => {
    it('kırpma penceresi eski playerBlink ile aynı', () => {
        expect(blinkClosedAt('legacy', 4000 * 0.96)).toBe(true);
        expect(idleFaceAt('legacy', 1, 4000 * 0.96)).toBe(BLINK_FACE);
        expect(idleFaceAt('legacy', 1, 1000)).toBe(NEUTRAL_FACE);
    });

    it('deterministik ve bakınma yalnızca pencerede, yalnızca yatay', () => {
        let glances = 0;
        for (let cycle = 0; cycle < 200; cycle++) {
            const mid = cycle * 4000 + 4000 * 0.45;
            const f = idleFaceAt('legacy', 7, mid);
            expect(f).toEqual(idleFaceAt('legacy', 7, mid));
            expect(f.lookY).toBe(0);
            if (f.lookX !== 0) glances++;
            expect(idleFaceAt('legacy', 7, cycle * 4000 + 4000 * 0.2)).toBe(NEUTRAL_FACE);
        }
        // %20 hedef — seyrek ama var.
        expect(glances).toBeGreaterThan(15);
        expect(glances).toBeLessThan(70);
    });
});

describe('süs yerleşimi', () => {
    it('her süs sonlu değerler üretir', () => {
        for (const kind of ['exclaim', 'question', 'sweat', 'zzz', 'sparkle', 'hearts', 'stars', 'anger'] as const) {
            for (let ms = 0; ms < 3000; ms += 37) {
                for (const i of fxInstances({ kind, ms })) {
                    for (const v of [i.x, i.y, i.scale, i.alpha, i.rot]) expect(Number.isFinite(v)).toBe(true);
                    expect(i.alpha).toBeLessThanOrEqual(1);
                }
            }
        }
    });

    it('zzz döngü sınırında sıçramaz (uyuklama döngülü)', () => {
        const period = EMOTES.sleepy.duration;
        expect(fxInstances({ kind: 'zzz', ms: 0 })).toEqual(fxInstances({ kind: 'zzz', ms: period }));
    });
});
