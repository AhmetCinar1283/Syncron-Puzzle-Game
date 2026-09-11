'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { workerFetch } from '@/services/api/workerClient';
import { LOCAL_T, type DonorProfile } from '../lib/i18n';

export function useDonatePage() {
  const { lang } = useLanguage();
  const { user, isAnonymous: isGuest, loading: authLoading } = useAuth();
  const [isCapacitor, setIsCapacitor] = useState(false);

  const t = lang === 'tr' ? LOCAL_T.tr : LOCAL_T.en;

  useEffect(() => {
    const cap = (window as any).Capacitor;
    if (cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()) {
      setIsCapacitor(true);
    }
  }, []);

  const formatCurrency = useCallback((cents: number, curr: string, showDecimals = true) => {
    const amount = cents / 100;
    try {
      return new Intl.NumberFormat(lang === 'tr' ? 'tr-TR' : 'en-US', {
        style: 'currency',
        currency: curr ? curr.toUpperCase() : 'USD',
        minimumFractionDigits: showDecimals ? 2 : 0,
        maximumFractionDigits: showDecimals ? 2 : 0
      }).format(amount);
    } catch (e) {
      return `${amount.toFixed(showDecimals ? 2 : 0)} ${curr ? curr.toUpperCase() : 'USD'}`;
    }
  }, [lang]);

  const [selectedAmount, setSelectedAmount] = useState<number | null>(5);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [donorName, setDonorName] = useState<string>('');
  const [isAnonCheck, setIsAnonCheck] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<DonorProfile | null>(null);
  const [topDonors, setTopDonors] = useState<DonorProfile[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Set default donor name once auth user is loaded
  useEffect(() => {
    if (user && !isGuest && user.displayName) {
      setDonorName(user.displayName);
    }
  }, [user, isGuest]);

  // Fetch current user donor profile
  const fetchUserProfile = useCallback(async () => {
    if (!user || isGuest) return;
    try {
      const res = await workerFetch<{ success: boolean; profile?: DonorProfile }>(
        `/donors/${user.uid}`
      );
      if (res.success && res.profile) {
        setUserProfile(res.profile);
      }
    } catch (err) {
      console.error('Error fetching user donor profile:', err);
    }
  }, [user, isGuest]);

  // Fetch top donors list
  const fetchTopDonors = useCallback(async () => {
    try {
      const res = await workerFetch<{ success: boolean; donors?: DonorProfile[] }>(
        '/donors/top'
      );
      if (res.success && res.donors) {
        setTopDonors(res.donors);
      }
    } catch (err) {
      console.error('Error fetching top donors list:', err);
    }
  }, []);

  useEffect(() => {
    fetchUserProfile();
    fetchTopDonors();
  }, [fetchUserProfile, fetchTopDonors]);

  const handleAmountChange = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
    setErrorMsg('');
  };

  const handleCustomAmountChange = (val: string) => {
    setSelectedAmount(null);
    setCustomAmount(val);
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    const amount = selectedAmount !== null ? selectedAmount : parseFloat(customAmount);

    if (isNaN(amount) || amount < 1) {
      setErrorMsg(t.errorMin);
      setIsSubmitting(false);
      return;
    }

    try {
      // Save pending UID and pre-donation coin balance for polling on success page
      if (user && !isGuest) {
        sessionStorage.setItem('pendingDonorUid', user.uid);
        sessionStorage.setItem('preDonationCoins', String(userProfile?.coinsBalance ?? 0));
        sessionStorage.setItem('preDonationTier', userProfile?.badgeTier ?? 'none');
      } else {
        sessionStorage.removeItem('pendingDonorUid');
        sessionStorage.removeItem('preDonationCoins');
        sessionStorage.removeItem('preDonationTier');
      }

      const storeSubdomain = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_STORE_SUBDOMAIN || 'syncron';
      const variantId = process.env.NEXT_PUBLIC_LEMON_SQUEEZY_VARIANT_ID || '123456';

      const checkoutUrl = new URL(`https://${storeSubdomain}.lemonsqueezy.com/checkout/buy/${variantId}`);

      // Calculate amount in cents
      const cents = Math.round(amount * 100);
      checkoutUrl.searchParams.append('checkout[custom_price]', String(cents));

      // Prefill user details if logged in
      if (user && !isGuest) {
        checkoutUrl.searchParams.append('custom[uid]', user.uid);
        if (user.email) {
          checkoutUrl.searchParams.append('checkout[email]', user.email);
        }
      }

      // Add other custom params
      checkoutUrl.searchParams.append('custom[donor_alias]', donorName.trim() || 'Anonim');
      checkoutUrl.searchParams.append('custom[is_anonymous]', String(isAnonCheck));

      // Redirect user to success thank-you page after completion
      const successUrl = typeof window !== 'undefined' ? `${window.location.origin}/great-supporter` : 'https://syncron.polimelo.com/great-supporter';
      checkoutUrl.searchParams.append('checkout[success_url]', successUrl);

      // Redirect user to Lemon Squeezy checkout
      window.location.href = checkoutUrl.toString();
    } catch (err) {
      console.error('[Donate] Error constructing checkout URL:', err);
      setErrorMsg(t.errorSubmit);
      setIsSubmitting(false);
    }
  };

  return {
    lang,
    t,
    user,
    isGuest,
    authLoading,
    isCapacitor,
    formatCurrency,
    selectedAmount,
    customAmount,
    donorName,
    setDonorName,
    isAnonCheck,
    setIsAnonCheck,
    userProfile,
    topDonors,
    errorMsg,
    isSubmitting,
    handleAmountChange,
    handleCustomAmountChange,
    handleSubmit,
  };
}
