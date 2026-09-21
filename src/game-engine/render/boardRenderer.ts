/**
 * DOSYA AMACI: Oynanış tahtasının DOM mu canvas mı çizileceğini belirleyen geçiş
 * bayrağı, cihaz kuralı ve ayar/otomatik-geçiş anahtarları.
 *
 * NEDEN: Canvas yolu DOM yolunun YANINA kuruluyor, yerine değil (00-ilkeler §9).
 * Karar sırası (Faz 09 §2.4 + Faz 11 §3.3):
 *   1. `boardRenderer` = 'dom' | 'canvas' (kullanıcı, ayarlar) → o kazanır.
 *   2. `boardRendererAuto` = 'canvas' (kasma dedektörü yazar) → 'canvas'.
 *   3. Cihaz kuralı: DOM yalnızca cihazın güçlü olduğuna dair OLUMLU kanıt varsa;
 *      belirsizlikte canvas. Kasmama garantisi görüntü sadakatinden önce gelir.
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

/** Kasma dedektörünün kararı; yalnızca `'canvas'` yazılır. */
export const BOARD_RENDERER_AUTO_KEY = 'boardRendererAuto';
/** Ayar veya otomatik karar değişince `window`a yayılır (açık ekranlar anında uyar). */
export const BOARD_RENDERER_EVENT = 'syncron:board-renderer';

export type BoardRenderer = 'dom' | 'canvas';
export type BoardRendererSetting = 'auto' | BoardRenderer;

/** Cihaz kuralının girdisi; `undefined` = tarayıcı değeri vermiyor. */
export interface DeviceSignals {
    isNative: boolean;
    /** Birincil işaretleyici parmak mı (bilinmiyorsa `true`). */
    coarsePointer: boolean;
    cores: number | undefined;
    memoryGb: number | undefined;
    isLiteTier: boolean;
}

/** Faz 09 §2.4: hepsi doğruysa güçlü; herhangi biri eksik/yanlışsa değil. */
export function isDeviceStrong(d: DeviceSignals): boolean {
    return !d.isNative
        && !d.coarsePointer
        && d.cores !== undefined && d.cores > 4
        && d.memoryGb !== undefined && d.memoryGb > 4
        && !d.isLiteTier;
}

export interface RendererInputs {
    setting: BoardRendererSetting;
    autoCanvas: boolean;
    device: DeviceSignals;
}

/** Karar sırasının saf hâli (test edilir). */
export function resolveBoardRenderer({ setting, autoCanvas, device }: RendererInputs): BoardRenderer {
    if (setting !== 'auto') return setting;
    if (autoCanvas) return 'canvas';
    return isDeviceStrong(device) ? 'dom' : 'canvas';
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

/** Kasma dedektörünün kararı: o cihazda bir daha çalışmaz. Kullanıcı seçimine dokunmaz. */
export function markBoardRendererAutoCanvas(): void {
    userStorageSet(BOARD_RENDERER_AUTO_KEY, 'canvas');
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
        autoCanvas: userStorageGet(BOARD_RENDERER_AUTO_KEY) === 'canvas',
        device: readDeviceSignals(),
    });
}

interface Decision {
    renderer: BoardRenderer;
    /** Ayar Otomatik ve karar DOM: kasma dedektörü çalışabilir. */
    jankGuard: boolean;
}

function decide(): Decision {
    const renderer = detectBoardRenderer();
    return { renderer, jankGuard: renderer === 'dom' && readBoardRendererSetting() === 'auto' };
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

    // Dedektör yalnızca DOM çiziliyorken ve karar hâlâ DOM iken çalışır.
    return { renderer: shown, jankGuard: !!wanted?.jankGuard && shown === 'dom' };
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
