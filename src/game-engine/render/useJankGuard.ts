/**
 * DOSYA AMACI: Kasma dedektörünü (`jankMonitor.ts`) React'e bağlar. `enabled`
 * (tahta DOM çiziliyor + ayar Otomatik) iken bir dedektör kurar; kararı
 * `boardRendererAuto` anahtarına üst sınır olarak yazar. Kapalıyken `undefined`
 * döner: çağıran evre bildirmez, RAF yok.
 *
 * Merdiven: tam DOM'da yalnızca zafer kasıyorsa `hybrid`, oyun akışı kasıyorsa
 * `canvas`; `hybrid`'de zafer zaten canvas olduğundan yalnızca oyun akışı
 * ölçülür ve karar `canvas` olur.
 *
 * Yazılan karar `boardRenderer.ts`'in değişim olayını tetikler; `useBoardRenderer`
 * onu güvenli anda (hareket bitince) uygular. Bu hook geçişin kendisini yapmaz.
 */

'use client';

import { useCallback, useEffect, useRef } from 'react';
import { markBoardRendererAutoCap, type BoardRenderer } from './boardRenderer';
import { createJankMonitor, type JankMonitor, type JankPhase, type JankVerdict } from './jankMonitor';

/** Tam DOM'da yalnızca zafer kasıyorsa bir alt seviye (hybrid), aksi hâlde canvas. */
export function capForVerdict(level: BoardRenderer, verdict: JankVerdict): 'hybrid' | 'canvas' {
    return level === 'dom' && verdict === 'victory' ? 'hybrid' : 'canvas';
}

export function useJankGuard(enabled: boolean, level: BoardRenderer | null): ((phase: JankPhase) => void) | undefined {
    const monitorRef = useRef<JankMonitor | null>(null);

    useEffect(() => {
        if (!enabled || !level) return;
        const monitor = createJankMonitor({
            onDecision: verdict => markBoardRendererAutoCap(capForVerdict(level, verdict)),
            watchVictory: level === 'dom',
        });
        monitorRef.current = monitor;
        return () => {
            monitor.dispose();
            monitorRef.current = null;
        };
    }, [enabled, level]);

    const reportPhase = useCallback((phase: JankPhase) => monitorRef.current?.setPhase(phase), []);
    return enabled ? reportPhase : undefined;
}
