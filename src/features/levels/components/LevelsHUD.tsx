'use client';

import { useT } from '@/contexts/LanguageContext';
import { GameIcon } from '@/components/icons';

export interface LevelsHUDProps {
  isMobile: boolean;
  activeTab: 'campaign' | 'custom';
  onChangeTab: (tab: 'campaign' | 'custom') => void;
  totalScore: number;
  totalStars?: number;
  syncing: boolean;
  onRefresh: () => void;
  onBack: () => void;
  onNewLevel: () => void;
  isGamepadConnected: boolean;
  labels: { back: string; campaign: string; custom: string; newLevel: string };
  /** Editör (dolayısıyla "özel leveller" sekmesi ve "yeni level") portal build'lerinde kapalıdır. */
  showCustomTab?: boolean;
}

/**
 * Üst HUD çubuğu — yüksekliği sarmalayıcıdan alır (LevelsPage: içerik + safe-area üst payı).
 * Tüm alt bileşenler bu barın sabit olduğunu bilerek yerleşir; artık bağımsız
 * "position: absolute + sihirli piksel" yok.
 */
export function LevelsHUD({
  isMobile,
  activeTab,
  onChangeTab,
  totalScore,
  totalStars,
  syncing,
  onRefresh,
  onBack,
  onNewLevel,
  isGamepadConnected,
  labels,
  showCustomTab = true,
}: LevelsHUDProps) {
  const t = useT();

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-between gap-2 border-b border-white/[0.08] bg-[#080c1c]/80 px-3 backdrop-blur-md"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <button
        onClick={onBack}
        className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-bold tracking-wide text-slate-400 transition-colors hover:text-slate-200"
      >
        <span>←</span>
        {!isMobile && <span>{labels.back}</span>}
        {isGamepadConnected && <GamepadBadge letter="B" color="#ef4444" />}
      </button>

      {showCustomTab ? (
        <div className="relative flex rounded-lg border border-white/5 bg-black/30 p-0.5">
          <TabButton active={activeTab === 'campaign'} color="#00ff88" onClick={() => onChangeTab('campaign')}>
            {labels.campaign}
          </TabButton>
          <TabButton active={activeTab === 'custom'} color="#00c4ff" onClick={() => onChangeTab('custom')}>
            {labels.custom}
          </TabButton>
        </div>
      ) : (
        <div />
      )}

      <div className="flex items-center gap-1.5">
        {(totalStars !== undefined ? totalStars > 0 : false) && (
          <div className="flex items-center gap-1 rounded-lg border border-yellow-400/30 bg-yellow-400/[0.08] px-2 py-1 text-[11px] font-black text-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.2)]">
            <GameIcon name="star" size={13} color="#facc15" />
            <span>{totalStars}</span>
          </div>
        )}
        {totalScore > 0 && (
          <div className="hidden sm:flex items-center gap-1 rounded-lg border border-cyan-400/20 bg-cyan-400/[0.06] px-2 py-1 text-[11px] font-extrabold text-cyan-400">
            <GameIcon name="trophy" size={13} color="#38bdf8" />
            <span>{totalScore}</span>
          </div>
        )}
        <button
          onClick={onRefresh}
          disabled={syncing}
          title={t('levels.refresh_tooltip')}
          className="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-slate-400 disabled:cursor-not-allowed disabled:text-slate-700"
        >
          <span className={syncing ? 'inline-block animate-spin' : 'inline-block'}>↻</span>
        </button>
        {showCustomTab && (
          <button
            onClick={onNewLevel}
            className="rounded-lg border border-cyan-400/45 bg-cyan-400/10 px-2.5 py-1.5 text-[11px] font-extrabold tracking-wide text-cyan-400"
          >
            {isMobile ? '+' : labels.newLevel}
          </button>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, color, onClick, children }: { active: boolean; color: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="rounded-md px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors"
      style={{ background: active ? `${color}14` : 'transparent', color: active ? color : '#64748b' }}
    >
      {children}
    </button>
  );
}

export function GamepadBadge({ letter, color }: { letter: string; color: string }) {
  return (
    <span
      className="ml-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] font-extrabold text-white"
      style={{ background: color, boxShadow: `0 0 5px ${color}` }}
    >
      {letter}
    </span>
  );
}
