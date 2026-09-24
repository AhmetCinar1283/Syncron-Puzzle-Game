/**
 * DOSYA AMACI: Maskotu (oyuncu karakteri) DOM'un içine koymanın tek yolu —
 * menü, editör, DOM yedek tahtası, önizleme sayfası. Çizim KENDİ kodu değildir:
 * tahtadaki canvas çizicisinin (`render/entities/mascot.ts` → `playerSprite`)
 * aynısı küçük bir `<canvas>`a çağrılır. Yüz tek yerde tanımlı, her yerde aynı.
 *
 * Kullanım:
 *     <MascotView theme="neon" playerIndex={0} />                     // boşta kırpar
 *     const ref = useRef<MascotHandle>(null);
 *     <MascotView ref={ref} ... />;  ref.current?.emote('happy');       // tetikle
 *     <MascotView controller={shared} id={entity.id} ... />            // dışarıdan denetle
 *     <MascotView time={420} controller={c} ... />                     // donmuş an (denetleyiciden)
 *     <MascotView pose={sampleEmote(compiledEmote('happy'), 420)} ... /> // hazır poz (şablon/video)
 *
 * Yerleşim kutusu eski `PlayerGraphic` gibi 64x64; tuval taşan parlama, zıplama
 * ve süsler için her yöne `MARGIN` kadar taşar (tıklamayı engellemez).
 *
 * Boştaki davranış, bir atası `data-board-ambient="off|paused"` veya
 * `data-victory-freeze` taşıyorsa durur — eski CSS `playerBlink` kurallarının karşılığı.
 */

import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { CSSProperties, Ref } from 'react';
import type { GameTheme } from '../../themes/themeConfig';
import type { EmoteName } from '../../mascot/emotes';
import type { MascotController, TriggerOptions } from '../../mascot/controller';
import { createMascotController } from '../../mascot/controller';
import { faceKey } from '../../mascot/pose';
import type { MascotPose } from '../../mascot/pose';
import { NATIVE_CELL_SIZE } from '../../render/types';
import { createSpriteCache, type SpriteCache } from '../../render/spriteCache';
import { currentDpr } from '../../render/surface';
import { onIconsReady } from '../../render/icons';
import { pulsePhaseAt } from '../../render/entities/player';
import { mascotPoseAt, paintMascot } from '../../render/entities/mascot';
import { subscribeMascotTicker, wakeMascotTicker, type TickDemand } from './mascotTicker';

/** Tuvalin yerleşim kutusundan her yöne taşması (px): zıplama + üstteki süsler. */
const MARGIN = 32;
const BOX = NATIVE_CELL_SIZE + MARGIN * 2;

const FREEZE_SELECTOR = '[data-board-ambient="off"], [data-board-ambient="paused"], [data-victory-freeze]';

/** Aynı ölçekteki bütün görünümler tek önbelleği paylaşır (anahtar temayı içerir). */
const caches = new Map<number, SpriteCache>();
function cacheFor(scale: number): SpriteCache {
    let c = caches.get(scale);
    if (!c) {
        c = createSpriteCache(scale);
        caches.set(scale, c);
    }
    return c;
}

/** Teşhis: bütün `MascotView` önbelleklerindeki sprite sayısı. */
export function mascotCacheSize(): number {
    let n = 0;
    for (const c of caches.values()) n += c.size();
    return n;
}

export interface MascotHandle {
    controller: MascotController;
    /** @returns İfade başladıysa `true` (bkz. öncelik kuralı, controller.ts). */
    emote(name: EmoteName, opts?: TriggerOptions): boolean;
    stop(name?: EmoteName): void;
}

export interface MascotViewProps {
    theme: GameTheme;
    playerIndex: number;
    mode?: 'normal' | 'reversed';
    locked?: boolean;
    /** Denetleyicideki kimlik ve bakınma tohumu (tahtada varlık id'si). */
    id?: number;
    /** Paylaşılan denetleyici; verilmezse görünüm kendininkini kurar. */
    controller?: MascotController;
    /** Verilirse saat DONAR ve bu an (ms) çizilir — şablon/video/önizleme için. */
    time?: number;
    /**
     * Hazır poz: denetleyici ve boştaki davranış YOK SAYILIR, saat donar.
     * Nabız fazı `time`'dan (verilmezse 0). Video/şablonun asıl girişi.
     */
    pose?: MascotPose;
    /** Boşta kırpma/bakınma. Varsayılan açık. */
    idle?: boolean;
    /** Raster ölçeği (büyük gösterimde bulanıklaşmasın). CSS boyutunu DEĞİŞTİRMEZ. */
    zoom?: number;
    style?: CSSProperties;
    ref?: Ref<MascotHandle>;
}

export function MascotView({
    theme, playerIndex, mode = 'normal', locked = false, id = 0,
    controller, time, pose: fixedPose, idle = true, zoom = 1, style, ref,
}: MascotViewProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [own] = useState(createMascotController);
    const ctl = controller ?? own;

    useImperativeHandle(ref, () => ({
        controller: ctl,
        emote: (name, opts) => ctl.trigger(id, name, performance.now(), opts),
        stop: name => ctl.stop(id, name),
    }), [ctl, id]);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const scale = currentDpr() * zoom;
        canvas.width = Math.round(BOX * scale);
        canvas.height = Math.round(BOX * scale);
        const cache = cacheFor(scale);
        let lastKey = '';

        const render = (now: number): TickDemand => {
            const idleOn = idle && !locked && !canvas.closest(FREEZE_SELECTOR);
            const pose = fixedPose ?? mascotPoseAt(theme, id, now, idleOn, ctl);
            const pulsePhase = pulsePhaseAt(theme, mode, now);
            const emoting = !fixedPose && ctl.active(id, now) !== null;
            // İfade sürerken gövde/süs her karede değişir; boştayken yalnızca
            // yüz veya nabız değişince çizilir.
            const key = emoting ? `e${now}` : `${faceKey(pose.face)}|${pulsePhase}`;
            if (key !== lastKey) {
                lastKey = key;
                ctx.setTransform(scale, 0, 0, scale, 0, 0);
                ctx.clearRect(0, 0, BOX, BOX);
                ctx.translate(BOX / 2, BOX / 2);
                paintMascot(ctx, cache, { theme, playerIndex, mode, locked, pulsePhase }, pose);
            }
            if (emoting) return 'fast';
            // Donmuş atadan çıkışı fark etmek için boşta da yavaş tur sürer.
            const pulses = theme === 'neon' && mode === 'reversed';
            return (idle && !locked) || pulses ? 'slow' : 'sleep';
        };

        // İkon (kilit) geç yüklenirse yeniden çiz.
        const redraw = () => { lastKey = ''; };

        if (fixedPose || time !== undefined) {
            const at = time ?? 0;
            render(at);
            return onIconsReady(() => { redraw(); render(at); });
        }

        const offTick = subscribeMascotTicker(render);
        const offCtl = ctl.subscribe(wakeMascotTicker);
        const offIcons = onIconsReady(() => { redraw(); wakeMascotTicker(); });
        return () => { offTick(); offCtl(); offIcons(); };
    }, [theme, playerIndex, mode, locked, id, ctl, time, fixedPose, idle, zoom]);

    return (
        <div style={{ width: NATIVE_CELL_SIZE, height: NATIVE_CELL_SIZE, position: 'relative', userSelect: 'none', ...style }}>
            <canvas
                ref={canvasRef}
                aria-hidden
                style={{
                    position: 'absolute',
                    left: -MARGIN,
                    top: -MARGIN,
                    width: BOX,
                    height: BOX,
                    pointerEvents: 'none',
                }}
            />
        </div>
    );
}
