/**
 * DOSYA AMACI: Zafer koreografisinin ÇİZİMİ — vignette, 36 parçacık, iki şok
 * dalgası, hayalet izler, oyuncular ve süpernova. `drawActorsLayer` içinden
 * çağrılan tek giriş noktası (faz planı §3).
 *
 * Koreografi matematiği ve durumu `victoryState.ts`'te; rasterleyiciler
 * `victorySprites.ts`'te. Buradan hepsi yeniden dışa aktarılır, böylece
 * çağıranlar tek modül görür.
 *
 * Bu dosyada gölge/filtre YOK (00-ilkeler §2.1): kare döngüsünde yalnızca
 * `drawImage`, dönüşüm, `globalAlpha`, `arc`/`stroke` ve şok dalgasının
 * radial gradient'i var.
 */

import type { SpriteCache } from './spriteCache';
import { parseCssColor, toCss } from './paintTokens';
import { TRAIL_BLURS, advanceVictory } from './victoryState';
import type { VictoryState } from './victoryState';
import {
    PARTICLE_BOX,
    SUPERNOVA_SIZE,
    VIGNETTE_INSET,
    victoryParticleSprite,
    victoryPlayerSprite,
    victorySupernovaSprite,
    victoryVignetteBox,
    victoryVignetteSprite,
} from './victorySprites';
import type { VictoryPlayerInput } from './victorySprites';

export {
    VICTORY_CELEBRATION_DURATION,
    advanceVictory,
    createVictoryState,
    createVictoryTracker,
} from './victoryState';
export type { VictoryState, VictoryTracker } from './victoryState';

const DEG_TO_RAD = Math.PI / 180;

/** Her önbelleğin ŞU AN tuttuğu vignette anahtarı. */
const vignetteSlots = new WeakMap<SpriteCache, string>();

/**
 * Vignette sprite'ı — önbellekteki TEK YUVALI girdi.
 *
 * 00-ilkeler §3.1'in "ayıklama yok" kararının bilinçli tek istisnası (Faz 07,
 * 06-rapor §4.1). Gerekçe o kararın kendisi: ayıklama yasağı "animasyon
 * sürerken yeniden rasterizasyon tetiklenmesin" diye konmuştu. Vignette ise
 * koreografinin İLK karesinde üretilir ve tahta boyutu koreografi sırasında
 * değişmez; boyut ancak koreografiler ARASINDA değişir, yani eski vignette'i
 * silmek animasyon sürerken hiçbir şeyi yeniden rasterize ettirmez.
 * Vignette önbelleğin en pahalı girdisi (640x640, DPR 2: 1,98 MB); her boyut
 * için bir tane biriktirmek bunu boşa büyütürdü.
 *
 * Genel bir ayıklama mekanizması DEĞİL: yalnızca bu girdi, yalnızca burada.
 */
function vignetteSprite(cache: SpriteCache, input: { w: number; h: number }): HTMLCanvasElement {
    const key = victoryVignetteSprite.key(input);
    const held = vignetteSlots.get(cache);
    if (held !== undefined && held !== key) cache.delete(held);
    vignetteSlots.set(cache, key);
    return cache.get(victoryVignetteSprite, input);
}

/**
 * `drop-shadow(0 0 Npx c)` taşıyan bir halka. Parlama, halkanın iki yanına
 * SABİT genişlikte bir radial gradient şeridi olarak çizilir (faz planı §4.4).
 *
 * NEDEN gradient her karede yeniden kuruluyor (planın §4.4'teki "birim yarıçapta
 * hazırla ve `ctx.scale` ile ölçekle" önerisinin aksine): ölçekleme parlamanın
 * GENİŞLİĞİNİ de büyütürdü ve §4.4'ün asıl şartı parlamanın her yarıçapta sabit
 * kalması. Sabit genişlikli bir şeridi değişen yarıçapta veren tek bir gradient
 * nesnesi matematiksel olarak mümkün değil. Bedel ölçülü: şok dalgaları ~315ms
 * sürüyor, yani tüm koreografi boyunca iki halka için toplam ~38 gradient.
 */
function drawGlowRing(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    radius: number,
    width: number,
    color: string,
    glowBlur: number,
    alpha: number,
): void {
    if (radius <= 0 || alpha <= 0) return;
    const rgba = parseCssColor(color);
    if (!rgba) return;

    // CSS `drop-shadow(0 0 Npx)` = standart sapması N/2 olan Gauss; görünür
    // sınırı ~3σ. Tepe genliği, `width` kalınlığındaki çizginin yayılmış hâli.
    const sigma = glowBlur / 2;
    const reach = sigma * 3;
    const inner = Math.max(0, radius - reach);
    const outer = radius + reach;
    const peak = Math.min(1, width / (sigma * Math.sqrt(2 * Math.PI)));

    ctx.save();
    ctx.globalAlpha = alpha;

    const gradient = ctx.createRadialGradient(cx, cy, inner, cx, cy, outer);
    for (let i = 0; i <= 8; i++) {
        const t = i / 8;
        const d = (inner + (outer - inner) * t - radius) / sigma;
        gradient.addColorStop(t, toCss(rgba, peak * Math.exp(-0.5 * d * d)));
    }
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, outer, 0, Math.PI * 2);
    ctx.arc(cx, cy, inner, 0, Math.PI * 2, true);
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
}

/** Sprite'ı, merkezi şu anki dönüşümün başlangıcında olacak şekilde blit eder. */
function blitCentered(ctx: CanvasRenderingContext2D, sprite: CanvasImageSource, w: number, h: number): void {
    ctx.drawImage(sprite, -w / 2, -h / 2, w, h);
}

/** Bir oyuncu kopyasını (ana grafik veya hayalet iz) çizer. */
function drawCopy(
    ctx: CanvasRenderingContext2D,
    cache: SpriteCache,
    input: VictoryPlayerInput,
    tr: { x: number; y: number; scale: number; rotation: number; opacity: number },
): void {
    const { w, h } = victoryPlayerSprite.size(input);
    ctx.save();
    ctx.globalAlpha = tr.opacity;
    // DOM sırası: `translate3d(...) scale(...) rotate(...)`.
    ctx.translate(tr.x, tr.y);
    ctx.scale(tr.scale, tr.scale);
    ctx.rotate(tr.rotation * DEG_TO_RAD);
    blitCentered(ctx, cache.get(victoryPlayerSprite, input), w, h);
    ctx.restore();
}

/**
 * Koreografiyi bir kare ilerletir ve çizer.
 *
 * ÇİZİM SIRASI kaynaktaki yığılma sırasının aynısı: vignette → parçacıklar →
 * şok dalgaları → hayalet izler (hepsi `z-index: auto`, belge sırasında) →
 * oyuncular (`z-index: 160 + idx`) → süpernova (`z-index: 200`).
 *
 * @returns Koreografi sürüyorsa `true`. `false` döndüğünde hiçbir şey ÇİZİLMEZ
 * ve çağıran artık bu durumu kullanmaz (00-ilkeler §3.4).
 */
export function drawVictory(
    ctx: CanvasRenderingContext2D,
    state: VictoryState,
    cache: SpriteCache,
    now: number,
): boolean {
    const progress = Math.min(1, (now - state.startedAt) / state.durationMs);
    if (progress >= 1) return false;

    advanceVictory(state, progress);

    const { cx, cy, burst } = state;

    ctx.save();
    const vignetteInput = { w: state.boardW, h: state.boardH };
    const vignette = victoryVignetteBox(vignetteInput);
    // Sprite yarı çözünürlükte; iki katına ölçeklenirken yumuşatma açık kalmalı.
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(
        vignetteSprite(cache, vignetteInput),
        -VIGNETTE_INSET, -VIGNETTE_INSET, vignette.w, vignette.h,
    );

    for (const pt of state.particles) {
        if (pt.opacity <= 0.01) continue;
        const sprite = cache.get(victoryParticleSprite, { shape: pt.shape, color: pt.color });
        ctx.save();
        ctx.globalAlpha = pt.opacity;
        ctx.translate(pt.x, pt.y);
        ctx.rotate(pt.rotation * DEG_TO_RAD);
        // `scale(p.size / 10)`: daire için de aynı çarpan, çünkü sprite
        // `size = 10` referansında (r = 5) çizildi → r = p.size / 2.
        ctx.scale(pt.size / 10, pt.size / 10);
        blitCentered(ctx, sprite, PARTICLE_BOX, PARTICLE_BOX);
        ctx.restore();
    }

    if (burst.active && burst.shockwaveOpacity > 0.01) {
        drawGlowRing(ctx, cx, cy, burst.shockwaveRadius, 3, '#00ff88', 12, burst.shockwaveOpacity);
        drawGlowRing(ctx, cx, cy, burst.shockwaveRadius * 0.72, 2, '#ffd700', 8, burst.shockwaveOpacity * 0.85);
    }

    state.states.forEach((st, idx) => {
        const cfg = state.configs[idx];
        if (!cfg) return;
        st.trails.forEach((tr, tIdx) => {
            if (tr.opacity <= 0.01) return;
            drawCopy(ctx, cache, { base: cfg.base, blur: TRAIL_BLURS[tIdx] ?? 1.5 }, tr);
        });
    });

    state.states.forEach((st, idx) => {
        const cfg = state.configs[idx];
        if (!cfg || st.opacity <= 0.01) return;
        drawCopy(ctx, cache, { base: cfg.base, blur: 0 }, st);
    });

    if (burst.active && burst.scale > 0.05) {
        ctx.save();
        ctx.globalAlpha = burst.opacity;
        ctx.translate(cx, cy);
        ctx.scale(burst.scale, burst.scale);
        ctx.rotate(burst.scale * 120 * DEG_TO_RAD);
        blitCentered(ctx, cache.get(victorySupernovaSprite, {}), SUPERNOVA_SIZE, SUPERNOVA_SIZE);
        ctx.restore();
    }

    ctx.restore();
    return true;
}

