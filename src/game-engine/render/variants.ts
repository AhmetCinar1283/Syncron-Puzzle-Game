/**
 * DOSYA AMACI: Herhangi bir sprite'ın FİLTRELİ ve PARLAMALI varyantlarının
 * rasterleyicileri. `filter`/`drop-shadow` gerektiren her görünüm (sis karartması,
 * ölüm/çarpışma renk kayması ve parlaması) kare döngüsünde hesaplanmaz; buradaki
 * varyant bir kez rasterize edilir, kare döngüsü yalnızca `drawImage` +
 * `globalAlpha` yapar (00-ilkeler §2.1).
 *
 * `ctx.filter` ve gölge YALNIZCA bu dosyada, rasterizasyonda kullanılır.
 * `brightness`/`contrast`/`saturate`/`hue-rotate`/`sepia`/`grayscale` uzunluk
 * birimi taşımadığı için DPR sorunu yok; parlama uzunluk taşır ve `setShadow`
 * üzerinden DPR ile çarpılır (04b sözleşmesi).
 *
 * Varyant nesneleri temel rasterleyici başına bir kez üretilir (kare başına yeni
 * nesne oluşmasın diye).
 */

import type { SpritePainter } from './types';
import { rasterDprOf, registerRasterDpr, setShadow } from './paintTokens';

/**
 * Temel sprite'ı ara bir tuvale çizer. Filtre/gölge tek tek çizim işlemlerine
 * değil BİRLEŞİK görüntüye uygulansın diye (üst üste binen yarı saydam
 * katmanlar DOM'daki gibi etkilensin).
 *
 * @returns Ara tuval; temel çizim `false` döndürdüyse (ör. ikon yüklenmedi) veya
 * 2D bağlam yoksa `null` — çağıran `false` dönmeli, sprite önbelleğe girmemeli.
 */
function rasterizeBase<T>(ctx: CanvasRenderingContext2D, base: SpritePainter<T>, input: T): HTMLCanvasElement | null {
    const dpr = rasterDprOf(ctx);
    const { w, h } = base.size(input);
    const tmp = document.createElement('canvas');
    tmp.width = Math.max(1, Math.round(w * dpr));
    tmp.height = Math.max(1, Math.round(h * dpr));
    const tctx = tmp.getContext('2d');
    if (!tctx) return null;
    tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    registerRasterDpr(tctx, dpr);
    return base.draw(tctx, input) === false ? null : tmp;
}

const memo = new WeakMap<object, Map<string, object>>();

function memoized<T>(base: SpritePainter<T>, id: string, build: () => SpritePainter<T>): SpritePainter<T> {
    let byId = memo.get(base);
    if (!byId) {
        byId = new Map();
        memo.set(base, byId);
    }
    const known = byId.get(id);
    if (known) return known as SpritePainter<T>;
    const variant = build();
    byId.set(id, variant);
    return variant;
}

export interface FilterVariantSpec {
    /** CSS `filter` zinciri (`drop-shadow` hariç — parlama için `haloVariantOf`). */
    filter: string;
    /** Anahtar eki; aynı temel için farklı filtrelerde farklı olmalı. */
    suffix: string;
    /**
     * `ctx.filter` desteklenmeyen bağlamda sprite'ın üstüne `source-atop` ile
     * bindirilen renk. Verilmezse süzgeç yok sayılır ve temel sprite çizilir.
     */
    fallbackShade?: string;
}

/** Temel rasterleyici → süzgeçli varyantı. Anahtar `<temel>|<suffix>`. */
export function filterVariantOf<T>(base: SpritePainter<T>, spec: FilterVariantSpec): SpritePainter<T> {
    return memoized(base, `filter:${spec.suffix}`, () => ({
        key: input => `${base.key(input)}|${spec.suffix}`,

        size: input => base.size(input),

        draw(ctx, input) {
            const { w, h } = base.size(input);
            const tmp = rasterizeBase(ctx, base, input);
            if (!tmp) return false;

            ctx.save();
            // Desteklemeyen bağlamda `filter` özelliği hiç yok (`undefined`).
            if (typeof ctx.filter === 'string') {
                ctx.filter = spec.filter;
                ctx.drawImage(tmp, 0, 0, w, h);
            } else {
                ctx.drawImage(tmp, 0, 0, w, h);
                if (spec.fallbackShade) {
                    ctx.globalCompositeOperation = 'source-atop';
                    ctx.fillStyle = spec.fallbackShade;
                    ctx.fillRect(0, 0, w, h);
                }
            }
            ctx.restore();
            return true;
        },
    }));
}

/**
 * Bir parlamanın (`drop-shadow(0 0 blur color)`) YALNIZCA gölge kısmı: temel
 * sprite'ın silüetinden türeyen, gövdesi olmayan bir hale. Kutu her yönde `blur`
 * kadar büyür; çağıran gövdeyle AYNI merkeze blit etmeli (`entities/effects.ts`).
 */
export function haloVariantOf<T>(base: SpritePainter<T>, halo: { color: string; blur: number }): SpritePainter<T> {
    const pad = Math.ceil(halo.blur);
    /** Gövdeyi tuvalin dışına atıp gölgesini ofsetle içeri almak için; gövde hiç görünmez. */
    const OFFSET = 4096;

    return memoized(base, `halo:${halo.color}:${halo.blur}`, () => ({
        key: input => `${base.key(input)}|halo:${halo.color}:${halo.blur}`,

        size: input => {
            const { w, h } = base.size(input);
            return { w: w + pad * 2, h: h + pad * 2 };
        },

        draw(ctx, input) {
            const { w, h } = base.size(input);
            const tmp = rasterizeBase(ctx, base, input);
            if (!tmp) return false;

            ctx.save();
            setShadow(ctx, halo.color, halo.blur, OFFSET, 0);
            ctx.drawImage(tmp, pad - OFFSET, pad, w, h);
            ctx.restore();
            return true;
        },
    }));
}
