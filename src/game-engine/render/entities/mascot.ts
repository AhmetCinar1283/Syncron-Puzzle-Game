/**
 * DOSYA AMACI: Maskotu (oyuncu) bir poza göre çizmenin TEK yolu — tahta
 * (`index.ts`), DOM bileşeni (`MascotView`), önizleme sayfası ve ileride
 * portal şablonları/video bunu çağırır.
 *
 *   yüz  → `playerSprite` anahtarına pişer (önbellekten gelir)
 *   gövde → blit öncesi `ctx` dönüşümü (sürekli, maliyetsiz)
 *   süs  → gövdenin kaymasını izler ama ezilmesini İZLEMEZ (glif bozulmasın)
 *
 * Kare döngüsünde gölge/filtre yok (00-ilkeler §2.1): burada yalnızca
 * `drawImage` + dönüşüm + `globalAlpha`.
 */

import type { GameTheme } from '../../themes/themeConfig';
import type { BodyPose, MascotPose } from '../../mascot/pose';
import { NEUTRAL_BODY, NEUTRAL_FACE } from '../../mascot/pose';
import { idleFaceAt } from '../../mascot/idle';
import type { MascotController } from '../../mascot/controller';
import type { SpriteCache } from '../spriteCache';
import type { PlayerSpriteInput } from './playerStyles';
import { playerSprite } from './player';
import { drawMascotFx } from './mascotFx';

/** Ezilme/uzamanın pivotu: jetonun tabanı (merkezden aşağı, 44/2). */
const BODY_PIVOT_Y = 22;

export function isNeutralBody(b: BodyPose): boolean {
    return b.dx === 0 && b.dy === 0 && b.sx === 1 && b.sy === 1 && b.rot === 0;
}

/** Gövde pozunu, dönüşümü jeton merkezinde olan `ctx`'e uygular. */
export function applyBodyPose(ctx: CanvasRenderingContext2D, body: BodyPose): void {
    if (isNeutralBody(body)) return;
    ctx.translate(body.dx, body.dy + BODY_PIVOT_Y);
    if (body.rot) ctx.rotate(body.rot);
    ctx.scale(body.sx, body.sy);
    ctx.translate(0, -BODY_PIVOT_Y);
}

/**
 * Bir oyuncunun bu andaki pozu: süren ifade varsa o, yoksa boştaki yüz.
 * `idle === false` (ambient kapalı/duraklatılmış, zafer dondurması) → nötr yüz;
 * böylece hamle sırasında göz yarı kapalı donup kalmaz.
 */
export function mascotPoseAt(
    theme: GameTheme,
    id: number,
    now: number,
    idle: boolean,
    controller: MascotController | null,
): MascotPose {
    const idleFace = idle ? idleFaceAt(theme, id, now) : NEUTRAL_FACE;
    if (controller) return controller.poseOf(id, now, idleFace);
    return { face: idleFace, body: NEUTRAL_BODY, fx: null };
}

/**
 * Süsü çizer; dönüşüm jeton merkezinde, gövdenin YALNIZCA kayması uygulanır.
 */
export function paintMascotFx(ctx: CanvasRenderingContext2D, cache: SpriteCache, pose: MascotPose): void {
    if (!pose.fx) return;
    ctx.save();
    ctx.translate(pose.body.dx, pose.body.dy);
    drawMascotFx(ctx, cache, pose.fx);
    ctx.restore();
}

/**
 * Maskotun tamamı (gövde + yüz + süs). `ctx`'in dönüşümü jeton merkezinde olmalı.
 * `input.face` yok sayılır; yüz `pose.face`'ten gelir.
 */
export function paintMascot(
    ctx: CanvasRenderingContext2D,
    cache: SpriteCache,
    input: Omit<PlayerSpriteInput, 'face'>,
    pose: MascotPose,
): void {
    const full: PlayerSpriteInput = { ...input, face: input.locked ? NEUTRAL_FACE : pose.face };
    const sprite = cache.get(playerSprite, full);
    const { w, h } = playerSprite.size(full);
    ctx.save();
    applyBodyPose(ctx, pose.body);
    ctx.drawImage(sprite, -w / 2, -h / 2, w, h);
    ctx.restore();
    paintMascotFx(ctx, cache, pose);
}
