/**
 * DOSYA AMACI: Sprite önbelleğinin "bir kez rasterize et" garantisini kanıtlamak:
 * aynı anahtar `draw`'u bir kez, farklı anahtar ikinci kez çağırır; `clear()`
 * sonrası yeniden çağırır; `draw` `false` dönerse önbelleğe yazılmaz; 2D bağlamı
 * olmayan ortamda çökmez.
 *
 * NEDEN sahte `document`: proje test ortamı `node` ve `jsdom` kurulu değil
 * (bkz. vitest.config.mts). `spriteCache` yalnızca `document.createElement` ve
 * `getContext` kullandığı için yeni bağımlılık eklemek yerine bu ikisi taklit
 * edilir (00-ilkeler §8 — bu izde yeni bağımlılık beklenmiyor).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSpriteCache } from './spriteCache';
import type { SpritePainter } from './types';

interface FakeCanvas {
    width: number;
    height: number;
    getContext: (id: string) => unknown;
}

let created: FakeCanvas[] = [];
let hadDocument: boolean;
let savedDocument: unknown;

/** `withContext: false` → `getContext('2d')` null döner (bağlamsız ortam). */
function installFakeDocument(withContext: boolean) {
    created = [];
    const doc = {
        createElement: (tag: string) => {
            if (tag !== 'canvas') throw new Error(`beklenmeyen etiket: ${tag}`);
            const canvas: FakeCanvas = {
                width: 0,
                height: 0,
                getContext: () => (withContext ? { setTransform: () => {} } : null),
            };
            created.push(canvas);
            return canvas;
        },
    };
    (globalThis as { document?: unknown }).document = doc;
}

beforeEach(() => {
    hadDocument = 'document' in globalThis;
    savedDocument = (globalThis as { document?: unknown }).document;
});

afterEach(() => {
    if (hadDocument) (globalThis as { document?: unknown }).document = savedDocument;
    else delete (globalThis as { document?: unknown }).document;
});

interface Input { color: string; phase: number }

function makePainter(overrides: Partial<SpritePainter<Input>> = {}) {
    const draw = vi.fn<(ctx: CanvasRenderingContext2D, input: Input) => void | boolean>(() => undefined);
    const painter: SpritePainter<Input> = {
        key: i => `${i.color}|${i.phase}`,
        size: () => ({ w: 64, h: 64 }),
        draw,
        ...overrides,
    };
    return { painter, draw };
}

describe('createSpriteCache', () => {
    it('aynı girdide draw yalnızca bir kez çağrılır', () => {
        installFakeDocument(true);
        const cache = createSpriteCache(2);
        const { painter, draw } = makePainter();

        const first = cache.get(painter, { color: 'red', phase: 0 });
        const second = cache.get(painter, { color: 'red', phase: 0 });

        expect(draw).toHaveBeenCalledTimes(1);
        expect(second).toBe(first);
        expect(cache.size()).toBe(1);
    });

    it('farklı girdide draw ikinci kez çağrılır', () => {
        installFakeDocument(true);
        const cache = createSpriteCache(2);
        const { painter, draw } = makePainter();

        const a = cache.get(painter, { color: 'red', phase: 0 });
        const b = cache.get(painter, { color: 'red', phase: 1 });

        expect(draw).toHaveBeenCalledTimes(2);
        expect(b).not.toBe(a);
        expect(cache.size()).toBe(2);
    });

    it('clear() sonrası draw yeniden çağrılır', () => {
        installFakeDocument(true);
        const cache = createSpriteCache(2);
        const { painter, draw } = makePainter();

        cache.get(painter, { color: 'red', phase: 0 });
        cache.clear();
        expect(cache.size()).toBe(0);

        cache.get(painter, { color: 'red', phase: 0 });
        expect(draw).toHaveBeenCalledTimes(2);
    });

    it('tuval DPR ölçekli açılır ve dönüşüm bir kez kurulur', () => {
        installFakeDocument(true);
        const setTransform = vi.fn();
        (globalThis as { document: { createElement: (t: string) => unknown } }).document = {
            createElement: () => {
                const canvas: FakeCanvas = { width: 0, height: 0, getContext: () => ({ setTransform }) };
                created.push(canvas);
                return canvas;
            },
        };

        const cache = createSpriteCache(2);
        const { painter } = makePainter();
        cache.get(painter, { color: 'red', phase: 0 });

        expect(created[0].width).toBe(128);   // 64 CSS px * dpr 2
        expect(created[0].height).toBe(128);
        expect(setTransform).toHaveBeenCalledWith(2, 0, 0, 2, 0, 0);
    });

    it('draw false dönerse sprite önbelleğe alınmaz ve yeniden denenir', () => {
        installFakeDocument(true);
        const cache = createSpriteCache(1);
        // İlk çağrıda kaynak hazır değil (ör. ikon yüklenmemiş), ikincide hazır.
        const draw = vi.fn<(ctx: CanvasRenderingContext2D, input: Input) => void | boolean>()
            .mockReturnValueOnce(false)
            .mockReturnValueOnce(undefined);
        const { painter } = makePainter({ draw });

        cache.get(painter, { color: 'red', phase: 0 });
        expect(cache.size()).toBe(0);

        cache.get(painter, { color: 'red', phase: 0 });
        expect(draw).toHaveBeenCalledTimes(2);
        expect(cache.size()).toBe(1);
    });

    it('2D bağlamı olmayan ortamda çökmez: draw atlanır, boş tuval döner', () => {
        installFakeDocument(false);
        const cache = createSpriteCache(2);
        const { painter, draw } = makePainter();

        const canvas = cache.get(painter, { color: 'red', phase: 0 });

        expect(canvas).toBeDefined();
        expect(draw).not.toHaveBeenCalled();
        expect(cache.size()).toBe(0);
    });
});
