/**
 * DOSYA AMACI: `actors` katmanının çizimi — oyuncular, kutular, tick
 * interpolasyonu, zıplama, buzda eğilme, toz parçacıkları ve efekt keyframe'leri.
 *
 * Kaynak: `GameBoard.tsx`'in varlık katmanı + `physicsWrapper.tsx`.
 *
 * ÇİZİM SIRASI: `zIndex: 10 + z` karşılığı — varlıklar `z`'ye göre ARTAN sırada
 * çizilir, böylece zıplayan varlık üstte kalır (faz planı §3.7).
 *
 * MASKOT İFADELERİ (`mascot/`): süren bir ifade varsa (`MascotController`)
 * katman uyanık kalır — ifade tam hızda oynar, ambient bütçesine bağlı değildir
 * (bir tepki, hamle sırasında da görünmeli). Gövde dönüşümü efekt izinin
 * (`trackTransformOf`) İÇİNDE uygulanır; ikisi birbirini ezmez.
 *
 * GÖZ KIRPMA VE NABIZ bu katmanın döngüsünü KENDİSİ uyanık tutmaz: `actors`
 * yalnızca tick geçişi, aktif efekt, zıplama ve buzda kayma sürerken `true`
 * döner. Boşta duran oyuncunun animasyonunu `ambient` katmanının bütçesi
 * sürer (`idle.ts`, Faz 10 §2.1): ambient bir kare çizince, kırpma/nabız
 * durumu değiştiyse `BoardCanvas` bu katmanı da kirletir.
 */

import type { Entity } from '../../logic/entityTypes';
import type { Direction } from '../../logic/types';
import { cellKey } from '../../components/board/boardIndex';
import type { FogFrame } from '../fog';
import type { BoardScene } from '../types';
import { NATIVE_CELL_SIZE } from '../types';
import type { SpriteCache } from '../spriteCache';
import { EASE_MOVE } from '../motion';
import type { EntityMotionTracker } from '../entityMotion';
import { effectLayersOf, entityXY, isTeleporting, isTrackActive, trackTransformOf } from '../entityMotion';
import { drawVictory } from '../victory';
import type { VictoryTracker } from '../victory';
import { boxInputOf, boxSprite } from './box';
import { playerInputOf, playerSprite } from './player';
import type { MascotController } from '../../mascot/controller';
import { applyBodyPose, mascotPoseAt, paintMascotFx } from './mascot';
import { dustParticlesAt, iceDustSprite } from './dust';
import { blitWithEffects } from './effects';

export { boxSprite, playerSprite, iceDustSprite };
export { boxInputOf } from './box';
export { blinkClosedAt, playerInputOf, pulsePhaseAt } from './player';
export { applyBodyPose, mascotPoseAt, paintMascot, paintMascotFx } from './mascot';
export { dustParticlesAt } from './dust';

const HALF = NATIVE_CELL_SIZE / 2;

/** `zOffset = -(z * 14)` — `physicsWrapper`'daki zıplama yüksekliği. */
const Z_LIFT = 14;

/** Buzda kayma eğilme açıları (derece); `physicsWrapper`'daki `skew` zinciri. */
const SKEW_DEG: Record<Direction, { x: number; y: number }> = {
    left: { x: 12, y: 0 },
    right: { x: -12, y: 0 },
    up: { x: 0, y: -6 },
    down: { x: 0, y: 6 },
};

const DEG_TO_RAD = Math.PI / 180;

/** `isSliding`: `force > 0 && currentCellType === 'ice'`. */
function isSliding(scene: BoardScene, entity: Entity): boolean {
    if (entity.physics.force <= 0) return false;
    const room = scene.rooms[entity.position.roomId ?? 'main'];
    return room?.grid[entity.position.row]?.[entity.position.col]?.type === 'ice';
}

/** Sprite'ı, merkezi şu anki dönüşümün başlangıcında olacak şekilde blit eder. */
function blitCentered(ctx: CanvasRenderingContext2D, sprite: HTMLCanvasElement, w: number, h: number): void {
    ctx.drawImage(sprite, -w / 2, -h / 2, w, h);
}

/**
 * Varlık katmanı.
 *
 * @returns Bir kare daha gerekiyorsa `true` (00-ilkeler §3.4). Ölçüt faz planı
 * §3.8: tick geçişi sürüyor, aktif bir efekt var, bir varlık havada veya
 * buzda kayıyor ya da (Faz 06) zafer koreografisi sürüyor. Sis geçişi
 * (Faz 07) `KeepAlive` üzerinden katmanı kirli tutar (`keepAlive.ts`).
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
    const prevById = new Map<number, Entity>();
    for (const entity of scene.prevEntities ?? []) prevById.set(entity.id, entity);

    const progress = scene.frameMs > 0
        ? Math.max(0, Math.min(1, (now - scene.tickStartedAt) / scene.frameMs))
        : 1;
    const eased = EASE_MOVE(progress);
    let alive = progress < 1;
    // Süren bir ifade varsa bir kare daha (ifade bitince döngü kendiliğinden durur).
    if (mascots?.animating(now)) alive = true;
    // Boştaki yüz (kırpma/bakınma) yalnızca ambient AÇIKKEN; aksi hâlde nötr
    // (bkz. `mascotPoseAt`, `idle.ts`).
    const idleOn = scene.ambientMode === 'on';

    const ordered = [...scene.entities].sort((a, b) => a.physics.z - b.physics.z);

    for (const entity of ordered) {
        // Zafer koreografisi oynarken oyuncuları Faz 06 çiziyor; burada
        // görünmezler (`opacity: 0.0` karşılığı).
        if (entity.type === 'player' && scene.isVictoryActive) continue;

        // Sis (Faz 07): oyuncu keşfedilmiş hücrede hep görünür, diğer varlıklar
        // yalnızca görünür hücrede (`GameBoard`'daki `opacity` kuralı). Geçiş
        // `transition: opacity 0.3s` karşılığı, `FogFrame` ilerlemesiyle.
        const fogAlpha = fog
            ? fog.entityAlpha(cellKey(entity.position.roomId ?? 'main', entity.position.row, entity.position.col), entity.type === 'player')
            : 1;
        if (fogAlpha <= 0) continue;

        const z = entity.physics.z;
        const prev = prevById.get(entity.id) ?? null;
        const here = entityXY(scene, entity);
        const hereY = here.y - z * Z_LIFT;

        let x = here.x;
        let y = hereY;
        // Işınlanmada DOM `transition: none` diyor — doğrudan hedefe.
        if (prev && !isTeleporting(scene, entity, prev)) {
            const there = entityXY(scene, prev);
            const thereY = there.y - prev.physics.z * Z_LIFT;
            x = there.x + (here.x - there.x) * eased;
            y = thereY + (hereY - thereY) * eased;
        }

        const state = motion?.get(entity.id);
        const transform = trackTransformOf(state, now);
        if (isTrackActive(state, now)) alive = true;
        if (z > 0) alive = true;
        const sliding = isSliding(scene, entity);
        if (sliding) alive = true;

        ctx.save();
        ctx.globalAlpha *= fogAlpha;
        ctx.translate(x + HALF, y + HALF);

        if (transform) {
            // Süren bir CSS animasyonu satır içi `transform`u EZER (kaskad
            // önceliği); bu yüzden ölçek/eğilme burada uygulanmaz.
            ctx.translate(transform.tx, transform.ty);
            ctx.rotate(transform.rot);
            ctx.scale(transform.sx, transform.sy);
            ctx.globalAlpha *= transform.alpha;
        } else {
            const stretchX = z > 0 ? 1 - z * 0.06 : 1;
            const stretchY = z > 0 ? 1 + z * 0.12 : 1;
            const baseScale = 1 + z * 0.15;
            ctx.scale(baseScale * stretchX, baseScale * stretchY);
            if (sliding) {
                const skew = SKEW_DEG[entity.physics.direction] ?? SKEW_DEG.up;
                ctx.transform(1, Math.tan(skew.y * DEG_TO_RAD), Math.tan(skew.x * DEG_TO_RAD), 1, 0, 0);
            }
        }

        if (sliding) drawDust(ctx, cache, entity.physics.direction, now);

        // Ölüm/çarpışma keyframe'lerinin `filter` kısmı (renk kayması, parlama):
        // sprite varyantları, ağırlıkları `sampleTrack` verir (bkz. effects.ts).
        const layers = effectLayersOf(state);
        if (entity.type === 'player') {
            const pose = mascotPoseAt(scene.theme, entity.id, now, idleOn, mascots);
            ctx.save();
            applyBodyPose(ctx, pose.body);
            blitWithEffects(ctx, cache, playerSprite, playerInputOf(scene.theme, entity.customData, now, pose.face), layers, transform?.fx);
            ctx.restore();
            paintMascotFx(ctx, cache, pose);
        } else {
            blitWithEffects(ctx, cache, boxSprite, boxInputOf(scene.theme, entity), layers, transform?.fx);
        }

        ctx.restore();
    }

    // Zafer koreografisi oyuncuların YERİNE geçer ve her şeyin ÜSTÜNE çizilir
    // (DOM'da `zIndex: 150`'lik ayrı bir katmandı). `drawVictory` `false`
    // döndüğünde koreografi bitmiştir; durum sıfırlanmaz, aksi hâlde takipçi
    // aynı anahtarla yeniden kurup koreografiyi baştan oynatırdı.
    const celebration = victory?.state();
    if (celebration && drawVictory(ctx, celebration, cache, now)) alive = true;

    return alive;
}

/** Üç toz parçacığı; koordinatlar 64'lük kutunun merkezine göre çevrilir. */
function drawDust(
    ctx: CanvasRenderingContext2D,
    cache: SpriteCache,
    direction: Direction,
    now: number,
): void {
    const sprite = cache.get(iceDustSprite, {});
    const { w, h } = iceDustSprite.size({});

    for (const p of dustParticlesAt(direction, now)) {
        ctx.save();
        ctx.globalAlpha *= p.alpha;
        ctx.translate(p.x - HALF, p.y - HALF);
        ctx.scale(p.scale, p.scale);
        blitCentered(ctx, sprite, w, h);
        ctx.restore();
    }
}
