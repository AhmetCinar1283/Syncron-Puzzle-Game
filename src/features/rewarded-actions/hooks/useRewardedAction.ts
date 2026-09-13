'use client';

/**
 * DOSYA AMACI: Bir ödüllü aksiyonun React durumunu yönetir: erişim durumu
 * (reklam / ücretsiz / engelli), akış sürüyor mu, son hata mesajı. Akışın
 * kendisini `MonetizationContext.runRewardedAction` yürütür; bu hook aksiyondan
 * bağımsızdır — ipucu (04), level atlama (05) vb. aynı hook'u kullanır.
 */
import { useCallback, useState } from 'react';
import { useAds } from '@/contexts/MonetizationContext';
import type {
  RewardedActionId,
  RewardedActionOutcome,
  RewardedAvailability,
  RunRewardedActionParams,
} from '@/services/monetization';

/** Aksiyonun sunucu adımları (hazırla / teslim al / iptal bildir). */
export type RewardedActionSteps<T> = Pick<RunRewardedActionParams<T>, 'prepare' | 'claim' | 'cancel'>;
import { declineMessageKey } from '../lib/declineMessages';

export interface UseRewardedActionResult {
  /** Son okunan erişim durumu; `refresh()` ile güncellenir. */
  availability: RewardedAvailability;
  busy: boolean;
  /** Gösterilecek hata mesajının i18n anahtarı (yoksa `null`). */
  errorKey: string | null;
  refresh: () => RewardedAvailability;
  clearError: () => void;
  /** Akışı çalıştırır: hazırla → (reklam) → teslim al. Asla reject etmez. */
  run: <T>(steps: RewardedActionSteps<T>) => Promise<RewardedActionOutcome<T>>;
}

export function useRewardedAction(actionId: RewardedActionId, scopeKey: string): UseRewardedActionResult {
  const { getRewardedAvailability, runRewardedAction } = useAds();
  const [availability, setAvailability] = useState<RewardedAvailability>(() =>
    getRewardedAvailability(actionId, scopeKey),
  );
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  // Aksiyon/kapsam değişti (ör. başka level): erişim durumu yeni kapsam için okunur.
  const identity = `${actionId}:${scopeKey}`;
  const [trackedIdentity, setTrackedIdentity] = useState(identity);
  if (trackedIdentity !== identity) {
    setTrackedIdentity(identity);
    setAvailability(getRewardedAvailability(actionId, scopeKey));
    setErrorKey(null);
  }

  const refresh = useCallback(() => {
    const next = getRewardedAvailability(actionId, scopeKey);
    setAvailability(next);
    return next;
  }, [getRewardedAvailability, actionId, scopeKey]);

  const clearError = useCallback(() => setErrorKey(null), []);

  const run = useCallback(
    async <T,>(steps: RewardedActionSteps<T>) => {
      setBusy(true);
      setErrorKey(null);
      try {
        const outcome = await runRewardedAction<T>({ actionId, scopeKey, ...steps });
        if (outcome.status === 'declined') {
          setErrorKey(declineMessageKey(outcome.reason));
        }
        return outcome;
      } finally {
        setBusy(false);
        setAvailability(getRewardedAvailability(actionId, scopeKey));
      }
    },
    [runRewardedAction, getRewardedAvailability, actionId, scopeKey],
  );

  return { availability, busy, errorKey, refresh, clearError, run };
}
