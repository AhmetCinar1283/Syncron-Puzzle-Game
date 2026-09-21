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

/**
 * `static` ve `ambient` katmanlarının payı (Faz 04b değeri): kenar etiketleri ve
 * oda dış parlaması. Zafer koreografisi bu katmanlarda çizilmez, dolayısıyla
 * kademenin büyük payını ödemezler.
 */
export const BOARD_BLEED_BASE = 32;

/**
 * Kademenin payı = `actors` katmanının payı (zafer koreografisi yalnızca orada
 * çiziliyor). `BoardCanvas` seçer; `surface.ts` kademeyi tanımaz.
 */
export function boardBleedFor(tier: 'full' | 'lite'): number {
    return tier === 'lite' ? BOARD_BLEED_LITE : BOARD_BLEED_FULL;
}

/** Pay bir KATMAN özelliğidir (09-kapanis §2.1); `actorsBleed` kademenin payıdır. */
export function layerBleed(name: LayerName, actorsBleed: number): number {
    return name === 'actors' ? actorsBleed : BOARD_BLEED_BASE;
}

/**
 * Bir katmanın tuval geometrisi: CSS ölçüsü, konumu ve `setTransform` kaydırması.
 * Saf hesap — hizalama testi bunu kilitler: `left + tx / dpr === 0`, yani her
 * katmanın (0,0)'ı tahtanın (0,0)'ına oturur ve katmanlar ekranda hizalı kalır.
 */
export function layerGeometry(name: LayerName, cssW: number, cssH: number, dpr: number, actorsBleed: number) {
    const bleed = layerBleed(name, actorsBleed);
    return {
        bleed,
        fullW: cssW + bleed * 2,
        fullH: cssH + bleed * 2,
        pxW: Math.round((cssW + bleed * 2) * dpr),
        pxH: Math.round((cssH + bleed * 2) * dpr),
        left: -bleed,
        top: -bleed,
        tx: bleed * dpr,
        ty: bleed * dpr,
    };
}

/** z-sırası bu dizinin sırasıdır: static en altta, actors en üstte. */
const LAYER_ORDER: LayerName[] = ['static', 'ambient', 'actors'];

export interface Surface {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    /** Bu katmanın uygulanan payı (CSS pikseli); `resize` yazar. */
    bleed: number;
}

export interface Surfaces {
    host: HTMLElement;
    /** Yalnızca GERÇEKTEN oluşturulan katmanlar; `lite` kademede `ambient` yok. */
    layers: Partial<Record<LayerName, Surface>>;
    /** Oluşturulan katmanlar, z-sırasında. Tüm döngüler bunu gezer. */
    names: LayerName[];
    /** En son uygulanan CSS ölçüleri, DPR ve `actors` payı — gereksiz temizlemeyi önler. */
    cssW: number;
    cssH: number;
    dpr: number;
    bleed: number;
}

/**
 * Cihaz piksel oranı üst sınırları. 3x ve 4x DPR telefonlarda sınırsız ölçek
 * 9–16 kat piksel demek; bu izin amacı tam olarak o maliyetten kaçmak. 2x, bu
 * ekranlarda gözle ayırt edilemeyecek kadar keskin.
 *
 * `lite` kademede sınır 1,5: tuval belleği DPR'nin KARESİYLE büyüyor
 * (512x512 tahta, üç katman, pay 64 → DPR 2'de 18,8 MB, DPR 1,5'te 10,6 MB) ve
 * bu kademe zaten zayıf cihazı işaret ediyor (faz planı §2.5).
 */
export const MAX_DPR_FULL = 2;
export const MAX_DPR_LITE = 1.5;

export function currentDpr(tier: 'full' | 'lite' = 'full'): number {
    if (typeof window === 'undefined') return 1;
    return Math.min(window.devicePixelRatio || 1, tier === 'lite' ? MAX_DPR_LITE : MAX_DPR_FULL);
}

/**
 * Bu ortam 2D tuval bağlamı verebiliyor mu? `getContext('2d')` çok eski
 * WebView'lerde veya GPU sorunlarında `null` döner. `false` ise `BoardCanvas`
 * sessizce `GameBoard`'a düşer (faz planı §2.4).
 */
export function canUseCanvas2d(
    doc: Pick<Document, 'createElement'> | null = typeof document === 'undefined' ? null : document,
): boolean {
    if (!doc) return false;
    try {
        return doc.createElement('canvas').getContext('2d') !== null;
    } catch {
        return false;
    }
}

/**
 * Tuvaller ekran okuyucudan gizlenir; etiketi (`role="img"` + `aria-label`)
 * sarmalayıcı öğe taşır ki tahta bir kez okunsun (09-kapanis §2.2).
 */
export function hideSurfacesFromReaders(surfaces: Surfaces): void {
    for (const name of surfaces.names) {
        surfaces.layers[name]!.canvas.setAttribute('aria-hidden', 'true');
    }
}

/**
 * İstenen katmanlar için birer `<canvas>` üretir ve `host`'a üst üste yığar.
 *
 * `names` verilmezse üçü de kurulur. `lite` kademede `ambient` İSTENMEZ: o
 * kademede hücre süsleri zaten hiç çizilmiyor (bkz. motionTier.ts), dolayısıyla
 * tuvali kurmak yalnızca bellek harcar (faz planı §2.5).
 */
export function createSurfaces(host: HTMLElement, names: LayerName[] = LAYER_ORDER): Surfaces {
    const layers: Partial<Record<LayerName, Surface>> = {};
    // z-sırası katmanın KENDİ sırasından gelir; eksik katman sırayı kaydırmaz.
    const ordered = LAYER_ORDER.filter(name => names.includes(name));

    ordered.forEach(name => {
        const i = LAYER_ORDER.indexOf(name);
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
        layers[name] = { canvas, ctx, bleed: 0 };
    });

    return { host, layers, names: ordered, cssW: 0, cssH: 0, dpr: 0, bleed: 0 };
}

/**
 * Tuvalleri verilen CSS ölçüsüne, DPR'ye ve taşma paylarına ayarlar. Her tuval
 * KENDİ payını alır (`layerBleed`); `actorsBleed` kademenin payıdır.
 *
 * Hiçbiri gerçekten değişmediyse HİÇBİR ŞEY yapmaz: `canvas.width`'e yazmak —
 * aynı değeri yazmak bile — tuvali temizler ve durağan katmanı yok eder.
 *
 * @returns Ölçüler değiştiyse `true` (çağıran tüm katmanları geçersizleştirmeli).
 */
export function resize(surfaces: Surfaces, cssW: number, cssH: number, dpr: number, actorsBleed: number): boolean {
    if (surfaces.cssW === cssW && surfaces.cssH === cssH && surfaces.dpr === dpr && surfaces.bleed === actorsBleed) {
        return false;
    }

    for (const name of surfaces.names) {
        const layer = surfaces.layers[name]!;
        const { canvas, ctx } = layer;
        const g = layerGeometry(name, cssW, cssH, dpr, actorsBleed);
        canvas.width = g.pxW;
        canvas.height = g.pxH;
        canvas.style.width = `${g.fullW}px`;
        canvas.style.height = `${g.fullH}px`;
        // Tuval her yönde kendi payı kadar büyük; kaydırılır ki (0,0) yerinde kalsın.
        canvas.style.left = `${g.left}px`;
        canvas.style.top = `${g.top}px`;
        ctx.setTransform(dpr, 0, 0, dpr, g.tx, g.ty);
        layer.bleed = g.bleed;
    }

    surfaces.cssW = cssW;
    surfaces.cssH = cssH;
    surfaces.dpr = dpr;
    surfaces.bleed = actorsBleed;
    return true;
}

/**
 * Üç tuvalin yaklaşık bellek tüketimi (bayt): Σ genişlik × yükseklik × 4.
 * Tuval ölçüleri zaten cihaz pikselinde (DPR ve taşma payı içlerinde) olduğu
 * için ayrıca çarpılmaz.
 *
 * NEDEN: sprite belleği (`spriteCache.bytes()`) tablonun yarısı; taşma payı
 * kademeye bağlı olduğu için (bkz. `BOARD_BLEED_FULL`) tuvallerin kendisi de
 * on MB'lar tutabiliyor. Faz 08 §2.5b'nin 20MB eşiği ikisinin TOPLAMI için
 * anlamlı; profiler bu yüzden iki satır gösterir (07-rapor §9).
 */
export function surfaceBytes(surfaces: Surfaces): number {
    let total = 0;
    for (const name of surfaces.names) {
        const { canvas } = surfaces.layers[name]!;
        total += canvas.width * canvas.height * 4;
    }
    return total;
}

/** Bir katmanın tamamını siler (CSS pikseli cinsinden — dönüşüm zaten kurulu). */
export function clearLayer(surfaces: Surfaces, name: LayerName): void {
    const layer = surfaces.layers[name];
    if (!layer) return;
    const b = layer.bleed;
    layer.ctx.clearRect(-b, -b, surfaces.cssW + b * 2, surfaces.cssH + b * 2);
}

/** Tuvalleri DOM'dan ayırır ve referansları bırakır. */
export function dispose(surfaces: Surfaces): void {
    for (const name of surfaces.names) {
        surfaces.layers[name]!.canvas.remove();
    }
    surfaces.cssW = 0;
    surfaces.cssH = 0;
    surfaces.dpr = 0;
    surfaces.bleed = 0;
}
