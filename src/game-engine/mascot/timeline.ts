/**
 * DOSYA AMACI: Bir ifadenin (emote) anahtar kare listesini, verilen ANDAKİ
 * poza çeviren saf örnekleyici. Zaman dışarıdan gelir (`ms`); `performance`
 * okunmaz. Bu sayede aynı ifade oyunda, önizleme sayfasında ve videoda kare
 * kare aynı çıkar (video için "t anına git" = bu fonksiyonu çağır).
 *
 * Anahtar kare kuralları:
 *   - Her kare ÖNCEKİ karenin çözülmüş hâlini devralır, yalnızca verdiği alanı
 *     değiştirir. `'neutral'` o parçayı dinlenme hâline döndürür.
 *   - Sayısal alanlar (açıklık, bakış, göz boyu, gövde) iki kare arasında
 *     HEDEF karenin `ease`'iyle ara değerlenir.
 *   - Ayrık alanlar (göz şekli, ağız, yanak) BAŞLANGIÇ karesinin değerini
 *     tutar; bir şekli anında değiştirmek için o anda bir kare koyulur.
 */

import type { BodyPose, EyePose, FacePose, FxKind, MascotPose } from './pose';
import { NEUTRAL_BODY, NEUTRAL_FACE } from './pose';

export type Ease = 'linear' | 'in' | 'out' | 'inOut' | 'back' | 'step';

export interface FaceDelta {
    /** İki göze birden. `left`/`right` bunun üstüne uygulanır. */
    eyes?: Partial<EyePose>;
    left?: Partial<EyePose>;
    right?: Partial<EyePose>;
    lookX?: number;
    lookY?: number;
    eyeScale?: number;
    mouth?: FacePose['mouth'];
    blush?: boolean;
}

export interface EmoteKey {
    /** Kare zamanı (ms, ifadenin başından). İlk kare 0 olmalı. */
    at: number;
    face?: FaceDelta | 'neutral';
    body?: Partial<BodyPose> | 'neutral';
    /** Önceki kareden BU kareye geçişin eğrisi. Varsayılan `inOut`. */
    ease?: Ease;
}

export interface EmoteDef {
    duration: number;
    /** Daha düşük öncelikli ifade, süren daha yüksek önceliklinin yerini alamaz. */
    priority: number;
    /** `true` ise durdurulana kadar tekrar eder (ör. uyuklama). */
    loop?: boolean;
    keys: readonly EmoteKey[];
    /** Gövde dışı süs ve görünür olduğu aralık (ms). */
    fx?: { kind: FxKind; from: number; to: number };
}

interface ResolvedKey {
    at: number;
    face: FacePose;
    body: BodyPose;
    ease: Ease;
}

export interface CompiledEmote {
    def: EmoteDef;
    keys: ResolvedKey[];
}

const EASES: Record<Ease, (t: number) => number> = {
    linear: t => t,
    in: t => t * t * t,
    out: t => 1 - (1 - t) ** 3,
    inOut: t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
    // Hafif taşma — zıplama/pop hissi.
    back: t => {
        const c = 1.70158;
        return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
    },
    // Ara değer yok: önceki kare bu karenin anına kadar tutulur, sonra atlanır
    // (ör. tam turdan sonra 2π → 0; görüntü aynı, geri dönüş animasyonu yok).
    step: t => (t >= 1 ? 1 : 0),
};

function applyEye(base: EyePose, ...deltas: (Partial<EyePose> | undefined)[]): EyePose {
    let eye = base;
    for (const d of deltas) if (d) eye = { ...eye, ...d };
    return eye;
}

function applyFace(prev: FacePose, delta: FaceDelta | 'neutral' | undefined): FacePose {
    if (delta === 'neutral') return NEUTRAL_FACE;
    if (!delta) return prev;
    return {
        left: applyEye(prev.left, delta.eyes, delta.left),
        right: applyEye(prev.right, delta.eyes, delta.right),
        lookX: delta.lookX ?? prev.lookX,
        lookY: delta.lookY ?? prev.lookY,
        eyeScale: delta.eyeScale ?? prev.eyeScale,
        mouth: delta.mouth ?? prev.mouth,
        blush: delta.blush ?? prev.blush,
    };
}

function applyBody(prev: BodyPose, delta: Partial<BodyPose> | 'neutral' | undefined): BodyPose {
    if (delta === 'neutral') return NEUTRAL_BODY;
    return delta ? { ...prev, ...delta } : prev;
}

/** Anahtar kareleri bir kez çözer; örnekleme sırasında birleştirme yapılmaz. */
export function compileEmote(def: EmoteDef): CompiledEmote {
    const keys: ResolvedKey[] = [];
    let face = NEUTRAL_FACE;
    let body = NEUTRAL_BODY;
    const sorted = [...def.keys].sort((a, b) => a.at - b.at);
    for (const k of sorted) {
        face = applyFace(face, k.face);
        body = applyBody(body, k.body);
        keys.push({ at: k.at, face, body, ease: k.ease ?? 'inOut' });
    }
    if (keys.length === 0) keys.push({ at: 0, face, body, ease: 'linear' });
    return { def, keys };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function lerpEye(a: EyePose, b: EyePose, t: number): EyePose {
    return { shape: a.shape, open: lerp(a.open, b.open, t) };
}

function lerpFace(a: FacePose, b: FacePose, t: number): FacePose {
    return {
        left: lerpEye(a.left, b.left, t),
        right: lerpEye(a.right, b.right, t),
        lookX: lerp(a.lookX, b.lookX, t),
        lookY: lerp(a.lookY, b.lookY, t),
        eyeScale: lerp(a.eyeScale, b.eyeScale, t),
        mouth: a.mouth,
        blush: a.blush,
    };
}

function lerpBody(a: BodyPose, b: BodyPose, t: number): BodyPose {
    return {
        dx: lerp(a.dx, b.dx, t),
        dy: lerp(a.dy, b.dy, t),
        sx: lerp(a.sx, b.sx, t),
        sy: lerp(a.sy, b.sy, t),
        rot: lerp(a.rot, b.rot, t),
    };
}

/** İfade bu anda bitti mi (döngülü ifade hiç bitmez). `repeat`: art arda tur sayısı. */
export function emoteFinished(emote: CompiledEmote, ms: number, repeat = 1): boolean {
    return !emote.def.loop && ms >= emote.def.duration * repeat;
}

/**
 * İfadenin `ms` anındaki pozu. Yüz NİCEMLENMEZ — çizici anahtarı
 * `faceKey` ile, çizimi `quantizeFace` ile yapar (tek kural, tek yer).
 */
export function sampleEmote(emote: CompiledEmote, ms: number): MascotPose {
    const { def, keys } = emote;
    const t = def.loop && def.duration > 0
        ? ((ms % def.duration) + def.duration) % def.duration
        : Math.max(0, Math.min(ms, def.duration));

    let face = keys[keys.length - 1].face;
    let body = keys[keys.length - 1].body;
    for (let i = 0; i < keys.length - 1; i++) {
        const a = keys[i];
        const b = keys[i + 1];
        if (t >= b.at) continue;
        if (t <= a.at) { face = a.face; body = a.body; break; }
        const p = EASES[b.ease]((t - a.at) / (b.at - a.at));
        face = lerpFace(a.face, b.face, p);
        body = lerpBody(a.body, b.body, p);
        break;
    }

    const fx = def.fx && t >= def.fx.from && t < def.fx.to
        ? { kind: def.fx.kind, ms: t - def.fx.from }
        : null;
    return { face, body, fx };
}
