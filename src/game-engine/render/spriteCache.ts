/**
 * DOSYA AMACI: Görünümleri ekran dışı tuvallere BİR KEZ rasterize edip anahtarla
 * saklamak; kare döngüsünde iş `drawImage`'a inmek.
 *
 * NEDEN: Gölge/parlama (`shadowBlur`) canvas'ın Gauss bulanıklığıdır ve bugün
 * DOM'da ödediğimiz bedelin aynısıdır. Kare döngüsünde yasak (00-ilkeler §2.1);
 * yalnızca burada, sprite rasterizasyonu sırasında serbest. Bu dosyanın tek işi
 * o "bir kez"i garanti etmek.
 */

import type { SpritePainter } from './types';
import { registerRasterDpr } from './paintTokens';

/**
 * Bu sayının aşılması bir HATA göstergesidir: bir `key()` fonksiyonu duruma bağlı
 * olmayan bir şey (ör. `cell.id`) anahtara katıyordur. Üst sınır koymuyoruz —
 * ayıklama stratejisi yanlış anahtarı gizler, uyarı onu görünür kılar.
 */
const WARN_AT_SIZE = 600;

export interface SpriteCache {
    /** Anahtar önbellekte yoksa `painter.draw` ile bir kez rasterize eder. */
    get<T>(painter: SpritePainter<T>, input: T): HTMLCanvasElement;
    /** Tema veya DPR değişince çağrılır; tüm girdileri atar. */
    clear(): void;
    /** Teşhis için — rapora sayı yaz. */
    size(): number;
    /**
     * Önbellekteki tuvallerin yaklaşık toplam belleği (bayt): Σ genişlik × yükseklik × 4.
     * Tuval boyutu zaten DPR ile çarpılı olduğundan `w × h × dpr² × 4` ile aynıdır.
     */
    bytes(): number;
    /**
     * Tek bir girdiyi siler. Genel bir ayıklama mekanizması DEĞİL (00-ilkeler
     * §3.1): yalnızca tek yuvalı vignette için (bkz. `victory.ts`).
     */
    delete(key: string): void;
}

export function createSpriteCache(dpr: number): SpriteCache {
    const map = new Map<string, HTMLCanvasElement>();
    let warned = false;
    let totalBytes = 0;

    const bytesOf = (canvas: HTMLCanvasElement) => canvas.width * canvas.height * 4;

    return {
        get<T>(painter: SpritePainter<T>, input: T): HTMLCanvasElement {
            const key = painter.key(input);
            const hit = map.get(key);
            if (hit) return hit;

            const { w, h } = painter.size(input);
            // `OffscreenCanvas` KULLANILMAZ: eski Android WebView'lerde yok ve bu
            // izin hedef cihazı tam olarak orası.
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(w * dpr));
            canvas.height = Math.max(1, Math.round(h * dpr));

            const ctx = canvas.getContext('2d');
            // 2D bağlamı olmayan ortam (ör. test koşucusu) hiç çizim yapmaz;
            // çökmek yerine boş tuval döner ve önbelleğe hiçbir şey yazılmaz.
            if (!ctx) return canvas;

            // Rasterleyici tuvali de DPR ölçekli: `painter.draw` yine CSS
            // pikselinde çizer, DPR'yi hiçbir çizim kodu bilmez (00-ilkeler §3.3).
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            registerRasterDpr(ctx, dpr);
            const cacheable = painter.draw(ctx, input) !== false;

            // `false`: çizim için gereken bir kaynak (ör. henüz yüklenmemiş bir
            // ikon) hazır değildi. Eksik sprite önbelleğe YAZILMAZ; bir sonraki
            // karede yeniden denenir.
            if (!cacheable) return canvas;

            map.set(key, canvas);
            totalBytes += bytesOf(canvas);
            if (!warned && map.size > WARN_AT_SIZE) {
                warned = true;
                console.warn(
                    `[spriteCache] ${map.size} sprite önbellekte — bir key() muhtemelen ` +
                    'duruma bağlı olmayan bir alan (ör. cell.id) içeriyor.'
                );
            }
            return canvas;
        },

        clear(): void {
            map.clear();
            totalBytes = 0;
            warned = false;
        },

        size(): number {
            return map.size;
        },

        bytes(): number {
            return totalBytes;
        },

        delete(key: string): void {
            const hit = map.get(key);
            if (!hit) return;
            totalBytes -= bytesOf(hit);
            map.delete(key);
        },
    };
}
