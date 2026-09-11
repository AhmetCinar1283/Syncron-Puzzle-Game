'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { workerFetch } from '@/services/api/workerClient';
import { LOCAL_T, type DonorProfile } from '../lib/i18n';

export function useGreatSupporterPage() {
  const { lang } = useLanguage();
  const { user, isAnonymous: isGuest, loading: authLoading } = useAuth();
  const t = lang === 'tr' ? LOCAL_T.tr : LOCAL_T.en;

  const [state, setState] = useState<'loading' | 'reveal' | 'timeout'>('loading');
  const [isCapacitor, setIsCapacitor] = useState(false);

  useEffect(() => {
    const cap = (window as any).Capacitor;
    if (cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()) {
      setIsCapacitor(true);
    }
  }, []);
  const [loadingMsg, setLoadingMsg] = useState(t.verifying);
  const [progress, setProgress] = useState(0);
  const [donorProfile, setDonorProfile] = useState<DonorProfile | null>(null);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [isNewTier, setIsNewTier] = useState(false);
  const [displayedCoins, setDisplayedCoins] = useState(0);

  const pollingRef = useRef<number | null>(null);

  // Cycle loading messages
  useEffect(() => {
    if (state !== 'loading') return;
    const messages = [t.verifying, t.preparing, t.checking, t.almost];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % messages.length;
      setLoadingMsg(messages[idx]);
    }, 1200);

    return () => clearInterval(interval);
  }, [state, lang, t.verifying, t.preparing, t.checking, t.almost]);

  // Fake progress bar animating 0 -> 85%
  useEffect(() => {
    if (state !== 'loading') return;
    const start = Date.now();
    const duration = 1800; // reach 85% in 1.8s

    const updateProgress = () => {
      const elapsed = Date.now() - start;
      const progressVal = Math.min((elapsed / duration) * 85, 85);
      setProgress(progressVal);
      if (elapsed < duration) {
        requestAnimationFrame(updateProgress);
      }
    };
    requestAnimationFrame(updateProgress);
  }, [state]);

  // Main polling & transaction confirmation logic
  useEffect(() => {
    if (authLoading) return;

    // Read stored credentials or fallback to active auth user
    const pendingUid = typeof window !== 'undefined' ? sessionStorage.getItem('pendingDonorUid') : null;
    const preDonationCoinsStr = typeof window !== 'undefined' ? sessionStorage.getItem('preDonationCoins') : null;
    const preDonationTier = typeof window !== 'undefined' ? sessionStorage.getItem('preDonationTier') : null;
    const uidToPoll = pendingUid || user?.uid;

    if (!uidToPoll) {
      // If there is no UID, we cannot poll. Show timeout/error directly.
      setState('timeout');
      return;
    }

    const preDonationCoins = parseInt(preDonationCoinsStr || '0', 10);
    const startPollTime = Date.now();
    const pollIntervalMs = 3000;
    const maxDurationMs = 15000; // Max 15 seconds
    const minLoadingTimeMs = 2000; // Minimum 2 seconds loading screen

    const poll = async () => {
      try {
        const res = await workerFetch<{ success: boolean; profile?: DonorProfile }>(
          `/donors/${uidToPoll}`
        );

        if (res.success && res.profile) {
          const profile = res.profile;

          // Check if webhook is processed: coinsBalance must be greater than preDonationCoins
          // Or if there is no preDonationCoins, verify it's a valid non-zero donor
          const isProcessed = profile.coinsBalance > preDonationCoins ||
                             (!preDonationCoins && profile.coinsBalance > 0);

          if (isProcessed) {
            const elapsed = Date.now() - startPollTime;
            const remainingDelay = Math.max(0, minLoadingTimeMs - elapsed);

            // Wait until minimum loading time (2s) completes
            setTimeout(() => {
              setProgress(100);

              // Calculate rewards based on exact coins increase
              const earned = profile.coinsBalance - preDonationCoins;
              setCoinsEarned(Math.max(100, earned)); // minimum 100 SYNC fallback

              const preTier = preDonationTier === 'none' ? null : preDonationTier;
              const currentTier = profile.badgeTier;
              setIsNewTier(currentTier !== null && currentTier !== preTier);

              setDonorProfile(profile);
              setState('reveal');

              // Clean session variables
              sessionStorage.removeItem('pendingDonorUid');
              sessionStorage.removeItem('preDonationCoins');
              sessionStorage.removeItem('preDonationTier');
            }, remainingDelay);

            return; // Stop polling loop
          }
        }
      } catch (err) {
        console.error('[GreatSupporter] Error checking donor profile:', err);
      }

      // Check for timeout
      if (Date.now() - startPollTime >= maxDurationMs) {
        setState('timeout');
        return;
      }

      // Schedule next poll
      pollingRef.current = window.setTimeout(poll, pollIntervalMs);
    };

    // Begin polling
    poll();

    return () => {
      if (pollingRef.current) clearTimeout(pollingRef.current);
    };
  }, [authLoading, user]);

  // SYNC coin counter count-up effect
  useEffect(() => {
    if (state === 'reveal' && coinsEarned > 0) {
      const duration = 1500; // 1.5 seconds count-up duration
      const startTime = performance.now();

      const animateCount = (now: number) => {
        const elapsed = now - startTime;
        const progressVal = Math.min(elapsed / duration, 1);
        const easeOutQuad = progressVal * (2 - progressVal);
        const current = Math.floor(easeOutQuad * coinsEarned);

        setDisplayedCoins(current);

        if (progressVal < 1) {
          requestAnimationFrame(animateCount);
        } else {
          setDisplayedCoins(coinsEarned);
        }
      };

      // Delay start to align with 2.2s reveal timeline
      const timeout = setTimeout(() => {
        requestAnimationFrame(animateCount);
      }, 2200);

      return () => clearTimeout(timeout);
    }
  }, [state, coinsEarned]);

  return {
    lang,
    t,
    state,
    isCapacitor,
    authLoading,
    loadingMsg,
    progress,
    donorProfile,
    isNewTier,
    displayedCoins,
  };
}
