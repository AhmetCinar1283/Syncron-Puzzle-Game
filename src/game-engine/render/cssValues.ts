/**
 * DOSYA AMACI: Tema jetonlarındaki CSS dizgilerini sayıya/renge çeviren SAF
 * ayrıştırıcılar. Tuvale hiçbir şey çizmez, `CanvasRenderingContext2D` bilmez.
 *
 * NEDEN `paintTokens.ts`'ten ayrı: ikisi birlikte 300 satırı aşıyordu ve iki
 * ayrı iş yapıyorlardı (dizgi → değer, değer → çizim). 00-ilkeler §1 "her dosya
 * tek iş, ~250 satır" gereği bölündü. Faz planı §4.1 bu ayrıştırıcıları
 * `paintTokens`'ın vermesini istiyor; `paintTokens.ts` hepsini yeniden dışa
 * aktarır, yani sözleşme korunur.
 *
 * Burası izin test edilmesi en kolay ve en çok işe yarayan yeri: `cssValues.test.ts`.
 */

export interface Rgba { r: number; g: number; b: number; a: number; }
export interface Box { x: number; y: number; w: number; h: number; }
export interface BorderSpec { width: number; style: 'solid' | 'dashed' | 'none'; color: string; }
export interface ShadowSpec { inset: boolean; ox: number; oy: number; blur: number; spread: number; color: string; }

/** Parantez derinliğini gözeterek böler: `rgba(0, 0, 0, .5)` tek parça kalır. */
export function splitTopLevel(input: string, sep: string): string[] {
    const out: string[] = [];
    let depth = 0;
    let buf = '';
    for (const ch of input) {
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
        if (depth === 0 && (ch === sep || (sep === ' ' && /\s/.test(ch)))) {
            if (buf.trim()) out.push(buf.trim());
            buf = '';
            continue;
        }
        buf += ch;
    }
    if (buf.trim()) out.push(buf.trim());
    return out;
}

const HEX3 = /^#([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])?$/i;
const HEX6 = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/i;
const RGB_FN = /^rgba?\(([^)]*)\)$/i;

/**
 * `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()`, `rgba()` ve `transparent`.
 * Tanımadığında `null`.
 *
 * SEKİZ HANELİ HEX: Faz 03'ün hücreleri değerlerini DOM'dan birebir taşıyor ve
 * oradaki jetonlar `${powerColor}80` gibi şablonlarla üretiliyor. Bu biçim
 * tanınmazsa `innerShadow` gölgeyi sessizce ATLAR.
 */
export function parseCssColor(input: string): Rgba | null {
    const s = input.trim();
    if (s === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };

    const m3 = HEX3.exec(s);
    if (m3) {
        return {
            r: parseInt(m3[1] + m3[1], 16),
            g: parseInt(m3[2] + m3[2], 16),
            b: parseInt(m3[3] + m3[3], 16),
            a: m3[4] ? parseInt(m3[4] + m3[4], 16) / 255 : 1,
        };
    }
    const m6 = HEX6.exec(s);
    if (m6) {
        return {
            r: parseInt(m6[1], 16),
            g: parseInt(m6[2], 16),
            b: parseInt(m6[3], 16),
            a: m6[4] ? parseInt(m6[4], 16) / 255 : 1,
        };
    }
    const fn = RGB_FN.exec(s);
    if (fn) {
        const parts = fn[1].split(',').map(p => p.trim());
        if (parts.length < 3) return null;
        const r = Number(parts[0]);
        const g = Number(parts[1]);
        const b = Number(parts[2]);
        if ([r, g, b].some(v => Number.isNaN(v))) return null;
        const a = parts.length > 3 ? Number(parts[3]) : 1;
        return { r, g, b, a: Number.isNaN(a) ? 1 : a };
    }
    return null;
}

/** `Rgba` → canvas'ın anladığı dizgi. Alfa çarpanı iç gölgenin solmasında kullanılır. */
export function toCss(c: Rgba, alphaScale = 1): string {
    return `rgba(${c.r},${c.g},${c.b},${c.a * alphaScale})`;
}

/** `1.5px solid rgba(...)`, `2px dashed #38bdf8`. */
export function parseBorder(css: string | undefined): BorderSpec | null {
    if (!css) return null;
    const parts = splitTopLevel(css.trim(), ' ');
    if (parts.length < 2) return null;
    const width = parseFloat(parts[0]);
    if (Number.isNaN(width)) return null;
    const style = parts[1] === 'dashed' ? 'dashed' : parts[1] === 'none' ? 'none' : 'solid';
    return { width, style, color: parts.slice(2).join(' ') || 'transparent' };
}

/** `inset 2px 2px 0 #71717a, 0 0 10px rgba(...)` → sıraya sadık liste. */
export function parseBoxShadow(css: string | undefined): ShadowSpec[] {
    if (!css || css.trim() === 'none') return [];
    const out: ShadowSpec[] = [];
    for (const part of splitTopLevel(css, ',')) {
        const tokens = splitTopLevel(part, ' ');
        const inset = tokens.includes('inset');
        const nums: number[] = [];
        let color = '';
        for (const token of tokens) {
            if (token === 'inset') continue;
            const value = parseFloat(token);
            if (!Number.isNaN(value) && /^[-\d.]/.test(token)) nums.push(value);
            else color = color ? `${color} ${token}` : token;
        }
        if (nums.length < 2) continue;
        out.push({ inset, ox: nums[0], oy: nums[1], blur: nums[2] ?? 0, spread: nums[3] ?? 0, color: color || 'transparent' });
    }
    return out;
}

/** `border-radius`: `'0px'`, `'6px'`, `'50%'` veya sayı. Kutunun yarısını aşamaz. */
export function parseRadius(css: string | number | undefined, box: Box): number {
    if (css === undefined) return 0;
    const cap = Math.min(box.w, box.h) / 2;
    if (typeof css === 'number') return Math.max(0, Math.min(css, cap));
    const s = css.trim();
    const v = parseFloat(s);
    if (Number.isNaN(v)) return 0;
    const px = s.endsWith('%') ? (Math.min(box.w, box.h) * v) / 100 : v;
    return Math.max(0, Math.min(px, cap));
}

/** Bir `linear-gradient` durağı: `#152238 0%`. Renk tanınmazsa `null`. */
export function parseGradientStop(token: string): { color: string; pos: number | null } | null {
    const parts = splitTopLevel(token, ' ');
    if (parts.length === 0) return null;
    if (!parseCssColor(parts[0])) return null;
    if (parts.length > 1 && parts[1].endsWith('%')) {
        const pos = parseFloat(parts[1]) / 100;
        return { color: parts[0], pos: Number.isNaN(pos) ? null : pos };
    }
    return { color: parts[0], pos: null };
}

/**
 * CSS `linear-gradient(<açı>deg, ...)` açısını gradient çizgisinin iki ucuna
 * çevirir. CSS açısı "yukarı"dan saat yönünde ölçülür; çizginin boyu kutunun o
 * yöndeki izdüşümüdür, yani `|w·sinA| + |h·cosA|`.
 */
export function gradientEndpoints(angleDeg: number, box: Box): { x0: number; y0: number; x1: number; y1: number } {
    const rad = (angleDeg * Math.PI) / 180;
    const dx = Math.sin(rad);
    const dy = -Math.cos(rad);
    const len = Math.abs(box.w * dx) + Math.abs(box.h * dy);
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h / 2;
    return {
        x0: cx - (dx * len) / 2,
        y0: cy - (dy * len) / 2,
        x1: cx + (dx * len) / 2,
        y1: cy + (dy * len) / 2,
    };
}
