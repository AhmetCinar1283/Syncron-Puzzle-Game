'use client';

import React from 'react';
import { Lock, Sparkles, ChevronUp } from 'lucide-react';
import type { LevelThemeDefinition } from '../../themes/types';

export interface CircuitPortalNodeProps {
  xPercent: number;
  yPx: number;
  type: 'start' | 'end';
  isUnlocked: boolean;
  themeDef: LevelThemeDefinition;
  label: string;
  onActivate: () => void;
}

export function CircuitPortalNode({
  xPercent,
  yPx,
  type,
  isUnlocked,
  themeDef,
  label,
  onActivate,
}: CircuitPortalNodeProps) {
  const isStart = type === 'start';

  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center select-none z-20"
      style={{
        left: `${xPercent}%`,
        top: `${yPx}px`,
      }}
    >
      <button
        type="button"
        onClick={isUnlocked ? onActivate : undefined}
        disabled={!isUnlocked}
        aria-label={label}
        className={`group relative flex items-center justify-center rounded-2xl p-3 outline-none transition-all duration-300 ${
          isUnlocked
            ? 'cursor-pointer hover:scale-105 active:scale-95'
            : 'cursor-not-allowed opacity-50'
        }`}
        style={{
          width: 58,
          height: 58,
          background: isUnlocked
            ? `radial-gradient(circle, ${themeDef.accentColor}33 0%, #030712 100%)`
            : 'rgba(10, 15, 26, 0.8)',
          border: `2px solid ${isUnlocked ? themeDef.accentColor : 'rgba(255,255,255,0.1)'}`,
          boxShadow: isUnlocked
            ? `0 0 24px ${themeDef.accentGlow}, inset 0 0 12px ${themeDef.accentColor}40`
            : 'none',
        }}
      >
        {/* Dönen Kozmik Portal Halkası */}
        {isUnlocked && (
          <span
            className="pointer-events-none absolute -inset-2 rounded-2xl border border-dashed animate-spin opacity-70"
            style={{
              borderColor: themeDef.accentColor,
              animationDuration: isStart ? '12s' : '8s',
            }}
          />
        )}

        {/* Portal İkonu */}
        {isUnlocked ? (
          <div className="flex flex-col items-center text-white">
            {isStart ? (
              <ChevronUp size={22} style={{ color: themeDef.accentColor }} />
            ) : (
              <Sparkles size={20} style={{ color: themeDef.accentColor }} />
            )}
          </div>
        ) : (
          <Lock size={18} className="text-slate-500" />
        )}
      </button>

      {/* Portal Etiketi */}
      <span
        className="mt-2 rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-center"
        style={{
          color: isUnlocked ? themeDef.accentColor : '#64748b',
          background: 'rgba(0, 0, 0, 0.6)',
          border: `1px solid ${isUnlocked ? `${themeDef.accentColor}40` : 'rgba(255,255,255,0.08)'}`,
          backdropFilter: 'blur(4px)',
        }}
      >
        {label}
      </span>
    </div>
  );
}
