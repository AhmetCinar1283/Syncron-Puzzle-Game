/**
 * DOSYA AMACI: Maskotun (oyuncu varlığı) bir andaki görünüşünü VERİ olarak
 * tanımlamak. Çizim kodu (canvas) bu veriyi okur; hiçbir çizici ifadeyi kendisi
 * "bilmez". Böylece oyun, menü, editör, portal şablonları ve video TEK yüzü paylaşır.
 *
 * Poz üç parçadır ve bölünme performans kararıdır:
 *   - `FacePose`  → sprite'a PİŞİRİLİR (anahtara girer). Bu yüzden `quantizeFace`
 *                   ile sınırlı sayıda değere indirilir; yoksa önbellek şişer.
 *   - `BodyPose`  → blit anında `ctx` dönüşümüyle uygulanır (sürekli değer serbest).
 *   - `MascotFx`  → gövdenin DIŞINA çizilen süs (ünlem, zzz, yıldız); küçük glif
 *                   sprite'ları blit anında konumlanır.
 *
 * MOD BİLGİSİ KURALI: ağızdaki ▲/▼ oyun bilgisidir (normal/ters mod). Dinlenme
 * hâli daima `mouth: 'arrow'`dır; başka ağızlar YALNIZCA süreli ifadelerde
 * (emote) görünür ve ifade bitince ok geri gelir.
 *
 * Saf dosya: tuvale dokunmaz.
 */

/** Göz şekilleri. `dot` temanın kendi gözüdür (yuvarlak veya arcade'de kare). */
export type EyeShape =
    | 'dot'     // normal
    | 'happy'   // ^  (gülen / göz kırpan kapalı göz)
    | 'sad'     // eğik çizgi
    | 'x'       // ×  (çarpma, acı)
    | 'wide'    // halka + bebek (şaşkın)
    | 'spiral'  // @  (sersem)
    | 'line'    // −  (uykulu / kapalı)
    | 'heart'   // ♥
    | 'star';   // ★  (heyecan)

/** Ağız şekilleri. `arrow` = moda göre ▲/▼ (dinlenme hâli, bkz. MOD BİLGİSİ KURALI). */
export type MouthShape = 'arrow' | 'smile' | 'grin' | 'open' | 'frown' | 'flat' | 'wavy';

/** Gövde dışı süs türleri. */
export type FxKind = 'exclaim' | 'question' | 'sweat' | 'zzz' | 'sparkle' | 'hearts' | 'stars' | 'anger';

export interface EyePose {
    shape: EyeShape;
    /** Dikey açıklık: 1 açık, 0.1 kırpma. `scaleY` karşılığı. */
    open: number;
}

export interface FacePose {
    left: EyePose;
    right: EyePose;
    /** Bakış yönü, -1..1. Gözler ve (yarısı kadar) ağız kayar. */
    lookX: number;
    lookY: number;
    /** Göz boyu çarpanı (şaşkınlıkta büyür). */
    eyeScale: number;
    mouth: MouthShape;
    /** Yanak pembeliği. */
    blush: boolean;
}

export interface BodyPose {
    /** Kayma (CSS pikseli). `dy < 0` yukarı zıplama. */
    dx: number;
    dy: number;
    /** Ezilme/uzama; pivot jetonun TABANI (yere basıyormuş gibi). */
    sx: number;
    sy: number;
    /** Radyan. */
    rot: number;
}

export interface MascotFx {
    kind: FxKind;
    /** Süsün başlangıcından beri geçen süre (ms) — konum/alfa buradan hesaplanır. */
    ms: number;
}

export interface MascotPose {
    face: FacePose;
    body: BodyPose;
    fx: MascotFx | null;
}

const OPEN_EYE: EyePose = { shape: 'dot', open: 1 };

export const NEUTRAL_FACE: FacePose = Object.freeze({
    left: OPEN_EYE,
    right: OPEN_EYE,
    lookX: 0,
    lookY: 0,
    eyeScale: 1,
    mouth: 'arrow',
    blush: false,
}) as FacePose;

export const NEUTRAL_BODY: BodyPose = Object.freeze({ dx: 0, dy: 0, sx: 1, sy: 1, rot: 0 }) as BodyPose;

export const NEUTRAL_POSE: MascotPose = Object.freeze({ face: NEUTRAL_FACE, body: NEUTRAL_BODY, fx: null }) as MascotPose;

/** Kırpma karesi: iki göz de 0.1'e ezilir (`playerBlink` %96 karesi). */
export const BLINK_FACE: FacePose = Object.freeze({
    ...NEUTRAL_FACE,
    left: { shape: 'dot', open: 0.1 },
    right: { shape: 'dot', open: 0.1 },
}) as FacePose;

// ── Nicemleme ───────────────────────────────────────────────────────────────
// Yüz sprite'a pişirildiği için her sürekli alan az sayıda basamağa iner.
// Basamak sayısı = önbellekteki en kötü durum; değiştirirken anahtar
// patlamasını düşün (spriteCache WARN_AT_SIZE).

const snap = (v: number, step: number, min: number, max: number) =>
    Math.min(max, Math.max(min, Math.round(v / step) * step));

/** 0.1 (kırpma) korunur; geri kalanı çeyrek basamak. */
function snapOpen(v: number): number {
    if (v <= 0.175) return 0.1;
    return snap(v, 0.25, 0.25, 1);
}

function snapEye(e: EyePose): EyePose {
    return { shape: e.shape, open: snapOpen(e.open) };
}

export function quantizeFace(face: FacePose): FacePose {
    return {
        left: snapEye(face.left),
        right: snapEye(face.right),
        lookX: snap(face.lookX, 0.5, -1, 1),
        lookY: snap(face.lookY, 0.5, -1, 1),
        eyeScale: snap(face.eyeScale, 0.1, 0.6, 1.8),
        mouth: face.mouth,
        blush: face.blush,
    };
}

const num = (v: number) => (Math.round(v * 100) / 100).toString();

/** Nicemlenmiş yüzün sprite anahtarı parçası. Nötr yüz kısa ve sabit kalır. */
export function faceKey(face: FacePose): string {
    const q = quantizeFace(face);
    return `${q.left.shape}${num(q.left.open)}.${q.right.shape}${num(q.right.open)}`
        + `.${num(q.lookX)},${num(q.lookY)}.${num(q.eyeScale)}.${q.mouth}.${q.blush ? 1 : 0}`;
}
