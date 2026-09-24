/**
 * DOSYA AMACI: Sayfadaki BÜTÜN `MascotView`'ların paylaştığı tek saat.
 *
 * NEDEN tek saat: menüde aynı anda birkaç maskot olabilir; her birinin kendi
 * `requestAnimationFrame` döngüsü boşuna uyanma demek. Burada her abone her
 * turda ne istediğini söyler:
 *   - `fast`  → bir ifade oynuyor: bir sonraki kare RAF ile
 *   - `slow`  → yalnızca boşta davranış (kırpma, bakınma, neon nabzı): 100 ms'de bir
 *               (kırpmanın kapalı penceresi ~145 ms, en az bir örnek düşer)
 *   - `sleep` → değişecek bir şey yok
 * Kimse istemiyorsa saat DURUR; `wakeMascotTicker` (ör. ifade tetiklendi) yeniden başlatır.
 */

export type TickDemand = 'fast' | 'slow' | 'sleep';
export type TickFn = (now: number) => TickDemand;

const SLOW_MS = 100;

const subscribers = new Set<TickFn>();
let raf = 0;
let timer: ReturnType<typeof setTimeout> | null = null;

function cancel(): void {
    if (raf) cancelAnimationFrame(raf);
    if (timer) clearTimeout(timer);
    raf = 0;
    timer = null;
}

function run(now: number): void {
    raf = 0;
    timer = null;
    let fast = false;
    let slow = false;
    for (const fn of [...subscribers]) {
        const demand = fn(now);
        if (demand === 'fast') fast = true;
        else if (demand === 'slow') slow = true;
    }
    if (fast) raf = requestAnimationFrame(run);
    else if (slow) timer = setTimeout(() => run(performance.now()), SLOW_MS);
}

/** Bir sonraki karede bütün aboneleri çalıştırır (bekleyen yavaş turu öne alır). */
export function wakeMascotTicker(): void {
    if (raf) return;
    if (timer) { clearTimeout(timer); timer = null; }
    raf = requestAnimationFrame(run);
}

export function subscribeMascotTicker(fn: TickFn): () => void {
    subscribers.add(fn);
    wakeMascotTicker();
    return () => {
        subscribers.delete(fn);
        if (subscribers.size === 0) cancel();
    };
}
