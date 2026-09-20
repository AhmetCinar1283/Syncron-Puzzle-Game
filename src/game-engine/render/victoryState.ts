/**
 * DOSYA AMACI: Zafer koreografisinin DURUMU ve ZAMAN MATEMATİĞİ — üç aşamanın
 * konum/ölçek/dönüş formülleri, hayalet iz halkası, parçacık akışı, süpernova
 * ve şok dalgası değerleri. Burada hiçbir çizim yok; çizim `victory.ts`'te.
 *
 * Kaynak: `components/effects/VictoryCelebration.tsx`. Bu bir yeniden tasarım
 * DEĞİL, birebir porttur: eşikler, easing, yarıçap ve açı formülleri kaynaktan
 * olduğu gibi taşındı, hiçbir sayı yeniden türetilmedi (faz planı §4.1).
 *
 * DURUM KAREYE BAĞLI, ZAMANA DEĞİL. Kaynak hız, opaklık ve iz ölçeğini her RAF
 * karesinde bir öncekinin üstüne ekliyor (`pt.x += pt.vx`, `tr.scale *= 0.92`,
 * faz 3'te `current.rotation + p3 * 720`). Zamandan yeniden türetmek görüntüyü
 * değiştirirdi; bu yüzden `VictoryState` DEĞİŞKENDİR ve `advanceVictory` kare
 * başına bir kez ilerletir — tıpkı kaynaktaki `animate` gibi.
 *
 * NEDEN `victory.ts`'ten ayrı: ikisi birlikte 466 satırdı (00-ilkeler §1).
 * `motion.ts` ↔ `entityMotion.ts` ile aynı bölme.
 */

import type { GameTheme } from '../themes/themeConfig';
import type { BoardScene } from './types';
import { VICTORY_CELEBRATION_DURATION } from '../components/effects/VictoryCelebration';
import type { PlayerSpriteInput } from './entities/player';
import { PARTICLE_COLORS, PARTICLE_SHAPES } from './victorySprites';
import type { VictoryShape } from './victorySprites';

export { VICTORY_CELEBRATION_DURATION };

/** Oyuncu başına hayalet iz yuvası — kaynaktaki `TRAIL_SLOTS`. */
const TRAIL_SLOTS = 3;

/** `filter: blur(${tIdx + 1.5}px)` — yuva başına bulanıklık yarıçapı. */
export const TRAIL_BLURS = [1.5, 2.5, 3.5];

export interface VictoryTrail { x: number; y: number; scale: number; rotation: number; opacity: number }

export interface VictoryEntityState {
    x: number;
    y: number;
    scale: number;
    rotation: number;
    opacity: number;
    trails: VictoryTrail[];
}

export interface VictoryParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    shape: VictoryShape;
    rotation: number;
    rotSpeed: number;
    opacity: number;
}

export interface VictoryPlayerConfig {
    startX: number;
    startY: number;
    initialAngle: number;
    /** Faz 05'in sprite girdisi, göz kırpma ve nabız dondurulmuş hâlde. */
    base: PlayerSpriteInput;
}

export interface VictoryState {
    startedAt: number;
    durationMs: number;
    /** Aynı zaferi yeniden başlatmamak için kaynaktaki `victoryKey`. */
    key: string;
    cx: number;
    cy: number;
    maxRadius: number;
    boardW: number;
    boardH: number;
    configs: VictoryPlayerConfig[];
    states: VictoryEntityState[];
    particles: VictoryParticle[];
    burst: { active: boolean; scale: number; opacity: number; shockwaveRadius: number; shockwaveOpacity: number };
}

/** `[data-victory-freeze] * { animation: none }` — başlangıç durumuna dönüş. */
function frozenPlayerInput(theme: GameTheme, customData: Record<string, unknown>, idx: number): PlayerSpriteInput {
    return {
        theme,
        playerIndex: (customData.playerIndex as number) ?? idx,
        mode: (customData.mode as 'normal' | 'reversed') ?? 'normal',
        locked: Boolean(customData.isLocked),
        blinkClosed: false,
        pulsePhase: 0,
    };
}

/** Kaynaktaki `victoryKey`: oyuncu kimlikleri + konumları + tahta ölçüsü. */
function victoryKeyOf(scene: BoardScene): string {
    const players = scene.entities.filter(e => e.type === 'player' && !e.customData._destroyed);
    const ids = players
        .map(p => `${p.id}:${p.position.roomId}:${p.position.row},${p.position.col}`)
        .join('|');
    return `${ids}_${scene.totalWidth}x${scene.totalHeight}`;
}

export function createVictoryState(scene: BoardScene, now: number): VictoryState {
    const players = scene.entities.filter(e => e.type === 'player' && !e.customData._destroyed);
    const n = Math.max(1, players.length);
    const cx = scene.totalWidth / 2;
    const cy = scene.totalHeight / 2;

    const configs: VictoryPlayerConfig[] = players.map((ent, idx) => {
        const offset = scene.roomPositions[ent.position.roomId ?? 'main'] ?? { left: 0, top: 0 };
        const startX = offset.left + ent.position.col * 64 + 32;
        const startY = offset.top + ent.position.row * 64 + 32;
        // Merkeze göre açı ile düzgün dağılımın ortalaması.
        const baseAngle = Math.atan2(startY - cy, startX - cx);
        const distributedAngle = (2 * Math.PI * idx) / n;
        return {
            startX,
            startY,
            initialAngle: (baseAngle + distributedAngle) / 2,
            base: frozenPlayerInput(scene.theme, ent.customData, idx),
        };
    });

    const count = Math.min(36, 18 + n * 4);
    const particles: VictoryParticle[] = [];
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
        const speed = 1.2 + Math.random() * 3.5;
        particles.push({
            x: cx,
            y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 6 + Math.random() * 10,
            color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
            shape: PARTICLE_SHAPES[i % PARTICLE_SHAPES.length],
            rotation: Math.random() * 360,
            rotSpeed: (Math.random() - 0.5) * 12,
            opacity: 0,
        });
    }

    return {
        startedAt: now,
        durationMs: VICTORY_CELEBRATION_DURATION,
        key: victoryKeyOf(scene),
        cx,
        cy,
        maxRadius: Math.max(90, Math.min(scene.totalWidth, scene.totalHeight) * 0.38),
        boardW: scene.totalWidth,
        boardH: scene.totalHeight,
        configs,
        states: configs.map(c => ({ x: c.startX, y: c.startY, scale: 1, rotation: 0, opacity: 1, trails: [] })),
        particles,
        burst: { active: false, scale: 0, opacity: 0, shockwaveRadius: 0, shockwaveOpacity: 0 },
    };
}

/**
 * Koreografiyi bir kare ilerletir — kaynaktaki `animate`in gövdesi.
 *
 * Dışa açık, çünkü aşama matematiği bu izin en kırılgan saf parçası ve
 * 00-ilkeler §6.1 saf olan her şeyin test edilmesini istiyor. `drawVictory`
 * dışında çağıran yok.
 */
export function advanceVictory(state: VictoryState, progress: number): void {
    const { cx, cy, maxRadius } = state;
    const n = Math.max(1, state.configs.length);
    const isPhase1 = progress < 0.18;
    const isPhase2 = progress >= 0.18 && progress < 0.82;
    const isPhase3 = progress >= 0.82;

    state.configs.forEach((cfg, idx) => {
        const current = state.states[idx];
        if (!current) return;

        let curX = cfg.startX;
        let curY = cfg.startY;
        let curScale = 1;
        let curRot = 0;
        let curOpacity = 1;

        if (isPhase1) {
            // AŞAMA 1: sıçrama ve havalanma (0.00 → 0.18, ~315ms).
            const p1 = progress / 0.18;
            const easeP1 = 1 - Math.pow(1 - p1, 3);
            const targetX = cx + maxRadius * Math.cos(cfg.initialAngle);
            const targetY = cy + maxRadius * Math.sin(cfg.initialAngle);

            curX = cfg.startX + (targetX - cfg.startX) * easeP1;
            curY = cfg.startY + (targetY - cfg.startY) * easeP1 - Math.sin(p1 * Math.PI) * 28;
            curScale = 1 + Math.sin(p1 * Math.PI) * 0.35;
            curRot = p1 * 120;
        } else if (isPhase2) {
            // AŞAMA 2: hızlanan girdap dansı (0.18 → 0.82, ~1120ms).
            const p2 = (progress - 0.18) / 0.64;
            const decay = Math.pow(1 - p2, 1.2);
            const currentRadius = maxRadius * decay + 14;
            const totalRevs = n === 1 ? 3.2 : (n === 2 ? 3.8 : 3.0);
            const angleProgress = Math.pow(p2, 1.28);
            const currentAngle = cfg.initialAngle + Math.PI * 2 * totalRevs * angleProgress;

            if (n === 1) {
                // Tek oyuncu: figür-8 dalgalı zafer uçuşu.
                const waveX = Math.cos(currentAngle) * 1.25;
                const waveY = Math.sin(currentAngle) * (0.9 + 0.3 * Math.cos(2 * currentAngle));
                curX = cx + currentRadius * waveX;
                curY = cy + currentRadius * waveY;
            } else {
                curX = cx + currentRadius * Math.cos(currentAngle);
                curY = cy + currentRadius * Math.sin(currentAngle);
            }

            curScale = 1.15 + Math.sin(p2 * Math.PI * 4) * 0.1;
            curRot = (currentAngle * 180) / Math.PI + 90 + p2 * 360;
        } else {
            // AŞAMA 3: merkezde birleşme ve yıldız tozuna dönüşme (0.82 → 1.00).
            const p3 = (progress - 0.82) / 0.18;
            curX = cx + (current.x - cx) * (1 - p3 * 0.35);
            curY = cy + (current.y - cy) * (1 - p3 * 0.35);
            curScale = Math.max(0, (1 - p3) * 1.2);
            curRot = current.rotation + p3 * 720;
            curOpacity = Math.max(0, 1 - p3 * p3);
        }

        // Hayalet izler: nesneler KARELER ARASI paylaşılır, `scale *= 0.92`
        // bu yüzden her karede bileşik olarak küçülür (kaynaktaki davranış).
        const trails = [...current.trails];
        if (isPhase1 || isPhase2) {
            trails.unshift({ x: curX, y: curY, scale: curScale * 0.82, rotation: curRot, opacity: 0.55 });
            while (trails.length > TRAIL_SLOTS) trails.pop();
            trails.forEach((tr, tIdx) => {
                tr.opacity = (1 - (tIdx + 1) * 0.28) * curOpacity;
                tr.scale *= 0.92;
            });
        } else {
            trails.length = 0;
        }

        state.states[idx] = { x: curX, y: curY, scale: curScale, rotation: curRot, opacity: curOpacity, trails };
    });

    if (isPhase3) {
        const p3 = (progress - 0.82) / 0.18;
        state.burst = {
            active: true,
            scale: p3 < 0.35 ? p3 * 8.5 : 3.0 + (p3 - 0.35) * 1.5,
            opacity: p3 < 0.35 ? 1 : Math.max(0, 1 - Math.pow((p3 - 0.35) / 0.65, 1.8)),
            shockwaveRadius: Math.pow(p3, 0.7) * Math.min(state.boardW, state.boardH) * 0.7,
            shockwaveOpacity: Math.max(0, (1 - p3) * 0.85),
        };
    }

    for (const pt of state.particles) {
        if (progress <= 0.1) continue;
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.rotation += pt.rotSpeed;
        if (progress < 0.7) {
            pt.opacity = Math.min(0.9, pt.opacity + 0.08);
        } else {
            pt.opacity = Math.max(0, 0.9 * (1 - (progress - 0.7) / 0.3));
        }
    }
}

/**
 * Zafer durumunun sahne değişimlerine göre kurulup sıfırlanmasını yöneten
 * kap. `entityMotion`'daki takipçiyle aynı desen: `BoardCanvas` tick başına
 * `update` çağırır, çizim yalnızca okur.
 */
export interface VictoryTracker {
    update(scene: BoardScene, now: number): void;
    state(): VictoryState | null;
    clear(): void;
}

export function createVictoryTracker(): VictoryTracker {
    let current: VictoryState | null = null;

    return {
        update(scene, now) {
            if (!scene.isVictoryActive) {
                current = null;
                return;
            }
            const key = victoryKeyOf(scene);
            if (!current || current.key !== key) current = createVictoryState(scene, now);
        },
        state: () => current,
        clear() { current = null; },
    };
}
