'use client';

import { motion } from 'framer-motion';
import { Coffee, Coins, Award, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { DonorProfile, LOCAL_T } from '../lib/i18n';

type T = typeof LOCAL_T.en;

export function RevealState({
  t,
  donorProfile,
  isNewTier,
  displayedCoins,
}: {
  t: T;
  donorProfile: DonorProfile | null;
  isNewTier: boolean;
  displayedCoins: number;
}) {
  return (
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
  );
}
