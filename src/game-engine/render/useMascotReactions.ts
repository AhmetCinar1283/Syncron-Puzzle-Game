/**
 * DOSYA AMACI: Tahtadaki maskotları canlı tutar. İki kaynağı denetleyiciye yazar:
 *   1. Oyun olayları — her kare bir öncekiyle karşılaştırılır (`mascot/reactions.ts`).
 *   2. Yaşam — boştayken uyuma, göz kırpma, hedefe bakma (`mascot/life.ts`).
 *
 * Kare ÇAPRAZ film sınırında da karşılaştırılır (bir hamlenin filmi bir öncekinin
 * son karesinden devam eder), bu yüzden önceki kare kendi ref'inde tutulur.
 * Yeni tur (seviye/varlık kümesi değişti veya ölüm/zaferden sonra yeniden başlatma)
 * → baz sıfırlanır, tepki verilmez ve yaşam yeniden başlar (kimi uyuyarak).
 */

import { useEffect, useMemo, useRef } from 'react';
import type { TickSnapshot } from '../logic/types';
import type { MascotController } from '../mascot/controller';
import { reactionsBetween } from '../mascot/reactions';
import { createLife } from '../mascot/life';

/** Boştayken yaşam adımının sıklığı (ms). */
const LIFE_STEP_MS = 400;

function sameIds(a: TickSnapshot, b: TickSnapshot): boolean {
    if (a.entities.length !== b.entities.length) return false;
    return a.entities.every((e, i) => e.id === b.entities[i].id);
}

const ended = (s: TickSnapshot) => s.entities.some(e => e.customData.deathReason || e.customData.isVictory);

/**
 * Önceki kareden DEVAM mı, yoksa yeni tur mu? `tickNumber` her hamlede sıfırdan
 * başladığı için ölçüt DEĞİL. Yeni tur: seviye değişti, varlık kümesi değişti
 * veya önceki kare ölüm/zaferle bitmişti (yeniden başlatma).
 */
function isContinuation(last: TickSnapshot | null, next: TickSnapshot, sameLevel: boolean): last is TickSnapshot {
    return !!last && sameLevel && sameIds(last, next) && (!ended(last) || ended(next));
}

export function useMascotReactions(
    mascots: MascotController,
    snapshot: TickSnapshot | null,
    /** Hamle oynamıyor ve zafer/ölüm yok: yaşam adımlarına izin verilen durum. */
    resting: boolean,
    /** Kapalıysa yalnızca oyun olayları çalışır (düşük hareket kademesi). */
    lively = true,
    /** Seviye kimliği: değişince yeni tur sayılır (ör. seviye adı). */
    levelKey: string | undefined = undefined,
): void {
    const lastRef = useRef<TickSnapshot | null>(null);
    const levelRef = useRef<string | undefined>(levelKey);
    const snapshotRef = useRef<TickSnapshot | null>(snapshot);
    const life = useMemo(() => createLife(mascots), [mascots]);

    // Kare değişti: olay tepkileri + uyuyanı uyandırma / yeni turda başlangıç.
    useEffect(() => {
        snapshotRef.current = snapshot;
        if (!snapshot) { lastRef.current = null; return; }
        const last = lastRef.current;
        lastRef.current = snapshot;
        if (last === snapshot) return;

        const now = performance.now();
        const sameLevel = levelRef.current === levelKey;
        levelRef.current = levelKey;
        const continuous = isContinuation(last, snapshot, sameLevel);
        const reactions = reactionsBetween(continuous ? last.entities : null, snapshot.entities);
        const reacted = new Set(reactions.map(r => r.id));

        if (lively) {
            if (continuous) life.wake(snapshot, now, reacted);
            else life.start(snapshot, now);
        }
        for (const r of reactions) mascots.trigger(r.id, r.emote, now, { force: r.force });
    }, [snapshot, mascots, life, lively, levelKey]);

    // Yaşam: yalnızca tahta boşken adım atar; hamle başlayınca durur.
    useEffect(() => {
        if (!resting || !lively) return;
        const id = setInterval(() => {
            const s = snapshotRef.current;
            if (s) life.step(s, performance.now());
        }, LIFE_STEP_MS);
        return () => clearInterval(id);
    }, [resting, lively, life]);

    useEffect(() => () => mascots.clear(), [mascots]);
}
