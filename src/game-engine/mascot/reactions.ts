/**
 * DOSYA AMACI: Oyun olaylarını ifadelere çeviren SAF eşleme. İki tick arasındaki
 * varlık durumunu karşılaştırır, "hangi oyuncu hangi ifadeyi oynasın"ı döndürür.
 * Tuvale, zamana ve denetleyiciye dokunmaz; tetiklemeyi çağıran yapar
 * (`render/useMascotReactions.ts` → `controller.trigger`).
 *
 * Yeni bir tepki eklemek = `reactionOf` içine bir kural. İfadenin kendisi
 * (süre, öncelik, poz) `emotes.ts`'te; burada yalnızca "ne zaman" var.
 *
 * Kural sırası ÖNEMLİDİR: bir varlık bir tick'te en fazla bir tepki verir ve
 * ilk eşleşen kazanır (zafer > ölüm > çarpma > hedefe varış > mod değişimi).
 */

import type { Entity } from '../logic/entityTypes';
import type { EmoteName } from './emotes';

export interface Reaction {
    id: number;
    emote: EmoteName;
    /** Öncelik kuralını atla: sonuç anları (zafer/ölüm) süren her şeyi keser. */
    force?: boolean;
}

/** Çarpma sebebine göre ifade; listede olmayan sebep (ör. konveyör) tepkisiz. */
const BUMP_EMOTE: Partial<Record<string, EmoteName>> = {
    wall: 'ouch',
    blocked_push: 'nervous',
    collision: 'confused',
};

function reactionOf(prev: Entity | undefined, next: Entity): Reaction | null {
    const now = next.customData;
    const before = prev?.customData;
    const id = next.id;

    if (now.isVictory && !before?.isVictory) return { id, emote: 'celebrate', force: true };
    if (now.deathReason && !before?.deathReason) return { id, emote: 'dizzy', force: true };

    // Çarpma tick başına bir kez yazılır ve sonraki tick'te silinir
    // (`useGameEngine`), bu yüzden değer varlığı yeterli; ardışık iki çarpma
    // iki ayrı tepkidir.
    if (now.bumpDirection) {
        const emote = BUMP_EMOTE[String(now.bumpReason ?? 'wall')];
        if (emote) return { id, emote };
    }

    if (now.isLocked && !before?.isLocked) return { id, emote: 'happy' };
    if (prev && before?.mode !== now.mode) return { id, emote: 'surprised' };
    return null;
}

/**
 * `prev` → `next` geçişinde tetiklenecek tepkiler. `prev` yoksa (yeni tur)
 * boş döner: bir seviyenin ilk karesinde "değişim" yoktur, yalnızca durum vardır.
 */
export function reactionsBetween(prev: readonly Entity[] | null, next: readonly Entity[]): Reaction[] {
    if (!prev) return [];
    const before = new Map<number, Entity>();
    for (const e of prev) if (e.type === 'player') before.set(e.id, e);

    const out: Reaction[] = [];
    for (const e of next) {
        if (e.type !== 'player') continue;
        const r = reactionOf(before.get(e.id), e);
        if (r) out.push(r);
    }
    return out;
}

/** Uzun süre hareketsiz kalan (kilitsiz, canlı) oyuncular: uyuklama adayları. */
export function sleepyCandidates(entities: readonly Entity[]): number[] {
    return entities
        .filter(e => e.type === 'player' && !e.customData.isLocked && !e.customData.deathReason && !e.customData.isVictory)
        .map(e => e.id);
}
