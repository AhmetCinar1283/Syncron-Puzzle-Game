'use client';

import { Heart } from 'lucide-react';

export function CapacitorBlockedView({ lang }: { lang: string }) {
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
