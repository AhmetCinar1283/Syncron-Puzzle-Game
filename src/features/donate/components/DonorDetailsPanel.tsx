'use client';

import { motion } from 'framer-motion';
import { Award, Shield } from 'lucide-react';
import type { DonorProfile, LOCAL_T } from '../lib/i18n';
import type { useAuth } from '@/hooks/useAuth';

type T = typeof LOCAL_T.en;

export function DonorDetailsPanel({
  t,
  user,
  isGuest,
  userProfile,
  formatCurrency,
}: {
  t: T;
  user: ReturnType<typeof useAuth>['user'];
  isGuest: boolean;
  userProfile: DonorProfile | null;
  formatCurrency: (cents: number, curr: string, showDecimals?: boolean) => string;
}) {
  return (
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
  );
}
