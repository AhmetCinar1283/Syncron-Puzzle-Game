/**
 * DOSYA AMACI: Maskotlara "canlılık" katar. Oyuncular boştayken kendi kendine
 * davranır: bazıları uyuyakalır, göz kırpar, etrafa/hedefe bakar, ara sıra
 * sevinir. Hepsi rastgele ama SENKRONSUZ — herkes aynı anda aynı şeyi yapmaz.
 *
 * Doğallık kuralları (sabitler aşağıda, hepsi ayarlanabilir):
 *   - Tur açılınca bazı oyuncular UYUYARAK başlar (hepsi değil).
 *   - Uyuma, boşta rastgele bir süre sonra gelir ve UZUN sürer; aynı anda uyuyan sayısı
 *     sınırlı ve iki uyuma arasında en az `MIN_NAP_GAP_MS` boşluk var.
 *   - Uyuyan kendiliğinden de uyanır; uyanınca `happy`. Bir hamle de uyandırır
 *     (yalnızca uyuyanı: uyanık oyuncuya hamle `happy` VERMEZ).
 *   - Uyandıktan sonra hemen uyumaz: bir sonraki uyku daha uzun bir bekleyişle gelir.
 *   - Uyumayanlar seyrek aralıklarla rastgele ifade oynatır (1–2 tur, ağırlıklı liste).
 *
 * Zaman ve rastgelelik DIŞARIDAN verilir (`now`, `rng`): test edilebilir.
 * Tuvale dokunmaz; yalnızca `MascotController.trigger/stop` çağırır.
 */

import type { Entity } from '../logic/entityTypes';
import type { RoomState } from '../logic/types';
import type { EmoteName } from './emotes';
import type { MascotController } from './controller';
import { sleepyCandidates } from './reactions';

export const LIFE = {
    /** Tur açılışında bir oyuncunun uyuyarak başlama olasılığı. */
    startAsleepChance: 0.5,
    /** Boşta kalınca uykuya dalma gecikmesi [min, max] ms. */
    fallAsleepMs: [8000, 20000],
    /** Bir kez uyandıktan sonra tekrar uykuya dalma gecikmesi — daha uzun. */
    napAgainMs: [25000, 60000],
    /** Kendiliğinden uyanmadan önce uyuma süresi. */
    sleepLengthMs: [30000, 75000],
    /** İki oyuncunun uykuya dalışı arasındaki en az boşluk. */
    minNapGapMs: 4000,
    /** Uyumayan oyuncunun iki rastgele ifadesi arası. */
    actGapMs: [9000, 22000],
    /** Iki oyuncunun ifadesi arasındaki en az boşluk (aynı anda oynamasınlar). */
    minActGapMs: 2500,
    /** Rastgele ifade kaç tur oynar: 2 tur olasılığı, aksi halde 1. */
    twiceChance: 0.7,
    /** Tur açılınca ilk ifadeye kadar kısa gecikme. */
    firstActMs: [2000, 6000],
} as const;

type Range = readonly [number, number];

/** Aynı anda uyuyabilecek oyuncu sayısı: az oyuncuda 1, kalabalıkta biraz fazla. */
export function maxSleepers(players: number): number {
    return Math.max(1, Math.ceil(players / 3));
}

type Dir = 'lookLeft' | 'lookRight' | 'lookUp' | 'lookDown';

/**
 * Oyuncunun kendi rengindeki hedefe (aynı odada) doğru bakış yönü; hedef yoksa
 * veya üstündeyse `null`. `near`: hedef 3 hücre içinde mi (daha çok ilgilenir).
 */
export function targetGlance(
    player: Entity,
    rooms: Record<string, RoomState>,
): { emote: Dir; near: boolean } | null {
    const roomId = player.position.roomId ?? 'main';
    const grid = rooms[roomId]?.grid;
    if (!grid) return null;
    const index = (player.customData.playerIndex as number) ?? 0;

    let best: { dr: number; dc: number; dist: number } | null = null;
    for (const row of grid) {
        for (const cell of row) {
            if (cell.type !== 'target' || ((cell.customData.playerIndex as number) ?? 0) !== index) continue;
            const dr = cell.position.row - player.position.row;
            const dc = cell.position.col - player.position.col;
            const dist = Math.abs(dr) + Math.abs(dc);
            if (dist > 0 && (!best || dist < best.dist)) best = { dr, dc, dist };
        }
    }
    if (!best) return null;
    const emote: Dir = Math.abs(best.dc) >= Math.abs(best.dr)
        ? (best.dc > 0 ? 'lookRight' : 'lookLeft')
        : (best.dr > 0 ? 'lookDown' : 'lookUp');
    return { emote, near: best.dist <= 3 };
}

interface Mood {
    /** Bu ana kadar uykuya dalmaya izin yok. */
    sleepAt: number;
    /** Bir sonraki rastgele ifade. */
    actAt: number;
}

export interface LifeContext {
    entities: readonly Entity[];
    rooms: Record<string, RoomState>;
}

export interface Life {
    /** Yeni tur: kim uyuyarak başlar, ilk ifadeler ne zaman. */
    start(ctx: LifeContext, now: number): void;
    /** Tahtada hareket başladı: uyuyanları `happy` ile uyandır (`skip`: zaten tepki verenler). */
    wake(ctx: LifeContext, now: number, skip: ReadonlySet<number>): void;
    /** Boşta düzenli çağrılır (yaklaşık 400 ms'de bir). */
    step(ctx: LifeContext, now: number): void;
}

export function createLife(mascots: MascotController, rng: () => number = Math.random): Life {
    const moods = new Map<number, Mood>();
    let lastNapAt = -Infinity;
    let lastActAt = -Infinity;

    const between = ([lo, hi]: Range) => lo + rng() * (hi - lo);
    const moodOf = (id: number, now: number): Mood => {
        let m = moods.get(id);
        if (!m) {
            m = { sleepAt: now + between(LIFE.fallAsleepMs), actAt: now + between(LIFE.firstActMs) };
            moods.set(id, m);
        }
        return m;
    };
    const asleep = (id: number, now: number) => mascots.active(id, now)?.name === 'sleepy';
    const sleeping = (ids: number[], now: number) => ids.filter(id => asleep(id, now)).length;

    const pickAct = (player: Entity, rooms: Record<string, RoomState>): EmoteName => {
        const glance = targetGlance(player, rooms);
        const table: [EmoteName, number][] = [
            ['wink', 3], ['lookLeft', 1.5], ['lookRight', 1.5], ['lookUp', 1], ['lookDown', 1],
            ['happy', 1], ['love', 0.7], ['confused', 0.6],
        ];
        if (glance) table.push([glance.emote, glance.near ? 7 : 3]);
        let roll = rng() * table.reduce((s, [, w]) => s + w, 0);
        for (const [name, w] of table) { roll -= w; if (roll <= 0) return name; }
        return 'wink';
    };

    return {
        start({ entities }, now) {
            moods.clear();
            const ids = sleepyCandidates(entities);
            const cap = maxSleepers(ids.length);
            let asleepCount = 0;
            for (const id of ids) {
                const m = moodOf(id, now);
                if (asleepCount < cap && rng() < LIFE.startAsleepChance) {
                    mascots.trigger(id, 'sleepy', now);
                    m.sleepAt = now + between(LIFE.sleepLengthMs);   // uyku süresinin sonu
                    asleepCount++;
                    lastNapAt = now;
                }
            }
        },

        wake({ entities }, now, skip) {
            for (const id of sleepyCandidates(entities)) {
                if (!asleep(id, now)) continue;
                if (!skip.has(id)) mascots.trigger(id, 'happy', now);
                else mascots.stop(id, 'sleepy');
                const m = moodOf(id, now);
                m.sleepAt = now + between(LIFE.napAgainMs);
                m.actAt = now + between(LIFE.actGapMs);
            }
        },

        step({ entities, rooms }, now) {
            const players = entities.filter(e => e.type === 'player');
            const ids = sleepyCandidates(entities);
            const cap = maxSleepers(ids.length);

            for (const player of players) {
                const id = player.id;
                if (!ids.includes(id)) continue;
                const m = moodOf(id, now);

                if (asleep(id, now)) {
                    // Uyku süresi doldu: kendiliğinden uyan, bir süre uyumasın.
                    if (now >= m.sleepAt) {
                        mascots.trigger(id, 'happy', now);
                        m.sleepAt = now + between(LIFE.napAgainMs);
                        m.actAt = now + between(LIFE.actGapMs);
                    }
                    continue;
                }

                // Uykuya dalma: sınır ve boşluk kuralı; uymazsa biraz sonra yeniden dener.
                if (now >= m.sleepAt) {
                    if (sleeping(ids, now) < cap && now - lastNapAt >= LIFE.minNapGapMs && !mascots.active(id, now)) {
                        mascots.trigger(id, 'sleepy', now);
                        lastNapAt = now;
                        m.sleepAt = now + between(LIFE.sleepLengthMs);
                        continue;
                    }
                    m.sleepAt = now + 1500 + rng() * 2000;
                }

                // Rastgele ifade: yalnızca başka bir ifade sürmüyorken.
                if (now >= m.actAt) {
                    if (now - lastActAt < LIFE.minActGapMs) {
                        m.actAt = now + 1000 + rng() * 2000;   // başkası az önce oynadı
                    } else {
                        m.actAt = now + between(LIFE.actGapMs);
                        if (!mascots.active(id, now)) {
                            const repeat = rng() < LIFE.twiceChance ? 2 : 1;
                            mascots.trigger(id, pickAct(player, rooms), now, { repeat });
                            lastActAt = now;
                        }
                    }
                }
            }
        },
    };
}
