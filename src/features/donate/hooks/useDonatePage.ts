'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { workerFetch } from '@/services/api/workerClient';
import { useNativePlatform } from '@/hooks/useNativePlatform';
import { LOCAL_T, type DonorProfile } from '../lib/i18n';

export function useDonatePage() {
  const { lang } = useLanguage();
  const { user, isAnonymous: isGuest, loading: authLoading } = useAuth();
  // Native kabuk tespiti artık efektte state set etmiyor; SSR-güvenli tek bir
  // kaynaktan (`useNativePlatform`) okunuyor. Görünen davranış aynı: sunucuda ve
  // hidrasyonda `false`, tarayıcıda gerçek değer.
  const isCapacitor = useNativePlatform();

  const t = lang === 'tr' ? LOCAL_T.tr : LOCAL_T.en;

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

  // Bağışçı adının varsayılanı oturum değişince tazelenir. Bu, "girdi alanının
  // varsayılanını prop değişimine göre ayarla" işidir; efekt yerine değişimi fark
  // ettiğimiz render'da yapılır (React'in önerdiği örüntü). Böylece kullanıcı bir
  // kare boyunca boş alan görmez ve fazladan render turu oluşmaz.
  const [seenIdentity, setSeenIdentity] = useState<{ user: typeof user; isGuest: boolean } | null>(null);
  if (!seenIdentity || seenIdentity.user !== user || seenIdentity.isGuest !== isGuest) {
    setSeenIdentity({ user, isGuest });
    if (user && !isGuest && user.displayName) {
      setDonorName(user.displayName);
    }
  }

  // İstekler doğrudan efektin içinde başlatılır (eskiden `useCallback` sarmalı
  // vardı; dışarıdan hiç çağrılmıyordu). Böylece state yalnızca `await`'ten SONRA,
  // yani asenkron yanıtla set edilir ve efektin gövdesi senkron state yazmaz.
  // `active` bayrağı, bileşen söküldükten veya kullanıcı değiştikten sonra gelen
  // gecikmiş yanıtın ekrana yazılmasını engeller.

  // Fetch current user donor profile
  useEffect(() => {
    if (!user || isGuest) return;
    let active = true;
    const uid = user.uid;
    (async () => {
      try {
        const res = await workerFetch<{ success: boolean; profile?: DonorProfile }>(
          `/donors/${uid}`
        );
        if (active && res.success && res.profile) {
          setUserProfile(res.profile);
        }
      } catch (err) {
        console.error('Error fetching user donor profile:', err);
      }
    })();
    return () => {
      active = false;
    };
  }, [user, isGuest]);

  // Fetch top donors list
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await workerFetch<{ success: boolean; donors?: DonorProfile[] }>(
          '/donors/top'
        );
        if (active && res.success && res.donors) {
          setTopDonors(res.donors);
        }
      } catch (err) {
        console.error('Error fetching top donors list:', err);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

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
