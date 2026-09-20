/**
 * DOSYA AMACI: Zamanlayıcının üç bağlayıcı davranışını kanıtlamak:
 * (a) kirli bayrak yokken RAF planlanmaz, (b) tek `invalidate` sonrası bir kare
 * çizilir ve döngü durur, (c) ambient kısması kareyi atlar ama döngüyü durdurmaz.
 *
 * `raf`/`caf` enjekte edildiği için DOM'a ihtiyaç yok.
 */

import { describe, expect, it } from 'vitest';
import { createScheduler } from './scheduler';
import type { LayerName } from './types';

/** Sahte RAF: kareleri elle, istenen `now` damgasıyla çalıştırır. */
function fakeRaf() {
    const pending = new Map<number, FrameRequestCallback>();
    let nextId = 1;
    const cancelled: number[] = [];

    return {
        scheduledCount: () => pending.size,
        totalScheduled: () => nextId - 1,
        cancelled,
        raf: (cb: FrameRequestCallback) => {
            const id = nextId++;
            pending.set(id, cb);
            return id;
        },
        caf: (id: number) => {
            pending.delete(id);
            cancelled.push(id);
        },
        /** Bekleyen tüm kareleri verilen damgayla çalıştırır. */
        flush(now: number) {
            const due = Array.from(pending.entries());
            pending.clear();
            for (const [, cb] of due) cb(now);
        },
    };
}

describe('createScheduler', () => {
    it('invalidate çağrılmadan RAF planlamaz', () => {
        const clock = fakeRaf();
        const drawn: LayerName[] = [];

        createScheduler({ draw: l => { drawn.push(l); }, raf: clock.raf, caf: clock.caf });

        expect(clock.totalScheduled()).toBe(0);
        expect(drawn).toEqual([]);
    });

    it('tek invalidate sonrası tam bir kare çizer ve döngüyü durdurur', () => {
        const clock = fakeRaf();
        const drawn: LayerName[] = [];
        const scheduler = createScheduler({ draw: l => { drawn.push(l); }, raf: clock.raf, caf: clock.caf });

        scheduler.invalidate('static');
        expect(clock.scheduledCount()).toBe(1);

        clock.flush(0);
        expect(drawn).toEqual(['static']);

        // Kirli katman kalmadı: yeni kare PLANLANMAZ (00-ilkeler §2.2).
        expect(clock.scheduledCount()).toBe(0);
        expect(clock.totalScheduled()).toBe(1);

        // İkinci kare çalıştırılsa bile çizim tekrarlanmaz.
        clock.flush(16);
        expect(drawn).toEqual(['static']);
    });

    it('aynı karede kirli olan tüm katmanları çizer, temiz olanları atlar', () => {
        const clock = fakeRaf();
        const drawn: LayerName[] = [];
        const scheduler = createScheduler({ draw: l => { drawn.push(l); }, raf: clock.raf, caf: clock.caf });

        scheduler.invalidate('actors');
        scheduler.invalidate('static');
        clock.flush(0);

        // Sıra z-sırasıdır: static < ambient < actors.
        expect(drawn).toEqual(['static', 'actors']);
        expect(clock.scheduledCount()).toBe(0);
    });

    it('actors kirliyse kısma yok — her karede çizilir', () => {
        const clock = fakeRaf();
        const drawn: LayerName[] = [];
        const scheduler = createScheduler({ draw: l => { drawn.push(l); }, raf: clock.raf, caf: clock.caf });

        for (let i = 0; i < 4; i++) {
            scheduler.invalidate('actors');
            clock.flush(i * 16);
        }

        expect(drawn).toEqual(['actors', 'actors', 'actors', 'actors']);
    });

    it('ambient kısması 20Hz üstü çağrılarda kareyi atlar ama döngüyü durdurmaz', () => {
        const clock = fakeRaf();
        const drawn: LayerName[] = [];
        const scheduler = createScheduler({
            draw: l => { drawn.push(l); },
            ambientHz: 20,            // 50ms'lik en küçük aralık
            raf: clock.raf,
            caf: clock.caf,
        });

        scheduler.invalidate('ambient');
        clock.flush(1000);
        expect(drawn).toEqual(['ambient']);

        // 16ms sonra yine kirletilir: 50ms dolmadı, kare ATLANIR.
        scheduler.invalidate('ambient');
        clock.flush(1016);
        expect(drawn).toEqual(['ambient']);
        // Bayrak kirli kaldı → döngü uyanık.
        expect(clock.scheduledCount()).toBe(1);

        // 32ms sonra hâlâ dolmadı.
        clock.flush(1032);
        expect(drawn).toEqual(['ambient']);
        expect(clock.scheduledCount()).toBe(1);

        // 50ms dolunca çizilir ve döngü durur.
        clock.flush(1050);
        expect(drawn).toEqual(['ambient', 'ambient']);
        expect(clock.scheduledCount()).toBe(0);
    });

    it('stop bekleyen RAF\'ı iptal eder ve sonraki invalidate\'leri yutar', () => {
        const clock = fakeRaf();
        const drawn: LayerName[] = [];
        const scheduler = createScheduler({ draw: l => { drawn.push(l); }, raf: clock.raf, caf: clock.caf });

        scheduler.invalidate('static');
        scheduler.stop();

        expect(clock.cancelled).toEqual([1]);
        expect(clock.scheduledCount()).toBe(0);

        scheduler.invalidate('actors');
        expect(clock.totalScheduled()).toBe(1);

        clock.flush(0);
        expect(drawn).toEqual([]);
    });

    it('draw içinden gelen invalidate bir sonraki kareyi planlar', () => {
        const clock = fakeRaf();
        let count = 0;
        const scheduler = createScheduler({
            draw: () => {
                count++;
                // Faz 03'ün ambient döngüsünü sürdürme deseni.
                if (count < 3) scheduler.invalidate('actors');
            },
            raf: clock.raf,
            caf: clock.caf,
        });

        scheduler.invalidate('actors');
        clock.flush(0);
        expect(count).toBe(1);
        expect(clock.scheduledCount()).toBe(1);

        clock.flush(16);
        clock.flush(32);
        expect(count).toBe(3);
        expect(clock.scheduledCount()).toBe(0);
    });
});
