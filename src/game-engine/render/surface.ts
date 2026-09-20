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

/** z-sırası bu dizinin sırasıdır: static en altta, actors en üstte. */
const LAYER_ORDER: LayerName[] = ['static', 'ambient', 'actors'];

export interface Surface {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
}

export interface Surfaces {
    host: HTMLElement;
    layers: Record<LayerName, Surface>;
    /** En son uygulanan CSS ölçüleri ve DPR — gereksiz temizlemeyi önler. */
    cssW: number;
    cssH: number;
    dpr: number;
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
        canvas.style.inset = '0';
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

    return { host, layers, cssW: 0, cssH: 0, dpr: 0 };
}

/**
 * Tuvalleri verilen CSS ölçüsüne ve DPR'ye ayarlar.
 *
 * Boyut gerçekten değişmediyse HİÇBİR ŞEY yapmaz: `canvas.width`'e yazmak —
 * aynı değeri yazmak bile — tuvali temizler ve durağan katmanı yok eder.
 *
 * @returns Ölçüler değiştiyse `true` (çağıran tüm katmanları geçersizleştirmeli).
 */
export function resize(surfaces: Surfaces, cssW: number, cssH: number, dpr: number): boolean {
    if (surfaces.cssW === cssW && surfaces.cssH === cssH && surfaces.dpr === dpr) {
        return false;
    }

    for (const name of LAYER_ORDER) {
        const { canvas, ctx } = surfaces.layers[name];
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
        canvas.style.width = `${cssW}px`;
        canvas.style.height = `${cssH}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    surfaces.cssW = cssW;
    surfaces.cssH = cssH;
    surfaces.dpr = dpr;
    return true;
}

/** Bir katmanın tamamını siler (CSS pikseli cinsinden — dönüşüm zaten kurulu). */
export function clearLayer(surfaces: Surfaces, name: LayerName): void {
    surfaces.layers[name].ctx.clearRect(0, 0, surfaces.cssW, surfaces.cssH);
}

/** Tuvalleri DOM'dan ayırır ve referansları bırakır. */
export function dispose(surfaces: Surfaces): void {
    for (const name of LAYER_ORDER) {
        surfaces.layers[name].canvas.remove();
    }
    surfaces.cssW = 0;
    surfaces.cssH = 0;
    surfaces.dpr = 0;
}
