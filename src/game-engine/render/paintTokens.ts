/**
 * DOSYA AMACI: Tema jetonlarının (CSS dizgileri) canvas karşılığını ÇİZMEK.
 * Hücre çizicileri `linear-gradient(...)`, `1.5px solid rgba(...)`,
 * `inset 0 0 22px rgba(...)`, `border-radius: 6px` gibi değerleri DOM
 * dosyalarından BİREBİR kopyalar (00-ilkeler §4) ve buradaki yardımcılara verir.
 *
 * NEDEN tek ve paylaşılan katman: beş tema × 12 hücre tipi × (boş/dolu) yüzlerce
 * kombinasyon demek. Her hücre çizicisinin bu dönüşümü kendi başına icat etmesi
 * hem tutarsızlık hem de tekrar olurdu.
 *
 * Dizgi → değer ayrıştırması `cssValues.ts`'te; buradan yeniden dışa aktarılır
 * (faz planı §4.1 hepsini `paintTokens`'tan bekliyor).
 *
 * Her şey CSS pikselinde çalışır; DPR ölçeği `spriteCache` içinde bir kez kurulur
 * (00-ilkeler §3.3). Gölge/filtre çağrıları YALNIZCA sprite rasterizasyonunda,
 * yani bu dosyanın çağrıldığı yerde serbesttir (00-ilkeler §2.1).
 */

import {
    gradientEndpoints,
    parseBorder,
    parseBoxShadow,
    parseCssColor,
    parseGradientStop,
    parseRadius,
    splitTopLevel,
    toCss,
} from './cssValues';
import type { Box, BorderSpec } from './cssValues';

export * from './cssValues';

/** CSS `dashed` kenarının tire/boşluk oranı — Chromium'un kullandığı yaklaşık değer. */
const DASH_RATIO = 3;

/** Rasterleyici bağlamının DPR'si; `spriteCache` bağlamı kurarken yazar. */
const rasterDpr = new WeakMap<CanvasRenderingContext2D, number>();

/** Yalnızca `spriteCache` çağırır: bu bağlam DPR ölçekli rasterize ediliyor. */
export function registerRasterDpr(ctx: CanvasRenderingContext2D, dpr: number): void {
    rasterDpr.set(ctx, dpr);
}

/**
 * Bu rasterleyici bağlamının DPR'si; kayıtlı değilse 1.
 *
 * NEDEN dışa açık (Faz 06): zafer sprite'ları ara bir tuvale çizip onu
 * bulanıklaştırıyor (bkz. blur.ts). Ara tuvalin cihaz pikseli cinsinden
 * kurulması gerekiyor, yoksa bulanık varyant DPR 2'de yarı çözünürlükte kalır.
 */
export function rasterDprOf(ctx: CanvasRenderingContext2D): number {
    return rasterDpr.get(ctx) ?? 1;
}

/**
 * CSS `box-shadow`/`drop-shadow` yarıçapının canvas karşılığı.
 * `shadowBlur` dönüşüm matrisini yok saydığı için DPR ile elle çarpılır;
 * aksi halde DPR 2'de parlamalar yarı yarıçapta çıkar (04-rapor §5).
 * YALNIZCA sprite rasterizasyonunda çağrılır (00-ilkeler §2.1).
 */
export function setShadow(
    ctx: CanvasRenderingContext2D,
    color: string,
    blurCssPx: number,
    offsetXCssPx = 0,
    offsetYCssPx = 0,
): void {
    const dpr = rasterDpr.get(ctx) ?? 1;
    ctx.shadowColor = color;
    ctx.shadowBlur = blurCssPx * dpr;
    ctx.shadowOffsetX = offsetXCssPx * dpr;
    ctx.shadowOffsetY = offsetYCssPx * dpr;
}

/** Köşeleri yuvarlatılmış kutu yolu. `ctx.beginPath()` burada yapılır. */
export function roundRectPath(ctx: CanvasRenderingContext2D, box: Box, radius: string | number): void {
    const r = parseRadius(radius, box);
    const { x, y, w, h } = box;
    ctx.beginPath();
    if (r <= 0) {
        ctx.rect(x, y, w, h);
        return;
    }
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

/** Düz renk, `linear-gradient(<açı>deg, ...)` veya `radial-gradient(circle, ...)`. */
function buildFill(ctx: CanvasRenderingContext2D, box: Box, css: string): string | CanvasGradient {
    const s = css.trim();
    const linear = s.startsWith('linear-gradient(');
    const radial = s.startsWith('radial-gradient(');
    if (!linear && !radial) return s;

    const args = splitTopLevel(s.slice(s.indexOf('(') + 1, s.lastIndexOf(')')), ',');
    let head = 0;
    let angleDeg = 180;              // CSS varsayılanı: `to bottom`
    if (args.length > 0 && !parseGradientStop(args[0])) {
        const deg = parseFloat(args[0]);
        if (!Number.isNaN(deg) && args[0].includes('deg')) angleDeg = deg;
        head = 1;                    // `circle` gibi anahtar kelimeler de atlanır
    }

    const stops: { color: string; pos: number | null }[] = [];
    for (const arg of args.slice(head)) {
        const stop = parseGradientStop(arg);
        if (stop) stops.push(stop);
    }
    if (stops.length === 0) return s;

    let gradient: CanvasGradient;
    if (linear) {
        const { x0, y0, x1, y1 } = gradientEndpoints(angleDeg, box);
        gradient = ctx.createLinearGradient(x0, y0, x1, y1);
    } else {
        const cx = box.x + box.w / 2;
        const cy = box.y + box.h / 2;
        gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(box.w / 2, box.h / 2));
    }
    stops.forEach((stop, i) => {
        const pos = stop.pos ?? (stops.length === 1 ? 0 : i / (stops.length - 1));
        gradient.addColorStop(Math.max(0, Math.min(1, pos)), stop.color);
    });
    return gradient;
}

/**
 * Arka planı kutunun DİKDÖRTGENİNE boyar. Yuvarlatılmış köşe isteniyorsa çağıran
 * önce `roundRectPath` + `ctx.clip()` kurar; böylece aynı kırpma iç gölgeyle
 * paylaşılır ve köşe yarıçapı tek yerde tanımlanır.
 */
export function applyBackground(ctx: CanvasRenderingContext2D, box: Box, css: string | undefined): void {
    if (!css) return;
    ctx.fillStyle = buildFill(ctx, box, css);
    ctx.fillRect(box.x, box.y, box.w, box.h);
}

/**
 * Kenarı İÇERİDEN çizer (`box-sizing: border-box` karşılığı): yol kutudan
 * `width/2` içeri alınır, yarıçap da aynı kadar küçülür.
 */
export function strokeBorder(ctx: CanvasRenderingContext2D, box: Box, border: BorderSpec | null, radius: string | number): void {
    if (!border || border.style === 'none' || border.width <= 0) return;
    const color = parseCssColor(border.color);
    if (color && color.a === 0) return;

    const inset = border.width / 2;
    const inner: Box = { x: box.x + inset, y: box.y + inset, w: box.w - border.width, h: box.h - border.width };
    const r = Math.max(0, parseRadius(radius, box) - inset);

    ctx.save();
    ctx.lineWidth = border.width;
    ctx.strokeStyle = border.color;
    if (border.style === 'dashed') ctx.setLineDash([border.width * DASH_RATIO, border.width * DASH_RATIO]);
    roundRectPath(ctx, inner, r);
    ctx.stroke();
    ctx.restore();
}

/**
 * `box-shadow`un INSET girdilerini taklit eder. Canvas'ta inset gölge yoktur;
 * iki ayrı yaklaşım kullanılır (bkz. raporlar/02-rapor.md §4):
 *
 *   - Ofsetli, bulanıksız (`inset 2px 2px 0 c`) → pah (bevel): kutunun ilgili
 *     kenarlarında `|ofset|` kalınlığında şerit. Bu, CSS'in ürettiğinin AYNISIDIR.
 *   - Ofsetsiz, bulanık (`inset 0 0 14px c`) → kenardan içeri `blur` kadar solan
 *     gradient. Bu bir YAKLAŞIMDIR: gerçek Gauss profili yerine doğrusal solma.
 */
export function innerShadow(ctx: CanvasRenderingContext2D, box: Box, radius: string | number, css: string | undefined): void {
    const shadows = parseBoxShadow(css).filter(s => s.inset);
    if (shadows.length === 0) return;

    ctx.save();
    roundRectPath(ctx, box, radius);
    ctx.clip();
    const { x, y, w, h } = box;

    for (const sh of shadows) {
        if (sh.ox !== 0 || sh.oy !== 0) {
            ctx.fillStyle = sh.color;
            if (sh.ox > 0) ctx.fillRect(x, y, sh.ox, h);
            if (sh.ox < 0) ctx.fillRect(x + w + sh.ox, y, -sh.ox, h);
            if (sh.oy > 0) ctx.fillRect(x, y, w, sh.oy);
            if (sh.oy < 0) ctx.fillRect(x, y + h + sh.oy, w, -sh.oy);
            continue;
        }
        const reach = Math.min(sh.blur + sh.spread, Math.min(w, h) / 2);
        if (reach <= 0) continue;
        const color = parseCssColor(sh.color);
        if (!color) continue;
        const solid = toCss(color);
        const clear = toCss(color, 0);
        const edges: number[][] = [
            [x, y, w, reach, x, y, x, y + reach],                      // üst
            [x, y + h - reach, w, reach, x, y + h, x, y + h - reach],  // alt
            [x, y, reach, h, x, y, x + reach, y],                      // sol
            [x + w - reach, y, reach, h, x + w, y, x + w - reach, y],  // sağ
        ];
        for (const [rx, ry, rw, rh, gx0, gy0, gx1, gy1] of edges) {
            const gradient = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
            gradient.addColorStop(0, solid);
            gradient.addColorStop(1, clear);
            ctx.fillStyle = gradient;
            ctx.fillRect(rx, ry, rw, rh);
        }
    }
    ctx.restore();
}

/**
 * `box-shadow`un INSET OLMAYAN girdilerini kutunun DIŞINA çizer.
 *
 * Kutunun dışı tek-çift kuralıyla kırpılır, sonra şekil opak doldurulur: şeklin
 * kendisi kırpma yüzünden tuvale düşmez, yalnızca bulanık gölgesi kalır.
 */
export function outerShadows(ctx: CanvasRenderingContext2D, box: Box, radius: string | number, css: string | undefined): void {
    for (const sh of parseBoxShadow(css)) {
        if (sh.inset) continue;
        const s = sh.spread;
        ctx.save();
        ctx.beginPath();
        ctx.rect(box.x - 1e4, box.y - 1e4, 2e4, 2e4);
        roundRectPath(ctx, box, radius);
        ctx.clip('evenodd');
        setShadow(ctx, sh.color, sh.blur, sh.ox, sh.oy);
        ctx.fillStyle = '#000';
        roundRectPath(
            ctx,
            { x: box.x - s - sh.ox, y: box.y - s - sh.oy, w: box.w + s * 2, h: box.h + s * 2 },
            radius,
        );
        ctx.fill();
        ctx.restore();
    }
}

/**
 * `filter: drop-shadow(0 0 Npx c)` ve `box-shadow: 0 0 Npx c` karşılığı.
 * `drawShape` bir kez çağrılır; canvas önce gölgeyi, sonra şeklin kendisini
 * çizer — CSS'teki sıranın aynısı.
 */
export function outerGlow(ctx: CanvasRenderingContext2D, drawShape: () => void, color: string, blur: number): void {
    ctx.save();
    setShadow(ctx, color, blur);
    drawShape();
    ctx.restore();
}

/** Bir CSS kutusunun tam boyama sırası: dış gölge → arka plan → iç gölge → kenar. */
export function paintBox(
    ctx: CanvasRenderingContext2D,
    box: Box,
    style: { background?: string; border?: string; boxShadow?: string; borderRadius?: string | number },
): void {
    const radius = style.borderRadius ?? 0;
    outerShadows(ctx, box, radius, style.boxShadow);
    if (style.background) {
        ctx.save();
        roundRectPath(ctx, box, radius);
        ctx.clip();
        applyBackground(ctx, box, style.background);
        ctx.restore();
    }
    innerShadow(ctx, box, radius, style.boxShadow);
    strokeBorder(ctx, box, parseBorder(style.border), radius);
}
