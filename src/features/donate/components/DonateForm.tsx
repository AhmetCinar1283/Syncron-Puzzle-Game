'use client';

import { motion } from 'framer-motion';
import { DollarSign, CheckCircle2, User } from 'lucide-react';
import { QUICK_AMOUNTS, LOCAL_T } from '../lib/i18n';

type T = typeof LOCAL_T.en;

export function DonateForm({
  t,
  selectedAmount,
  customAmount,
  donorName,
  setDonorName,
  isAnonCheck,
  setIsAnonCheck,
  errorMsg,
  isSubmitting,
  onAmountChange,
  onCustomAmountChange,
  onSubmit,
}: {
  t: T;
  selectedAmount: number | null;
  customAmount: string;
  donorName: string;
  setDonorName: (v: string) => void;
  isAnonCheck: boolean;
  setIsAnonCheck: (v: boolean) => void;
  errorMsg: string;
  isSubmitting: boolean;
  onAmountChange: (amount: number) => void;
  onCustomAmountChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <motion.div
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="bg-[#060d1a]/85 backdrop-blur-xl border border-sky-500/20 rounded-2xl p-6 shadow-2xl shadow-sky-500/5 flex flex-col justify-between"
    >
      <form onSubmit={onSubmit} className="space-y-6">

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
                onClick={() => onAmountChange(amount)}
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
              onChange={(e) => onCustomAmountChange(e.target.value)}
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
  );
}
