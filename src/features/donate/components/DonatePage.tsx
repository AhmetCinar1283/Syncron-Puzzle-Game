'use client';

import { motion } from 'framer-motion';
import { MascotBuddy } from '@/components/ui';
import { useDonatePage } from '../hooks/useDonatePage';
import { CapacitorBlockedView } from './CapacitorBlockedView';
import { DonateForm } from './DonateForm';
import { DonorDetailsPanel } from './DonorDetailsPanel';
import { TopDonorsWall } from './TopDonorsWall';

export function DonatePage() {
  const {
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
  } = useDonatePage();

  if (isCapacitor) {
    return <CapacitorBlockedView lang={lang} />;
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
    <main className="min-h-[100dvh] bg-transparent text-[#e2e8f0] py-12 px-4 relative overflow-hidden flex flex-col items-center">
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
            className="inline-flex mb-2"
          >
            <MascotBuddy size={72} greet="love" moods={['love', 'happy', 'wink']} />
          </motion.div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-[#00ff88] to-[#00c4ff] bg-clip-text text-transparent">
            {t.title}
          </h1>
          <p className="text-sm md:text-base text-slate-400 max-w-xl mx-auto">
            {t.subtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <DonateForm
            t={t}
            selectedAmount={selectedAmount}
            customAmount={customAmount}
            donorName={donorName}
            setDonorName={setDonorName}
            isAnonCheck={isAnonCheck}
            setIsAnonCheck={setIsAnonCheck}
            errorMsg={errorMsg}
            isSubmitting={isSubmitting}
            onAmountChange={handleAmountChange}
            onCustomAmountChange={handleCustomAmountChange}
            onSubmit={handleSubmit}
          />

          <DonorDetailsPanel
            t={t}
            user={user}
            isGuest={isGuest}
            userProfile={userProfile}
            formatCurrency={formatCurrency}
          />
        </div>

        <TopDonorsWall t={t} topDonors={topDonors} formatCurrency={formatCurrency} />

      </div>
    </main>
  );
}
