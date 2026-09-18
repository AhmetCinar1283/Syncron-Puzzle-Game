'use client';

/**
 * DOSYA AMACI: `/play`'in ödüllü level atlama akışı (05):
 *
 *   oyuncu takıldı (başarısız deneme / süre eşiği) → "Level'ı atla" butonu öne çıkar
 *   → onay kartı (oyun girdisi kilitli) → sunucu atlamayı hazırlar (kuralları uygular)
 *   → ödüllü reklam → sunucu teslim eder ve `skipped_levels`'a yazar
 *   → yerel Dexie kaydı → çağıran telemetriyi kapatır ve sonraki level'a geçer
 *
 * Atlama skor/yıldız/XP vermez; yalnızca ilerleme kilidini açar. Reklam/kota akışı
 * ortak ödüllü aksiyon altyapısındadır (`features/rewarded-actions`).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRewardedAction } from '@/features/rewarded-actions';
import { cancelReward, claimReward, isRewardServerConfigured, prepareReward } from '@/services/api/rewardsClient';
import { SKIP_LEVEL_UI_CONFIG, canOfferSkip, msUntilTimeThreshold } from '../lib/skipLevelConfig';

interface UsePlaySkipArgs {
    /** Level'ın Firestore id'si; yoksa (kullanıcı level'ı) atlama sunulmaz. */
    firestoreId: string | undefined;
    /** Kampanya bölümü id'si (sunucu üyeliği doğrular). */
    partId: string | undefined;
    /** Bölümün son level'ı mı. */
    isChapterEnd: boolean;
    /** Level yüklendi ve oynanabilir. */
    ready: boolean;
    /** Atlama teslim edildi ve yerel kayıt yazıldı. */
    onSkipped: () => void;
}

interface SkipLevelResult {
    levelId: string;
}

export function usePlaySkip({ firestoreId, partId, isChapterEnd, ready, onSkipped }: UsePlaySkipArgs) {
    const scopeKey = firestoreId ?? 'unscored';
    const rewarded = useRewardedAction('skip-level', scopeKey);
    const { refresh, clearError, run, availability, busy } = rewarded;

    const [dialogOpen, setDialogOpen] = useState(false);
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [timeReached, setTimeReached] = useState(false);
    /** `null` → yerel kayıt henüz okunmadı. */
    const [alreadyProgressed, setAlreadyProgressed] = useState<boolean | null>(null);
    /** Level'ın (kapsamın) ilk oynanabilir olduğu an — yeniden başlatmada korunur. */
    const startedAtRef = useRef<{ scope: string; at: number } | null>(null);

    // Başka level'a geçildi: sayaçlar ve kart sıfırlanır. Yeniden başlatma aynı
    // kapsamda kaldığı için süre ve deneme sayısı korunur.
    const [trackedScope, setTrackedScope] = useState(scopeKey);
    if (trackedScope !== scopeKey) {
        setTrackedScope(scopeKey);
        setDialogOpen(false);
        setFailedAttempts(0);
        setTimeReached(false);
        setAlreadyProgressed(null);
    }

    // Level zaten çözülmüş ya da atlanmışsa buton hiç gösterilmez.
    useEffect(() => {
        if (!firestoreId) return;
        let cancelled = false;
        import('@/services/db')
            .then(({ getPlayedLevel, getSkippedLevel }) => Promise.all([getPlayedLevel(firestoreId), getSkippedLevel(firestoreId)]))
            .then(([played, skipped]) => {
                if (!cancelled) setAlreadyProgressed(!!played || !!skipped);
            })
            .catch(() => {
                if (!cancelled) setAlreadyProgressed(false);
            });
        return () => { cancelled = true; };
    }, [firestoreId]);

    // Süre eşiği: level'ın ilk oynanabilir olduğu andan itibaren sayılır.
    useEffect(() => {
        if (!ready || timeReached) return;
        let start = startedAtRef.current;
        if (start?.scope !== scopeKey) {
            start = { scope: scopeKey, at: Date.now() };
            startedAtRef.current = start;
        }
        const remaining = msUntilTimeThreshold(Date.now() - start.at);
        const timer = setTimeout(() => setTimeReached(true), remaining);
        return () => clearTimeout(timer);
    }, [ready, scopeKey, timeReached]);

    const eligible =
        alreadyProgressed === false &&
        canOfferSkip({
            isCampaignLevel: !!firestoreId && !!partId,
            serverConfigured: isRewardServerConfigured(),
            alreadyProgressed,
            isChapterEnd,
        });
    const offered = !(availability.kind === 'blocked' && availability.reason === 'disabled');
    const stuck = timeReached || failedAttempts >= SKIP_LEVEL_UI_CONFIG.minFailedAttempts;

    /** Yeniden başlatma ya da ölüm (başarısız deneme). */
    const onFailedAttempt = useCallback(() => setFailedAttempts((n) => n + 1), []);

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
        if (!firestoreId || !partId || busy) return;
        const outcome = await run<SkipLevelResult>({
            prepare: () => prepareReward<SkipLevelResult>('skip-level', firestoreId, { partId }),
            claim: (requestId, via) => claimReward<SkipLevelResult>(requestId, via),
            cancel: (requestId, reason) => cancelReward(requestId, reason),
        });
        if (outcome.status !== 'granted') return;

        // Sunucu kaydı yazıldı; yerel kopya haritanın hemen güncellenmesi için (sync zaten taşır).
        try {
            const { putSkippedLevel } = await import('@/services/db');
            const now = Date.now();
            await putSkippedLevel({ levelId: firestoreId, skippedAt: now, updatedAt: now });
        } catch (err) {
            console.warn('[Skip] Yerel atlama kaydı yazılamadı:', err);
        }
        setDialogOpen(false);
        setAlreadyProgressed(true);
        onSkipped();
    }, [firestoreId, partId, busy, run, onSkipped]);

    return {
        /** Buton gösterilsin mi (uygun + takıldı + platformda açık). */
        buttonVisible: ready && eligible && offered && stuck,
        busy,
        inputLocked: dialogOpen,
        onRequest,
        onFailedAttempt,
        dialog: {
            open: dialogOpen,
            availability,
            busy,
            errorKey: rewarded.errorKey,
            confirm,
            dismiss,
        },
    };
}

export type PlaySkip = ReturnType<typeof usePlaySkip>;
