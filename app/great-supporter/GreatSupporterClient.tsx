'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/app/src/hooks/useAuth';
import { useLanguage } from '@/app/src/contexts/LanguageContext';
import { workerFetch } from '@/app/src/lib/api/workerClient';
import { Coffee, Coins, Award, ArrowRight, ShieldCheck, HelpCircle, Loader2, Heart } from 'lucide-react';
import Link from 'next/link';

const LOCAL_T = {
  tr: {
    loadingTitle: 'İşleminiz Doğrulanıyor',
    verifying: 'Ödemeniz doğrulanıyor...',
    preparing: 'SYNC hazırlanıyor...',
    checking: 'Rozetler kontrol ediliyor...',
    almost: 'Neredeyse hazır...',
    successTitle: 'Harika Destekçi! 🎉',
    successSubtitle: 'Know & Conquer\'a desteğiniz için çok teşekkür ederiz!',
    starterBadgeAwarded: 'donor_starter rozeti kazandınız!',
    newTierAwarded: (tier: string) => `Tebrikler! ${tier.toUpperCase()} seviyesine yükseldiniz!`,
    syncEarned: 'Kazanılan SYNC',
    totalBalance: 'Toplam Bakiye',
    btnBack: 'Oyuna Dön',
    btnDonate: 'Tekrar Destek Ol',
    timeoutTitle: 'Ödemeniz Alındı! ⚡',
    timeoutDesc: 'Ödemeniz başarıyla ulaştı fakat Lemon Squeezy doğrulaması biraz gecikti. SYNC ve rozetleriniz birkaç dakika içinde profilinize eklenecektir.',
    btnProfile: 'Profilimi Gör',
    badgeStarter: 'Kahve Sever Başlangıç Rozeti',
    badgeDesc: 'Her bağışçıya özel kalıcı ☕ rozeti.',
    bronze: 'Bronze Destekçi',
    silver: 'Silver Koruyucu',
    gold: 'Gold Kahraman',
  },
  en: {
    loadingTitle: 'Verifying Transaction',
    verifying: 'Verifying your payment...',
    preparing: 'Preparing your SYNC...',
    checking: 'Checking your badges...',
    almost: 'Almost ready...',
    successTitle: 'Great Supporter! 🎉',
    successSubtitle: 'Thank you so much for supporting Know & Conquer!',
    starterBadgeAwarded: 'You earned the donor_starter badge!',
    newTierAwarded: (tier: string) => `Congratulations! Promoted to ${tier.toUpperCase()} tier!`,
    syncEarned: 'SYNC Earned',
    totalBalance: 'Total Balance',
    btnBack: 'Back to Game',
    btnDonate: 'Support Again',
    timeoutTitle: 'Payment Received! ⚡',
    timeoutDesc: 'Your payment went through successfully, but the verification is taking longer than usual. Your SYNC and badges will be updated in a few minutes.',
    btnProfile: 'View My Profile',
    badgeStarter: 'Coffee Lover Starter Badge',
    badgeDesc: 'A permanent ☕ badge gifted to all supporters.',
    bronze: 'Bronze Supporter',
    silver: 'Silver Guardian',
    gold: 'Gold Hero',
  }
};

interface DonorProfile {
  uid: string | null;
  displayName: string;
  totalDonatedCents: number;
  currency: string;
  badgeTier: 'bronze' | 'silver' | 'gold' | null;
  isAnonymous: boolean;
  coinsBalance: number;
}

export default function GreatSupporterClient() {
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

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pollingRef = useRef<number | null>(null);

  // Background floating particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animationFrameId: number;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (canvas) {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', handleResize);

    const particles: Array<{
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      color: string;
    }> = [];

    const colors = [
      'rgba(0, 255, 136, 0.12)',
      'rgba(0, 196, 255, 0.12)',
      'rgba(255, 215, 0, 0.15)',
    ];

    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 3 + 1,
        speedX: (Math.random() - 0.5) * 0.4,
        speedY: (Math.random() - 0.5) * 0.4,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

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
        <Loader2 className="w-8 h-8 text-[#00c4ff] animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[#030712] text-[#e2e8f0] relative overflow-hidden flex items-center justify-center p-4">
      {/* Particle Background */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* Styled inline CSS for custom animations */}
      <style jsx global>{`
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 15px rgba(255, 215, 0, 0.2), inset 0 0 15px rgba(255, 215, 0, 0.1); }
          50% { box-shadow: 0 0 25px rgba(255, 215, 0, 0.4), inset 0 0 25px rgba(255, 215, 0, 0.2); }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes confetti-fall {
          0% { transform: translateY(-5vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(105vh) rotate(360deg); opacity: 0; }
        }
        .glow-card {
          animation: glow 3s infinite;
        }
        .animate-bounce-slow {
          animation: bounce-slow 4s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin-slow 12s linear infinite;
        }
        .confetti {
          position: absolute;
          top: -5vh;
          width: 8px;
          height: 16px;
          opacity: 0;
          animation: confetti-fall 3.5s linear forwards;
        }
      `}</style>

      {/* Confetti element generator on Reveal */}
      {state === 'reveal' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 50 }).map((_, i) => {
            const left = Math.random() * 100; // horizontal start %
            const delay = Math.random() * 3; // animation delay
            const duration = Math.random() * 2 + 2.5; // animation speed
            const size = Math.random() * 8 + 6;
            const colors = ['#ffd700', '#00ff88', '#00c4ff', '#ff007f', '#ffaa00'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            return (
              <div
                key={i}
                className="confetti"
                style={{
                  left: `${left}%`,
                  backgroundColor: randomColor,
                  width: `${size}px`,
                  height: `${size * 1.5}px`,
                  animationDelay: `${delay}s`,
                  animationDuration: `${duration}s`,
                }}
              />
            );
          })}
        </div>
      )}

      <AnimatePresence mode="wait">
        {state === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="z-10 text-center max-w-sm w-full space-y-6 bg-[#060d1a]/80 border border-sky-500/15 backdrop-blur-xl p-8 rounded-2xl shadow-2xl"
          >
            {/* Spinning Coffee / SYNC Graphic */}
            <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-dashed border-[#00ff88]/30 animate-spin-slow" />
              <div className="absolute inset-2 rounded-full border border-sky-500/20" />
              <Coffee className="w-10 h-10 text-[#00ff88] animate-bounce-slow" />
            </div>

            <div className="space-y-2">
              <h2 className="text-sm font-semibold tracking-wider text-[#00c4ff] uppercase">
                {t.loadingTitle}
              </h2>
              <p className="text-slate-400 text-sm font-medium h-5 flex justify-center items-center">
                {loadingMsg}
              </p>
            </div>

            {/* Neon green progress bar */}
            <div className="space-y-1">
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <motion.div
                  className="h-full bg-gradient-to-r from-[#00ff88] to-[#00c4ff]"
                  style={{ width: `${progress}%` }}
                  transition={{ type: 'spring', stiffness: 80 }}
                />
              </div>
              <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">
                {Math.round(progress)}%
              </span>
            </div>
          </motion.div>
        )}

        {state === 'reveal' && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="z-10 max-w-lg w-full text-center space-y-8 p-6"
          >
            {/* Title Section */}
            <div className="space-y-2">
              <motion.h1
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3, type: 'spring' }}
                className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-[#ffd700] via-[#00ff88] to-[#00c4ff] bg-clip-text text-transparent"
              >
                {t.successTitle}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.6 }}
                className="text-xs md:text-sm text-slate-400"
              >
                {t.successSubtitle}
              </motion.p>
            </div>

            {/* Badges Container */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Coffee Starter Badge */}
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.8, type: 'spring' }}
                className="bg-[#060d1a]/85 border border-[#ffd700]/25 backdrop-blur-xl p-5 rounded-2xl glow-card flex flex-col items-center justify-center space-y-3"
              >
                <div className="p-3 bg-[#ffd700]/10 border border-[#ffd700]/30 text-[#ffd700] rounded-full">
                  <Coffee className="w-6 h-6 fill-current" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-slate-100">{t.badgeStarter}</h3>
                  <p className="text-[10px] text-slate-400 leading-normal">{t.badgeDesc}</p>
                </div>
                <span className="text-[9px] bg-[#ffd700]/10 border border-[#ffd700]/25 text-[#ffd700] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-widest">
                  starter
                </span>
              </motion.div>

              {/* Cumulative Promotion Badge (if newly awarded) */}
              {isNewTier && donorProfile?.badgeTier && (
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 3.8, type: 'spring' }}
                  className="bg-[#060d1a]/85 border border-[#00c4ff]/25 backdrop-blur-xl p-5 rounded-2xl flex flex-col items-center justify-center space-y-3"
                >
                  <div className={`p-3 rounded-full border ${
                    donorProfile.badgeTier === 'gold' ? 'bg-[#ffd700]/10 border-[#ffd700]/30 text-[#ffd700]' :
                    donorProfile.badgeTier === 'silver' ? 'bg-slate-400/10 border-slate-400/30 text-slate-300' :
                    'bg-amber-700/10 border-amber-700/30 text-amber-600'
                  }`}>
                    <Award className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xs font-bold text-slate-100">
                      {donorProfile.badgeTier === 'gold' ? t.gold :
                       donorProfile.badgeTier === 'silver' ? t.silver : t.bronze}
                    </h3>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      {t.newTierAwarded(donorProfile.badgeTier)}
                    </p>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase tracking-widest border ${
                    donorProfile.badgeTier === 'gold' ? 'bg-[#ffd700]/10 border-[#ffd700]/25 text-[#ffd700]' :
                    donorProfile.badgeTier === 'silver' ? 'bg-slate-400/10 border-slate-400/25 text-slate-300' :
                    'bg-amber-700/10 border-amber-700/25 text-amber-600'
                  }`}>
                    {donorProfile.badgeTier}
                  </span>
                </motion.div>
              )}
            </div>

            {/* SYNC Earned Reveal */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 1, opacity: 1 }}
              transition={{ duration: 0.6, delay: 1.5 }}
              className="bg-[#060d1a]/80 border border-slate-800/80 p-6 rounded-2xl space-y-3"
            >
              <span className="text-xs font-semibold tracking-wider text-[#00c4ff] uppercase">
                {t.syncEarned}
              </span>
              <div className="flex items-center justify-center space-x-2.5">
                <Coins className="w-8 h-8 text-[#ffd700] animate-bounce-slow" />
                <span className="text-5xl font-mono font-extrabold text-[#ffd700] tracking-tight">
                  +{displayedCoins}
                </span>
                <span className="text-xl font-extrabold text-[#ffd700] font-mono select-none">SYNC</span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                {t.totalBalance}: <span className="font-mono text-slate-400 font-semibold">{donorProfile?.coinsBalance ?? 0} SYNC</span>
              </div>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: isNewTier ? 4.8 : 3.8 }}
              className="flex flex-col sm:flex-row gap-3 justify-center pt-2"
            >
              <Link href="/play" className="px-6 py-3 bg-gradient-to-r from-[#00ff88] to-[#00c4ff] text-[#030712] font-extrabold rounded-xl text-sm transition-all duration-150 shadow-lg shadow-emerald-500/10 hover:opacity-90 flex items-center justify-center space-x-2">
                <span>{t.btnBack}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/donate" className="px-6 py-3 border border-slate-800 bg-slate-900/30 text-slate-300 font-extrabold rounded-xl text-sm transition-all duration-150 hover:bg-slate-900/60 flex items-center justify-center">
                {t.btnDonate}
              </Link>
            </motion.div>
          </motion.div>
        )}

        {state === 'timeout' && (
          <motion.div
            key="timeout"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="z-10 text-center max-w-md w-full bg-[#060d1a]/85 border border-amber-500/20 backdrop-blur-xl p-8 rounded-2xl shadow-2xl space-y-6"
          >
            <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-full mx-auto flex items-center justify-center shadow-lg shadow-amber-500/5">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-bold text-slate-100">{t.timeoutTitle}</h2>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                {t.timeoutDesc}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link href="/play" className="px-5 py-2.5 bg-gradient-to-r from-[#00ff88] to-[#00c4ff] text-[#030712] font-extrabold rounded-xl text-xs transition-all duration-150 hover:opacity-90 flex items-center justify-center space-x-1">
                <span>{t.btnBack}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link href="/profile" className="px-5 py-2.5 border border-slate-800 bg-slate-900/30 text-slate-300 font-extrabold rounded-xl text-xs transition-all duration-150 hover:bg-slate-900/60 flex items-center justify-center">
                {t.btnProfile}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
