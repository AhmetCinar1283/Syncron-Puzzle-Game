/**
 * DOSYA AMACI: DOM tahtada (dom/hybrid) kasmayı oyun sırasında yakalayan dedektör. Güçlü
 * görünen ama DOM'da kasan cihazı (8 çekirdek, zayıf GPU) bulur; karar verirse
 * `onDecision` çağrılır ve dedektör durur (Faz 11 §3.1).
 *
 * YALNIZCA DOM + OTOMATİK + OYUN EKRANI: kurma kararı `useJankGuard`'da. Canvas
 * modunda hiç kurulmaz.
 *
 * ÖLÇÜM: `requestAnimationFrame` damgaları arasındaki farklar; RAF döngüsü
 * YALNIZCA örnekleme pencerelerinde çalışır, sürekli değil. Pencereler:
 *   - `move`: oyuncu hareketi sürerken (kısa hareketler birikir, ≥ MIN_FRAMES
 *     olunca değerlendirilir; tek hareket ~6 kare eder),
 *   - `victory`: zafer koreografisi boyunca,
 *   - boşta: açılıştan SETTLE_MS sonra başlayan IDLE_WINDOW_MS'lik pencere.
 *
 * YANLIŞ ALARM KAYNAKLARI: açılıştan sonraki ilk SETTLE_MS (yükleme, GC; PlayScreen
 * seviye başına yeniden kurulduğu için seviye değişimini de kapsar), sekme
 * görünmezken geçen süre, tek bir OUTLIER_MS+ kare.
 */

/** Bir kare bu süreyi aşarsa "kasan" sayılır (60Hz'de 16,7 ms; ~40fps altı). */
export const JANK_FRAME_MS = 25;
/** Pencere ancak bu kadar kare örneklenmişse değerlendirilir. */
export const MIN_FRAMES = 30;
/** Karelerin bu oranı (≥) JANK_FRAME_MS'yi aşarsa pencere kötüdür. */
export const JANK_RATIO = 0.2;
/** Penceredeki TEK böyle kare yok sayılır (GC, bildirim); ikincisi sayılır. */
export const OUTLIER_MS = 100;
/** Bundan uzun aralık kasma değil askıya alınmadır (sekme/uygulama arka planı). */
export const SUSPEND_GAP_MS = 1000;
/** Art arda bu kadar kötü pencere → geçiş kararı. */
export const BAD_WINDOWS_TO_SWITCH = 2;
/** Açılıştan sonra örneklenmeyen süre. */
export const SETTLE_MS = 1000;
/** Boşta pencerenin uzunluğu. */
export const IDLE_WINDOW_MS = 3000;

/** Askıya alma aralıkları ve TEK aykırı kare çıkarılmış örnek. Saf. */
export function sampleOf(deltas: readonly number[]): number[] {
    const frames = deltas.filter(d => d < SUSPEND_GAP_MS);
    const outliers = frames.filter(d => d >= OUTLIER_MS).length;
    return outliers === 1 ? frames.filter(d => d < OUTLIER_MS) : frames;
}

/** Kare aralıklarından (ms) tek pencerenin kötü olup olmadığı. Saf. */
export function isBadWindow(deltas: readonly number[]): boolean {
    const sample = sampleOf(deltas);
    if (sample.length < MIN_FRAMES) return false;
    const slow = sample.filter(d => d > JANK_FRAME_MS).length;
    return slow / sample.length >= JANK_RATIO;
}

/** Pencere sonuçlarını sayar; art arda `required` kötü pencerede `true` döner. Saf. */
export function createBadStreak(required: number = BAD_WINDOWS_TO_SWITCH): (bad: boolean) => boolean {
    let streak = 0;
    return bad => {
        streak = bad ? streak + 1 : 0;
        return streak >= required;
    };
}

/** GameBoard'un bildirdiği oynatma evresi. */
export type JankPhase = 'idle' | 'move' | 'victory';

export interface JankMonitor {
    setPhase(phase: JankPhase): void;
    dispose(): void;
}

/** Karar: `victory` = yalnızca zafer kasıyor (oyun akışı sağlam), `move` = oyun akışı kasıyor. */
export type JankVerdict = 'victory' | 'move';
type JankKind = 'move' | 'victory' | 'idle';

interface JankMonitorOptions {
    onDecision: (verdict: JankVerdict) => void;
    /**
     * `false`: zafer penceresi örneklenmez ve değerlendirilmez. Zaferi canvas
     * çizdiği (dengeli mod) yolda DOM'un zafer maliyeti ölçüm konusu değildir.
     */
    watchVictory?: boolean;
}

export function createJankMonitor({ onDecision, watchVictory = true }: JankMonitorOptions): JankMonitor {
    const record = createBadStreak();
    // Seriyi oluşturan kötü pencerelerin türleri: karar, oyun akışı da bozuk mu
    // yoksa yalnızca zafer mi kasıyor sorusunu buradan yanıtlar.
    let badKinds: JankKind[] = [];
    const startedAt = performance.now();
    const buckets: Record<'move' | 'victory' | 'idle', number[]> = { move: [], victory: [], idle: [] };

    let phase: JankPhase = 'idle';
    let idleOpen = false;
    let idleDone = false;
    let raf = 0;
    let last: number | null = null;
    let disposed = false;
    let idleStartTimer: ReturnType<typeof setTimeout> | null = null;
    let idleEndTimer: ReturnType<typeof setTimeout> | null = null;

    const activeBucket = (): 'move' | 'victory' | 'idle' | null =>
        phase === 'move' ? 'move' : phase === 'victory' ? (watchVictory ? 'victory' : null) : idleOpen ? 'idle' : null;

    /** `carry`: kare azsa örnek atılmaz, sonraki segmente birikir (yalnızca hareket). */
    const judge = (kind: 'move' | 'victory' | 'idle', carry: boolean) => {
        const deltas = buckets[kind];
        if (sampleOf(deltas).length < MIN_FRAMES) {
            // Yetersiz örnek pencere değildir: seriyi ne artırır ne sıfırlar.
            if (!carry) buckets[kind] = [];
            return;
        }
        buckets[kind] = [];
        const bad = isBadWindow(deltas);
        badKinds = bad ? [...badKinds, kind].slice(-BAD_WINDOWS_TO_SWITCH) : [];
        if (record(bad) && !disposed) {
            dispose();
            // Yalnızca zafer pencereleri kötüyse karar 'victory', biri bile
            // hareket/boşta ise 'move': oyun akışının kendisi kasıyor.
            onDecision(badKinds.every(k => k === 'victory') ? 'victory' : 'move');
        }
    };

    const tick = (ts: number) => {
        raf = 0;
        if (disposed) return;
        const kind = activeBucket();
        if (!kind) { last = null; return; }
        if (ts - startedAt >= SETTLE_MS && last !== null) buckets[kind].push(ts - last);
        last = ts;
        raf = requestAnimationFrame(tick);
    };

    const sync = () => {
        if (disposed) return;
        if (activeBucket() && !raf && document.visibilityState === 'visible') {
            last = null;
            raf = requestAnimationFrame(tick);
        }
    };

    const openIdle = () => {
        idleStartTimer = null;
        if (disposed || phase !== 'idle' || idleDone) return;
        idleOpen = true;
        sync();
        idleEndTimer = setTimeout(() => {
            idleEndTimer = null;
            idleOpen = false;
            idleDone = true;
            judge('idle', false);
        }, IDLE_WINDOW_MS);
    };
    idleStartTimer = setTimeout(openIdle, SETTLE_MS);

    /** Sekme görünmez olunca açık pencere geçersiz: arka plandaki süre örneği bozar. */
    const onVisibility = () => {
        last = null;
        if (document.visibilityState !== 'visible') {
            if (raf) cancelAnimationFrame(raf);
            raf = 0;
            buckets.idle = [];
            buckets.move = [];
            buckets.victory = [];
        } else {
            sync();
        }
    };
    document.addEventListener('visibilitychange', onVisibility);

    function dispose() {
        if (disposed) return;
        disposed = true;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
        if (idleStartTimer) clearTimeout(idleStartTimer);
        if (idleEndTimer) clearTimeout(idleEndTimer);
        document.removeEventListener('visibilitychange', onVisibility);
    }

    return {
        setPhase(next) {
            if (disposed || next === phase) return;
            const previous = phase;
            phase = next;
            last = null;
            if (next !== 'idle' && idleOpen) {
                // Hareket başladı: boşta pencere karışık olurdu, atılır (yeniden açılmaz).
                idleOpen = false;
                idleDone = true;
                buckets.idle = [];
                if (idleEndTimer) clearTimeout(idleEndTimer);
                idleEndTimer = null;
            }
            if (next !== 'idle') idleDone = true;
            if (previous === 'victory') judge('victory', false);
            else if (previous === 'move') judge('move', true);
            sync();
        },
        dispose,
    };
}
