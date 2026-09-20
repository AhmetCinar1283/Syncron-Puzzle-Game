/**
 * DOSYA AMACI: Portal bağlantı yolları — `GameBoard.tsx`'teki `connectionPaths`'in
 * portu. `routePortalPath` her bağlantı için bir SVG `d` dizgisi verir; DOM iki
 * kez çiziyordu:
 *   - kalın, bulanık alt katman (`rgba(168,85,247,.4)`, 6px, `blur(4px)`),
 *   - ince, kesikli üst katman (`#c084fc`, 2.5px, `6,6`, `crawlPath 1.2s`).
 *
 * `Path2D(d)` SVG yol dizgisini doğrudan çizer; `d` çizim için AYRIŞTIRILMAZ.
 * Alt katman bir kez sprite'a rasterize edilir; üst katman her ambient karesinde
 * `setLineDash` + `lineDashOffset` ile çizilir (ucuz bir stroke).
 *
 * ANAHTAR: plan `portalpath|<connectionKey>` diyordu; `d` de eklendi. Aynı oda
 * kimlikleri farklı bir bölümde başka yerleşimle gelebilir (ör. iki bölümde de
 * `main`) ve sprite yolun ŞEKLİNE bağlı — yalnızca bağlantı adı olsaydı eski
 * bölümün bulanık izi yeni bölümde kalırdı. `d` görüntüyü tam belirler.
 *
 * SINIRLAR: sprite kutusu için yolun kapladığı alan gerekiyor; `Path2D`'nin
 * sınır sorgusu yok. `d` yalnızca `M/L/Q` ve mutlak sayılardan oluşuyor
 * (`getRoundedCornerPath`); sayı çiftlerinden alınan min/max, Bézier'in kontrol
 * noktalarını da içerdiği için eğrinin üst sınırıdır. Yalnızca KUTU için okunur.
 */

import { routePortalPath } from '../../logic/engine/rooms';
import type { BoardScene, SpritePainter } from '../types';
import { NATIVE_CELL_SIZE } from '../types';
import type { SpriteCache } from '../spriteCache';
import { setShadow } from '../paintTokens';
import { ROOM_LAYOUT_GAP } from '../../components/play-screen/constants';
import { EDGE_SIDES, drawAt } from './geometry';
import type { EdgeSide } from './geometry';
import { crawlDashOffset } from './timing';

interface Bounds { minX: number; minY: number; maxX: number; maxY: number }

interface PortalConnection {
    key: string;
    d: string;
    bounds: Bounds;
    /** İlk çizimde kurulur; `Path2D` testlerde/SSR'da yok. */
    path: Path2D | null;
}

export interface PortalGlowInput { key: string; d: string; bounds: Bounds }

/** Bulanık katmanın kalınlığı ve `filter: blur(4px)` sigması. */
const GLOW_STROKE = 6;
const BLUR_SIGMA = 4;
/** Gauss kuyruğu ~3σ + çizgi yarı kalınlığı + bir miktar pay. */
const GLOW_PAD = Math.ceil(BLUR_SIGMA * 3 + GLOW_STROKE / 2 + 1);
/** Şekil tuvalin çok dışına çizilir; yalnızca gölgesi sprite'a düşer. */
const OFFSCREEN = 10000;

const DASH_STROKE = 2.5;
const DASH_PATTERN = [6, 6];

/** `rooms` referansı ızgara değişmedikçe sabit → bağlantılar bir kez kurulur. */
const connectionsByRooms = new WeakMap<object, PortalConnection[]>();

function boundsOf(d: string): Bounds | null {
    const numbers = d.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi)?.map(Number) ?? [];
    if (numbers.length < 4) return null;
    const b: Bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    for (let i = 0; i + 1 < numbers.length; i += 2) {
        b.minX = Math.min(b.minX, numbers[i]);
        b.maxX = Math.max(b.maxX, numbers[i]);
        b.minY = Math.min(b.minY, numbers[i + 1]);
        b.maxY = Math.max(b.maxY, numbers[i + 1]);
    }
    return b;
}

/** `GameBoard`'un bağlantı listesi: her çift bir kez, sıralı anahtarla. */
function buildConnections(scene: BoardScene): PortalConnection[] {
    const pairs: { fromRoomId: string; fromSide: EdgeSide; toRoomId: string; toSide: EdgeSide; key: string }[] = [];
    const seen = new Set<string>();

    for (const [roomId, room] of Object.entries(scene.rooms)) {
        for (const side of EDGE_SIDES) {
            const edge = room.edges[side];
            if (!edge || edge.type !== 'portal' || !edge.targetRoomId || !edge.targetEdge) continue;

            const key = [`${roomId}:${side}`, `${edge.targetRoomId}:${edge.targetEdge}`].sort().join('--');
            if (seen.has(key)) continue;
            seen.add(key);
            pairs.push({ fromRoomId: roomId, fromSide: side, toRoomId: edge.targetRoomId, toSide: edge.targetEdge, key });
        }
    }

    const connections: PortalConnection[] = [];
    pairs.forEach((p, index) => {
        const d = routePortalPath(
            p.fromRoomId, p.fromSide, p.toRoomId, p.toSide,
            scene.roomPositions, scene.rooms, NATIVE_CELL_SIZE, ROOM_LAYOUT_GAP, index, pairs.length,
        );
        const bounds = d ? boundsOf(d) : null;
        if (bounds) connections.push({ key: p.key, d, bounds, path: null });
    });
    return connections;
}

function connectionsOf(scene: BoardScene): PortalConnection[] {
    let list = connectionsByRooms.get(scene.rooms);
    if (!list) {
        list = buildConnections(scene);
        connectionsByRooms.set(scene.rooms, list);
    }
    return list;
}

/** Bulanık alt katman. Gölge YALNIZCA burada, sprite rasterizasyonunda çizilir. */
export const portalGlowSprite: SpritePainter<PortalGlowInput> = {
    key: ({ key, d }) => `portalpath|${key}|${d}`,

    size: ({ bounds }) => ({
        w: Math.ceil(bounds.maxX - bounds.minX) + GLOW_PAD * 2,
        h: Math.ceil(bounds.maxY - bounds.minY) + GLOW_PAD * 2,
    }),

    draw: (ctx, { d, bounds }) => {
        // CSS `blur(4px)` σ=4'tür; `shadowBlur` σ = blur/2 olduğu için 2σ verilir.
        // DPR çarpımı `setShadow`'da.
        ctx.translate(GLOW_PAD - bounds.minX - OFFSCREEN, GLOW_PAD - bounds.minY);
        setShadow(ctx, 'rgba(168, 85, 247, 0.4)', BLUR_SIGMA * 2, OFFSCREEN);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = GLOW_STROKE;
        ctx.lineCap = 'round';
        ctx.stroke(new Path2D(d));
    },
};

/**
 * Portal bağlantı yolları.
 *
 * @param now `null` = `ambientMode === 'off'` taban hâli (`stroke-dashoffset` 0).
 * @returns Çizilecek bir bağlantı varsa `true` (kesikli çizgi hep akıyor).
 */
export function drawPortalPaths(
    ctx: CanvasRenderingContext2D,
    scene: BoardScene,
    cache: SpriteCache,
    now: number | null,
): boolean {
    const connections = connectionsOf(scene);
    if (connections.length === 0) return false;

    for (const conn of connections) {
        const { key, d, bounds } = conn;
        drawAt(ctx, cache, portalGlowSprite, { key, d, bounds }, bounds.minX - GLOW_PAD, bounds.minY - GLOW_PAD);

        conn.path ??= new Path2D(d);
        ctx.save();
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = DASH_STROKE;
        ctx.lineCap = 'round';
        ctx.setLineDash(DASH_PATTERN);
        ctx.lineDashOffset = now === null ? 0 : crawlDashOffset(now);
        ctx.stroke(conn.path);
        ctx.restore();
    }
    return true;
}
