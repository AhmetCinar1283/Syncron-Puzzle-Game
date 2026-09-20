/**
 * DOSYA AMACI: Üç katmanlı tuval yüzeyini kurmak, DPR'yi bir kez ayarlamak ve
 * yeniden boyutlandırmayı yönetmek.
 *
 * NEDEN üç tuval: her katmanın kendi kare bütçesi var (00-ilkeler §2.3). Durağan
 * gövde bir kez çizilip orada kalır; ambient 20fps'e kısılır; yalnızca `actors`
 * tam hızda çizilir. Tek tuvalde bu ayrım mümkün değil — her kare her şeyi
 * yeniden çizmek gerekirdi.
 *
 * NEDEN çizim kodu DPR bilmez: ölçek burada `setTransform` ile bir kez kurulur
 * (00-ilkeler §3.3). Hücre koordinatları her yerde CSS pikselidir.
 */

import type { LayerName } from './types';

/**
 * Tuvalin tahta sınırının dışına verdiği pay (CSS pikseli). Çizim kodu bu
 * sayıyı BİLMEZ — dönüşüm matrisine bir kez gömülür (00-ilkeler §3.3).
 *
 * Faz 06'ya kadar tek bir 32 sabitiydi; oda dış parlaması 20px ve kenar
 * etiketleri ~6px taşıdığı için yetiyordu. Zafer koreografisi çok daha
 * fazlasını istiyor: şok dalgası tahta kenarını `min(w,h) * 0,19` kadar,
 * parçacıklar merkezden ~420px'e kadar aşıyor. Tam kapsama ~460px pay
 * demek — tuval alanı payla KARESEL büyüdüğü ve DPR² ile çarpıldığı için
 * giriş seviyesi telefonda kabul edilemez (512x512 tahtada 3 katman @DPR2:
 * 97 MB). Bu yüzden pay cihaz kademesine bağlandı (proje sahibi kararı):
 *
 *   | Kademe | Pay | 512x512 tahta, 3 katman, DPR 2 |
 *   |--------|-----|--------------------------------|
 *   | lite   |  64 | ~18,9 MB                       |
 *   | full   | 160 | ~32,5 MB                       |
 *
 * `lite` zaten hücre süslerini tamamen kapatan kademe (bkz. motionTier.ts),
 * yani cihaza göre görüntü ayrımı bu izde yeni bir ilke değil.
 */
export const BOARD_BLEED_LITE = 64;
export const BOARD_BLEED_FULL = 160;

/** Kademenin payı. `BoardCanvas` seçer; `surface.ts` kademeyi tanımaz. */
export function boardBleedFor(tier: 'full' | 'lite'): number {
    return tier === 'lite' ? BOARD_BLEED_LITE : BOARD_BLEED_FULL;
}

/** z-sırası bu dizinin sırasıdır: static en altta, actors en üstte. */
const LAYER_ORDER: LayerName[] = ['static', 'ambient', 'actors'];

export interface Surface {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
}

export interface Surfaces {
    host: HTMLElement;
    layers: Record<LayerName, Surface>;
    /** En son uygulanan CSS ölçüleri, DPR ve taşma payı — gereksiz temizlemeyi önler. */
    cssW: number;
    cssH: number;
    dpr: number;
    bleed: number;
}

/**
 * Cihaz piksel oranı üst sınırı. 3x ve 4x DPR telefonlarda sınırsız ölçek 9–16
 * kat piksel demek; bu izin amacı tam olarak o maliyetten kaçmak. 2x, bu
 * ekranlarda gözle ayırt edilemeyecek kadar keskin.
 */
export function currentDpr(): number {
    if (typeof window === 'undefined') return 1;
    return Math.min(window.devicePixelRatio || 1, 2);
}

/** Üç `<canvas>` üretir ve `host`'a üst üste yığar. */
export function createSurfaces(host: HTMLElement): Surfaces {
    const layers = {} as Record<LayerName, Surface>;

    LAYER_ORDER.forEach((name, i) => {
        const canvas = document.createElement('canvas');
        canvas.dataset.layer = name;
        canvas.style.position = 'absolute';
        // Konum ve ölçü `resize` içinde yazılır: pay orada belli oluyor.
        canvas.style.zIndex = String(i + 1);
        // Girdi bugünkü gibi BoardArea'nın swipe dinleyicilerinde kalıyor;
        // tuvaller dokunuşu yakalamamalı (isabet testi Faz 07).
        canvas.style.pointerEvents = 'none';
        host.appendChild(canvas);

        // `desynchronized`: WebView'e "bu tuvalin sunumunu DOM ile senkronlamak
        // zorunda değilsin" der, girdi gecikmesini düşürür.
        // `alpha`: static katmanında da şart — oda dışı boşluk saydam kalmalı.
        const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
        if (!ctx) throw new Error(`2D context alınamadı: ${name}`);
        layers[name] = { canvas, ctx };
    });

    return { host, layers, cssW: 0, cssH: 0, dpr: 0, bleed: 0 };
}

/**
 * Tuvalleri verilen CSS ölçüsüne, DPR'ye ve taşma payına ayarlar.
 *
 * Hiçbiri gerçekten değişmediyse HİÇBİR ŞEY yapmaz: `canvas.width`'e yazmak —
 * aynı değeri yazmak bile — tuvali temizler ve durağan katmanı yok eder.
 *
 * @returns Ölçüler değiştiyse `true` (çağıran tüm katmanları geçersizleştirmeli).
 */
export function resize(surfaces: Surfaces, cssW: number, cssH: number, dpr: number, bleed: number): boolean {
    if (surfaces.cssW === cssW && surfaces.cssH === cssH && surfaces.dpr === dpr && surfaces.bleed === bleed) {
        return false;
    }

    for (const name of LAYER_ORDER) {
        const { canvas, ctx } = surfaces.layers[name];
        const fullW = cssW + bleed * 2;
        const fullH = cssH + bleed * 2;
        canvas.width = Math.round(fullW * dpr);
        canvas.height = Math.round(fullH * dpr);
        canvas.style.width = `${fullW}px`;
        canvas.style.height = `${fullH}px`;
        // Tuval her yönde `bleed` büyük; kaydırılır ki (0,0) yerinde kalsın.
        canvas.style.left = `${-bleed}px`;
        canvas.style.top = `${-bleed}px`;
        ctx.setTransform(dpr, 0, 0, dpr, bleed * dpr, bleed * dpr);
    }

    surfaces.cssW = cssW;
    surfaces.cssH = cssH;
    surfaces.dpr = dpr;
    surfaces.bleed = bleed;
    return true;
}

/** Bir katmanın tamamını siler (CSS pikseli cinsinden — dönüşüm zaten kurulu). */
export function clearLayer(surfaces: Surfaces, name: LayerName): void {
    const b = surfaces.bleed;
    surfaces.layers[name].ctx.clearRect(-b, -b, surfaces.cssW + b * 2, surfaces.cssH + b * 2);
}

/** Tuvalleri DOM'dan ayırır ve referansları bırakır. */
export function dispose(surfaces: Surfaces): void {
    for (const name of LAYER_ORDER) {
        surfaces.layers[name].canvas.remove();
    }
    surfaces.cssW = 0;
    surfaces.cssH = 0;
    surfaces.dpr = 0;
    surfaces.bleed = 0;
}
