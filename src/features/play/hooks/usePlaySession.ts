'use client';

import { useCallback, useRef } from 'react';
import type { Direction } from '@/game-engine/logic/types';
import { sendTelemetry } from '@/services/api/gameClient';
import type { LevelSession } from '../lib/types';
import {
    DIRECTION_TO_MOVE,
    SWITCH_ROOM_MOVE,
    clearActiveSession,
    generateUUID,
    persistActiveSession,
} from '../lib/session';

/**
 * Oyun izleme + telemetri oturumu: hamle geçmişi, süre sayacı, restart/death sayaçları.
 *
 * Tamamı ref tabanlı (state değil) — önceki page.tsx ile aynı: bu değerler render
 * tetiklememeli, sadece worker/telemetri çağrılarında okunur. Dönen tüm callback'ler
 * boş deps ile stabil, bu yüzden tüketen effect/callback'lerin deps listeleri değişmez.
 *
 * `sessionRef.current === null` → seviyenin firestoreId'si yok (kullanıcı seviyesi):
 * telemetri ve localStorage oturumu tamamen atlanır.
 */
export function usePlaySession() {
    const moveHistoryRef = useRef<string[]>([]); // 'u' | 'd' | 'l' | 'r' | 's'
    // Önceden useRef(Date.now()) idi (render'da impure çağrı). Başlangıç değeri hiç
    // okunmuyor: useLevelLoader effect'i mount'ta onBeforeLoad → resetTracking ile
    // Date.now() yazıyor ve PlayScreen/kazanma akışı ancak yükleme bittikten sonra var.
    const startTimeRef = useRef(0);
    const sessionRef = useRef<LevelSession | null>(null);
    /**
     * Yüklenen level için gösterilen ipucu sayısı. Oturumdan (sessionRef) ayrı tutulur
     * çünkü kullanıcı seviyelerinde oturum yoktur ama kazanma akışı yine okur.
     */
    const hintsUsedRef = useRef(0);

    /** Yeni yükleme / restart: hamle geçmişi ve süre sayacı sıfırlanır. */
    const resetTracking = useCallback(() => {
        moveHistoryRef.current = [];
        startTimeRef.current = Date.now();
    }, []);

    /** Seviye yüklendiğinde çağrılır; firestoreId yoksa oturum null olur. */
    const beginSession = useCallback((firestoreId: string | undefined, version: number) => {
        hintsUsedRef.current = 0;
        if (firestoreId) {
            sessionRef.current = {
                id: generateUUID(),
                startTime: Date.now(),
                restarts: 0,
                deaths: 0,
                hintsUsed: 0,
                levelId: firestoreId,
                version,
            };
            persistActiveSession(sessionRef.current);
        } else {
            sessionRef.current = null;
        }
    }, []);

    const submitTelemetry = useCallback(async (outcome: 'win' | 'restart' | 'quit' | 'skip') => {
        if (!sessionRef.current || !sessionRef.current.levelId) return;
        const currentSession = sessionRef.current;
        const timeSpent = Math.round((Date.now() - currentSession.startTime) / 1000);
        const movesCount = moveHistoryRef.current.length;

        // Clear active session from localStorage
        clearActiveSession();

        await sendTelemetry({
            id: currentSession.id,
            levelId: currentSession.levelId!,
            version: currentSession.version,
            outcome,
            timeSpent,
            restarts: currentSession.restarts,
            deaths: currentSession.deaths,
            movesCount,
            hintsUsed: currentSession.hintsUsed,
        });
    }, []);

    const handleMoveExecuted = useCallback((direction: Direction | 'switch_room') => {
        if (direction === 'switch_room') {
            moveHistoryRef.current.push(SWITCH_ROOM_MOVE);
        } else {
            moveHistoryRef.current.push(DIRECTION_TO_MOVE[direction]);
        }

        // Update lastActiveTime in active session
        if (sessionRef.current) {
            persistActiveSession(sessionRef.current);
        }
    }, []);

    /**
     * Motorun "geri al"ı son YÖN hamlesinden önceki durumu geri yükler; oda seçimi de
     * o anki hâline döner. Oda değiştirme motor geçmişine ayrı kayıt açmadığı için
     * son yön hamlesinden sonraki oda değiştirmeler de geri alınmış olur — hamle
     * geçmişi motorla aynı kalsın diye onlar da düşülür (sunucu bu geçmişi oynatır).
     */
    const handleUndoExecuted = useCallback(() => {
        const history = moveHistoryRef.current;
        while (history.length > 0 && history[history.length - 1] === SWITCH_ROOM_MOVE) history.pop();
        history.pop();
    }, []);

    /** Restart butonu: ölümse deaths, değilse restarts artar; sonra izleme sıfırlanır. */
    const recordRestart = useCallback((isDeath: boolean | undefined) => {
        if (sessionRef.current) {
            if (isDeath) {
                sessionRef.current.deaths += 1;
            } else {
                sessionRef.current.restarts += 1;
            }
            persistActiveSession(sessionRef.current);
        }
        moveHistoryRef.current = [];
        startTimeRef.current = Date.now();
    }, []);

    /** Oyuncuya bir ipucu gösterildi (telemetri + tamamlama isteği için sayılır). */
    const recordHintUsed = useCallback(() => {
        hintsUsedRef.current += 1;
        if (sessionRef.current) {
            sessionRef.current.hintsUsed += 1;
            persistActiveSession(sessionRef.current);
        }
    }, []);

    return {
        moveHistoryRef,
        hintsUsedRef,
        startTimeRef,
        resetTracking,
        beginSession,
        submitTelemetry,
        handleMoveExecuted,
        handleUndoExecuted,
        recordRestart,
        recordHintUsed,
    };
}

export type PlaySession = ReturnType<typeof usePlaySession>;
