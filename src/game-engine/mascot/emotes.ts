/**
 * DOSYA AMACI: Maskotun ifade (emote) kataloğu — YALNIZCA veri. Yeni bir ifade
 * eklemek = buraya bir kayıt eklemek; çizici, denetleyici ve önizleme sayfası
 * değişmez (`dev-mascot` sayfası listeyi buradan okur).
 *
 * Kurallar (bkz. pose.ts):
 *   - Son kare dinlenme hâline dönmeli (`'neutral'`); dönmezse ifade bittiğinde
 *     yüz bir karede zıplar.
 *   - Ok dışında bir ağız kullanan ifade kısa kalmalı (mod bilgisi kuralı).
 *   - Gövde değerleri 44px'lik jetona göre: 10px'lik zıplama belirgin bir sıçrayış.
 *
 * Öncelik kademeleri: 0 kırpma · 1 bakış/uyuklama · 2 göz kırpma · 3 hafif duygu ·
 * 4 güçlü tepki · 5 çarpma/sersemlik · 6 kutlama.
 */

import type { EmoteDef } from './timeline';

const LOOK = (lookX: number, lookY: number): EmoteDef => ({
    duration: 900,
    priority: 1,
    keys: [
        { at: 0, face: 'neutral' },
        { at: 140, face: { lookX, lookY }, ease: 'out' },
        { at: 700, face: { lookX, lookY } },
        { at: 900, face: 'neutral' },
    ],
});

const TABLE = {
    blink: {
        duration: 180,
        priority: 0,
        keys: [
            { at: 0, face: 'neutral' },
            { at: 80, face: { eyes: { open: 0.1 } }, ease: 'in' },
            { at: 180, face: 'neutral', ease: 'out' },
        ],
    },

    wink: {
        duration: 650,
        priority: 2,
        keys: [
            { at: 0, face: 'neutral' },
            { at: 70, face: { right: { shape: 'happy' }, mouth: 'smile' }, body: { rot: 0.1 }, ease: 'back' },
            { at: 520, body: { rot: 0.1 } },
            { at: 650, face: 'neutral', body: 'neutral' },
        ],
    },

    lookLeft: LOOK(-1, 0),
    lookRight: LOOK(1, 0),
    lookUp: LOOK(0, -1),
    lookDown: LOOK(0, 1),

    surprised: {
        duration: 950,
        priority: 4,
        fx: { kind: 'exclaim', from: 40, to: 800 },
        keys: [
            { at: 0, face: 'neutral' },
            { at: 60, face: { eyes: { shape: 'wide' }, eyeScale: 1.3, mouth: 'open' }, body: { dy: -7, sx: 0.88, sy: 1.14 }, ease: 'out' },
            { at: 220, body: { dy: 0, sx: 1.06, sy: 0.94 }, ease: 'in' },
            { at: 340, body: 'neutral', ease: 'out' },
            { at: 780, face: { eyeScale: 1.2 } },
            { at: 950, face: 'neutral' },
        ],
    },

    happy: {
        duration: 1000,
        priority: 4,
        fx: { kind: 'sparkle', from: 0, to: 900 },
        keys: [
            { at: 0, face: { eyes: { shape: 'happy' }, mouth: 'grin', blush: true } },
            { at: 140, body: { dy: -6, sx: 0.94, sy: 1.08 }, ease: 'out' },
            { at: 280, body: { dy: 0, sx: 1.08, sy: 0.92 }, ease: 'in' },
            { at: 420, body: { dy: -4, sx: 0.97, sy: 1.04 }, ease: 'out' },
            { at: 560, body: 'neutral', ease: 'in' },
            { at: 860, face: { eyes: { shape: 'happy' } } },
            { at: 1000, face: 'neutral' },
        ],
    },

    celebrate: {
        duration: 1500,
        priority: 6,
        fx: { kind: 'stars', from: 250, to: 1400 },
        keys: [
            { at: 0, face: { eyes: { shape: 'happy' }, mouth: 'grin', blush: true } },
            // Hazırlık: çömelme.
            { at: 120, body: { sx: 1.12, sy: 0.84 }, ease: 'out' },
            // Sıçra + tam tur.
            { at: 420, face: { eyes: { shape: 'star' }, eyeScale: 1.3 }, body: { dy: -14, sx: 0.9, sy: 1.12, rot: Math.PI }, ease: 'out' },
            { at: 700, body: { dy: 0, sx: 1.1, sy: 0.88, rot: Math.PI * 2 }, ease: 'in' },
            { at: 820, body: { dy: 0, sx: 1, sy: 1, rot: Math.PI * 2 }, ease: 'back' },
            // 2π ≡ 0: sıfırlama görünmez, sondaki 'neutral' geri döndürmez.
            { at: 821, body: { rot: 0 }, ease: 'step' },
            { at: 1300, face: { eyes: { shape: 'star' }, eyeScale: 1.2 } },
            { at: 1500, face: 'neutral', body: 'neutral', ease: 'linear' },
        ],
    },

    love: {
        duration: 1200,
        priority: 3,
        fx: { kind: 'hearts', from: 0, to: 1100 },
        keys: [
            { at: 0, face: 'neutral' },
            { at: 90, face: { eyes: { shape: 'heart' }, eyeScale: 1.3, mouth: 'smile', blush: true }, body: { sx: 1.06, sy: 1.06 }, ease: 'back' },
            { at: 400, body: { sx: 0.98, sy: 0.98 } },
            { at: 700, body: { sx: 1.05, sy: 1.05 } },
            { at: 1050, face: { eyeScale: 1.3 }, body: 'neutral' },
            { at: 1200, face: 'neutral' },
        ],
    },

    sad: {
        duration: 1500,
        priority: 4,
        fx: { kind: 'sweat', from: 200, to: 1300 },
        keys: [
            { at: 0, face: 'neutral' },
            { at: 200, face: { eyes: { shape: 'sad' }, mouth: 'frown', lookY: 0.5 }, body: { dy: 2, sx: 1.05, sy: 0.93 }, ease: 'out' },
            { at: 1250, face: { lookY: 0.5 }, body: { dy: 2, sx: 1.05, sy: 0.93 } },
            { at: 1500, face: 'neutral', body: 'neutral' },
        ],
    },

    confused: {
        duration: 1300,
        priority: 3,
        fx: { kind: 'question', from: 80, to: 1150 },
        keys: [
            { at: 0, face: 'neutral' },
            { at: 120, face: { right: { shape: 'line' }, mouth: 'wavy', lookY: -0.5 }, body: { rot: -0.18 }, ease: 'back' },
            { at: 650, body: { rot: 0.14 } },
            { at: 1100, face: { lookY: -0.5 }, body: { rot: 0.14 } },
            { at: 1300, face: 'neutral', body: 'neutral' },
        ],
    },

    nervous: {
        duration: 1200,
        priority: 3,
        fx: { kind: 'sweat', from: 0, to: 1100 },
        keys: [
            { at: 0, face: { eyeScale: 0.8, mouth: 'wavy', lookX: -0.5 } },
            { at: 250, face: { lookX: 0.5 }, body: { dx: 1 } },
            { at: 500, face: { lookX: -0.5 }, body: { dx: -1 } },
            { at: 750, face: { lookX: 0.5 }, body: { dx: 1 } },
            { at: 1000, face: { lookX: 0 }, body: 'neutral' },
            { at: 1200, face: 'neutral' },
        ],
    },

    ouch: {
        duration: 700,
        priority: 5,
        fx: { kind: 'anger', from: 0, to: 600 },
        keys: [
            { at: 0, face: { eyes: { shape: 'x' }, mouth: 'wavy' }, body: { sx: 1.22, sy: 0.8 } },
            { at: 120, body: { sx: 0.92, sy: 1.08, rot: -0.12 }, ease: 'out' },
            { at: 240, body: { sx: 1.03, sy: 0.97, rot: 0.08 } },
            { at: 360, body: { rot: -0.04 } },
            { at: 480, body: 'neutral' },
            { at: 560, face: { eyes: { shape: 'x' } } },
            { at: 700, face: 'neutral' },
        ],
    },

    dizzy: {
        duration: 1800,
        priority: 5,
        fx: { kind: 'stars', from: 0, to: 1650 },
        keys: [
            { at: 0, face: { eyes: { shape: 'spiral' }, mouth: 'wavy' } },
            { at: 225, body: { rot: 0.16, dx: 1.5 } },
            { at: 450, body: { rot: -0.16, dx: -1.5 } },
            { at: 675, body: { rot: 0.14, dx: 1.5 } },
            { at: 900, body: { rot: -0.14, dx: -1.5 } },
            { at: 1125, body: { rot: 0.1, dx: 1 } },
            { at: 1350, body: { rot: -0.06, dx: -0.5 } },
            { at: 1550, face: { eyes: { shape: 'spiral' } }, body: 'neutral' },
            { at: 1800, face: 'neutral' },
        ],
    },

    sleepy: {
        duration: 2400,
        priority: 1,
        loop: true,
        fx: { kind: 'zzz', from: 0, to: 2400 },
        keys: [
            { at: 0, face: { eyes: { shape: 'line' }, mouth: 'flat', lookY: 0.5 }, body: { sx: 1.03, sy: 0.96 } },
            { at: 1200, body: { sx: 0.99, sy: 1.02 } },
            { at: 2400, body: { sx: 1.03, sy: 0.96 } },
        ],
    },
} satisfies Record<string, EmoteDef>;

export type EmoteName = keyof typeof TABLE;

/** Ad → tanım. `EmoteDef` olarak tiplenir ki isteğe bağlı alanlar (`loop`, `fx`) her kayıtta okunabilsin. */
export const EMOTES: Record<EmoteName, EmoteDef> = TABLE;

export const EMOTE_NAMES = Object.keys(EMOTES) as EmoteName[];
