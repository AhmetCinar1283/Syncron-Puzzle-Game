/**
 * DOSYA AMACI: `paintTokens`'ın SAF dizgi işleme yüzünü kanıtlamak —
 * `parseCssColor`, `parseBorder`, `parseBoxShadow`, `parseRadius` ve
 * `linear-gradient` açı dönüşümü.
 *
 * NEDEN yalnızca bunlar: tuvale çizim testi bu izin kapsamı dışında
 * (00-ilkeler §6.1 — test ortamı `node`, `CanvasRenderingContext2D` yok).
 * Bu ayrıştırıcılar ise saf girdi/çıktı; izde test edilmesi en kolay ve yanlış
 * gittiğinde beş temayı birden bozacak yer tam olarak burası.
 *
 * İçe aktarım kasıtlı olarak `paintTokens` üzerinden: faz planı §4.1 bu
 * yardımcıları oradan bekliyor (gövdeleri `cssValues.ts`'te).
 */

import { describe, expect, it } from 'vitest';
import { gradientEndpoints, parseBorder, parseBoxShadow, parseCssColor, parseRadius, splitTopLevel } from './paintTokens';

const BOX = { x: 0, y: 0, w: 64, h: 64 };

describe('splitTopLevel', () => {
    it('parantez içindeki virgülleri bölmez', () => {
        expect(splitTopLevel('inset 0 0 14px rgba(239, 68, 68, 0.3), 0 0 8px #fff', ','))
            .toEqual(['inset 0 0 14px rgba(239, 68, 68, 0.3)', '0 0 8px #fff']);
    });

    it('boşlukla bölerken rgba(...) tek parça kalır', () => {
        expect(splitTopLevel('1.5px solid rgba(0, 255, 136, 0.35)', ' '))
            .toEqual(['1.5px', 'solid', 'rgba(0, 255, 136, 0.35)']);
    });
});

describe('parseCssColor', () => {
    it('#rgb kısa yazımını açar', () => {
        expect(parseCssColor('#f0a')).toEqual({ r: 255, g: 0, b: 170, a: 1 });
    });

    it('#rrggbb okur', () => {
        expect(parseCssColor('#38bdf8')).toEqual({ r: 56, g: 189, b: 248, a: 1 });
    });

    it('rgb() alfasız gelince 1 varsayar', () => {
        expect(parseCssColor('rgb(13, 25, 40)')).toEqual({ r: 13, g: 25, b: 40, a: 1 });
    });

    it('rgba() alfasını okur', () => {
        expect(parseCssColor('rgba(147, 197, 253, 0.25)')).toEqual({ r: 147, g: 197, b: 253, a: 0.25 });
    });

    it('transparent tamamen saydamdır', () => {
        expect(parseCssColor('transparent')).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    });

    it('tanımadığı dizgide null döner', () => {
        expect(parseCssColor('rebeccapurple')).toBeNull();
        expect(parseCssColor('rgb(1, 2)')).toBeNull();
    });
});

describe('parseBorder', () => {
    it('ondalık kalınlığı ve rgba rengini ayırır', () => {
        expect(parseBorder('1.5px solid rgba(0, 255, 136, 0.35)'))
            .toEqual({ width: 1.5, style: 'solid', color: 'rgba(0, 255, 136, 0.35)' });
    });

    it('dashed stilini tanır', () => {
        expect(parseBorder('2px dashed #38bdf8')).toEqual({ width: 2, style: 'dashed', color: '#38bdf8' });
    });

    it('transparent kenarı renk olarak taşır', () => {
        expect(parseBorder('2px solid transparent')).toEqual({ width: 2, style: 'solid', color: 'transparent' });
    });

    it('tanımsız veya eksik girdide null döner', () => {
        expect(parseBorder(undefined)).toBeNull();
        expect(parseBorder('solid')).toBeNull();
    });
});

describe('parseBoxShadow', () => {
    it('inset pah çiftini sıraya sadık okur', () => {
        expect(parseBoxShadow('inset 2px 2px 0 #71717a, inset -2px -2px 0 #09090b')).toEqual([
            { inset: true, ox: 2, oy: 2, blur: 0, spread: 0, color: '#71717a' },
            { inset: true, ox: -2, oy: -2, blur: 0, spread: 0, color: '#09090b' },
        ]);
    });

    it('inset ve dış gölgeyi aynı listede ayırt eder', () => {
        expect(parseBoxShadow('inset 0 0 22px rgba(255,255,255,0.25), 0 0 12px rgba(0,0,0,0.4)')).toEqual([
            { inset: true, ox: 0, oy: 0, blur: 22, spread: 0, color: 'rgba(255,255,255,0.25)' },
            { inset: false, ox: 0, oy: 0, blur: 12, spread: 0, color: 'rgba(0,0,0,0.4)' },
        ]);
    });

    it('yayılma (spread) değerini okur', () => {
        expect(parseBoxShadow('0 0 0 2px #000')).toEqual([
            { inset: false, ox: 0, oy: 0, blur: 0, spread: 2, color: '#000' },
        ]);
    });

    it('none ve tanımsız boş liste verir', () => {
        expect(parseBoxShadow('none')).toEqual([]);
        expect(parseBoxShadow(undefined)).toEqual([]);
    });
});

describe('parseRadius', () => {
    it('px değerini okur', () => {
        expect(parseRadius('6px', BOX)).toBe(6);
    });

    it('yüzdeyi kutunun kısa kenarına göre çevirir', () => {
        expect(parseRadius('50%', BOX)).toBe(32);
    });

    it('kutunun yarısını aşamaz', () => {
        expect(parseRadius('200px', BOX)).toBe(32);
    });

    it('tanımsız ve geçersiz girdide 0 verir', () => {
        expect(parseRadius(undefined, BOX)).toBe(0);
        expect(parseRadius('0px', BOX)).toBe(0);
    });
});

describe('gradientEndpoints', () => {
    it('180deg yukarıdan aşağıya iner (CSS varsayılanı)', () => {
        const { x0, y0, x1, y1 } = gradientEndpoints(180, BOX);
        expect(x0).toBeCloseTo(32);
        expect(x1).toBeCloseTo(32);
        expect(y0).toBeCloseTo(0);
        expect(y1).toBeCloseTo(64);
    });

    it('0deg aşağıdan yukarı çıkar', () => {
        const { y0, y1 } = gradientEndpoints(0, BOX);
        expect(y0).toBeCloseTo(64);
        expect(y1).toBeCloseTo(0);
    });

    it('90deg soldan sağa gider', () => {
        const { x0, y0, x1, y1 } = gradientEndpoints(90, BOX);
        expect(x0).toBeCloseTo(0);
        expect(x1).toBeCloseTo(64);
        expect(y0).toBeCloseTo(32);
        expect(y1).toBeCloseTo(32);
    });

    it('135deg kareyi köşeden köşeye tarar', () => {
        // Karede 135deg gradient çizgisinin boyu w·|sin| + h·|cos| = 64·√2.
        const { x0, y0, x1, y1 } = gradientEndpoints(135, BOX);
        expect(Math.hypot(x1 - x0, y1 - y0)).toBeCloseTo(64 * Math.SQRT2);
        expect(x0).toBeCloseTo(0);
        expect(y0).toBeCloseTo(0);
        expect(x1).toBeCloseTo(64);
        expect(y1).toBeCloseTo(64);
    });
});
