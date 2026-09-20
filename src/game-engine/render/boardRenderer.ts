/**
 * DOSYA AMACI: Oynanış tahtasının DOM mu canvas mı çizileceğini belirleyen geçiş
 * bayrağı.
 *
 * NEDEN: Canvas yolu DOM yolunun YANINA kuruluyor, yerine değil (00-ilkeler §9).
 * Bu bayrak sayesinde her faz sonunda oyun oynanabilir durumda kalır; yarım
 * kalmış bir canvas yolu kimseyi engellemez. Varsayılan `'dom'`; Faz 08 ölçümden
 * sonra varsayılanı `'canvas'`'a çevirir.
 *
 * NEDEN `src/lib` altında değil: `motionTier` hem menüyü hem tahtayı ilgilendiriyor,
 * bu bayrak ise yalnızca oyun motorunu. Desen `src/lib/motionTier.ts` ile birebir
 * aynıdır: anahtar sabiti + override yazıcısı + tespit + mount sonrası okuyan hook.
 */

import { useEffect, useState } from 'react';
import { userStorageGet, userStorageSet } from '@/lib/userStorage';

/** Otomatik varsayılanı geçersiz kılan tercih anahtarı. */
export const BOARD_RENDERER_KEY = 'boardRenderer';

export type BoardRenderer = 'dom' | 'canvas';

/** Çiziciyi sabitler; `null` varsayılana döner. */
export function setBoardRendererOverride(r: BoardRenderer | null): void {
    userStorageSet(BOARD_RENDERER_KEY, r ?? '');
}

/**
 * Kullanılacak çiziciyi döndürür. SSR'da (window yokken) `'dom'` döner; gerçek
 * okuma mount sonrası `useBoardRenderer` ile yapılır, böylece sunucu ve istemci
 * ilk render'ı ayrışmaz.
 */
export function detectBoardRenderer(): BoardRenderer {
    if (typeof window === 'undefined') return 'dom';

    const override = userStorageGet(BOARD_RENDERER_KEY);
    if (override === 'canvas' || override === 'dom') return override;

    return 'dom';
}

/**
 * Çiziciyi mount sonrası okur. SSR ile istemci ilk render'ının ayrışmaması için
 * ilk değer daima `'dom'`'dur.
 */
export function useBoardRenderer(): BoardRenderer {
    const [renderer, setRenderer] = useState<BoardRenderer>('dom');

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRenderer(detectBoardRenderer());
    }, []);

    return renderer;
}
