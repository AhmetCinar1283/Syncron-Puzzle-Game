'use client';

import type { StoredLevel, StoredPlayedLevel } from '@/app/src/lib/db';
import { DIFFICULTY_COLORS } from '../mapThemes';

type LevelEntry = StoredLevel & { id: number };

export interface LevelDetailPanelProps {
  level: LevelEntry;
  index: number;
  isLocked: boolean;
  playedData?: StoredPlayedLevel;
  accentColor: string;
  isGamepadConnected: boolean;
  onPlay: () => void;
  t: (key: string) => string;
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

/**
 * Seçili seviyenin özet kartı. Dock'un TAM üstünde sabit yükseklikte (`--panel-h`) durur;
 * harita/liste kaydırma alanı bu yüksekliği `padding-bottom` olarak zaten hesaba katıyor,
 * yani hiçbir düğüm bu panelin altında kalmaz.
 */
export function LevelDetailPanel({ level, index, isLocked, playedData, accentColor, isGamepadConnected, onPlay, t }: LevelDetailPanelProps) {
  const difficultyColor = level.difficulty ? DIFFICULTY_COLORS[level.difficulty] : accentColor;

  return (
    <div
      className="absolute inset-x-2 z-20 flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#080c1c]/85 px-3 backdrop-blur-md"
      style={{ bottom: 'calc(var(--dock-h) + 8px)', height: 'calc(var(--panel-h) - 8px)' }}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-600">SEVİYE {index + 1}</span>
        <span className="truncate text-sm font-bold text-slate-100">{isLocked ? '🔒 Kilitli Bölüm' : level.name}</span>
        <div className="mt-0.5 flex items-center gap-1.5">
          {level.difficulty && (
            <span
              className="rounded px-1.5 py-0.5 text-[9px] font-extrabold"
              style={{ color: difficultyColor, background: `${difficultyColor}12`, border: `1px solid ${difficultyColor}30` }}
            >
              {t(`difficulty.${level.difficulty}`)}
            </span>
          )}
          {playedData && (
            <span className="text-[9px] text-slate-500">
              {playedData.moveCount} Hamle · {formatTime(playedData.timeSpent)}
            </span>
          )}
        </div>
      </div>

      {playedData && (
        <div className="flex gap-0.5">
          {[1, 2, 3].map((n) => (
            <span key={n} className="text-sm" style={{ color: n <= (playedData.stars ?? 0) ? '#ffd700' : 'rgba(255,255,255,0.1)' }}>
              ★
            </span>
          ))}
        </div>
      )}

      <button
        onClick={onPlay}
        disabled={isLocked}
        className="flex shrink-0 items-center gap-1 rounded-xl px-4 py-2 text-[11px] font-extrabold uppercase tracking-wider disabled:cursor-not-allowed disabled:text-slate-600"
        style={{
          background: isLocked ? 'rgba(71,85,105,0.1)' : `linear-gradient(135deg, ${accentColor}18 0%, ${accentColor}30 100%)`,
          border: `1px solid ${isLocked ? 'rgba(71,85,105,0.2)' : `${accentColor}60`}`,
          color: isLocked ? undefined : '#fff',
        }}
      >
        <span>{isLocked ? 'KİLİTLİ' : 'OYNAT'}</span>
        {!isLocked && <span>▶</span>}
        {!isLocked && isGamepadConnected && (
          <span className="ml-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-400 text-[9px] font-extrabold text-[#030712]">
            A
          </span>
        )}
      </button>
    </div>
  );
}
