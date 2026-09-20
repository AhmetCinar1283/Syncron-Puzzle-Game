/**
 * DOSYA AMACI: Canvas yolunun tek dışa açık giriş noktası. `GameBoard` ile aynı
 * props'ları alır, aynı film oynatma mantığını yürütür (kare ilerletme, ses,
 * titreşim, `onAnimationEnd`), sahneyi (`BoardScene`) hesaplar, üç tuvali kurar
 * ve zamanlayıcıyı çalıştırır.
 *
 * BU FAZ HİÇBİR OYUN İÇERİĞİ ÇİZMEZ. Üç katman çizim fonksiyonu boş; imzaları
 * DONDURULMUŞTUR, sonraki fazlar onları doldurur (bkz. dosya sonu).
 *
 * NEDEN oynatma mantığı `GameBoard` ile birebir tekrar ediliyor: ortak bir
 * `useFilmPlayback` hook'u çıkarmak `GameBoard`'a dokunmak demek; o hâlâ üretimde
 * ve varsayılan yol. Tek değişiklikle iki yolu birden riske atmamak için tekrar
 * kabul edildi; Faz 08'de DOM yolu kapanınca sadeleşir (faz planı §3.7).
 *
 * NEDEN props arayüzü burada yeniden yazıldı: `GameBoardProps` `GameBoard.tsx`
 * içinde yereldir ve o dosya bu fazda değiştirilmiyor (faz planı §4).
 */

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { TickSnapshot, VFXEvent } from '../logic/types';
import type { Entity } from '../logic/entityTypes';
import type { LevelEdges } from '../logic/engine/getNextTopologyPosition';
import type { SoundName } from '../hooks/useSoundManager';
import { calculateRoomLayoutOffsets } from '../logic/engine/rooms';
import { useGameTheme } from '../contexts/GameThemeContext';
import { VICTORY_CELEBRATION_DURATION } from '../components/effects/VictoryCelebration';
import { NATIVE_CELL_SIZE, ROOM_LAYOUT_GAP } from '../components/play-screen/constants';
import type { BoardAmbientMode } from '../components/board/boardKeyframes';
import { soundEngine } from '../audio/soundEngine';
import { hapticImpact, hapticNotify } from '@/lib/haptics';
import { useMotionTier } from '@/lib/motionTier';
import { boardBleedFor, createSurfaces, resize, dispose, clearLayer, currentDpr, type Surfaces } from './surface';
import { createScheduler, type Scheduler } from './scheduler';
import { createSpriteCache, type SpriteCache } from './spriteCache';
import { onIconsReady, clearIcons } from './icons';
import { drawCellsAmbient, drawCellsStatic, occupancySignature } from './cells';
import { createActivityTracker, type ActivityTracker } from './cells/activity';
import { drawAmbientOverlays, drawRoomFrames, drawStaticOverlays } from './overlays';
import { drawActorsLayer as drawActors } from './entities';
import { createEntityMotionTracker, type EntityMotionTracker } from './entityMotion';
import { createVictoryTracker, type VictoryTracker } from './victory';
import { playersSignature } from '../components/board/boardIndex';
import type { BoardScene } from './types';

/** Bir tick'in ekranda kalma süresi (ms) — `GameBoard` ile aynı değerler. */
const MIN_FRAME_MS = 55;
const MAX_FRAME_MS = 90;

const VFX_TO_SOUND: Partial<Record<string, SoundName>> = {
    sound_move:         'move',
    sound_push:         'box_push',
    sound_ice_slide:    'ice',
    sound_ice_break:    'ice',
    sound_portal_enter: 'portal',
    sound_portal_exit:  'teleport',
    sound_boing:        'boing',
    sound_conveyor:     'conveyor',
    sound_toggle:       'toggle',
    sound_win:          'win',
    sound_lose:         'lose',
};

const NO_ENTITIES: Entity[] = [];

interface BoardCanvasProps {
    snapshots: TickSnapshot[] | null;
    controlledRoomIds?: string[];
    levelEdges?: LevelEdges;
    onAnimationEnd?: () => void;
    onPlaySound?: (sound: SoundName) => void;
    muted?: boolean;
}

const BoardCanvas = ({ snapshots, controlledRoomIds, onAnimationEnd, onPlaySound, muted }: BoardCanvasProps) => {
    const { theme } = useGameTheme();
    const motionTier = useMotionTier();
    const [prevSnapshots, setPrevSnapshots] = useState<TickSnapshot[] | null>(snapshots);
    const [currentFrame, setCurrentFrame] = useState(0);

    if (snapshots !== prevSnapshots) {
        setPrevSnapshots(snapshots);
        const isExtension = prevSnapshots &&
                            prevSnapshots.length > 0 &&
                            snapshots &&
                            snapshots.length > prevSnapshots.length &&
                            prevSnapshots[0] === snapshots[0];
        if (!isExtension) {
            setCurrentFrame(0);
        }
    }

    const onAnimationEndRef = useRef(onAnimationEnd);
    onAnimationEndRef.current = onAnimationEnd;

    const remainingFrames = snapshots ? snapshots.length - 1 - currentFrame : 0;
    const frameMs = snapshots
        ? remainingFrames > 3
            ? Math.max(MIN_FRAME_MS, Math.min(MAX_FRAME_MS, 420 / remainingFrames))
            : Math.max(60, Math.min(110, 300 / snapshots.length))
        : 80;

    const frameIndex = snapshots && snapshots.length > 0 ? Math.min(currentFrame, snapshots.length - 1) : 0;
    const snapshot: TickSnapshot | null = snapshots?.[frameIndex] ?? null;
    const prevSnapshot: TickSnapshot | null = (snapshots && frameIndex > 0 ? snapshots[frameIndex - 1] : null) ?? null;
    const rooms = snapshot?.rooms ?? null;

    const layout = useMemo(
        () => (rooms
            ? calculateRoomLayoutOffsets(rooms, NATIVE_CELL_SIZE, ROOM_LAYOUT_GAP)
            : { roomPositions: {}, totalWidth: 0, totalHeight: 0 }),
        [rooms]
    );

    // Kare ilerletme — `GameBoard` ile birebir aynı zamanlama.
    useEffect(() => {
        if (!snapshots || snapshots.length === 0) return;
        if (snapshots.length === 1) return;

        if (currentFrame >= snapshots.length - 1) {
            const finalSnapshot = snapshots[snapshots.length - 1];
            const hasDeath = finalSnapshot?.entities.some(e => e.customData.deathReason) ?? false;
            const hasWin = finalSnapshot?.entities.some(e => e.customData.isVictory) ?? false;

            if (hasDeath) {
                const timer = setTimeout(() => { onAnimationEndRef.current?.(); }, 800);
                return () => clearTimeout(timer);
            } else if (hasWin) {
                const timer = setTimeout(() => { onAnimationEndRef.current?.(); }, VICTORY_CELEBRATION_DURATION);
                return () => clearTimeout(timer);
            } else {
                onAnimationEndRef.current?.();
            }
            return;
        }

        let start: number | null = null;
        let animationFrameId: number;

        const step = (timestamp: number) => {
            if (!start) start = timestamp;
            if (timestamp - start >= frameMs) {
                setCurrentFrame(c => c + 1);
            } else {
                animationFrameId = requestAnimationFrame(step);
            }
        };

        animationFrameId = requestAnimationFrame(step);
        return () => cancelAnimationFrame(animationFrameId);
    }, [currentFrame, snapshots, frameMs]);

    useEffect(() => {
        if (muted) return;
        if (!snapshots) return;
        const frame = snapshots[currentFrame];
        if (!frame) return;
        frame.vfxEvents.forEach((vfx: VFXEvent) => {
            const soundName = VFX_TO_SOUND[vfx];
            if (!soundName) return;
            if (onPlaySound) {
                onPlaySound(soundName);
            } else {
                soundEngine.play(soundName);
            }
        });
    }, [currentFrame, snapshots, muted, onPlaySound]);

    // Dokunsal geri bildirim sesle aynı karede verilir ki üçlü senkron kalsın.
    useEffect(() => {
        if (!snapshots) return;
        const frame = snapshots[currentFrame];
        if (!frame) return;

        let strongest: 'none' | 'bump' | 'death' | 'victory' = 'none';
        for (const entity of frame.entities) {
            if (entity.customData.deathReason) { strongest = 'death'; break; }
            if (entity.customData.isVictory) { strongest = 'victory'; break; }
            if (entity.customData.bumpDirection) strongest = 'bump';
        }

        if (strongest === 'death') hapticNotify('error');
        else if (strongest === 'victory') hapticNotify('success');
        else if (strongest === 'bump') hapticImpact('medium');
    }, [currentFrame, snapshots]);

    const isPlaying = !!snapshots && snapshots.length > 1 && currentFrame < snapshots.length - 1;
    const hasVictory = snapshots?.[snapshots.length - 1]?.entities.some(e => e.customData.isVictory) ?? false;
    const isVictoryActive = !!snapshots && currentFrame >= snapshots.length - 1 && hasVictory;
    const ambientMode: BoardAmbientMode =
        motionTier === 'lite' || isVictoryActive ? 'off' : isPlaying ? 'paused' : 'on';

    // Bu tick'in başlangıç damgası: hareket interpolasyonunun (Faz 05) tabanı.
    // Kasıtlı olarak yalnızca `snapshot` değişince yenilenir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const tickStartedAt = useMemo(() => (typeof performance !== 'undefined' ? performance.now() : 0), [snapshot]);

    const scene: BoardScene | null = useMemo(() => (rooms && snapshot ? {
        rooms,
        entities: snapshot.entities ?? NO_ENTITIES,
        prevEntities: prevSnapshot?.entities ?? null,
        roomPositions: layout.roomPositions,
        totalWidth: layout.totalWidth,
        totalHeight: layout.totalHeight,
        theme,
        controlledRoomIds,
        ambientMode,
        frameMs,
        tickStartedAt,
        isVictoryActive,
    } : null), [rooms, snapshot, prevSnapshot, layout, theme, controlledRoomIds, ambientMode, frameMs, tickStartedAt, isVictoryActive]);

    // Çizim geri çağrıları render döngüsünün dışında çalışır; sahneyi bir ref
    // üzerinden okurlar ki zamanlayıcı her sahnede yeniden kurulmak zorunda kalmasın.
    const sceneRef = useRef<BoardScene | null>(scene);
    sceneRef.current = scene;

    // Konveyör/teleport/trambolin hücrelerinin GEÇİCİ "çalışıyor" hâli sahnede
    // yazılı değil, kendi zamanlayıcısıyla sönüyor (bkz. cells/activity.ts).
    const activity = useMemo<ActivityTracker>(() => createActivityTracker(), []);
    const activityRef = useRef(activity);
    activityRef.current = activity;

    // Varlıkların süren efekt durumu (iniş, çarpma, ölüm, zafer). Sahne
    // değişince güncellenir; çizim yalnızca okur (bkz. entityMotion.ts).
    const motion = useMemo<EntityMotionTracker>(() => createEntityMotionTracker(), []);
    const motionRef = useRef(motion);
    motionRef.current = motion;
    const expiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Zafer koreografisinin kare dışı durumu (Faz 06). Sahne değişince kurulur
    // veya sıfırlanır; çizim yalnızca okur ve ilerletir (bkz. victory.ts).
    const victory = useMemo<VictoryTracker>(() => createVictoryTracker(), []);
    const victoryRef = useRef(victory);
    victoryRef.current = victory;

    // Tuvalin taşma payı cihaz kademesine bağlı (bkz. surface.ts). Yüzey
    // efekti yalnızca `host`a bağlı olduğu için değer bir ref üzerinden okunur.
    const bleed = boardBleedFor(motionTier);
    const bleedRef = useRef(bleed);
    bleedRef.current = bleed;

    useEffect(() => () => {
        if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
        expiryTimerRef.current = null;
        activity.clear();
        motion.clear();
        victory.clear();
    }, [activity, motion, victory]);

    const [host, setHost] = useState<HTMLDivElement | null>(null);
    const surfacesRef = useRef<Surfaces | null>(null);
    const cacheRef = useRef<SpriteCache | null>(null);
    const schedulerRef = useRef<Scheduler | null>(null);

    useEffect(() => {
        if (!host) return;

        const surfaces = createSurfaces(host);
        let dpr = currentDpr();
        let cache = createSpriteCache(dpr);
        surfacesRef.current = surfaces;
        cacheRef.current = cache;

        // `loop` çizim geri çağrısının içinden okunur; `createScheduler` daha
        // dönmediği için doğrudan referans verilemez.
        let loop: Scheduler | null = null;
        const scheduler = createScheduler({
            draw: (layer, now) => {
                const current = sceneRef.current;
                if (!current) return;
                const ctx = surfaces.layers[layer].ctx;
                clearLayer(surfaces, layer);
                if (layer === 'static') drawStaticLayer(ctx, current, cache, activityRef.current);
                else if (layer === 'ambient') {
                    // Canlı bir süs varsa bir sonraki kareyi KENDİMİZ planlarız;
                    // yoksa döngü durur (00-ilkeler §2.2, 01-rapor §6.1).
                    // `paused` ve `off` modlarında asla planlanmaz.
                    const alive = drawAmbientLayer(ctx, current, cache, now, activityRef.current);
                    if (alive && current.ambientMode === 'on') loop?.invalidate('ambient');
                }
                else {
                    // Hareket, efekt veya zıplama sürüyorsa bir kare daha
                    // lazım; yoksa döngü GERÇEKTEN durur (00-ilkeler §2.2).
                    const moving = drawActorsLayer(ctx, current, cache, now, motionRef.current, victoryRef.current);
                    if (moving) loop?.invalidate('actors');
                }
            },
        });
        loop = scheduler;
        schedulerRef.current = scheduler;

        const invalidateAll = () => {
            scheduler.invalidate('static');
            scheduler.invalidate('ambient');
            scheduler.invalidate('actors');
        };

        // DPR değişimi (tarayıcı yakınlaştırma, ekran değişimi): tuvaller yeniden
        // ölçeklenir ve tüm sprite'lar geçersizleşir — eski DPR'de rasterize
        // edilmiş her sprite artık bulanık.
        const onResize = () => {
            const next = currentDpr();
            if (next === dpr) return;
            dpr = next;
            cache = createSpriteCache(dpr);
            cacheRef.current = cache;
            clearIcons();
            const s = sceneRef.current;
            if (s) resize(surfaces, s.totalWidth, s.totalHeight, dpr, bleedRef.current);
            invalidateAll();
        };
        window.addEventListener('resize', onResize);

        // İkonlar asenkron gelir: eksik ikonlu sprite önbelleğe yazılmadı, hazır
        // olunca ilgili katmanlar yeniden çizilir.
        const offIcons = onIconsReady(invalidateAll);

        return () => {
            offIcons();
            window.removeEventListener('resize', onResize);
            scheduler.stop();
            dispose(surfaces);
            surfacesRef.current = null;
            cacheRef.current = null;
            schedulerRef.current = null;
        };
    }, [host]);

    // Sahne değişince hangi katmanın kirlendiğine karar verilir. `rooms` ızgara
    // değişmediği tick'lerde referans olarak aynı kalıyor (gridRevision.ts); bu,
    // `static` katmanının geçersizleştirme sinyalidir (00-ilkeler §2.3).
    // `static` katmanının TEK geçersizleştirme noktası: `rooms` referansı,
    // varlık doluluk imzası (buz hücresi) ve oyuncu imzası (iz kolları). Tema
    // ve yeniden boyutlandırma `null` yazarak tetikler. Yeni bir sinyal buraya
    // eklenir, ayrı bir ref açılmaz.
    const lastStatic = useRef<{ rooms: unknown; occupancy: string; players: string } | null>(null);
    const lastTheme = useRef<string | null>(null);
    const lastAmbientMode = useRef<BoardAmbientMode | null>(null);

    useEffect(() => {
        const surfaces = surfacesRef.current;
        const scheduler = schedulerRef.current;
        if (!surfaces || !scheduler || !scene) return;

        if (resize(surfaces, scene.totalWidth, scene.totalHeight, surfaces.dpr || currentDpr(), bleed)) {
            // Boyut yazmak tuvalleri temizledi; üç katman da yeniden çizilmeli.
            lastStatic.current = null;
            lastAmbientMode.current = null;
        }

        if (lastTheme.current !== scene.theme) {
            lastTheme.current = scene.theme;
            // 00-ilkeler §3.1: tema değişince önbellek TAMAMEN boşaltılır, tek
            // tek ayıklanmaz. İkon rasterleri de tema rengine bağlı.
            cacheRef.current?.clear();
            clearIcons();
            lastStatic.current = null;
            lastAmbientMode.current = null;
        }

        // `static` katmanı varlıklara DA bağlı ve bu, `rooms` referansı değişmeden
        // değişebiliyor: buz hücresi dolu/boş hâllerinde farklı görünüyor
        // (doluluk imzası) ve iz kolları oyuncunun KOMŞU hücrede olup olmadığına
        // bakıyor (oyuncu imzası). İmzalar yalnızca varlık sayısı kadar uzun,
        // tick başına bir kez hesaplanıyor; değişmedikleri sürece katman yeniden
        // çizilmiyor.
        const staticSignal = {
            rooms: scene.rooms,
            occupancy: occupancySignature(scene),
            players: playersSignature(scene.entities),
        };
        const prevStatic = lastStatic.current;
        if (!prevStatic
            || prevStatic.rooms !== staticSignal.rooms
            || prevStatic.occupancy !== staticSignal.occupancy
            || prevStatic.players !== staticSignal.players) {
            lastStatic.current = staticSignal;
            scheduler.invalidate('static');
        }

        // Geçici "çalışıyor" hâli: hem gövde (arka plan/kenar/gölge) hem de
        // süsler değiştiği için iki katman da kirlenir. Görünüm pencere boyunca
        // SABİT olduğundan her kare yeniden çizmeye gerek yok; sönme anına bir
        // zamanlayıcı kurulur ve o an katmanlar bir kez daha kirletilir.
        const armExpiry = () => {
            if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
            expiryTimerRef.current = null;
            const next = activity.nextExpiry();
            if (next === null) return;
            expiryTimerRef.current = setTimeout(() => {
                expiryTimerRef.current = null;
                if (activity.expire(performance.now())) {
                    schedulerRef.current?.invalidate('static');
                    schedulerRef.current?.invalidate('ambient');
                }
                armExpiry();
            }, Math.max(0, next - performance.now()));
        };

        if (activity.update(scene, performance.now())) {
            scheduler.invalidate('static');
            scheduler.invalidate('ambient');
        }
        armExpiry();

        if (lastAmbientMode.current !== scene.ambientMode) {
            const wasOff = lastAmbientMode.current === 'off';
            const isOff = scene.ambientMode === 'off';
            lastAmbientMode.current = scene.ambientMode;
            // 'off' ↔ diğerleri geçişinde süsler iki katman arasında yer
            // değiştirir (bkz. cells/index.ts, `drawCellsStatic`).
            if (wasOff !== isOff) scheduler.invalidate('static');
            // 'paused' katmanı SİLMEZ: DOM'daki `animation-play-state: paused`
            // gibi son kare donar. Bir kez çizdirilir ki ilk hamlede boş kalmasın.
            if (isOff) clearLayer(surfaces, 'ambient');
            else scheduler.invalidate('ambient');
        }

        // Efekt seçim zinciri tick başına BİR KEZ uygulanır; çizim saf kalır.
        motion.update(scene, performance.now());
        // Zafer başlangıç damgası burada konur; `drawVictory`nin `now`u ile aynı
        // zaman kaynağı (`performance.now()` ↔ RAF damgası).
        victory.update(scene, performance.now());
        scheduler.invalidate('actors');
        // `host` de bağımlılık: ref geri çağrısı state'i commit sırasında kurar,
        // yani yüzeyler ancak İKİNCİ render'da var olur. `scene` o iki render
        // arasında değişmediği için bu efektin bir kez daha çalışması şart —
        // yoksa ilk kare hiç çizilmez.
    }, [scene, host, activity, motion, victory, bleed]);

    if (!snapshots || snapshots.length === 0 || !snapshot || !rooms) return null;

    return (
        <div
            ref={setHost}
            data-board-ambient={ambientMode}
            style={{ position: 'relative', width: layout.totalWidth, height: layout.totalHeight }}
        />
    );
};

export default BoardCanvas;

// ─── Katman çizicileri — imzalar DONDURULMUŞ, sonraki fazlar doldurur ────────

/**
 * Durağan katman: oda çerçevesi → hücrelerin gövdesi → iz, kablo, wall
 * şeritleri, oda başlığı (sıra ve gerekçe: overlays/index.ts).
 */
export function drawStaticLayer(
    ctx: CanvasRenderingContext2D,
    scene: BoardScene,
    cache: SpriteCache,
    activity: ActivityTracker | null = null,
): void {
    drawRoomFrames(ctx, scene, cache);
    drawCellsStatic(ctx, scene, cache, activity);
    drawStaticOverlays(ctx, scene, cache);
}

/**
 * Hücrelerin animasyonlu süsleri (20fps'e kısılmış).
 *
 * @returns Çizilen canlı bir süs varsa `true`. İmzanın `void` yerine `boolean`
 * dönmesi Faz 01'in dondurduğu sözleşmenin gerekli bir genişlemesi: zamanlayıcı
 * boştayken durduğu için (00-ilkeler §2.2) süs döngüsünü canlı tutmanın tek
 * yolu, çizimden sonra katmanı yeniden kirletmek (01-rapor §6.1). Katmanda
 * animasyonlu hiçbir hücre yoksa döngü gerçekten durur.
 */
export function drawAmbientLayer(
    ctx: CanvasRenderingContext2D,
    scene: BoardScene,
    cache: SpriteCache,
    now: number,
    activity: ActivityTracker | null = null,
): boolean {
    const cells = drawCellsAmbient(ctx, scene, cache, now, activity);
    const overlays = drawAmbientOverlays(ctx, scene, cache, now);
    return cells || overlays;
}

/**
 * Oyuncular, kutular, hareket/çarpma/ölüm efektleri ve zafer koreografisi.
 *
 * @returns Bir kare daha gerekiyorsa `true` (00-ilkeler §3.4).
 */
export function drawActorsLayer(
    ctx: CanvasRenderingContext2D,
    scene: BoardScene,
    cache: SpriteCache,
    now: number,
    motion: EntityMotionTracker | null = null,
    victory: VictoryTracker | null = null,
): boolean {
    return drawActors(ctx, scene, cache, now, motion, victory);
}
