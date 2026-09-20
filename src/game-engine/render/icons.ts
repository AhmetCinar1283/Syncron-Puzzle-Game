/**
 * DOSYA AMACI: Hücrelerin ve oyuncunun kullandığı `GameIcon` SVG'lerini BİR KEZ
 * tuvale rasterize etmek ve kare döngüsüne `drawImage`'a hazır bir tuval vermek.
 *
 * NEDEN bu yol (react-dom/client, `renderToStaticMarkup` DEĞİL): ikon bileşenleri
 * React SVG'si; canvas'a girmeleri için bir SVG dizgisine ihtiyaç var.
 * `react-dom/server` istemci paketine ~60KB (gzip) ekler — faz planının koyduğu
 * 15KB sınırının çok üstünde. `react-dom/client` ise zaten pakette: bileşeni
 * kopuk (DOM'a bağlı olmayan) bir `<div>` içine `flushSync` ile senkron çizip
 * `innerHTML`'ini okumak sıfır paket maliyetiyle AYNI markup'ı verir. Yolları
 * elle `Path2D`'ye çevirmenin (planın ikinci seçeneği) aksine ikonların tek
 * kaynağı korunur: `classicIcons` değişince canvas da değişir.
 *
 * Asenkronluk: `Image` yüklemesi asenkron. `getIcon` hazır değilse `null` döner;
 * çağıran ikonu ATLAR ve `onIconsReady` geldiğinde katmanı geçersizleştirir.
 * Eksik ikonlu sprite önbelleğe yazılmaz (bkz. `spriteCache` `skipCache` yolu).
 */

import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { classicIcons } from '@/components/icons/themes/classic';
import type { IconName } from '@/components/icons/types';

/**
 * Rasterizasyon üst örnekleme çarpanı. `getIcon` imzası DPR almıyor (donmuş
 * sözleşme), bu yüzden ikonlar `surface.ts`'teki DPR üst sınırıyla aynı oranda
 * büyük çizilir; `drawImage` hedefte küçültünce 1x–2x DPR'de keskin kalır.
 */
const SUPERSAMPLE = 2;

type IconState = 'pending' | 'ready' | 'failed';

const canvases = new Map<string, HTMLCanvasElement>();
const states = new Map<string, IconState>();
const listeners = new Set<() => void>();

function cacheKey(name: string, sizePx: number, color: string): string {
    return `${name}|${sizePx}|${color}`;
}

function notifyReady(): void {
    for (const cb of Array.from(listeners)) cb();
}

/**
 * İkon bileşenini SVG dizgisine çevirir. Kopuk bir kökte senkron çizim yapılır;
 * `Image`'ın veri URI'sini kabul etmesi için `xmlns` eksikse eklenir.
 */
function serializeIcon(name: string, sizePx: number, color: string): string | null {
    const Component = classicIcons[name as IconName];
    if (!Component) return null;

    const holder = document.createElement('div');
    const root = createRoot(holder);
    try {
        flushSync(() => {
            root.render(createElement(Component, { size: sizePx * SUPERSAMPLE, color }));
        });
        let svg = holder.innerHTML;
        if (!svg) return null;
        if (!svg.includes('xmlns=')) {
            svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
        }
        return svg;
    } catch {
        return null;
    } finally {
        root.unmount();
    }
}

function startLoad(key: string, name: string, sizePx: number, color: string): void {
    states.set(key, 'pending');

    const svg = serializeIcon(name, sizePx, color);
    if (!svg) {
        states.set(key, 'failed');
        return;
    }

    const image = new Image();
    image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(sizePx * SUPERSAMPLE));
        canvas.height = Math.max(1, Math.round(sizePx * SUPERSAMPLE));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            states.set(key, 'failed');
            return;
        }
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvases.set(key, canvas);
        states.set(key, 'ready');
        notifyReady();
    };
    image.onerror = () => {
        // Bir daha denenmez: aynı ikon her karede yeniden yüklenmeye çalışırsa
        // kare döngüsü başarısız isteklerle dolar.
        states.set(key, 'failed');
    };
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Hazırsa tuvali, değilse null döner ve hazır olunca `onReady` ile haber verir. */
export function getIcon(name: string, sizePx: number, color: string): HTMLCanvasElement | null {
    if (typeof document === 'undefined') return null;

    const key = cacheKey(name, sizePx, color);
    const hit = canvases.get(key);
    if (hit) return hit;
    if (states.get(key) === undefined) startLoad(key, name, sizePx, color);
    return null;
}

/** İkon hazır olduğunda haber verir; dönen fonksiyon aboneliği bırakır. */
export function onIconsReady(cb: () => void): () => void {
    listeners.add(cb);
    return () => { listeners.delete(cb); };
}

/** Tema veya DPR değişince çağrılır; tüm rasterleri atar. */
export function clearIcons(): void {
    canvases.clear();
    states.clear();
}
