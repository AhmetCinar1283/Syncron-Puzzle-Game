/**
 * DOSYA AMACI: Zafer koreografisinin RASTERLEYİCİLERİ — vignette, parçacık
 * şekilleri, süpernova yıldızı ve oyuncunun zafer varyantları (ana + üç bulanık
 * hayalet iz). Değerler `components/effects/VictoryCelebration.tsx`'ten BİREBİR
 * okundu (00-ilkeler §4).
 *
 * NEDEN `victory.ts`'ten ayrı: koreografi matematiği ile rasterizasyon iki ayrı
 * iş ve birlikte ~450 satır ediyordu (00-ilkeler §1). `motion.ts` ↔ `entityMotion.ts`
 * ile aynı bölme.
 *
 * Gölge/parlama burada serbesttir — kare döngüsünde değil (00-ilkeler §2.1).
 * Bulanıklık `blur.ts` üzerinden; bu dosyada `ctx.filter` yok (tek kullanıcısı
 * `cells/dim.ts`, sis karartması).
 */

import type { SpritePainter } from './types';
import { getPlayerColor } from '../components/playerColors';
import { getThemeConfig } from '../themes/themeConfig';
import { outerGlow, registerRasterDpr, rasterDprOf, roundRectPath } from './paintTokens';
import { blurCanvas, blurPad } from './blur';
import { faceKey } from '../mascot/pose';
// `./entities` (index) DEĞİL, doğrudan `./entities/player`: index bu dosyayı
// dolaylı olarak içe aktarıyor ve barrel üzerinden geçmek döngü kurardı.
import { playerSprite } from './entities/player';
import type { PlayerSpriteInput } from './entities/player';

/** Kaynak dosyadaki parçacık şekilleri. */
export type VictoryShape = 'star' | 'circle' | 'sparkle';

/** `const shapes = ['star', 'circle', 'sparkle']` — indeks sırası korunur. */
export const PARTICLE_SHAPES: VictoryShape[] = ['star', 'circle', 'sparkle'];

/** `const colors = [...]` — indeks sırası korunur. */
export const PARTICLE_COLORS = ['#ffd700', '#00ff88', '#00c4ff', '#d946ef', '#f97316', '#ffffff'];

/**
 * Bir parçacık kutusunun kenar uzunluğu — kaynak dosyadaki `PARTICLE_BOX`.
 * Şekiller kutunun MERKEZİNE çizilir (SVG viewBox'ı orijini ortalıyordu).
 */
export const PARTICLE_BOX = 64;

/** Vignette div'inin `inset: -40` değeri. */
export const VIGNETTE_INSET = 40;

/** Süpernova SVG'sinin viewBox kenarı (`-48 -48 96 96`). */
const SUPERNOVA_BOX = 96;

/** Yıldızın en geniş parlaması (`drop-shadow(0 0 45px #00ff88)`). */
const SUPERNOVA_PAD = 45;

/**
 * Süpernova sprite'ı doğal boyutunun kaç katı çözünürlükte rasterize edilir.
 *
 * NEDEN 1 değil: yıldız kare döngüsünde `scale(3.0..4.0)` ile büyütülüyor. 1x
 * rasterize edilse beyaz çapraz ışınların kenarı 3,4 kat büyütülmüş olurdu ve
 * DOM'daki keskin SVG'den bariz ayrılırdı. 2x'te büyütme 1,7 kata iner.
 * Bedeli tek bir sprite'ta ödenir; sayı rapora yazılıdır (06-rapor §6).
 */
export const SUPERNOVA_RASTER = 2;

/** Sprite'ın CSS piksel cinsinden çizim kutusu (blit bu ölçüyle yapılır). */
export const SUPERNOVA_SIZE = SUPERNOVA_BOX + SUPERNOVA_PAD * 2;

const STAR_PATH = 'M0,-8 L2,-2 L8,-2 L3,2 L5,8 L0,4 L-5,8 L-3,2 L-8,-2 L-2,-2 Z';
const SPARKLE_PATH = 'M0,-10 Q1,-2 10,0 Q1,2 0,10 Q-1,2 -10,0 Q-1,-2 0,-10 Z';
const SUPERNOVA_PATH = 'M0,-46 L6,-12 L46,0 L6,12 L0,46 L-6,12 L-46,0 L-6,-12 Z';
const SUPERNOVA_CROSS = 'M0,-30 L4,-8 L30,0 L4,8 L0,30 L-4,8 L-30,0 L-4,-8 Z';

// ─── Parçacıklar ────────────────────────────────────────────────────────────

export interface VictoryParticleInput {
    shape: VictoryShape;
    color: string;
}

/**
 * Şekil × renk başına TEK sprite (faz planı §4.3). Kaynakta şekil `i % 3`,
 * renk `i % 6` ile seçildiği için gerçekte yalnızca ALTI kombinasyon doğuyor.
 *
 * Kaynak, yıldız ve parıltıyı `scale(p.size / 10)` ile büyütüyor; parlama da o
 * ölçekle büyüyor. Bu yüzden sprite `size = 10` referansında çizilir ve kare
 * döngüsünde `ctx.scale(p.size / 10)` uygulanır.
 */
export const victoryParticleSprite: SpritePainter<VictoryParticleInput> = {
    key: input => `victoryParticle|${input.shape}|${input.color}`,

    size: () => ({ w: PARTICLE_BOX, h: PARTICLE_BOX }),

    draw(ctx, input) {
        const c = PARTICLE_BOX / 2;
        ctx.save();
        ctx.translate(c, c);
        ctx.fillStyle = input.color;

        if (input.shape === 'circle') {
            // `<circle r={p.size / 2} />`; referans `size = 10` → r = 5.
            const drawShape = () => {
                ctx.beginPath();
                ctx.arc(0, 0, 5, 0, Math.PI * 2);
                ctx.fill();
            };
            outerGlow(ctx, drawShape, input.color, 4);
            drawShape();
        } else {
            const path = new Path2D(input.shape === 'star' ? STAR_PATH : SPARKLE_PATH);
            const blur = input.shape === 'star' ? 6 : 8;
            outerGlow(ctx, () => ctx.fill(path), input.color, blur);
            ctx.fill(path);
        }

        ctx.restore();
    },
};

// ─── Vignette ───────────────────────────────────────────────────────────────

/**
 * Vignette'in rasterizasyon çözünürlüğü (Faz 07, 06-rapor §4.1 kararı).
 * Vignette düz bir radial gradient, yüksek frekanslı detayı yok; yarı
 * çözünürlükte rasterize edilip blit'te iki katına ölçeklenmesi gözle
 * ayırt edilemez ve 640x640 tahtada belleği 7,91 MB'tan 1,98 MB'a indirir.
 */
export const VIGNETTE_RASTER = 0.5;

/** Vignette'in CSS piksel cinsinden GÖRÜNEN kutusu (blit bu ölçüyle yapılır). */
export function victoryVignetteBox(input: { w: number; h: number }): { w: number; h: number } {
    return { w: input.w + VIGNETTE_INSET * 2, h: input.h + VIGNETTE_INSET * 2 };
}

/**
 * Tahtayı karartan sinematik vignette (faz planı §4.5). Tahta boyutu
 * değişmediği sürece tek sprite; boyut değişince eskisi önbellekten silinir
 * (bkz. `victory.ts`, tek yuvalı istisna).
 *
 * `size()` sprite'ın GERÇEK (yarı çözünürlüklü) kutusunu verir, blit ölçüsünü
 * değil — blit için `victoryVignetteBox` kullanılır. `SUPERNOVA_RASTER` ile
 * aynı sözleşme, ters yönde.
 *
 * `radial-gradient(circle at center, ...)`in CSS varsayılan yayılımı
 * `farthest-corner`; yarıçap bu yüzden kutunun köşesine olan uzaklıktır.
 * %75'ten sonrası son durağa sabitlenir — canvas gradient'i de öyle yapar.
 */
export const victoryVignetteSprite: SpritePainter<{ w: number; h: number }> = {
    key: input => `vignette|${input.w}x${input.h}`,

    size(input) {
        const box = victoryVignetteBox(input);
        return { w: box.w * VIGNETTE_RASTER, h: box.h * VIGNETTE_RASTER };
    },

    draw(ctx, input) {
        const { w, h } = victoryVignetteBox(input);
        const cx = w / 2;
        const cy = h / 2;

        ctx.save();
        // Çizim tam boyutta kalır; yarım ölçek tuvale sığdırır.
        ctx.scale(VIGNETTE_RASTER, VIGNETTE_RASTER);
        roundRectPath(ctx, { x: 0, y: 0, w, h }, 24);
        ctx.clip();
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(cx, cy));
        gradient.addColorStop(0, 'rgba(0, 255, 136, 0.12)');
        gradient.addColorStop(0.75, 'rgba(3, 7, 18, 0.45)');
        gradient.addColorStop(1, 'rgba(3, 7, 18, 0.45)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
    },
};

// ─── Süpernova yıldızı ──────────────────────────────────────────────────────

/**
 * Merkezdeki 8 köşeli patlama. Tek sprite; kare döngüsünde `scale` + `rotate`.
 *
 * DİKKAT — `supernovaGrad` `cx="0%" cy="0%" r="50%"` tanımlı ve
 * `gradientUnits` varsayılanı `objectBoundingBox`. Yani gradient'in merkezi
 * yıldızın sınırlayıcı kutusunun SOL ÜST KÖŞESİ (-46,-46), yarıçapı 46.
 * Yıldızın büyük kısmı son durağın (`rgba(0,255,136,0)`) ötesinde kalır ve
 * SAYDAM çizilir. Görünen şey aslında sol üst uca doğru bir beyaz-altın
 * yıkama artı parlamalar. Bu bir hata gibi duruyor ama DOM'daki görüntü bu;
 * 00-ilkeler §4 gereği birebir taşındı, "düzeltilmedi".
 */
export const victorySupernovaSprite: SpritePainter<Record<string, never>> = {
    key: () => 'victorySupernova',

    size: () => ({ w: SUPERNOVA_SIZE * SUPERNOVA_RASTER, h: SUPERNOVA_SIZE * SUPERNOVA_RASTER }),

    draw(ctx) {
        const c = (SUPERNOVA_SIZE / 2) * SUPERNOVA_RASTER;
        ctx.save();
        ctx.translate(c, c);
        ctx.scale(SUPERNOVA_RASTER, SUPERNOVA_RASTER);

        const gradient = ctx.createRadialGradient(-46, -46, 0, -46, -46, 46);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.45, '#ffd700');
        gradient.addColorStop(0.8, '#00ff88');
        gradient.addColorStop(1, 'rgba(0,255,136,0)');

        const star = new Path2D(SUPERNOVA_PATH);
        ctx.fillStyle = gradient;
        outerGlow(ctx, () => ctx.fill(star), '#00ff88', 45);
        outerGlow(ctx, () => ctx.fill(star), '#ffd700', 24);
        ctx.fill(star);

        // `transform="rotate(45)"` — çapraz küçük ışınlar.
        ctx.save();
        ctx.rotate(Math.PI / 4);
        const cross = new Path2D(SUPERNOVA_CROSS);
        ctx.fillStyle = '#ffffff';
        outerGlow(ctx, () => ctx.fill(cross), '#ffffff', 14);
        ctx.fill(cross);
        ctx.restore();

        const core = () => {
            ctx.beginPath();
            ctx.arc(0, 0, 14, 0, Math.PI * 2);
            ctx.fill();
        };
        ctx.fillStyle = '#ffffff';
        outerGlow(ctx, core, '#ffffff', 10);
        core();

        ctx.restore();
    },
};

// ─── Oyuncu: ana grafik ve bulanık hayalet izler ────────────────────────────

export interface VictoryPlayerInput {
    /** Faz 05'in oyuncu girdisi; göz kırpma ve nabız DONDURULMUŞ hâlde. */
    base: PlayerSpriteInput;
    /** 0 = ana grafik. >0 = hayalet izin `blur(Npx)` yarıçapı. */
    blur: number;
}

/** Ana grafiğin `drop-shadow(0 0 30px glow)`u; hayalet izinki 10px. */
function victoryPad(input: VictoryPlayerInput): number {
    return input.blur > 0 ? blurPad(input.blur) + 10 : 30;
}

/**
 * Zafer koreografisindeki oyuncu. Faz 05'in `playerSprite`'ı ara bir tuvale
 * çizilir, gerekiyorsa bulanıklaştırılır, sonra parlamalarıyla blit edilir.
 *
 * Göz kırpma ve neon nabzı DONDURULMUŞ: kaynaktaki `[data-victory-freeze] *
 * { animation: none }` kuralı animasyonu durdurmuyor, BAŞLANGIÇ durumuna
 * döndürüyor — yani nötr yüz (zaferde mutlu yüz, bkz. victoryState.ts) ve nabız `scale(1)`
 * (`pulsePhase: 0`). Girdiyi kuran `victory.ts`.
 */
export const victoryPlayerSprite: SpritePainter<VictoryPlayerInput> = {
    key(input) {
        const styleType = getThemeConfig(input.base.theme).player.styleType;
        return `victoryPlayer|${styleType}|${input.base.playerIndex}|${input.base.mode}`
            + `|${input.base.locked ? 1 : 0}|${faceKey(input.base.face)}|blur${input.blur}`;
    },

    size(input) {
        const base = playerSprite.size(input.base);
        const pad = victoryPad(input);
        return { w: base.w + pad * 2, h: base.h + pad * 2 };
    },

    draw(ctx, input) {
        const dpr = rasterDprOf(ctx);
        const base = playerSprite.size(input.base);

        const tmp = document.createElement('canvas');
        tmp.width = Math.max(1, Math.round(base.w * dpr));
        tmp.height = Math.max(1, Math.round(base.h * dpr));
        const tctx = tmp.getContext('2d');
        if (!tctx) return false;
        tctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        registerRasterDpr(tctx, dpr);

        // Kilit ikonu henüz yüklenmemişse sprite önbelleğe ALINMAZ (01-rapor §6.5).
        if (playerSprite.draw(tctx, input.base) === false) return false;

        if (input.blur > 0) blurCanvas(tmp, input.blur, dpr);

        const pad = victoryPad(input);
        const blit = () => ctx.drawImage(tmp, pad, pad, base.w, base.h);
        const { primary, glow } = getPlayerColor(input.base.playerIndex);

        // CSS'te zincirlenen `drop-shadow`lar birbirinin sonucuna uygulanır;
        // `paintTokens.outerShadows` ile aynı yaklaşım kullanıldı: her parlama
        // şeklin kendisinden çizilir, en genişi en altta kalır.
        if (input.blur > 0) {
            outerGlow(ctx, blit, primary, 10);
        } else {
            outerGlow(ctx, blit, glow, 30);
            outerGlow(ctx, blit, primary, 16);
        }
        blit();
        return true;
    },
};
