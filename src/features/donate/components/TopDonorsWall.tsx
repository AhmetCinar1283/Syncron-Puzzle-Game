'use client';

import { motion } from 'framer-motion';
import { Award, Trophy, User, EyeOff } from 'lucide-react';
import type { DonorProfile, LOCAL_T } from '../lib/i18n';

type T = typeof LOCAL_T.en;

export function TopDonorsWall({
  t,
  topDonors,
  formatCurrency,
}: {
  t: T;
  topDonors: DonorProfile[];
  formatCurrency: (cents: number, curr: string, showDecimals?: boolean) => string;
}) {
  if (topDonors.length === 0) return null;

  return (
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
  );
}
