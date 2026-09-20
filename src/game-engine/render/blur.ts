/**
 * DOSYA AMACI: CSS `filter: blur(Npx)`in canvas karşılığı — bir tuvalin
 * piksellerini yerinde Gauss'a yakın bulanıklaştırmak.
 *
 * NEDEN `ctx.filter` DEĞİL: 00-ilkeler §2.1 kare döngüsünde yasaklıyor, Faz 06'nın
 * kabul kriteri ise `victory.ts` içinde HİÇ geçmemesini istiyor. Ayrıca
 * `ctx.filter`ın uzunluk birimi tarayıcıya göre dönüşüm matrisinden etkileniyor;
 * `setShadow`un DPR düzeltmesine benzer bir sürprizi burada istemiyoruz.
 * Piksel üzerinde çalışan bu yol her WebView'de aynı sonucu verir.
 *
 * NEDEN kutu bulanıklığı: art arda ÜÇ kutu geçişi Gauss'un bilinen ve kabul
 * gören yaklaşımıdır. Maliyet yalnızca sprite rasterizasyonunda ödenir
 * (zafer başına oyuncu × 3 iz), kare döngüsünde asla.
 */

/**
 * Gauss'u n kutu geçişine bölerken her geçişin yarıçapı.
 * Kaynak: W3C SVG filtre ekinin "three box blurs" yaklaşımı.
 */
function boxRadii(sigma: number, n: number): number[] {
    const wIdeal = Math.sqrt((12 * sigma * sigma) / n + 1);
    let wl = Math.floor(wIdeal);
    if (wl % 2 === 0) wl -= 1;
    const wu = wl + 2;
    const mIdeal = (12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4);
    const m = Math.round(mIdeal);

    const out: number[] = [];
    for (let i = 0; i < n; i++) out.push(((i < m ? wl : wu) - 1) / 2);
    return out;
}

/** Tek eksende kutu geçişi (kaydırmalı toplam); kenarlarda kenar pikseli kopyalanır. */
function boxPass(src: Float32Array, dst: Float32Array, w: number, h: number, r: number, vertical: boolean): void {
    const lineLen = vertical ? h : w;
    const lines = vertical ? w : h;
    const step = (vertical ? w : 1) * 4;
    const lineStep = (vertical ? 1 : w) * 4;
    const norm = 1 / (r + r + 1);

    for (let line = 0; line < lines; line++) {
        const base = line * lineStep;
        for (let c = 0; c < 4; c++) {
            const first = src[base + c];
            const last = src[base + (lineLen - 1) * step + c];

            let sum = (r + 1) * first;
            for (let i = 0; i < r; i++) sum += src[base + Math.min(i, lineLen - 1) * step + c];

            for (let i = 0; i <= r; i++) {
                sum += src[base + Math.min(i + r, lineLen - 1) * step + c] - first;
                dst[base + i * step + c] = sum * norm;
            }
            for (let i = r + 1; i < lineLen - r; i++) {
                sum += src[base + (i + r) * step + c] - src[base + (i - r - 1) * step + c];
                dst[base + i * step + c] = sum * norm;
            }
            for (let i = Math.max(r + 1, lineLen - r); i < lineLen; i++) {
                sum += last - src[base + (i - r - 1) * step + c];
                dst[base + i * step + c] = sum * norm;
            }
        }
    }
}

/**
 * `canvas`ı yerinde bulanıklaştırır.
 *
 * @param radiusCssPx CSS `blur()` yarıçapı (= Gauss standart sapması).
 * @param dpr Tuvalin cihaz piksel oranı; yarıçap cihaz pikseline çevrilir.
 *
 * Alfa ÖNCEDEN ÇARPILIR: saydam pikseller (0,0,0,0) doğrudan karıştırılırsa
 * kenarlarda koyu bir hale oluşur. Geri yazarken çarpım geri alınır.
 */
export function blurCanvas(canvas: HTMLCanvasElement, radiusCssPx: number, dpr: number): void {
    const sigma = radiusCssPx * dpr;
    if (sigma <= 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    if (w < 2 || h < 2) return;

    // `getImageData` dönüşümden etkilenmez; her zaman cihaz pikselini verir.
    const image = ctx.getImageData(0, 0, w, h);
    const data = image.data;
    const n = w * h * 4;

    const a = new Float32Array(n);
    const b = new Float32Array(n);
    for (let i = 0; i < n; i += 4) {
        const alpha = data[i + 3] / 255;
        a[i] = data[i] * alpha;
        a[i + 1] = data[i + 1] * alpha;
        a[i + 2] = data[i + 2] * alpha;
        a[i + 3] = data[i + 3];
    }

    for (const r of boxRadii(sigma, 3)) {
        if (r < 1) continue;
        boxPass(a, b, w, h, r, false);
        boxPass(b, a, w, h, r, true);
    }

    for (let i = 0; i < n; i += 4) {
        const alpha = a[i + 3];
        const inv = alpha > 0 ? 255 / alpha : 0;
        data[i] = Math.min(255, a[i] * inv);
        data[i + 1] = Math.min(255, a[i + 1] * inv);
        data[i + 2] = Math.min(255, a[i + 2] * inv);
        data[i + 3] = Math.min(255, alpha);
    }

    // Dönüşüm kurulu olduğu için `putImageData` ile yazılır: o da dönüşümü
    // yok sayar, yani cihaz pikseli cinsinden (0,0)'a oturur.
    ctx.putImageData(image, 0, 0);
}

/**
 * `blur(Npx)`in tuvalde gerektirdiği kenar payı (CSS pikseli).
 * Gauss görünür olarak ~3σ'da biter.
 */
export function blurPad(radiusCssPx: number): number {
    return Math.ceil(radiusCssPx * 3);
}
