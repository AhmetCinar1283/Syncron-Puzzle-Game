'use client';

import { motion } from 'framer-motion';
import { Coffee } from 'lucide-react';
import type { LOCAL_T } from '../lib/i18n';

type T = typeof LOCAL_T.en;

export function LoadingState({ t, loadingMsg, progress }: { t: T; loadingMsg: string; progress: number }) {
  return (
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
  );
}
