/**
 * DOSYA AMACI: Oynanış tahtasının nasıl çizileceğini belirleyen geçiş bayrağı,
 * cihaz kuralı ve ayar/otomatik-geçiş anahtarları.
 *
 * ÜÇ ÇİZİM SEVİYESİ (kaliteden akıcılığa):
 *   - `dom`    : tahta ve zafer animasyonu DOM.
 *   - `hybrid` : tahta DOM, yalnızca zafer animasyonu canvas. DOM yolunun asıl
 *                kasma kaynağı zafer koreografisiydi (36 parçacık, iki şok
 *                dalgası, hayalet izler, blur/drop-shadow); oyun sırasındaki
 *                hareket DOM'da sorunsuz.
 *   - `canvas` : tahta ve zafer canvas.
 *
 * NEDEN: Canvas yolu DOM yolunun YANINA kuruluyor, yerine değil (00-ilkeler §9).
 * Karar sırası (Faz 09 §2.4 + Faz 11 §3.3):
 *   1. `graphics.renderer` = 'dom' | 'hybrid' | 'canvas' (kullanıcı) → o kazanır.
 *   2. Otomatik: cihaz kuralının verdiği seviye, `boardRendererAuto` ile
 *      (kasma dedektörünün yazdığı ÜST SINIR) sınırlanır; ikisinden düşük olan.
 *   3. Cihaz kuralı (`classifyDevice`): kasmama garantisi görüntü sadakatinden
 *      önce gelir; bir seviyeye çıkmak için OLUMLU kanıt gerekir.
 *
 * DEDEKTÖR MERDİVENİ: dom → (yalnızca zafer kasıyorsa) hybrid → (oyun akışı
 * kasıyorsa) canvas. Dedektör seviyeyi yalnızca AŞAĞI çeker, hiç yükseltmez.
 *
 * İKİ ANAHTAR AYRI: dedektör kullanıcının seçimini asla ezmez. Kullanıcı ayarı
 * "Otomatik"e alırsa ikisi de silinir (dedektöre yeniden şans).
 *
 * `motionTier.ts`'teki `?? 8` varsayımı bu karar için KULLANILMAZ: `deviceMemory`
 * Firefox/Safari'de yok, eksik değer "güçlü" sayılırdı. Ham `navigator` burada
 * okunur; `detectMotionTier()` yalnızca `lite` kontrolü için çağrılır.
 */

import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { userStorageGet, userStorageRemove, userStorageSet } from '@/lib/userStorage';
import { settingsService } from '@/services/settings';
import { detectMotionTier } from '@/lib/motionTier';

/** Kasma dedektörünün yazdığı üst sınır: `'hybrid'` veya `'canvas'` (eski kayıtlar yalnızca `'canvas'`). */
export const BOARD_RENDERER_AUTO_KEY = 'boardRendererAuto';
/** Ayar veya otomatik karar değişince `window`a yayılır (açık ekranlar anında uyar). */
export const BOARD_RENDERER_EVENT = 'syncron:board-renderer';

export type BoardRenderer = 'dom' | 'hybrid' | 'canvas';
export type BoardRendererSetting = 'auto' | BoardRenderer;
/** Dedektörün yazabileceği üst sınırlar; `null` = sınır yok. */
export type AutoCap = 'hybrid' | 'canvas' | null;

/** Kaliteden akıcılığa sıra: küçük indeks = daha kaliteli. */
const LEVELS: readonly BoardRenderer[] = ['dom', 'hybrid', 'canvas'];

/** İki seviyeden akıcı olanı (sıradaki büyük indeks). */
function lower(a: BoardRenderer, b: BoardRenderer): BoardRenderer {
    return LEVELS.indexOf(a) >= LEVELS.indexOf(b) ? a : b;
}

/** Cihaz kuralının girdisi; `undefined` = tarayıcı değeri vermiyor. */
export interface DeviceSignals {
    isNative: boolean;
    /** Birincil işaretleyici parmak mı (bilinmiyorsa `true`). */
    coarsePointer: boolean;
    cores: number | undefined;
    memoryGb: number | undefined;
    isLiteTier: boolean;
}

/** Faz 09 §2.4: hepsi doğruysa güçlü (tam DOM); herhangi biri eksik/yanlışsa değil. */
export function isDeviceStrong(d: DeviceSignals): boolean {
    return !d.isNative
        && !d.coarsePointer
        && d.cores !== undefined && d.cores > 4
        && d.memoryGb !== undefined && d.memoryGb > 4
        && !d.isLiteTier;
}

/**
 * Dengeli seviye (DOM tahta + canvas zafer) için olumlu kanıt. Oyun sırasındaki
 * DOM hareketi orta sınıf cihazda da akıcı; bu yüzden eşik `isDeviceStrong`dan
 * gevşek, ama yine kanıt ister:
 *   - masaüstü/dizüstü (ince işaretleyici, yerel değil): çekirdek > 4; RAM
 *     bilinmiyorsa (Firefox/Safari) engel değil, biliniyorsa > 4 olmalı;
 *   - dokunmatik veya yerel uygulama (WebView): hem çekirdek > 4 hem RAM > 4
 *     AÇIKÇA bildirilmiş olmalı. Aynı çekirdek sayısı telefonlarda çok farklı
 *     GPU'larla gelir; RAM bilinmiyorsa (iOS Safari) canvas.
 * Yanlış tahmini dedektör düzeltir (dom/hybrid → canvas).
 */
export function isDeviceCapable(d: DeviceSignals): boolean {
    if (d.isLiteTier) return false;
    if (d.cores === undefined || d.cores <= 4) return false;
    if (d.isNative || d.coarsePointer) return d.memoryGb !== undefined && d.memoryGb > 4;
    return d.memoryGb === undefined || d.memoryGb > 4;
}

/** Cihaz kuralının Otomatik'te başlangıç seviyesi (dedektörden ÖNCE). */
export function classifyDevice(d: DeviceSignals): BoardRenderer {
    if (isDeviceStrong(d)) return 'dom';
    return isDeviceCapable(d) ? 'hybrid' : 'canvas';
}

export interface RendererInputs {
    setting: BoardRendererSetting;
    /** Kasma dedektörünün yazdığı üst sınır. */
    autoCap: AutoCap;
    device: DeviceSignals;
}

/** Karar sırasının saf hâli (test edilir). */
export function resolveBoardRenderer({ setting, autoCap, device }: RendererInputs): BoardRenderer {
    if (setting !== 'auto') return setting;
    const byDevice = classifyDevice(device);
    return autoCap ? lower(byDevice, autoCap) : byDevice;
}

interface DeviceNavigator extends Navigator {
    deviceMemory?: number;
}

function readDeviceSignals(): DeviceSignals {
    const nav = navigator as DeviceNavigator;
    const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
    let coarsePointer = true;
    try {
        const query = window.matchMedia?.('(pointer: coarse)');
        if (query) coarsePointer = query.matches;
    } catch {
        // matchMedia okunamıyorsa belirsizlik: canvas.
    }
    return {
        isNative: !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()),
        coarsePointer,
        cores: nav.hardwareConcurrency,
        memoryGb: nav.deviceMemory,
        isLiteTier: detectMotionTier() === 'lite',
    };
}

/** Kullanıcının seçimi: birleşik ayar sisteminden (`graphics.renderer`) okunur. */
export function readBoardRendererSetting(): BoardRendererSetting {
    return settingsService.getSettings().graphics.renderer;
}

function notifyChange(): void {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(BOARD_RENDERER_EVENT));
}

/**
 * Kullanıcı seçimi. Ayara yazar; `'auto'` seçilince dedektör kararı da silinir
 * (dedektör yeniden dener). Olay yayını aşağıdaki ayar aboneliğinden gelir, böylece
 * ayar hangi yoldan değişirse değişsin (sıfırlama dahil) açık ekranlar uyarılır.
 */
export function setBoardRendererSetting(setting: BoardRendererSetting): void {
    settingsService.updateSettings({ graphics: { renderer: setting } });
}

let lastSyncedSetting: BoardRendererSetting | null = null;

/** Ayarlardaki çizici tercihi değişince dedektör kararını temizler ve olayı yayar. */
function onSettingsChanged(): void {
    const next = readBoardRendererSetting();
    if (lastSyncedSetting === null) {
        lastSyncedSetting = next;
        return;
    }
    if (next === lastSyncedSetting) return;
    lastSyncedSetting = next;
    if (next === 'auto') userStorageRemove(BOARD_RENDERER_AUTO_KEY);
    notifyChange();
}

if (typeof window !== 'undefined') {
    onSettingsChanged();
    settingsService.subscribe(onSettingsChanged);
}

function readAutoCap(): AutoCap {
    const stored = userStorageGet(BOARD_RENDERER_AUTO_KEY);
    return stored === 'hybrid' || stored === 'canvas' ? stored : null;
}

/**
 * Kasma dedektörünün kararı: üst sınırı verilen seviyeye indirir; o cihazda
 * seviyeyi hiç yükseltmez ve kullanıcı seçimine dokunmaz. Zaten daha düşük bir
 * sınır kayıtlıysa (ör. `canvas`) onu `hybrid` ile YUKARI çekmez.
 */
export function markBoardRendererAutoCap(cap: 'hybrid' | 'canvas'): void {
    if (readAutoCap() === 'canvas') return;
    userStorageSet(BOARD_RENDERER_AUTO_KEY, cap);
    notifyChange();
}

/**
 * Kullanılacak çiziciyi döndürür. SSR'da (window yokken) belirsizlik olduğundan
 * `'canvas'`; ama tahta sunucuda hiç çizilmez (`useBoardRenderer` ilk değeri `null`).
 */
export function detectBoardRenderer(): BoardRenderer {
    if (typeof window === 'undefined') return 'canvas';
    return resolveBoardRenderer({
        setting: readBoardRendererSetting(),
        autoCap: readAutoCap(),
        device: readDeviceSignals(),
    });
}

interface Decision {
    renderer: BoardRenderer;
    /** Ayar Otomatik ve karar canvas değil: kasma dedektörü çalışabilir. */
    jankGuard: boolean;
}

function decide(): Decision {
    const renderer = detectBoardRenderer();
    return { renderer, jankGuard: renderer !== 'canvas' && readBoardRendererSetting() === 'auto' };
}

/**
 * Tahtanın ÇİZİLEN çizicisi. İlk değer `null`: karar `window` ister ve yanlış
 * tahta bir kare bile çakmamalı; `BoardArea` `null` iken hiçbir tahta çizmez.
 * Karar boyamadan önce (`useLayoutEffect`) verilir.
 *
 * Sonradan değişen karar (ayar, dedektör) yalnızca `isSafe` iken uygulanır:
 * hareket ortasında çizici değişirse kare oynatma sıfırlanıp sıçrama üretir
 * (Faz 11 §3.2). `isSafe` false iken karar bekler, güvenli ana ertelenir.
 */
export function useBoardRenderer(isSafe: boolean): { renderer: BoardRenderer | null; jankGuard: boolean } {
    const [wanted, setWanted] = useState<Decision | null>(null);
    const [shown, setShown] = useState<BoardRenderer | null>(null);

    useLayoutEffect(() => {
        const sync = () => setWanted(decide());
        sync();
        window.addEventListener(BOARD_RENDERER_EVENT, sync);
        return () => window.removeEventListener(BOARD_RENDERER_EVENT, sync);
    }, []);

    // Karar yalnızca ilk çizimde veya güvenli anda uygulanır (render sırasında
    // setState: `useFilmPlayback`taki desenle aynı, efekt kaskadı yok).
    if (wanted && shown !== wanted.renderer && (shown === null || isSafe)) setShown(wanted.renderer);

    // Dedektör yalnızca tahta DOM çiziliyorken (dom/hybrid) ve karar hâlâ canvas değilken çalışır.
    return { renderer: shown, jankGuard: !!wanted?.jankGuard && (shown === 'dom' || shown === 'hybrid') };
}

/** Ayarlar ekranı için: kullanıcının seçimi + değiştirici; başka ekranlardaki değişimi de izler. */
export function useBoardRendererSetting(): [BoardRendererSetting, (s: BoardRendererSetting) => void] {
    const [setting, setSetting] = useState<BoardRendererSetting>('auto');

    useEffect(() => {
        const sync = () => setSetting(readBoardRendererSetting());
        sync();
        window.addEventListener(BOARD_RENDERER_EVENT, sync);
        return () => window.removeEventListener(BOARD_RENDERER_EVENT, sync);
    }, []);

    const choose = useCallback((next: BoardRendererSetting) => setBoardRendererSetting(next), []);
    return [setting, choose];
}
