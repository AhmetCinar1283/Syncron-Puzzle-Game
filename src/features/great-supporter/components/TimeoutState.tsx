'use client';

import { motion } from 'framer-motion';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import type { LOCAL_T } from '../lib/i18n';

type T = typeof LOCAL_T.en;

export function TimeoutState({ t }: { t: T }) {
  return (
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
  );
}
