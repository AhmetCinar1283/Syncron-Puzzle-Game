/**
 * DOSYA AMACI: Ölüm ve çarpışma keyframe'lerinin `filter` kısmının (renk kayması
 * ve parlama) KARE DÖNGÜSÜ çizimi. `TRACKS`'teki `layers`/`fx` ağırlıklarını
 * (`sampleTrack` üretir; zamanlama ve easing Faz 05'in yorumlayıcısında)
 * sprite varyantlarının `globalAlpha`'sına çevirir. `variants.ts` varyantları bir
 * kez rasterize eder; burada yalnızca `drawImage` + `globalAlpha` var.
 *
 * NEDEN renkli varyant, `source-atop` örtüsü değil (10-rapor §3): `source-atop`
 * tuvalin O ANKİ içeriğini boyar; `actors` tuvalinde altta başka varlıklar
 * duruyor, örtü onları da boyardı. Varyantlar ise varlığın kendi silüetine bağlı,
 * `grayscale`/`sepia`/`hue-rotate` gibi kaynaktaki filtrenin AYNISINI kullanır.
 *
 * KARIŞTIRMA KURALI: renk katmanları ardışık "üstüne çizme" ile ağırlıklı
 * ortalamaya çevrilir (her katmanın alfası = ağırlık / şimdiye kadarki toplam);
 * opak sprite'larda bu tam doğrusal karışımdır. Parlamalar gövdenin ARKASINA,
 * kendi ağırlıklarıyla çizilir.
 */

import type { EffectLayer } from '../motion';
import type { SpriteCache } from '../spriteCache';
import type { SpritePainter } from '../types';
import { filterVariantOf, haloVariantOf } from '../variants';

/** Bunun altındaki ağırlıklar çizilmez. */
const MIN_WEIGHT = 0.01;

export interface EffectDraw {
    /** `layers` dizini; `null` = filtresiz temel sprite. */
    layer: number | null;
    alpha: number;
}

export interface EffectPlan {
    /** Gövdenin arkasına, bu sırayla. */
    halos: EffectDraw[];
    /** Gövde: temel sprite ve renk varyantları, üst üste bu sırayla. */
    body: EffectDraw[];
}

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));

/**
 * Bir andaki ağırlıklardan çizim planı. Saf; tuvale dokunmaz.
 *
 * @param weights `Transform.fx`; `layers` ile aynı sırada, eksik = 0.
 */
export function planEffects(layers: readonly EffectLayer[] | undefined, weights: readonly number[] | undefined): EffectPlan {
    const plan: EffectPlan = { halos: [], body: [{ layer: null, alpha: 1 }] };
    if (!layers || !weights) return plan;

    const tints: EffectDraw[] = [];
    let tintTotal = 0;
    layers.forEach((layer, i) => {
        const w = clamp01(weights[i] ?? 0);
        if (w < MIN_WEIGHT) return;
        if (layer.kind === 'halo') {
            plan.halos.push({ layer: i, alpha: w });
        } else {
            tints.push({ layer: i, alpha: w });
            tintTotal += w;
        }
    });
    if (tints.length === 0) return plan;

    // Toplam 1'i aşarsa (yuvarlama) oranlanır; aşmazsa kalanı temel sprite alır.
    const scale = tintTotal > 1 ? 1 / tintTotal : 1;
    const baseWeight = Math.max(0, 1 - tintTotal * scale);
    const weighted: EffectDraw[] = [
        { layer: null, alpha: baseWeight },
        ...tints.map(t => ({ layer: t.layer, alpha: t.alpha * scale })),
    ].filter(d => d.alpha >= MIN_WEIGHT);

    // Ardışık "üstüne çizme": k. katmanın alfası = w_k / (w_0 + … + w_k).
    let cumulative = 0;
    plan.body = weighted.map(d => {
        cumulative += d.alpha;
        return { layer: d.layer, alpha: d.alpha / cumulative };
    });
    return plan;
}

/** Sprite'ı, merkezi şu anki dönüşümün başlangıcında olacak şekilde blit eder. */
function blitCentered<T>(ctx: CanvasRenderingContext2D, cache: SpriteCache, painter: SpritePainter<T>, input: T): void {
    const { w, h } = painter.size(input);
    ctx.drawImage(cache.get(painter, input), -w / 2, -h / 2, w, h);
}

/**
 * Varlık sprite'ını ortalı çizer; süren bir efekt varsa renk kayması ve parlaması
 * ile. `ctx.globalAlpha` çağıranın verdiği taban opaklıktır (sis × efekt opaklığı).
 */
export function blitWithEffects<T>(
    ctx: CanvasRenderingContext2D,
    cache: SpriteCache,
    painter: SpritePainter<T>,
    input: T,
    layers: readonly EffectLayer[] | undefined,
    weights: readonly number[] | undefined,
): void {
    if (!layers || !weights) {
        blitCentered(ctx, cache, painter, input);
        return;
    }

    const plan = planEffects(layers, weights);
    const alpha = ctx.globalAlpha;

    for (const halo of plan.halos) {
        const layer = layers[halo.layer as number];
        if (layer.kind !== 'halo') continue;
        ctx.globalAlpha = alpha * halo.alpha;
        blitCentered(ctx, cache, haloVariantOf(painter, layer), input);
    }

    for (const part of plan.body) {
        ctx.globalAlpha = alpha * part.alpha;
        const layer = part.layer === null ? null : layers[part.layer];
        if (layer && layer.kind === 'tint') {
            blitCentered(ctx, cache, filterVariantOf(painter, { filter: layer.filter, suffix: `fx:${layer.filter}` }), input);
        } else {
            blitCentered(ctx, cache, painter, input);
        }
    }

    ctx.globalAlpha = alpha;
}
