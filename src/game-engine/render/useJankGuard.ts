/**
 * DOSYA AMACI: Kasma dedektörünü (`jankMonitor.ts`) React'e bağlar. `enabled`
 * (DOM çiziliyor + ayar Otomatik) iken bir dedektör kurar; kararı `boardRendererAuto`
 * anahtarına yazar. Kapalıyken `undefined` döner: çağıran evre bildirmez, RAF yok.
 *
 * Yazılan karar `boardRenderer.ts`'in değişim olayını tetikler; `useBoardRenderer`
 * onu güvenli anda (hareket bitince) uygular. Bu hook geçişin kendisini yapmaz.
 */

'use client';

import { useCallback, useEffect, useRef } from 'react';
import { markBoardRendererAutoCanvas } from './boardRenderer';
import { createJankMonitor, type JankMonitor, type JankPhase } from './jankMonitor';

export function useJankGuard(enabled: boolean): ((phase: JankPhase) => void) | undefined {
    const monitorRef = useRef<JankMonitor | null>(null);

    useEffect(() => {
        if (!enabled) return;
        const monitor = createJankMonitor({ onDecision: markBoardRendererAutoCanvas });
        monitorRef.current = monitor;
        return () => {
            monitor.dispose();
            monitorRef.current = null;
        };
    }, [enabled]);

    const reportPhase = useCallback((phase: JankPhase) => monitorRef.current?.setPhase(phase), []);
    return enabled ? reportPhase : undefined;
}
