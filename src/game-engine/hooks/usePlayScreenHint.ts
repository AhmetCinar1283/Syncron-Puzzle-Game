'use client';

/**
 * DOSYA AMACI: PlayScreen'in ipucu bağlantısı: ipucu isteğini dışarı iletir,
 * aktif ipucunun görünürlüğünü ve HUD'da hangi butonun vurgulanacağını hesaplar.
 * İpucunun nasıl hesaplandığını (sunucu) ve kazanıldığını (reklam vb.) bilmez.
 */
import { useCallback } from 'react';
import type { ReactNode } from 'react';
import type { ActiveHint } from '../hint';

/** PlayScreen'e dışarıdan verilen ipucu desteği (yalnızca oyuncu modu). */
export interface PlayScreenHint {
    /** Gösterilecek ipucu; `null` → işaret yok. */
    active: ActiveHint | null;
    /** İpucu hazırlanıyor (sunucu / reklam). */
    busy: boolean;
    disabled?: boolean;
    /** İpucu kartı açık: oyun girdisi kilitlenir (ipucu tam o durum için hesaplanır). */
    inputLocked?: boolean;
    /** HUD butonundaki küçük rozet. */
    badge?: ReactNode;
    /** Oyuncu ipucu istedi. */
    onRequest: () => void;
}

interface UsePlayScreenHintArgs {
    hint: PlayScreenHint | undefined;
    isAnimating: boolean;
    isGameOver: boolean;
}

export function usePlayScreenHint({ hint, isAnimating, isGameOver }: UsePlayScreenHintArgs) {
    const onRequest = hint?.onRequest;
    const blocked = !hint || hint.busy || !!hint.disabled || isAnimating || isGameOver;

    const requestHint = useCallback(() => {
        if (!blocked) onRequest?.();
    }, [blocked, onRequest]);

    const visibleHint = hint?.active && !isAnimating ? hint.active : null;
    const hudHighlight: 'undo' | 'restart' | null =
        visibleHint?.phase === 'undo' ? 'undo' : visibleHint?.phase === 'restart' ? 'restart' : null;

    return { requestHint, visibleHint, hudHighlight };
}
