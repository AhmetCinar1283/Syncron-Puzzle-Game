'use client';

/**
 * DOSYA AMACI: `/play`'in ödüllü ipucu akışı. İpucu İSTEMCİDE HESAPLANMAZ:
 *
 *   oyuncu ipucu ister → onay kartı (oyun girdisi kilitli)
 *   → sunucu hamle geçmişini oynatıp ipucunu hazırlar (içerik gelmez)
 *   → gerekiyorsa ödüllü reklam → sunucu hakkı doğrulayıp ipucunu teslim eder
 *   → "çözüme N adım" + sıradaki 5 adım gösterilir; oyuncu takip ettikçe ilerler
 *
 * Yalnızca sunucuda kayıtlı (Firestore id'li) level'larda sunulur.
 */
import { useCallback, useMemo, useState } from 'react';
import {
    advanceOnMove,
    advanceOnRestart,
    advanceOnUndo,
    startHint,
    type ActiveHint,
    type HintMoveCode,
    type ServerHint,
} from '@/game-engine/hint';
import type { PlayScreenHint } from '@/game-engine/components/PlayScreen';
import { cancelReward, claimReward, isRewardServerConfigured, prepareReward } from '@/services/api/rewardsClient';
import { useRewardedAction } from '@/features/rewarded-actions';

interface UsePlayHintArgs {
    /** Level'ın Firestore id'si; yoksa (kullanıcı seviyesi) ipucu sunulmaz. */
    firestoreId: string | undefined;
    levelVersion: number;
    /** O anki hamle geçmişi (restart'tan beri, geri almalar düşülmüş). */
    getMoves: () => readonly string[];
    onHintShown: () => void;
}

export function usePlayHint({ firestoreId, levelVersion, getMoves, onHintShown }: UsePlayHintArgs) {
    const enabled = !!firestoreId && isRewardServerConfigured();
    const scopeKey = firestoreId ?? 'unscored';
    const rewarded = useRewardedAction('hint', scopeKey);
    const { refresh, clearError, run, availability, busy } = rewarded;

    const [active, setActive] = useState<ActiveHint | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    // Başka level'a geçildi: ipucu ve açık kart temizlenir (render sırasında
    // durum ayarlama — effect'te setState zincirleme render'a yol açar).
    const scope = `${scopeKey}@${levelVersion}`;
    const [trackedScope, setTrackedScope] = useState(scope);
    if (trackedScope !== scope) {
        setTrackedScope(scope);
        setActive(null);
        setDialogOpen(false);
    }

    const onRequest = useCallback(() => {
        clearError();
        refresh();
        setDialogOpen(true);
    }, [clearError, refresh]);

    const dismiss = useCallback(() => {
        if (busy) return;
        setDialogOpen(false);
        clearError();
    }, [busy, clearError]);

    const confirm = useCallback(async () => {
        if (!firestoreId || busy) return;
        // Kart açıkken girdi kilitli olduğu için geçmiş akış boyunca değişmez.
        const moves = [...getMoves()];

        const outcome = await run<ServerHint>({
            prepare: () => prepareReward<ServerHint>('hint', firestoreId, { moves }),
            claim: (requestId, via) => claimReward<ServerHint>(requestId, via),
            cancel: (requestId, reason) => cancelReward(requestId, reason),
        });

        if (outcome.status === 'granted') {
            setDialogOpen(false);
            onHintShown();
            setActive(startHint(outcome.payload));
        }
    }, [firestoreId, busy, getMoves, run, onHintShown]);

    /** Oyuncu bir hamle / oda değiştirme yaptı: ipucu doğru adımsa ilerler, değilse kapanır. */
    const onMoveExecuted = useCallback((move: string) => {
        setActive((current) => (current ? advanceOnMove(current, move as HintMoveCode) : null));
    }, []);

    const onUndoExecuted = useCallback(() => {
        setActive((current) => (current ? advanceOnUndo(current) : null));
    }, []);

    const onRestart = useCallback(() => {
        setActive((current) => (current ? advanceOnRestart(current) : null));
    }, []);

    /** Level sonu. */
    const reset = useCallback(() => {
        setActive(null);
        setDialogOpen(false);
    }, []);

    const screenHint = useMemo<PlayScreenHint | undefined>(() => {
        if (!enabled) return undefined;
        if (availability.kind === 'blocked' && availability.reason === 'disabled') return undefined;
        let badge: string | null = null;
        if (availability.kind === 'ad') badge = '▶';
        else if (availability.kind === 'free' && availability.remaining !== null) badge = String(availability.remaining);
        else if (availability.kind === 'blocked') badge = '0';
        return { active, busy, disabled: active !== null, inputLocked: dialogOpen, badge, onRequest };
    }, [enabled, availability, active, busy, dialogOpen, onRequest]);

    return {
        screenHint,
        dialog: {
            open: enabled && dialogOpen,
            availability,
            busy,
            errorKey: rewarded.errorKey,
            confirm,
            dismiss,
        },
        onMoveExecuted,
        onUndoExecuted,
        onRestart,
        reset,
    };
}

export type PlayHint = ReturnType<typeof usePlayHint>;
