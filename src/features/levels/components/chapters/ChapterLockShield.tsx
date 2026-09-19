'use client';

import React from 'react';
import { Lock } from 'lucide-react';
import { useT } from '@/contexts/LanguageContext';
import { GameIcon } from '@/components/icons';
import type { LevelThemeDefinition } from '../../themes/types';

export interface ChapterLockShieldProps {
  chapterName: string;
  requiredStars: number;
  currentStars: number;
  themeDef: LevelThemeDefinition;
}

export function ChapterLockShield({
  chapterName,
  requiredStars,
  currentStars,
  themeDef,
}: ChapterLockShieldProps) {
  const t = useT();
  const pct = requiredStars > 0 ? Math.min(100, Math.round((currentStars / requiredStars) * 100)) : 100;
  const missingStars = Math.max(0, requiredStars - currentStars);

  return (
    <div
      className="relative flex flex-col items-center justify-center p-8 mx-auto my-6 w-full max-w-md rounded-2xl border text-center backdrop-blur-md transition-all duration-300 select-none shadow-2xl"
      style={{
        background: themeDef.lockShield.background,
        borderColor: themeDef.lockShield.border,
        boxShadow: `0 0 40px ${themeDef.lockShield.glow}`,
      }}
    >
      {/* Kilit İkonu ve Parıltı */}
      <div
        className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-full border-2"
        style={{
          borderColor: themeDef.accentColor,
          background: 'rgba(0, 0, 0, 0.4)',
          boxShadow: `0 0 24px ${themeDef.accentGlow}`,
        }}
      >
        <Lock size={34} color={themeDef.accentColor} strokeWidth={2.4} />
      </div>

      {/* Başlık ve Bölüm Adı */}
      <span className="text-[11px] font-extrabold tracking-widest uppercase text-slate-400">
        {t('levels.locked_sector')}
      </span>
      <h3 className="mt-1 text-xl font-black uppercase text-white tracking-wide">
        {chapterName}
      </h3>

      {/* İlerleme ve Yıldız Eşiği */}
      <div className="mt-6 w-full rounded-xl bg-white/[0.04] p-4 border border-white/[0.08]">
        <div className="flex items-center justify-between text-xs font-bold mb-2">
          <span className="text-slate-400">{t('levels.required_stars')}</span>
          <span className="flex items-center gap-1 text-yellow-400">
            <GameIcon name="star" size={13} color="#facc15" />
            <span className="text-white">{currentStars}</span> / {requiredStars} ⭐
          </span>
        </div>

        {/* İlerleme Çubuğu */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-black/40 border border-white/[0.05]">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${pct}%`,
              background: themeDef.accentColor,
              boxShadow: `0 0 8px ${themeDef.accentColor}`,
            }}
          />
        </div>

        <p className="mt-3 text-[11px] text-slate-400 leading-relaxed">
          {t('levels.unlock_stars_needed', { stars: missingStars })}
        </p>
      </div>
    </div>
  );
}
