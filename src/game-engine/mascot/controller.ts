/**
 * DOSYA AMACI: İfadeleri DIŞARIDAN tetiklemenin tek yolu. Bir denetleyici,
 * kimliğe (varlık id'si) göre "şu an hangi ifade oynuyor"u tutar ve istenen
 * an için pozu verir. Çizim yapmaz; zamanı dışarıdan alır.
 *
 *     const mascots = createMascotController();
 *     mascots.trigger(entity.id, 'surprised', performance.now());
 *     const pose = mascots.poseOf(entity.id, now, idleFace);
 *
 * Öncelik: süren bir ifadenin yerini ancak eşit veya daha yüksek öncelikli bir
 * ifade alır (`force` bunu atlar). Kırpma (0) bir kutlamayı (6) kesemez.
 *
 * `subscribe`: tetikleme/durdurma sonrası çağrılır. Tuval sahibi bununla
 * uyuyan döngüsünü uyandırır (ör. `BoardCanvas` → `actors` katmanı).
 */

import type { FacePose, MascotPose } from './pose';
import { NEUTRAL_BODY } from './pose';
import type { EmoteName } from './emotes';
import { EMOTES } from './emotes';
import type { CompiledEmote } from './timeline';
import { compileEmote, emoteFinished, sampleEmote } from './timeline';

const compiled = new Map<EmoteName, CompiledEmote>();

/** İfadeyi bir kez çözer ve saklar (katalog sabit olduğu için güvenli). */
export function compiledEmote(name: EmoteName): CompiledEmote {
    let c = compiled.get(name);
    if (!c) {
        c = compileEmote(EMOTES[name]);
        compiled.set(name, c);
    }
    return c;
}

export interface ActiveEmote {
    name: EmoteName;
    startedAt: number;
    /** Kaç kez üst üste oynar (döngülü ifadelerde anlamsız). */
    repeat: number;
}

export interface TriggerOptions {
    /** Önceliği yok say, süreni kes. */
    force?: boolean;
    /** İfadeyi bu kadar kez art arda oynat (varsayılan 1). */
    repeat?: number;
}

export interface MascotController {
    /** @returns İfade başladıysa `true`; daha öncelikli bir ifade sürüyorsa `false`. */
    trigger(id: number, name: EmoteName, now: number, opts?: TriggerOptions): boolean;
    /** Süren ifadeyi keser (`name` verilirse yalnızca o ifadeyse). Döngülüleri bitirmenin yolu. */
    stop(id: number, name?: EmoteName): void;
    /** Bu anda süren ifade (bitmişse `null`). */
    active(id: number, now: number): ActiveEmote | null;
    /** `id`'nin `now` anındaki pozu; ifade yoksa verilen boştaki yüz. */
    poseOf(id: number, now: number, idleFace: FacePose): MascotPose;
    /** Herhangi bir kimlikte süren ifade var mı — döngüyü uyanık tutma ölçütü. */
    animating(now: number): boolean;
    subscribe(listener: () => void): () => void;
    clear(): void;
}

export function createMascotController(): MascotController {
    const running = new Map<number, ActiveEmote>();
    const listeners = new Set<() => void>();
    const notify = () => { for (const l of listeners) l(); };

    const live = (id: number, now: number): ActiveEmote | null => {
        const a = running.get(id);
        if (!a) return null;
        if (emoteFinished(compiledEmote(a.name), now - a.startedAt, a.repeat)) {
            running.delete(id);
            return null;
        }
        return a;
    };

    return {
        trigger(id, name, now, opts) {
            const current = live(id, now);
            if (current && !opts?.force && EMOTES[current.name].priority > EMOTES[name].priority) return false;
            running.set(id, { name, startedAt: now, repeat: Math.max(1, Math.round(opts?.repeat ?? 1)) });
            notify();
            return true;
        },

        stop(id, name) {
            const a = running.get(id);
            if (!a || (name && a.name !== name)) return;
            running.delete(id);
            notify();
        },

        active: live,

        poseOf(id, now, idleFace) {
            const a = live(id, now);
            if (!a) return { face: idleFace, body: NEUTRAL_BODY, fx: null };
            const c = compiledEmote(a.name);
            const elapsed = now - a.startedAt;
            // Tekrarlarda her tur baştan; son tur bitince `live` ifadeyi zaten atar.
            return sampleEmote(c, a.repeat > 1 ? elapsed % EMOTES[a.name].duration : elapsed);
        },

        animating(now) {
            for (const id of [...running.keys()]) if (live(id, now)) return true;
            return false;
        },

        subscribe(listener) {
            listeners.add(listener);
            return () => { listeners.delete(listener); };
        },

        clear() {
            running.clear();
        },
    };
}
