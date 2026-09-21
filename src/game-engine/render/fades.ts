/**
 * DOSYA AMACI: DOM'daki `transition`ların canvas karşılığının KARE DIŞI durumu —
 * bir hücrenin veya odanın görünümü değişince eski görünümü, başlangıç damgasını
 * ve süreyi tutar; çizim bunlardan `globalAlpha` ile çapraz geçiş çıkarır.
 *
 * NEDEN sprite yeniden rasterize edilmez: iki uç hâlin sprite'ı zaten önbellekte
 * (anahtar hâli taşıyor); ara kareler yalnızca iki `drawImage` + `globalAlpha`
 * (00-ilkeler §2.1). CSS renkleri ara değerler; burada iki görüntü karıştırılır —
 * yarı saydam sprite'larda fark küçüktür (bkz. 10-rapor §4).
 *
 * KİRLİ TUTMA burada değil: geçiş başlayınca bitiş damgası `KeepAlive`a yazılır
 * (`keepAlive.ts`); sis geçişiyle aynı yol.
 *
 * Saf dosya: tuvale dokunmaz, `performance` okumaz (`now` dışarıdan gelir).
 */

import type { CellPaintInput, LayerName } from './types';
import type { KeepAlive } from './keepAlive';
import { EASE_CSS } from './motion';

/** `GameBoard`'daki oda `<div>`'inin `transition: opacity 0.25s, box-shadow 0.25s`. */
export const ROOM_FADE_MS = 250;

/** Kontrol edilmeyen odanın `opacity: 0.4` değeri (`GameBoard`'daki oda `<div>`'i). */
export const UNCONTROLLED_ALPHA = 0.4;

/** Hücre ve oda geçişlerinin uyandırdığı katmanlar: gövde `static`te, süsler `ambient`te. */
const FADE_LAYERS: readonly LayerName[] = ['static', 'ambient'];

interface Fade<S> {
    from: S;
    startedAt: number;
    durationMs: number;
}

/** Bir hücrenin çizimin okuduğu geçiş görünümü. */
export interface CellFade {
    /** Geçişten ÖNCEKİ hücre girdisi. */
    from: CellPaintInput;
    /** CSS `ease` uygulanmış ilerleme, 0..1. */
    e: number;
    /** Geçişin başlangıcından bu yana geçen süre (ms) — tek atımlık izler için. */
    elapsedMs: number;
}

/** Çizicilerin bir karede okuduğu görünüm. Geçiş yoksa ilgili çağrı `null` / taban değer döner. */
export interface FadeFrame {
    cell(key: string): CellFade | null;
    /** Odanın o anki `opacity`si (geçiş sürüyorsa ara değer). */
    roomAlpha(roomId: string, isControlled: boolean): number;
    /** Oda çerçevesinin eski hâli ve ilerleme; geçiş yoksa `null`. */
    roomFade(roomId: string): { fromControlled: boolean; e: number } | null;
}

export interface Fades {
    /**
     * Hücrenin şu anki hâlini bildirir. `token` görünümü belirleyen dizgi
     * (sprite anahtarı); değiştiyse ve `durationMs > 0` ise geçiş başlar.
     * `snap` (yeni tur, tema değişimi) geçiş başlatmaz, yalnızca hâli yazar.
     * @returns Yeni bir geçiş başladıysa `true`.
     */
    observeCell(
        key: string,
        token: string,
        input: CellPaintInput,
        now: number,
        durationMs: number,
        snap: boolean,
        layers?: readonly LayerName[],
    ): boolean;
    observeRoom(roomId: string, isControlled: boolean, now: number, snap: boolean): boolean;
    frame(now: number): FadeFrame;
    clear(): void;
}

/** Süre dolmuşsa `null`; aksi halde geçen süre ve CSS `ease` uygulanmış ilerleme. */
function progressOf(fade: Fade<unknown> | undefined, now: number): { elapsedMs: number; e: number } | null {
    if (!fade) return null;
    // RAF damgası `performance.now()`tan biraz önce olabilir; negatif süre 0'a kenetlenir.
    const elapsedMs = Math.max(0, now - fade.startedAt);
    if (elapsedMs >= fade.durationMs) return null;
    return { elapsedMs, e: EASE_CSS(elapsedMs / fade.durationMs) };
}

export function createFades(keepAlive: KeepAlive): Fades {
    const cellState = new Map<string, { token: string; input: CellPaintInput }>();
    const cellFades = new Map<string, Fade<CellPaintInput>>();
    const roomState = new Map<string, boolean>();
    const roomFades = new Map<string, Fade<boolean>>();

    return {
        observeCell(key, token, input, now, durationMs, snap, layers = FADE_LAYERS) {
            const known = cellState.get(key);
            cellState.set(key, { token, input });
            if (!known || known.token === token) return false;

            if (snap || durationMs <= 0) {
                cellFades.delete(key);
                return false;
            }
            cellFades.set(key, { from: known.input, startedAt: now, durationMs });
            keepAlive.hold(layers, now + durationMs);
            return true;
        },

        observeRoom(roomId, isControlled, now, snap) {
            const known = roomState.get(roomId);
            roomState.set(roomId, isControlled);
            if (known === undefined || known === isControlled) return false;

            if (snap) {
                roomFades.delete(roomId);
                return false;
            }
            roomFades.set(roomId, { from: known, startedAt: now, durationMs: ROOM_FADE_MS });
            keepAlive.hold(FADE_LAYERS, now + ROOM_FADE_MS);
            return true;
        },

        frame(now) {
            return {
                cell(key) {
                    const fade = cellFades.get(key);
                    const p = progressOf(fade, now);
                    return fade && p ? { from: fade.from, e: p.e, elapsedMs: p.elapsedMs } : null;
                },

                roomAlpha(roomId, isControlled) {
                    const target = isControlled ? 1 : UNCONTROLLED_ALPHA;
                    const fade = roomFades.get(roomId);
                    const p = progressOf(fade, now);
                    if (!fade || !p) return target;
                    const from = fade.from ? 1 : UNCONTROLLED_ALPHA;
                    return from + (target - from) * p.e;
                },

                roomFade(roomId) {
                    const fade = roomFades.get(roomId);
                    const p = progressOf(fade, now);
                    return fade && p ? { fromControlled: fade.from, e: p.e } : null;
                },
            };
        },

        clear() {
            cellState.clear();
            cellFades.clear();
            roomState.clear();
            roomFades.clear();
        },
    };
}

/** Oda `opacity`si: geçiş sürüyorsa ara değer, yoksa `1` / `UNCONTROLLED_ALPHA`. */
export function roomAlphaOf(fades: FadeFrame | null, roomId: string, isControlled: boolean): number {
    return fades ? fades.roomAlpha(roomId, isControlled) : (isControlled ? 1 : UNCONTROLLED_ALPHA);
}
