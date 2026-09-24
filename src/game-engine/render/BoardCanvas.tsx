/**
 * DOSYA AMACI: Canvas yolunun tek dışa açık giriş noktası. `GameBoard` ile aynı
 * props'ları alır, aynı film oynatma mantığını yürütür (kare ilerletme, ses,
 * titreşim, `onAnimationEnd`), sahneyi (`BoardScene`) hesaplar, üç tuvali kurar
 * ve zamanlayıcıyı çalıştırır.
 *
 * OYNATMA MANTIĞI ORTAK: kare ilerletme, ses, titreşim ve `onAnimationEnd`
 * `hooks/useFilmPlayback.ts`'te; `GameBoard` de aynı hook'u kullanır. Faz 01'de
 * bilinçli kabul edilen tekrar Faz 08 §2.6'da kaldırıldı.
 *
 * NEDEN props arayüzü burada yeniden yazıldı: `GameBoardProps` `GameBoard.tsx`
 * içinde yereldir ve o dosya bu fazda değiştirilmiyor (faz planı §4).
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { TickSnapshot } from '../logic/types';
import type { Entity } from '../logic/entityTypes';
import type { LevelEdges } from '../logic/engine/getNextTopologyPosition';
import type { SoundId } from '@/services/audio';
import { calculateRoomLayoutOffsets } from '../logic/engine/rooms';
import { useGameTheme } from '../contexts/GameThemeContext';
import { NATIVE_CELL_SIZE, ROOM_LAYOUT_GAP } from '../components/play-screen/constants';
import type { BoardAmbientMode } from '../components/board/boardKeyframes';
import { useFilmPlayback } from '../hooks/useFilmPlayback';
import { useMotionTier } from '@/lib/motionTier';
import GameBoard from '../components/GameBoard';
import { boardBleedFor, canUseCanvas2d, createSurfaces, hideSurfacesFromReaders, resize, dispose, clearLayer, currentDpr, type Surfaces } from './surface';
import { createScheduler, type Scheduler } from './scheduler';
import { createSpriteCache, type SpriteCache } from './spriteCache';
import { onIconsReady, clearIcons } from './icons';
import { drawCellsAmbient, drawCellsStatic, observeCellFades, occupancySignature } from './cells';
import { createActivityTracker, type ActivityTracker } from './cells/activity';
import { drawAmbientOverlays, drawRoomFrames, drawStaticOverlays, observeRoomFades } from './overlays';
import { drawActorsLayer as drawActors } from './entities';
import { createEntityMotionTracker, type EntityMotionTracker } from './entityMotion';
import { createVictoryTracker, type VictoryTracker } from './victory';
import { FOG_TRANSITION_MS, createFogTracker, type FogFrame, type FogTracker } from './fog';
import { createKeepAlive, type KeepAlive } from './keepAlive';
import { createFades, type FadeFrame, type Fades } from './fades';
import { createIdleTracker, type IdleTracker } from './idle';
import { createMascotController, type MascotController } from '../mascot/controller';
import { useMascotReactions } from './useMascotReactions';
import { isProfilerEnabled, recordFrame } from './profiler';
import { ProfilerOverlay } from './ProfilerOverlay';
import { playersSignature } from '../components/board/boardIndex';
import type { BoardScene, LayerName } from './types';

const NO_ENTITIES: Entity[] = [];

interface BoardCanvasProps {
    snapshots: TickSnapshot[] | null;
    controlledRoomIds?: string[];
    levelEdges?: LevelEdges;
    onAnimationEnd?: () => void;
    onPlaySound?: (sound: SoundId) => void;
    muted?: boolean;
    /** Sarmalayıcının `aria-label`inde kullanılır (faz planı §2.4). */
    levelName?: string;
    /**
     * Oyuncu ifadelerini dışarıdan tetiklemek için (`mascots.trigger(id, 'happy', now)`).
     * Verilmezse tahta kendi denetleyicisini kurar (yalnızca boşta davranış).
     * DOM yedeği (`GameBoard`) ifade oynatmaz.
     */
    mascots?: MascotController;
}

/**
 * Dışa açık giriş noktası. 2D bağlam alınamıyorsa (çok eski WebView, GPU
 * sorunu) sessizce `GameBoard`'a düşer (faz planı §2.4). Düşüş BURADA, iç
 * bileşenin DIŞINDA yapılır: iç bileşen kendi film oynatma efektlerini
 * yürütüyor, ikisi birden bağlı kalsa `onAnimationEnd` iki kez tetiklenirdi.
 */
const BoardCanvas = ({ levelName, mascots, ...boardProps }: BoardCanvasProps) => {
    const [unsupported, setUnsupported] = useState(() => !canUseCanvas2d());
    const markUnsupported = useCallback(() => setUnsupported(true), []);

    if (unsupported) return <GameBoard {...boardProps} />;
    return <CanvasBoard {...boardProps} levelName={levelName} mascots={mascots} onUnsupported={markUnsupported} />;
};

interface CanvasBoardProps extends BoardCanvasProps {
    /** Tuvaller kurulurken `getContext('2d')` beklenmedik biçimde başarısız oldu. */
    onUnsupported: () => void;
}

const CanvasBoard = ({ snapshots, controlledRoomIds, onAnimationEnd, onPlaySound, muted, levelName, mascots: mascotsProp, onUnsupported }: CanvasBoardProps) => {
    const { theme } = useGameTheme();
    const motionTier = useMotionTier();
    // Film oynatma (kare ilerletme, ses, titreşim, bitiş) ortak hook'ta:
    // DOM yolu da aynısını kullanır (bkz. hooks/useFilmPlayback.ts).
    const { frameMs, snapshot, prevSnapshot, isPlaying, isVictoryActive } =
        useFilmPlayback({ snapshots, onAnimationEnd, onPlaySound, muted });
    const rooms = snapshot?.rooms ?? null;

    const layout = useMemo(
        () => (rooms
            ? calculateRoomLayoutOffsets(rooms, NATIVE_CELL_SIZE, ROOM_LAYOUT_GAP)
            : { roomPositions: {}, totalWidth: 0, totalHeight: 0 }),
        [rooms]
    );

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

    // Sis durumu (Faz 07): hücre başına seviye ve 0.3s karartma geçişi. Sahne
    // değişince güncellenir; çizim `frame(now)` ile okur (bkz. fog.ts).
    const fog = useMemo<FogTracker>(() => createFogTracker(), []);
    const fogRef = useRef(fog);
    fogRef.current = fog;

    // Süresi olan geçişlerin (sis, buz/teleport/oda çapraz geçişi, trambolin
    // ezilmesi) katmanı kirli tutması TEK yerden (Faz 10; bkz. keepAlive.ts).
    const holds = useMemo<KeepAlive>(() => createKeepAlive(), []);
    // Buz, teleport, oda ve trambolin geçişlerinin eski hâli (bkz. fades.ts).
    const fades = useMemo<Fades>(() => createFades(holds), [holds]);
    // Boşta oyuncu animasyonu ambient bütçesine bağlı (bkz. idle.ts).
    const idle = useMemo<IdleTracker>(() => createIdleTracker(), []);
    // Maskot ifadeleri (bkz. mascot/controller.ts). Tetikleme `actors`'ı uyandırır.
    const ownMascots = useMemo<MascotController>(() => createMascotController(), []);
    const mascots = mascotsProp ?? ownMascots;
    // Oyun olayları → ifadeler (mascot/reactions.ts) ve boştaki yaşam: uyuma,
    // bakınma (mascot/life.ts). Yaşam yalnızca tahta gerçekten boşken sürer.
    useMascotReactions(mascots, snapshot, ambientMode === 'on', motionTier !== 'lite', levelName);

    useEffect(() => () => {
        if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
        expiryTimerRef.current = null;
        activity.clear();
        motion.clear();
        victory.clear();
        fog.clear();
        holds.clear();
        fades.clear();
        idle.clear();
    }, [activity, motion, victory, fog, holds, fades, idle]);

    const [host, setHost] = useState<HTMLDivElement | null>(null);
    const surfacesRef = useRef<Surfaces | null>(null);
    const cacheRef = useRef<SpriteCache | null>(null);
    const schedulerRef = useRef<Scheduler | null>(null);

    useEffect(() => {
        if (!host) return;

        let surfaces: Surfaces;
        try {
            // `lite` kademede `ambient` tuvali HİÇ kurulmaz: o kademede hücre
            // süsleri zaten çizilmiyor (ambientMode daima 'off'), tuval yalnızca
            // bellek harcardı (faz planı §2.5).
            const layerNames: LayerName[] = motionTier === 'lite'
                ? ['static', 'actors']
                : ['static', 'ambient', 'actors'];
            surfaces = createSurfaces(host, layerNames);
        } catch {
            // `getContext('2d')` null döndü: GameBoard'a düş (faz planı §2.4).
            onUnsupported();
            return;
        }
        // Etiketi sarmalayıcı taşır; üç tuval okuyucudan gizlenir (09-kapanis §2.2).
        hideSurfacesFromReaders(surfaces);
        let dpr = currentDpr(motionTier);
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
                // Kapalıyken `performance.now()` HİÇ çağrılmaz (bkz. profiler.ts).
                const surface = surfaces.layers[layer];
                // `lite` kademede `ambient` tuvali yok; o katman hiç çizilmez.
                if (!surface) return;
                const profiling = isProfilerEnabled();
                const startedAt = profiling ? performance.now() : 0;
                const ctx = surface.ctx;
                clearLayer(surfaces, layer);
                const fogFrame: FogFrame | null = fogRef.current.frame(now);
                const fadeFrame: FadeFrame = fades.frame(now);
                if (layer === 'static') {
                    drawStaticLayer(ctx, current, cache, activityRef.current, fogFrame, fadeFrame);
                }
                else if (layer === 'ambient') {
                    // Canlı bir süs varsa bir sonraki kareyi KENDİMİZ planlarız;
                    // yoksa döngü durur (00-ilkeler §2.2, 01-rapor §6.1).
                    // `paused` ve `off` modlarında asla planlanmaz.
                    const alive = drawAmbientLayer(ctx, current, cache, now, activityRef.current, fogFrame, fadeFrame);
                    // Boşta oyuncunun göz kırpması/nabzı ambient'in kadansıyla
                    // sürer: aynı modda (`on`), aynı 20fps. Kırpma/nabız durumu
                    // değiştiyse `actors` da çizilir (bkz. idle.ts).
                    const wake = idle.afterAmbient(current, now);
                    if ((alive || wake.keepAmbient) && current.ambientMode === 'on') loop?.invalidate('ambient');
                    if (wake.drawActors) loop?.invalidate('actors');
                }
                else {
                    // Hareket, efekt veya zıplama sürüyorsa bir kare daha
                    // lazım; yoksa döngü GERÇEKTEN durur (00-ilkeler §2.2).
                    const moving = drawActorsLayer(ctx, current, cache, now, motionRef.current, victoryRef.current, fogFrame, mascots);
                    idle.drewActors(current, now);
                    if (moving) loop?.invalidate('actors');
                }
                // Süren bir geçiş (sis, çapraz geçiş, trambolin ezilmesi) katmanı
                // bitiş damgasına kadar kirli tutar — TEK yer (keepAlive.ts).
                // Hamle sırasında ambient `paused` olduğu için kendi kendini
                // yenilemez; geçişteki süsleri buradan uyandırırız (20fps'e
                // kısılır). `off`ta ambient hiç çizilmez.
                if (holds.active(layer, now) && !(layer === 'ambient' && current.ambientMode === 'off')) {
                    loop?.invalidate(layer);
                }
                if (profiling) {
                    const endedAt = performance.now();
                    recordFrame(layer, endedAt - startedAt, endedAt);
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
            const next = currentDpr(motionTier);
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

        // Sayfa/uygulama arka plana alınıp geri gelince (reklam izleme, uygulama
        // değiştirme): mobil WebView'ler arka plandaki tuvalin GPU belleğini geri
        // alabilir/temizleyebilir. Sahne değişmediği sürece `static`/`ambient`
        // kendiliğinden yeniden çizilmez (yalnızca sahne imzası değişince
        // kirlenirler), bu yüzden görünürlük dönüşünde TÜM katmanlar elle
        // kirletilir — yoksa tahta bir sonraki hamleye kadar boş kalır.
        const onVisibility = () => {
            if (document.visibilityState === 'visible') invalidateAll();
        };
        document.addEventListener('visibilitychange', onVisibility);

        // İkonlar asenkron gelir: eksik ikonlu sprite önbelleğe yazılmadı, hazır
        // olunca ilgili katmanlar yeniden çizilir.
        const offIcons = onIconsReady(invalidateAll);
        // Bir ifade tetiklenince uyuyan `actors` döngüsü uyanır; ifade sürdükçe
        // `drawActorsLayer` `true` döndürerek kendini sürdürür.
        const offMascots = mascots.subscribe(() => scheduler.invalidate('actors'));

        // Yüzeyler yeniden kuruldu (ilk bağlanma veya kademe değişimi): sahne
        // değişmeden çizilmeleri gerekir, yoksa tahta ilk hamleye kadar boş kalır.
        lastStatic.current = null;
        lastTheme.current = null;
        lastAmbientMode.current = null;
        const initialScene = sceneRef.current;
        if (initialScene) {
            resize(surfaces, initialScene.totalWidth, initialScene.totalHeight, dpr, bleedRef.current);
            invalidateAll();
        }

        return () => {
            offIcons();
            offMascots();
            window.removeEventListener('resize', onResize);
            document.removeEventListener('visibilitychange', onVisibility);
            scheduler.stop();
            dispose(surfaces);
            surfacesRef.current = null;
            cacheRef.current = null;
            schedulerRef.current = null;
        };
    }, [host, onUnsupported, motionTier, holds, fades, idle, mascots]);

    // Ekran okuyucu etiketi sarmalayıcıda, bir kez okunur (09-kapanis §2.2).
    const boardLabel = levelName ? `Board: ${levelName}` : 'Board';

    const getCache = useCallback(() => cacheRef.current, []);
    const getSurfaces = useCallback(() => surfacesRef.current, []);

    // Sahne değişince hangi katmanın kirlendiğine karar verilir. `rooms` ızgara
    // değişmediği tick'lerde referans olarak aynı kalıyor (gridRevision.ts); bu,
    // `static` katmanının geçersizleştirme sinyalidir (00-ilkeler §2.3).
    // `static` katmanının TEK geçersizleştirme noktası: `rooms` referansı,
    // varlık doluluk imzası (buz hücresi), oyuncu imzası (iz kolları) ve sis
    // sürümü (Faz 07: hücre seviyeleri değişti). Tema ve yeniden boyutlandırma
    // `null` yazarak tetikler. Yeni bir sinyal buraya eklenir, ayrı bir ref
    // açılmaz.
    const lastStatic = useRef<{ rooms: unknown; occupancy: string; players: string; fog: number } | null>(null);
    const lastTheme = useRef<string | null>(null);
    const lastAmbientMode = useRef<BoardAmbientMode | null>(null);

    useEffect(() => {
        const surfaces = surfacesRef.current;
        const scheduler = schedulerRef.current;
        if (!surfaces || !scheduler || !scene) return;

        if (resize(surfaces, scene.totalWidth, scene.totalHeight, surfaces.dpr || currentDpr(motionTier), bleed)) {
            // Boyut yazmak tuvalleri temizledi; üç katman da yeniden çizilmeli.
            lastStatic.current = null;
            lastAmbientMode.current = null;
        }

        // Yeni tur (`prevEntities === null`) veya tema değişimi: çapraz geçişler
        // eski görünümden animasyon OYNATMAZ, yalnızca yeni hâli yazar.
        let snapFades = scene.prevEntities === null;

        if (lastTheme.current !== scene.theme) {
            snapFades = true;
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
        //
        // Sis, oyuncu konumuna bağlı olduğundan `rooms` değişmeden değişir
        // (01-rapor §6.6). Sürüm, seviyeler gerçekten değiştiğinde artar.
        const stamp = performance.now();
        fog.update(scene, stamp);
        const staticSignal = {
            rooms: scene.rooms,
            occupancy: occupancySignature(scene),
            players: playersSignature(scene.entities),
            fog: fog.revision(),
        };
        const prevStatic = lastStatic.current;
        if (!prevStatic
            || prevStatic.rooms !== staticSignal.rooms
            || prevStatic.occupancy !== staticSignal.occupancy
            || prevStatic.players !== staticSignal.players
            || prevStatic.fog !== staticSignal.fog) {
            const fogChanged = !prevStatic || prevStatic.fog !== staticSignal.fog;
            lastStatic.current = staticSignal;
            scheduler.invalidate('static');
            // Sis geçişi 300ms sürer; süresince katmanlar kirli tutulur.
            if (fogChanged && fog.frame(stamp)?.transitioning) {
                holds.hold(['static', 'ambient', 'actors'], stamp + FOG_TRANSITION_MS);
            }
            // Karartılan/gizlenen hücrenin süsü `ambient` katmanında; hamle
            // sırasında ('paused') o katman kendiliğinden yenilenmez.
            if (fogChanged && scene.ambientMode !== 'off') scheduler.invalidate('ambient');
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
                const firedAt = performance.now();
                if (activity.expire(firedAt)) {
                    // Etkinlik söndü: teleport eski hâline çapraz geçer (fades.ts).
                    const latest = sceneRef.current;
                    if (latest) observeCellFades(latest, activity, fades, firedAt, false);
                    schedulerRef.current?.invalidate('static');
                    schedulerRef.current?.invalidate('ambient');
                }
                armExpiry();
            }, Math.max(0, next - performance.now()));
        };

        if (activity.update(scene, stamp)) {
            scheduler.invalidate('static');
            scheduler.invalidate('ambient');
        }
        // Çapraz geçişler `activity`den SONRA gözlenir: buz/teleport görünümü
        // `isActive`e bakar. Trambolin yayı da burada ezilmeye başlar.
        const cellFadeStarted = observeCellFades(scene, activity, fades, stamp, snapFades);
        const roomFadeStarted = observeRoomFades(scene, fades, stamp, snapFades);
        if (cellFadeStarted || roomFadeStarted) {
            scheduler.invalidate('static');
            if (scene.ambientMode !== 'off') scheduler.invalidate('ambient');
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
    }, [scene, host, activity, motion, victory, fog, holds, fades, bleed, motionTier]);

    if (!snapshots || snapshots.length === 0 || !snapshot || !rooms) return null;

    return (
        <>
            <div
                ref={setHost}
                role="img"
                aria-label={boardLabel}
                data-board-ambient={ambientMode}
                style={{ position: 'relative', width: layout.totalWidth, height: layout.totalHeight }}
            />
            {isProfilerEnabled() && <ProfilerOverlay getCache={getCache} getSurfaces={getSurfaces} />}
        </>
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
    fog: FogFrame | null = null,
    fades: FadeFrame | null = null,
): void {
    drawRoomFrames(ctx, scene, cache, fades);
    drawCellsStatic(ctx, scene, cache, activity, fog, fades);
    drawStaticOverlays(ctx, scene, cache, fog, fades);
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
    fog: FogFrame | null = null,
    fades: FadeFrame | null = null,
): boolean {
    const cells = drawCellsAmbient(ctx, scene, cache, now, activity, fog, fades);
    const overlays = drawAmbientOverlays(ctx, scene, cache, now, fades);
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
    fog: FogFrame | null = null,
    mascots: MascotController | null = null,
): boolean {
    return drawActors(ctx, scene, cache, now, motion, victory, fog, mascots);
}
