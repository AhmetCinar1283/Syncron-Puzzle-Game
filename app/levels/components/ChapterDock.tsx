'use client';

export interface ChapterInfo {
  id: string;
  name: string;
  completed: number;
  total: number;
}

export interface ChapterDockProps {
  chapters: ChapterInfo[];
  selectedChapterId: string;
  onSelectChapter: (id: string) => void;
  viewMode: 'map' | 'list';
  onToggleView: () => void;
  onJumpToCurrent: () => void;
  isMobile: boolean;
  isGamepadConnected: boolean;
}

/**
 * Alt dock: bölüm (chapter) seçici + görünüm değiştirme + "aktif seviyeye dön" — HEPSİ AYNI BARDA.
 * Önceki sürümde bu üç kontrol birbirinden bağımsız `position: absolute` + sabit piksel
 * offsetleriyle yerleşiyordu ve detay paneli açıldığında çakışabiliyordu. Artık tek satır,
 * sabit yükseklik (`--dock-h`), her zaman aynı yerde.
 */
export function ChapterDock({
  chapters,
  selectedChapterId,
  onSelectChapter,
  viewMode,
  onToggleView,
  onJumpToCurrent,
  isMobile,
  isGamepadConnected,
}: ChapterDockProps) {
  if (chapters.length === 0) return null;

  return (
    <div
      className="absolute inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t border-white/[0.08] bg-[#080c1c]/85 px-2 backdrop-blur-md"
      style={{ height: 'var(--dock-h)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {chapters.map((c, idx) => {
          const isActive = c.id === selectedChapterId;
          const pct = c.total > 0 ? (c.completed / c.total) * 100 : 0;
          return (
            <button
              key={c.id}
              onClick={() => onSelectChapter(c.id)}
              className="flex shrink-0 flex-col gap-0.5 rounded-lg border px-2.5 py-1.5 text-left transition-colors"
              style={{
                minWidth: isMobile ? 118 : 150,
                background: isActive ? 'rgba(255,215,0,0.09)' : 'rgba(255,255,255,0.03)',
                borderColor: isActive ? 'rgba(255,215,0,0.5)' : 'rgba(255,255,255,0.08)',
                color: isActive ? '#ffd700' : '#94a3b8',
              }}
            >
              <span className="text-[8px] font-extrabold uppercase tracking-wider" style={{ color: isActive ? '#ffd700' : '#475569' }}>
                Chapter {idx + 1}
              </span>
              <span className="truncate text-[11px] font-bold">{c.name}</span>
              {c.total > 0 && (
                <div className="mt-0.5 flex items-center gap-1.5">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: isActive ? '#ffd700' : '#00ff88' }}
                    />
                  </div>
                  <span className="text-[9px] font-bold tabular-nums" style={{ color: isActive ? '#ffd700' : '#475569' }}>
                    ★{c.completed}/{c.total}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          onClick={onJumpToCurrent}
          title="Kaldığım seviyeye git"
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-yellow-400/30 bg-white/[0.04] text-base text-yellow-400"
        >
          🎯
        </button>
        <button
          onClick={onToggleView}
          title={viewMode === 'map' ? 'Liste görünümü' : 'Harita görünümü'}
          className="relative flex h-10 w-10 items-center justify-center rounded-full border border-emerald-400/30 bg-white/[0.04] text-base text-emerald-400"
        >
          {viewMode === 'map' ? '📋' : '🗺️'}
          {isGamepadConnected && (
            <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[#030712] bg-sky-400 text-[8px] font-black text-[#030712]">
              Y
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
