/**
 * DOSYA AMACI: Maskotu React'siz, tek çağrıyla bir `<canvas>`a çizer. Portal
 * şablonları (`docs/portals/assets/templates`) ve ileride video bunu kullanır;
 * `scripts/portal/build-mascot-bundle.mjs` bu dosyayı tek bir IIFE'ye paketler.
 *
 * Çizim KENDİ kodu değildir: oyundaki `paintMascot` (yüz sprite'ı + gövde
 * dönüşümü + süs) çağrılır. Poz `sampleEmote` ile ANDAN hesaplanır (saat yok),
 * bu yüzden aynı girdi her zaman aynı kareyi verir — ekran görüntüsü ve video için şart.
 *
 * Şablonda kullanım (HTML):
 *     <canvas data-mascot data-player="0" data-emote="wink" data-ms="300" data-size="76"></canvas>
 *     <script src="mascot.bundle.js"></script>   // yüklenince otomatik çizer
 * Elle: `Mascot.draw(canvas, { playerIndex: 1, emote: 'happy', ms: 200, size: 120 })`.
 */

import type { GameTheme } from '../themes/themeConfig';
import { compiledEmote, sampleEmote, EMOTES } from '../mascot';
import type { EmoteName, MascotPose } from '../mascot';
import { NEUTRAL_BODY, NEUTRAL_FACE } from '../mascot/pose';
import { NATIVE_CELL_SIZE } from '../render/types';
import { createSpriteCache } from '../render/spriteCache';
import { paintMascot } from '../render/entities/mascot';

/** Tuvalin, jeton kutusundan her yöne taşması (px, doğal ölçekte): süs ve parlama için. */
const MARGIN = 32;
const BOX = NATIVE_CELL_SIZE + MARGIN * 2;
/** Jetonun doğal kenarı (`playerStyles` token.size): hücrenin 44/64'ü. */
const TOKEN = 44;

export interface DrawMascotOptions {
    /** Marka teması (varsayılan: retro arcade 8-bit). */
    theme?: GameTheme;
    /** Renk: 0 yeşil, 1 mavi, … (bkz. `playerColors`). */
    playerIndex?: number;
    /** İfade adı; verilmezse nötr (dinlenme) yüz. */
    emote?: EmoteName;
    /** İfadenin bu anı (ms). */
    ms?: number;
    /** Jetonun (renkli karenin) ekrandaki kenarı, px. Tuval bunun etrafında taşma payıyla büyür. */
    size?: number;
    mode?: 'normal' | 'reversed';
    /** Hazır poz verilirse `emote`/`ms` yok sayılır. */
    pose?: MascotPose;
}

const REST: MascotPose = { face: { ...NEUTRAL_FACE, mouth: 'arrow' }, body: NEUTRAL_BODY, fx: null };

export function poseOf(emote: EmoteName | undefined, ms: number): MascotPose {
    return emote ? sampleEmote(compiledEmote(emote), ms) : REST;
}

/** Aynı ölçekteki çizimler önbelleği paylaşır. */
const caches = new Map<number, ReturnType<typeof createSpriteCache>>();

export function drawMascot(canvas: HTMLCanvasElement, opts: DrawMascotOptions = {}): void {
    const { theme = 'arcade', playerIndex = 0, mode = 'normal', size = TOKEN } = opts;
    const zoom = size / TOKEN;
    // Ekranın iki katı çözünürlük: küçültünce keskin kalır.
    const scale = zoom * 2;
    let cache = caches.get(scale);
    if (!cache) caches.set(scale, cache = createSpriteCache(scale));

    canvas.width = Math.round(BOX * scale);
    canvas.height = Math.round(BOX * scale);
    canvas.style.width = `${BOX * zoom}px`;
    canvas.style.height = `${BOX * zoom}px`;
    canvas.style.margin = `${-(BOX - TOKEN) / 2 * zoom}px`;   // yerleşim kutusu jetonun kendisi kalır

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, BOX, BOX);
    ctx.translate(BOX / 2, BOX / 2);
    const pose = opts.pose ?? poseOf(opts.emote, opts.ms ?? 0);
    paintMascot(ctx, cache, { theme, playerIndex, mode, locked: false, pulsePhase: 0 }, pose);
}

/** `data-mascot` taşıyan bütün tuvalleri çizer. */
export function hydrate(root: ParentNode = document): number {
    const canvases = root.querySelectorAll<HTMLCanvasElement>('canvas[data-mascot]');
    canvases.forEach(c => {
        const d = c.dataset;
        const emote = d.emote as EmoteName | undefined;
        if (emote && !EMOTES[emote]) throw new Error(`Bilinmeyen ifade: ${emote}`);
        drawMascot(c, {
            theme: (d.theme as GameTheme) || 'arcade',
            playerIndex: Number(d.player ?? 0),
            emote,
            ms: Number(d.ms ?? 0),
            size: Number(d.size ?? TOKEN),
            mode: d.mode === 'reversed' ? 'reversed' : 'normal',
        });
    });
    return canvases.length;
}

if (typeof document !== 'undefined') {
    const run = () => { hydrate(); (window as unknown as { __mascotReady?: boolean }).__mascotReady = true; };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
    else run();
}
