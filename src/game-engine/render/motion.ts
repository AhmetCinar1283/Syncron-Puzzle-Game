/**
 * DOSYA AMACI: Zamanın görüntüye çevrilmesi — CSS `cubic-bezier` çözücüsü,
 * hazır easing eğrileri ve `@keyframes` gövdelerinin veri karşılığı (`TRACKS`)
 * ile tek bir yorumlayıcı (`sampleTrack`).
 *
 * NEDEN tek bir yorumlayıcı: `effects/animationStyles.ts` yirmiden fazla
 * keyframe tanımlıyor. Her birini elle `if/else` ile yazmak hem uzun hem de
 * kaynak CSS ile karşılaştırılamaz olurdu. Burada her keyframe bir `stops`
 * dizisi; değerler kaynaktan BİREBİR okunmuştur (00-ilkeler §4).
 *
 * NEDEN burası easing'in evi (00-ilkeler §3): Faz 02 ve 03, `motion.ts` henüz
 * yokken çözücüyü `cells/common.ts`'e koymak zorunda kaldı. `cssBezier` artık
 * burada; `cells/common.ts` ve `cells/ice.ts` buradan içe aktarıyor.
 *
 * Saf dosya: tuvale dokunmaz, `Date`/`performance` okumaz.
 */

/**
 * CSS `cubic-bezier(x1, y1, x2, y2)` zamanlama eğrisi. Newton ile t→s çözülür.
 *
 * DİKKAT — parametre sırası `(x1, x2, y1, y2, t)`. Faz 02'de bu biçimde
 * yazılmıştı ve üç hücre çizicisi böyle çağırıyor; taşıma sırasında davranış
 * DEĞİŞTİRİLMEDİ (faz planı §3.1). Yeni kod `cubicBezier` fabrikasını kullanır.
 */
export function cssBezier(x1: number, x2: number, y1: number, y2: number, t: number): number {
    const curve = (a: number, b: number, s: number) =>
        3 * a * s * (1 - s) * (1 - s) + 3 * b * s * s * (1 - s) + s * s * s;
    let s = t;
    for (let i = 0; i < 6; i++) {
        const x = curve(x1, x2, s) - t;
        const dx = 3 * x1 * (1 - s) * (1 - 3 * s) + 3 * x2 * s * (2 - 3 * s) + 3 * s * s;
        if (Math.abs(dx) < 1e-6) break;
        s -= x / dx;
    }
    return curve(y1, y2, Math.max(0, Math.min(1, s)));
}

/** CSS `cubic-bezier(x1, y1, x2, y2)` karşılığı; hazır bir eğri döndürür. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
    return (t: number) => cssBezier(x1, x2, y1, y2, t);
}

/** `physicsWrapper`'ın `transition: transform` eğrisi — kasten 1'i aşar (yaylanma). */
export const EASE_MOVE = cubicBezier(0.25, 1.1, 0.5, 1.1);
export const EASE_IN_OUT = cubicBezier(0.42, 0, 0.58, 1);
export const EASE_OUT = cubicBezier(0, 0, 0.58, 1);
export const EASE_IN = cubicBezier(0.42, 0, 1, 1);
/** CSS `ease` anahtar kelimesi — `transition`larda süre yanında eğri verilmediğinde bu geçerli. */
export const EASE_CSS = cubicBezier(0.25, 0.1, 0.25, 1);
export const LINEAR = (t: number): number => t;

/** `blocked-push-*`, `trampolineLaunch` ve `death-crushed`'ın kendi eğrileri. */
const EASE_PUSH = cubicBezier(0.25, 1, 0.5, 1);
const EASE_CRUSH = cubicBezier(0.25, 1, 0.2, 1);

/** Bir keyframe'in ürettiği dönüşüm. Eksik alanlar birim değerdedir. */
export interface Transform {
    tx: number;
    ty: number;
    sx: number;
    sy: number;
    /** Radyan. */
    rot: number;
    alpha: number;
    /** Radyan; canvas'ta tanjantı `ctx.transform`'a verilir. */
    skewX: number;
    skewY: number;
    /**
     * `Track.layers`'ın her katmanının bu andaki ağırlığı (0..1). Yalnızca
     * `filter` taşıyan keyframe'lerde vardır; diğerlerinde `undefined`.
     */
    fx?: number[];
}

/**
 * Bir keyframe'in `filter` özelliğinin bir bileşeni. Kare döngüsünde
 * `ctx.filter`/`shadowBlur` yasak olduğu için (00-ilkeler §2.1) her bileşen bir
 * SPRITE VARYANTIdır (bkz. `variants.ts`); zamanla değişen tek şey ağırlığıdır.
 */
export type EffectLayer =
    /** `filter` zincirinin renk kısmı (`drop-shadow` HARİÇ). Varlığın kendisi bu renkle çizilir. */
    | { kind: 'tint'; filter: string }
    /** `drop-shadow(0 0 blur color)`. Varlığın ARKASINA parlama olarak çizilir. */
    | { kind: 'halo'; color: string; blur: number };

export interface TrackStop {
    /** 0..1 arası ilerleme noktası (`@keyframes`'teki yüzde). */
    at: number;
    tx?: number;
    ty?: number;
    sx?: number;
    sy?: number;
    /** Derece — kaynak CSS ile aynı birim; `sampleTrack` radyana çevirir. */
    rot?: number;
    alpha?: number;
    skewX?: number;
    skewY?: number;
    /** `Track.layers` ile aynı sırada ağırlıklar; eksik = 0. */
    fx?: number[];
}

export interface Track {
    stops: TrackStop[];
    /** Keyframe'in `filter` bileşenleri; `TrackStop.fx` bunlara ağırlık verir. */
    layers?: EffectLayer[];
    /**
     * Varsayılan süre. `bump-*`, `blocked-push-*`, `conveyor-reject-*`,
     * `collision-shake` ve `teleportInEffect` DOM'da `frameMs` ile oynatılıyor;
     * buradaki 80 yalnızca varsayılan, gerçek süre `sampleTrack`'in üçüncü
     * parametresiyle geçilir.
     */
    durationMs: number;
    easing: (t: number) => number;
    /** CSS karşılığı: `once` = fill yok, `loop` = `infinite`, `hold-last` = `forwards`. */
    repeat: 'once' | 'loop' | 'hold-last';
}

/** `frameMs` ile oynatılan efektlerin `durationMs` varsayılanı. */
const FRAME_MS_DEFAULT = 80;

const IDENTITY: Transform = { tx: 0, ty: 0, sx: 1, sy: 1, rot: 0, alpha: 1, skewX: 0, skewY: 0 };

const DIR_VECTOR: Record<string, { x: number; y: number }> = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
};

/**
 * Yön eksenli bir durak: `translateX/Y(±dist)` + hareket eksenine `main`, dik
 * eksene `cross` ölçeği. `bump-*`, `blocked-push-*` ve `conveyor-reject-*`
 * keyframe'lerinin dördü de bu kalıbın yön çevrimidir.
 */
function axialStop(at: number, dir: string, dist: number, main: number, cross: number): TrackStop {
    const v = DIR_VECTOR[dir] ?? DIR_VECTOR.up;
    const vertical = v.y !== 0;
    return {
        at,
        tx: v.x * dist,
        ty: v.y * dist,
        sx: vertical ? cross : main,
        sy: vertical ? main : cross,
    };
}

const DIRECTIONS = ['up', 'down', 'left', 'right'] as const;

function directionTracks(
    prefix: string,
    build: (dir: string) => TrackStop[],
    easing: (t: number) => number,
): Record<string, Track> {
    const out: Record<string, Track> = {};
    for (const dir of DIRECTIONS) {
        out[`${prefix}-${dir}`] = {
            stops: build(dir),
            durationMs: FRAME_MS_DEFAULT,
            easing,
            repeat: 'once',
        };
    }
    return out;
}

export const TRACKS: Record<string, Track> = {
    // ── bump-* : 30% ±14px + ezilme, 70% ∓3px + geri yaylanma ──
    ...directionTracks('bump', dir => [
        { at: 0 },
        axialStop(0.3, dir, 14, 0.85, 1.08),
        axialStop(0.7, dir, -3, 1.05, 0.96),
        { at: 1 },
    ], EASE_MOVE),

    // ── blocked-push-* : daha kısa yol, daha sert ezilme ──
    ...directionTracks('blocked-push', dir => [
        { at: 0 },
        axialStop(0.35, dir, 7, 0.75, 1.15),
        axialStop(0.75, dir, -1, 1.03, 0.98),
        { at: 1 },
    ], EASE_PUSH),

    // ── conveyor-reject-* : gidiş-dönüş, yalnızca hareket ekseni ölçekleniyor ──
    ...directionTracks('conveyor-reject', dir => [
        { at: 0 },
        axialStop(0.3, dir, 10, 0.9, 1),
        axialStop(0.75, dir, -10, 1.05, 1),
        { at: 1 },
    ], EASE_IN_OUT),

    // `filter: brightness(1.2)` yalnızca 15% ve 30%'da yazılı; 45–75% durakları
    // `filter` içermediği için özellik 30%'dan örtük 100% (`none`) değerine
    // doğrusal iner: 1 − (at − 0.30) / 0.70.
    'collision-shake': {
        layers: [{ kind: 'tint', filter: 'brightness(1.2)' }],
        stops: [
            { at: 0 },
            { at: 0.15, tx: -8, ty: -3, sx: 0.93, sy: 0.93, fx: [1] },
            { at: 0.30, tx: 7, ty: 3, sx: 1.07, sy: 1.07, fx: [1] },
            { at: 0.45, tx: -6, ty: 1, sx: 0.96, sy: 0.96, fx: [0.7857] },
            { at: 0.60, tx: 4, ty: -1, sx: 1.03, sy: 1.03, fx: [0.5714] },
            { at: 0.75, tx: -2, ty: 0, fx: [0.3571] },
            { at: 1 },
        ],
        durationMs: FRAME_MS_DEFAULT,
        easing: EASE_IN_OUT,
        repeat: 'once',
    },

    // `saturate(1)→(2)→(3)`, `brightness(1)→(1.5)→(0.2)`.
    'death-forbidden': {
        layers: [
            { kind: 'tint', filter: 'saturate(2) brightness(1.5)' },
            { kind: 'tint', filter: 'saturate(3) brightness(0.2)' },
        ],
        stops: [
            { at: 0, sx: 1, sy: 1, rot: 0, alpha: 1 },
            { at: 0.35, sx: 1.25, sy: 1.25, rot: 90, alpha: 0.9, fx: [1, 0] },
            { at: 1, sx: 0, sy: 0, rot: 540, alpha: 0, fx: [0, 1] },
        ],
        durationMs: 800,
        easing: EASE_IN_OUT,
        repeat: 'hold-last',
    },

    // `grayscale(0)→(0.6)→(1)`, `brightness(1)→(0.6)→(0.1)`.
    'death-crushed': {
        layers: [
            { kind: 'tint', filter: 'grayscale(0.6) brightness(0.6)' },
            { kind: 'tint', filter: 'grayscale(1) brightness(0.1)' },
        ],
        stops: [
            { at: 0, sx: 1, sy: 1, alpha: 1 },
            { at: 0.25, sx: 1.7, sy: 0.18, alpha: 1, fx: [1, 0] },
            { at: 1, sx: 1.9, sy: 0.02, alpha: 0, fx: [0, 1] },
        ],
        durationMs: 800,
        easing: EASE_CRUSH,
        repeat: 'hold-last',
    },

    // 40%: `brightness(1.6) sepia(1) hue-rotate(-50deg) drop-shadow(0 0 12px #ef4444)`,
    // 100%: `brightness(2) sepia(1) hue-rotate(-50deg)`. `drop-shadow` zincirin
    // SONUNDA olduğu için parlama, renk kaymasından etkilenmez.
    'death-lava': {
        layers: [
            { kind: 'tint', filter: 'brightness(1.6) sepia(1) hue-rotate(-50deg)' },
            { kind: 'tint', filter: 'brightness(2) sepia(1) hue-rotate(-50deg)' },
            { kind: 'halo', color: '#ef4444', blur: 12 },
        ],
        stops: [
            { at: 0, ty: 0, sx: 1, sy: 1, alpha: 1 },
            { at: 0.4, ty: 16, sx: 0.9, sy: 1.15, alpha: 0.8, fx: [1, 0, 1] },
            { at: 1, ty: 32, sx: 0, sy: 0, alpha: 0, fx: [0, 1, 0] },
        ],
        durationMs: 800,
        easing: EASE_IN,
        repeat: 'hold-last',
    },

    // 15%: `hue-rotate(180deg) brightness(2.5) drop-shadow(0 0 12px #00ff88)`,
    // 45%: `hue-rotate(90deg) brightness(1.8) drop-shadow(0 0 6px #00c4ff)`,
    // 100%: `hue-rotate(0deg) brightness(0.2)`.
    'death-trail': {
        layers: [
            { kind: 'tint', filter: 'hue-rotate(180deg) brightness(2.5)' },
            { kind: 'tint', filter: 'hue-rotate(90deg) brightness(1.8)' },
            { kind: 'tint', filter: 'brightness(0.2)' },
            { kind: 'halo', color: '#00ff88', blur: 12 },
            { kind: 'halo', color: '#00c4ff', blur: 6 },
        ],
        stops: [
            { at: 0, sx: 1, sy: 1, alpha: 1 },
            { at: 0.15, sx: 1.15, sy: 1.15, alpha: 1, fx: [1, 0, 0, 1, 0] },
            { at: 0.45, sx: 0.75, sy: 0.75, alpha: 0.75, fx: [0, 1, 0, 0, 1] },
            { at: 1, sx: 0, sy: 0, alpha: 0, fx: [0, 0, 1, 0, 0] },
        ],
        durationMs: 800,
        easing: EASE_IN_OUT,
        repeat: 'hold-last',
    },

    // `scale(1.2) translateY(-6px) rotate(360deg)`: CSS dönüşüm listesi soldan
    // sağa çarpılır, yani ÖLÇEK ötelemeyi de büyütür. Canvas'ta öteleme önce
    // uygulandığı için değer baştan ölçeklenmiş yazıldı: -6 × 1.2 = -7.2.
    'victory-spin': {
        stops: [
            { at: 0, sx: 1, sy: 1, ty: 0, rot: 0 },
            { at: 0.5, sx: 1.2, sy: 1.2, ty: -7.2, rot: 180 },
            { at: 1, sx: 1, sy: 1, ty: 0, rot: 360 },
        ],
        durationMs: 800,
        easing: EASE_IN_OUT,
        repeat: 'loop',
    },

    // 50% durağında `rotate` yok: CSS eksik fonksiyonu birim kabul eder, yani
    // dönüş 120° → 0° arasında ilk yarıda tükenir.
    teleportInEffect: {
        stops: [
            { at: 0, sx: 0, sy: 0, rot: 120, alpha: 0 },
            { at: 0.5, sx: 1.3, sy: 1.3, rot: 0, alpha: 0.8 },
            { at: 1, sx: 1, sy: 1, rot: 0, alpha: 1 },
        ],
        durationMs: FRAME_MS_DEFAULT,
        easing: EASE_OUT,
        repeat: 'hold-last',
    },

    landingSquashEffect: {
        stops: [
            { at: 0, sx: 1.3, sy: 0.7 },
            { at: 0.4, sx: 0.85, sy: 1.15 },
            { at: 0.7, sx: 1.05, sy: 0.95 },
            { at: 1 },
        ],
        durationMs: 220,
        easing: EASE_IN_OUT,
        repeat: 'once',
    },

    // Yalnızca trambolinin YAY'ı ezilir (hücre kutusu değil): `transform-origin:
    // bottom center`, `trampolineCellRenderer.tsx`. `filter: brightness(1.6→2)`
    // bu izde YOK — kare döngüsünde filtre yasak ve hücre sprite'ına da giremiyor.
    trampolineLaunch: {
        stops: [
            { at: 0, sx: 1.3, sy: 0.35 },
            { at: 0.4, sx: 0.7, sy: 1.4 },
            { at: 0.7, sx: 1.15, sy: 0.85 },
            { at: 1 },
        ],
        durationMs: 500,
        easing: EASE_PUSH,
        repeat: 'hold-last',
    },
};

const DEG_TO_RAD = Math.PI / 180;

function resolve(stop: TrackStop): Transform {
    return {
        tx: stop.tx ?? 0,
        ty: stop.ty ?? 0,
        sx: stop.sx ?? 1,
        sy: stop.sy ?? 1,
        rot: (stop.rot ?? 0) * DEG_TO_RAD,
        alpha: stop.alpha ?? 1,
        skewX: (stop.skewX ?? 0) * DEG_TO_RAD,
        skewY: (stop.skewY ?? 0) * DEG_TO_RAD,
        fx: stop.fx,
    };
}

/** Katman ağırlıklarının ara değeri; eksik eleman 0 sayılır, ikisi de yoksa `undefined`. */
function mixFx(a: number[] | undefined, b: number[] | undefined, u: number): number[] | undefined {
    if (!a && !b) return undefined;
    const length = Math.max(a?.length ?? 0, b?.length ?? 0);
    return Array.from({ length }, (_, i) => {
        const p = a?.[i] ?? 0;
        const q = b?.[i] ?? 0;
        return p + (q - p) * u;
    });
}

function mix(a: Transform, b: Transform, u: number): Transform {
    const lerp = (p: number, q: number) => p + (q - p) * u;
    return {
        fx: mixFx(a.fx, b.fx, u),
        tx: lerp(a.tx, b.tx),
        ty: lerp(a.ty, b.ty),
        sx: lerp(a.sx, b.sx),
        sy: lerp(a.sy, b.sy),
        rot: lerp(a.rot, b.rot),
        alpha: lerp(a.alpha, b.alpha),
        skewX: lerp(a.skewX, b.skewX),
        skewY: lerp(a.skewY, b.skewY),
    };
}

/**
 * Bir keyframe'in `elapsedMs` anındaki dönüşümü.
 *
 * Easing TÜM animasyona bir kez uygulanır, duraklar arası ara değer
 * DOĞRUSALDIR (faz planı §3.2). CSS her durak çiftine ayrı ayrı uygular;
 * fark yalnızca ara karelerin hızındadır, uç değerler aynıdır.
 *
 * @param durationMs `frameMs` ile oynatılan efektler için gerçek süre.
 */
export function sampleTrack(track: Track, elapsedMs: number, durationMs = track.durationMs): Transform {
    const stops = track.stops;
    if (stops.length === 0) return { ...IDENTITY };

    const raw = durationMs > 0 ? elapsedMs / durationMs : 1;
    const p = track.repeat === 'loop'
        ? ((raw % 1) + 1) % 1
        : Math.max(0, Math.min(1, raw));
    const e = track.easing(p);

    if (e <= stops[0].at) return resolve(stops[0]);
    for (let i = 1; i < stops.length; i++) {
        const b = stops[i];
        if (e > b.at) continue;
        const a = stops[i - 1];
        const span = b.at - a.at;
        return span <= 0 ? resolve(b) : mix(resolve(a), resolve(b), (e - a.at) / span);
    }
    // `EASE_MOVE` 1'i aşabilir (overshoot): son durakta kalınır.
    return resolve(stops[stops.length - 1]);
}
