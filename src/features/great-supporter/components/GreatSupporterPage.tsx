'use client';

import { AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useGreatSupporterPage } from '../hooks/useGreatSupporterPage';
import { CapacitorBlockedView } from './CapacitorBlockedView';
import { ConfettiOverlay } from './ConfettiOverlay';
import { LoadingState } from './LoadingState';
import { RevealState } from './RevealState';
import { TimeoutState } from './TimeoutState';

export function GreatSupporterPage() {
  const {
    lang,
    t,
    state,
    isCapacitor,
    authLoading,
    loadingMsg,
    progress,
    donorProfile,
    isNewTier,
    displayedCoins,
  } = useGreatSupporterPage();

  if (isCapacitor) {
    return <CapacitorBlockedView lang={lang} />;
  }

  if (authLoading) {
    return (
      <main className="min-h-[100dvh] bg-[#030712] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#00c4ff] animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-transparent text-[#e2e8f0] relative overflow-hidden flex items-center justify-center p-4">
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
      {state === 'reveal' && <ConfettiOverlay />}

      <AnimatePresence mode="wait">
        {state === 'loading' && <LoadingState t={t} loadingMsg={loadingMsg} progress={progress} />}

        {state === 'reveal' && (
          <RevealState t={t} donorProfile={donorProfile} isNewTier={isNewTier} displayedCoins={displayedCoins} />
        )}

        {state === 'timeout' && <TimeoutState t={t} />}
      </AnimatePresence>
    </main>
  );
}
