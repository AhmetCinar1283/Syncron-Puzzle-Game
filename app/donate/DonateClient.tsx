'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/app/src/hooks/useAuth';
import { useLanguage } from '@/app/src/contexts/LanguageContext';
import { workerFetch } from '@/app/src/lib/api/workerClient';
import { Heart, DollarSign, Award, Shield, CheckCircle2, User, Trophy, EyeOff } from 'lucide-react';

const LOCAL_T = {
  tr: {
    title: 'Bağış Yap',
    subtitle: 'Know & Conquer gelişimini destekleyin. Oyunu hep birlikte daha da büyütebiliriz!',
    quickSelect: 'Hızlı Seçim',
    customAmount: 'Özel Miktar (USD)',
    customAmountPlaceholder: 'Örn. 15',
    donorName: 'Bağışçı Adı',
    donorNamePlaceholder: 'Görünmesini istediğiniz ad (boş bırakılırsa Anonim)',
    anonymousCheckbox: 'Beni bağışçılar duvarında gizle (Anonim olarak göster)',
    submitBtn: 'Lemon Squeezy ile Bağış Yap',
    loading: 'Yükleniyor...',
    loginToBadge: 'Rozet kazanmak ve bağışlarınızı profilinizde biriktirmek için lütfen giriş yapın.',
    currentStatus: 'Mevcut Durumunuz',
    totalDonated: 'Toplam Katkınız:',
    badgeTier: 'Rozet Seviyeniz:',
    tiersTitle: 'Destekçi Rozet Seviyeleri',
    tierBronze: 'Bronze Destekçi',
    tierBronzeDesc: '5 USD veya üzeri kümülatif bağışlar için.',
    tierSilver: 'Silver Koruyucu',
    tierSilverDesc: '20 USD veya üzeri kümülatif bağışlar için.',
    tierGold: 'Gold Kahraman',
    tierGoldDesc: '50 USD veya üzeri kümülatif bağışlar için.',
    anonLabel: 'Anonim',
    noBadge: 'Rozet yok',
    recentDonors: 'En Çok Destek Olanlar',
    errorMin: 'Minimum bağış miktarı 1 USD olmalıdır.',
    errorSubmit: 'Bir hata oluştu, lütfen tekrar deneyin.',
    currencyText: 'Para birimi USD ($) bazlıdır. Lemon Squeezy ödeme ekranında yerel para biriminize otomatik çevrilecektir.',
  },
  en: {
    title: 'Donate',
    subtitle: 'Support the development of Know & Conquer. Together we can make the game even better!',
    quickSelect: 'Quick Select',
    customAmount: 'Custom Amount (USD)',
    customAmountPlaceholder: 'e.g. 15',
    donorName: 'Donor Name',
    donorNamePlaceholder: 'Name you want to display (Anonymous if empty)',
    anonymousCheckbox: 'Hide me on the supporters wall (Show as Anonymous)',
    submitBtn: 'Donate with Lemon Squeezy',
    loading: 'Loading...',
    loginToBadge: 'Please sign in to earn badges and keep track of your contributions.',
    currentStatus: 'Your Current Status',
    totalDonated: 'Total Contribution:',
    badgeTier: 'Badge Tier:',
    tiersTitle: 'Supporter Badge Tiers',
    tierBronze: 'Bronze Supporter',
    tierBronzeDesc: 'For cumulative donations of 5 USD or more.',
    tierSilver: 'Silver Guardian',
    tierSilverDesc: 'For cumulative donations of 20 USD or more.',
    tierGold: 'Gold Hero',
    tierGoldDesc: 'For cumulative donations of 50 USD or more.',
    anonLabel: 'Anonymous',
    noBadge: 'No badge',
    recentDonors: 'Top Supporters',
    errorMin: 'Minimum donation amount is 1 USD.',
    errorSubmit: 'An error occurred, please try again.',
    currencyText: 'Donation amount is based on USD ($). Lemon Squeezy will automatically convert to your local currency during checkout.',
  }
};

const QUICK_AMOUNTS = [1, 2, 5, 10];

interface DonorProfile {
  uid: string | null;
  displayName: string;
  totalDonatedCents: number;
  currency: string;
  badgeTier: 'bronze' | 'silver' | 'gold' | null;
  isAnonymous: boolean;
  coinsBalance: number;
}

export default function DonateClient() {
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

  if (isCapacitor) {
    return (
      <main className="min-h-[100dvh] bg-[#030712] text-[#e2e8f0] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Glow ambient background effects */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#ff0055]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#00c4ff]/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="z-10 text-center max-w-md w-full bg-[#060d1a]/85 border border-[#ff0055]/20 backdrop-blur-xl p-8 rounded-2xl shadow-2xl space-y-6">
          <div className="w-16 h-16 bg-[#ff0055]/10 border border-[#ff0055]/30 text-[#ff0055] rounded-full mx-auto flex items-center justify-center shadow-lg shadow-[#ff0055]/5">
            <Heart className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-100 font-sans">
              {lang === 'tr' ? 'Mobil Uygulamada Geçersiz' : 'Not Available on Mobile App'}
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm mx-auto font-sans">
              {lang === 'tr' 
                ? 'Bağış ve destek işlemlerini mobil uygulamamız üzerinden gerçekleştiremezsiniz. Lütfen web sitemizi ziyaret edin.' 
                : 'Donation and support transactions are not available through the mobile application. Please support us by visiting our website.'}
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => window.location.href = '/'}
              className="w-full px-5 py-2.5 bg-gradient-to-r from-[#00ff88] to-[#00c4ff] text-[#030712] font-extrabold rounded-xl text-sm transition-all duration-150 hover:opacity-90 flex items-center justify-center space-x-1"
            >
              {lang === 'tr' ? 'Ana Sayfaya Dön' : 'Back to Home'}
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (authLoading) {
    return (
      <main className="min-h-[100dvh] bg-[#030712] flex items-center justify-center">
        <span className="text-[#00c4ff] text-sm tracking-widest uppercase animate-pulse">
          {t.loading}
        </span>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[#030712] text-[#e2e8f0] py-12 px-4 relative overflow-hidden flex flex-col items-center">
      {/* Glow ambient background effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#00ff88]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#00c4ff]/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-4xl w-full z-10 space-y-8">
        
        {/* Header section */}
        <div className="text-center space-y-3">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex p-3 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/20 text-[#00ff88] mb-2"
          >
            <Heart className="w-8 h-8 fill-current" />
          </motion.div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-[#00ff88] to-[#00c4ff] bg-clip-text text-transparent">
            {t.title}
          </h1>
          <p className="text-sm md:text-base text-slate-400 max-w-xl mx-auto">
            {t.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Main Donation Form Panel */}
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-[#060d1a]/85 backdrop-blur-xl border border-sky-500/20 rounded-2xl p-6 shadow-2xl shadow-sky-500/5 flex flex-col justify-between"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Quick Select Options */}
              <div className="space-y-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#00c4ff] block">
                  {t.quickSelect}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {QUICK_AMOUNTS.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => handleAmountChange(amount)}
                      className={`py-3 rounded-xl border text-sm font-bold transition-all duration-150 ${
                        selectedAmount === amount
                          ? 'border-[#00ff88] bg-[#00ff88]/10 text-[#00ff88] shadow-[0_0_12px_rgba(0,255,136,0.2)]'
                          : 'border-slate-800 bg-[#060d1a] hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      ${amount}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Amount Field */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#00c4ff] block">
                  {t.customAmount}
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={customAmount}
                    onChange={(e) => handleCustomAmountChange(e.target.value)}
                    placeholder={t.customAmountPlaceholder}
                    className="w-full bg-[#060d1a] border border-slate-800 focus:border-[#00c4ff] text-slate-100 rounded-xl py-3 pl-9 pr-4 text-sm outline-none transition-all duration-150"
                  />
                </div>
              </div>

              {/* Display Name Input */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#00c4ff] block">
                  {t.donorName}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    maxLength={50}
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    placeholder={t.donorNamePlaceholder}
                    className="w-full bg-[#060d1a] border border-slate-800 focus:border-[#00c4ff] text-slate-100 rounded-xl py-3 pl-9 pr-4 text-sm outline-none transition-all duration-150"
                  />
                </div>
              </div>

              {/* Anonymous Checkbox */}
              <div className="flex items-start space-x-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800/40">
                <input
                  id="anonymous-check"
                  type="checkbox"
                  checked={isAnonCheck}
                  onChange={(e) => setIsAnonCheck(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-slate-800 text-[#00ff88] focus:ring-0 focus:ring-offset-0 bg-[#060d1a]"
                />
                <label htmlFor="anonymous-check" className="text-xs text-slate-400 select-none leading-relaxed cursor-pointer">
                  {t.anonymousCheckbox}
                </label>
              </div>

              {/* Error messages */}
              {errorMsg && (
                <div className="p-3 bg-red-950/40 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center space-x-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Currency Warning Text */}
              <p className="text-[10px] text-slate-500 leading-normal">
                {t.currencyText}
              </p>

              {/* Checkout Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-[#00ff88] to-[#00c4ff] hover:from-[#00ff88]/90 hover:to-[#00c4ff]/90 disabled:opacity-50 text-[#030712] font-extrabold rounded-xl py-3 text-sm transition-all duration-150 shadow-lg shadow-emerald-500/10 flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <span className="w-5 h-5 border-2 border-[#030712] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{t.submitBtn}</span>
                  </>
                )}
              </button>
            </form>
          </motion.div>

          {/* Details & Badges Panel */}
          <motion.div 
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-6"
          >
            {/* User status box */}
            <div className="bg-[#060d1a]/85 backdrop-blur-xl border border-sky-500/20 rounded-2xl p-6 shadow-2xl shadow-sky-500/5">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#00c4ff] border-b border-slate-800/80 pb-3 flex items-center space-x-2">
                <Shield className="w-4 h-4" />
                <span>{t.currentStatus}</span>
              </h2>

              {!user || isGuest ? (
                <p className="text-xs text-amber-500/90 leading-relaxed mt-4 bg-amber-950/20 p-3 rounded-xl border border-amber-500/20">
                  {t.loginToBadge}
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">{t.totalDonated}</span>
                    <span className="font-extrabold text-[#00ff88] bg-[#00ff88]/10 px-2 py-1 rounded">
                      {formatCurrency(userProfile?.totalDonatedCents || 0, userProfile?.currency || 'USD')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">{t.badgeTier}</span>
                    <span className="font-extrabold text-[#00c4ff] uppercase tracking-wider">
                      {userProfile?.badgeTier ? `${userProfile.badgeTier} tier` : t.noBadge}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">SYNC Bakiyesi:</span>
                    <span className="font-mono font-extrabold text-[#ffd700] text-sm tracking-wider">
                      {userProfile?.coinsBalance ?? 0} SYNC
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Supporter Tiers Showcase */}
            <div className="bg-[#060d1a]/85 backdrop-blur-xl border border-sky-500/20 rounded-2xl p-6 shadow-2xl shadow-sky-500/5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#00c4ff] border-b border-slate-800/80 pb-3 flex items-center space-x-2">
                <Award className="w-4 h-4" />
                <span>{t.tiersTitle}</span>
              </h3>

              <div className="mt-4 space-y-4">
                {/* Bronze Supporter */}
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-amber-700/10 border border-amber-700/30 text-amber-600 rounded-lg shrink-0 mt-0.5">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">{t.tierBronze}</h4>
                    <p className="text-[11px] text-slate-400 leading-normal">{t.tierBronzeDesc}</p>
                  </div>
                </div>

                {/* Silver Guardian */}
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-slate-400/10 border border-slate-400/30 text-slate-300 rounded-lg shrink-0 mt-0.5">
                    <Award className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">{t.tierSilver}</h4>
                    <p className="text-[11px] text-slate-400 leading-normal">{t.tierSilverDesc}</p>
                  </div>
                </div>

                {/* Gold Hero */}
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-[#ffd700]/10 border border-[#ffd700]/30 text-[#ffd700] rounded-lg shrink-0 mt-0.5 shadow-[0_0_8px_rgba(255,215,0,0.15)]">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">{t.tierGold}</h4>
                    <p className="text-[11px] text-slate-400 leading-normal">{t.tierGoldDesc}</p>
                  </div>
                </div>
              </div>
            </div>

          </motion.div>
        </div>

        {/* Top Supporters Wall */}
        {topDonors.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-[#060d1a]/85 backdrop-blur-xl border border-sky-500/20 rounded-2xl p-6 shadow-2xl shadow-sky-500/5 w-full"
          >
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#00c4ff] border-b border-slate-800/80 pb-3 flex items-center space-x-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span>{t.recentDonors}</span>
            </h3>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {topDonors.map((donor, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-900/30 border border-slate-800/50"
                >
                  <div className="flex items-center space-x-2.5 overflow-hidden">
                    {donor.isAnonymous ? (
                      <EyeOff className="w-4 h-4 text-slate-500 shrink-0" />
                    ) : (
                      <User className="w-4 h-4 text-[#00c4ff] shrink-0" />
                    )}
                    <span className="text-xs text-slate-300 font-medium truncate">
                      {donor.isAnonymous ? t.anonLabel : donor.displayName}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {donor.badgeTier && (
                      <Award className={`w-4 h-4 ${
                        donor.badgeTier === 'gold' ? 'text-[#ffd700]' :
                        donor.badgeTier === 'silver' ? 'text-slate-300' : 'text-amber-600'
                      }`} />
                    )}
                    <span className="text-[11px] font-bold text-[#00ff88]">
                      {formatCurrency(donor.totalDonatedCents, donor.currency, false)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </div>
    </main>
  );
}
