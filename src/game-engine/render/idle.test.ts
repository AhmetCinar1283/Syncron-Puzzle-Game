/**
 * DOSYA AMACI: Boşta oyuncu animasyonunun (göz kırpma, neon nabzı) ambient
 * bütçesine bağlandığını ve — en önemlisi — `lite` kademede ve zafer
 * koreografisi sırasında SIFIR çizim yaptığını kilitlemek (Faz 10 §2.1).
 *
 * Isınma sorununun cevabı "değişen yoksa çizim yok"tur (00-ilkeler §2.2). Bu
 * dosyadaki testler onu, `BoardCanvas`'ın ambient geri çağrısının kullandığı
 * KARAR fonksiyonlarıyla ve gerçek `createScheduler` ile sınar: `raf`
 * enjekte edildiği için "RAF planlandı mı" doğrudan sayılır.
 *
 * Tuvale çizim testi yok (00-ilkeler §6.1).
 */

import { describe, expect, it } from 'vitest';
import type { Entity } from '../logic/entityTypes';
import type { BoardAmbientMode, BoardScene, LayerName } from './types';
import { createScheduler } from './scheduler';
import { createIdleTracker, hasIdleAnimation, idleSignature } from './idle';
import { blinkClosedAt } from './entities/player';

function player(customData: Record<string, unknown> = {}, id = 1): Entity {
    return { id, type: 'player', position: { row: 0, col: 0, roomId: 'main' }, customData } as unknown as Entity;
}

const box = { id: 9, type: 'box', position: { row: 1, col: 1, roomId: 'main' }, customData: {} } as unknown as Entity;

function scene(entities: Entity[], ambientMode: BoardAmbientMode = 'on', theme = 'legacy'): BoardScene {
    return { entities, ambientMode, theme, isVictoryActive: ambientMode === 'off' } as unknown as BoardScene;
}

// `legacy` göz kırpma: 4000 ms; kapalı pencere = %94,2–%97,8 → 3768–3912 ms.
const OPEN = 1000;
const CLOSED = 3800;

describe('hasIdleAnimation', () => {
    it('ambient açıkken kilitsiz oyuncu animasyonlu sayılır', () => {
        expect(hasIdleAnimation(scene([player()]))).toBe(true);
    });

    it('lite / zafer (off) ve hamle sürerken (paused) hiçbir şey animasyonlu sayılmaz', () => {
        expect(hasIdleAnimation(scene([player()], 'off'))).toBe(false);
        expect(hasIdleAnimation(scene([player()], 'paused'))).toBe(false);
    });

    it('kilitli oyuncu kırpmaz; yalnızca neon ters modda nabız atar', () => {
        expect(hasIdleAnimation(scene([player({ isLocked: true })]))).toBe(false);
        expect(hasIdleAnimation(scene([player({ isLocked: true, mode: 'reversed' })], 'on', 'arcade'))).toBe(false);
        expect(hasIdleAnimation(scene([player({ isLocked: true, mode: 'reversed' })], 'on', 'neon'))).toBe(true);
    });

    it('oyuncu yoksa (yalnızca kutu) animasyon yok', () => {
        expect(hasIdleAnimation(scene([box]))).toBe(false);
        expect(hasIdleAnimation(scene([]))).toBe(false);
    });
});

describe('idleSignature', () => {
    it('göz açıkken aynı, kapanınca farklı', () => {
        const s = scene([player()]);
        expect(blinkClosedAt('legacy', OPEN)).toBe(false);
        expect(blinkClosedAt('legacy', CLOSED)).toBe(true);

        expect(idleSignature(s, 0)).toBe(idleSignature(s, OPEN));
        expect(idleSignature(s, OPEN)).not.toBe(idleSignature(s, CLOSED));
    });

    it('neon ters modda nabız fazı değişince farklı', () => {
        const s = scene([player({ mode: 'reversed' })], 'on', 'neon');
        expect(idleSignature(s, 0)).not.toBe(idleSignature(s, 200));
    });

    it('kutuları saymaz', () => {
        expect(idleSignature(scene([box]), 123)).toBe('');
    });
});

/** Sahte RAF (scheduler.test.ts ile aynı desen). */
function fakeRaf() {
    const pending = new Map<number, FrameRequestCallback>();
    let nextId = 1;
    return {
        scheduledCount: () => pending.size,
        totalScheduled: () => nextId - 1,
        raf: (cb: FrameRequestCallback) => {
            const id = nextId++;
            pending.set(id, cb);
            return id;
        },
        caf: (id: number) => { pending.delete(id); },
        flush(now: number) {
            const due = Array.from(pending.values());
            pending.clear();
            for (const cb of due) cb(now);
        },
    };
}

/**
 * `BoardCanvas`'ın çizim geri çağrısının boşta animasyonla ilgili kısmının aynısı:
 * ambient çizilince `afterAmbient`, actors çizilince `drewActors`.
 */
function harness(current: BoardScene) {
    const clock = fakeRaf();
    const idle = createIdleTracker();
    const drawn: LayerName[] = [];
    const scheduler = createScheduler({
        draw: (layer, now) => {
            drawn.push(layer);
            if (layer === 'ambient') {
                const wake = idle.afterAmbient(current, now);
                if (wake.keepAmbient && current.ambientMode === 'on') scheduler.invalidate('ambient');
                if (wake.drawActors) scheduler.invalidate('actors');
            } else if (layer === 'actors') {
                idle.drewActors(current, now);
            }
        },
        raf: clock.raf,
        caf: clock.caf,
    });
    return { clock, drawn, scheduler };
}

describe('sıfır çizim vaadi (00-ilkeler §2.2)', () => {
    it('lite / zafer (ambientMode off): ilk çizimden sonra RAF HİÇ planlanmaz', () => {
        const { clock, drawn, scheduler } = harness(scene([player(), player({}, 2)], 'off'));

        // Sahne değişimindeki tek seferlik kirletme (BoardCanvas efekti).
        scheduler.invalidate('ambient');
        scheduler.invalidate('actors');
        clock.flush(0);
        const scheduledAfterFirstFrame = clock.totalScheduled();

        // Kırpma penceresi dahil 30 saniye boyunca hiçbir şey uyanmaz.
        for (let t = 50; t <= 30_000; t += 50) clock.flush(t);

        expect(drawn).toEqual(['ambient', 'actors']);
        expect(clock.scheduledCount()).toBe(0);
        expect(clock.totalScheduled()).toBe(scheduledAfterFirstFrame);
    });

    it('hamle sürerken (paused) da kendi kendine uyanmaz', () => {
        const { clock, scheduler } = harness(scene([player()], 'paused'));
        scheduler.invalidate('ambient');
        clock.flush(0);
        const total = clock.totalScheduled();
        for (let t = 50; t <= 10_000; t += 50) clock.flush(t);
        expect(clock.scheduledCount()).toBe(0);
        expect(clock.totalScheduled()).toBe(total);
    });

    it('full kademe (on): ambient döngüsü sürer, actors yalnızca kırpma DEĞİŞİNCE çizilir', () => {
        const { clock, drawn, scheduler } = harness(scene([player()], 'on'));

        // İlk kare: actors henüz hiç çizilmedi → aynı karede actors da çizilir.
        scheduler.invalidate('ambient');
        clock.flush(0);
        expect(drawn).toEqual(['ambient', 'actors']);
        expect(clock.scheduledCount()).toBe(1);          // ambient bir sonrakini planladı

        // Göz açık kaldığı sürece ambient yürür ama actors çizilmez.
        for (let t = 50; t <= 3700; t += 50) clock.flush(t);
        expect(drawn.filter(l => l === 'actors')).toHaveLength(1);
        expect(clock.scheduledCount()).toBe(1);

        // Göz kapanır (3768 ms), sonra açılır (3912 ms): iki geçiş, iki çizim.
        for (let t = 3750; t <= 4100; t += 50) clock.flush(t);
        expect(drawn.filter(l => l === 'actors')).toHaveLength(3);
    });
});

describe('createIdleTracker', () => {
    it('actors çizildikten sonra aynı durumda actors\'ı yeniden kirletmez', () => {
        const idle = createIdleTracker();
        const s = scene([player()]);

        expect(idle.afterAmbient(s, OPEN).drawActors).toBe(true);   // hiç çizilmedi
        idle.drewActors(s, OPEN);
        expect(idle.afterAmbient(s, OPEN + 50).drawActors).toBe(false);
        expect(idle.afterAmbient(s, CLOSED).drawActors).toBe(true);
    });

    it('hamle sırasında çizilen actors da kaydedilir: bayat kare kalmaz', () => {
        const idle = createIdleTracker();
        const s = scene([player()]);

        idle.drewActors(s, OPEN);
        // Hamle (paused) sırasında actors göz KAPALIyken çizildi …
        idle.drewActors(scene([player()], 'paused'), CLOSED);
        // … hareket bitince göz açık: sonuç farklı, actors yeniden çizilmeli.
        expect(idle.afterAmbient(s, OPEN).drawActors).toBe(true);
    });

    it('animasyonlu oyuncu yoksa uyandırmaz', () => {
        const idle = createIdleTracker();
        expect(idle.afterAmbient(scene([box]), 0)).toEqual({ keepAmbient: false, drawActors: false });
    });
});
