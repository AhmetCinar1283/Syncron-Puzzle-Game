'use client';

import { useState, useRef, useCallback, type MouseEvent, type PointerEvent, type ReactNode } from 'react';
import type { StoredLevel, StoredPlayedLevel } from '@/services/db';
import { useT } from '@/contexts/LanguageContext';
import { DIFFICULTY_COLORS } from '../lib/mapThemes';
import { GameIcon } from '@/components/icons';
import { SkippedBadge } from './SkippedBadge';

type LevelEntry = StoredLevel & { id: number };

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function StarDisplay({ stars }: { stars: 1 | 2 | 3 }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] tracking-widest">
      {[1, 2, 3].map((n) => (
        <GameIcon
          key={n}
          name="star"
          size={11}
          color={n <= stars ? '#ffd700' : '#1e3a5f'}
          style={{ filter: n <= stars ? 'drop-shadow(0 0 4px rgba(255,215,0,0.5))' : undefined }}
        />
      ))}
    </span>
  );
}

// ─── Bağlam menüsü ──────────────────────────────────────────────────────────

interface MenuProps {
  x: number;
  y: number;
  isPreset: boolean;
  index: number;
  total: number;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onClose: () => void;
  t: (key: string) => string;
}

function ContextMenu({ x, y, isPreset, index, total, onEdit, onDelete, onMoveUp, onMoveDown, onClose, t }: MenuProps) {
  return (
    <>
      <div className="fixed inset-0 z-[300]" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div
        className="fixed z-[301] min-w-[170px] rounded-[10px] border border-cyan-400/25 bg-[#0d1425]/85 py-[5px] shadow-[0_8px_32px_rgba(0,0,0,0.6),0_0_24px_rgba(0,196,255,0.06)] backdrop-blur-md"
        style={{ left: x, top: y }}
      >
        <MenuItem color="#00c4ff" icon={<GameIcon name="pencil" size={14} />} label={t('list.edit')} onClick={() => { onEdit(); onClose(); }} />
        {!isPreset && (
          <>
            <MenuItem color="#9333ea" icon="↑" label={t('list.move_up')} onClick={() => { onMoveUp(); onClose(); }} disabled={index === 0} />
            <MenuItem color="#9333ea" icon="↓" label={t('list.move_down')} onClick={() => { onMoveDown(); onClose(); }} disabled={index >= total - 1} />
          </>
        )}
        <div className="my-1 h-px bg-white/[0.06]" />
        <MenuItem color="#ef4444" icon={<GameIcon name="close" size={14} />} label={t('list.delete')} onClick={() => { onDelete(); onClose(); }} />
      </div>
    </>
  );
}

function MenuItem({ color, icon, label, onClick, disabled }: { color: string; icon: ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      className="flex w-full items-center gap-2.5 px-4 py-2 text-[13px] tracking-wide transition-colors hover:enabled:bg-white/[0.05]"
      style={{ color: disabled ? '#334155' : color, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.4 : 1 }}
      disabled={disabled}
    >
      <span className="w-3.5 shrink-0 text-center">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

// ─── Kart ───────────────────────────────────────────────────────────────────

export interface RowProps {
  level: LevelEntry;
  index: number;
  total: number;
  isPreset: boolean;
  isAdmin?: boolean;
  isMobile: boolean;
  cols: string; // API uyumluluğu için, kullanılmıyor
  playedLevel?: StoredPlayedLevel;
  isLocked?: boolean;
  /** Ödüllü reklamla atlandı (05); çözülmüşse `playedLevel` önceliklidir. */
  isSkipped?: boolean;
  onPlay: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  gamepadSelected?: boolean;
}

export function LevelRow({
  level, index, total, isPreset, isAdmin, isMobile, playedLevel, isLocked, isSkipped,
  onPlay, onEdit, onDelete, onMoveUp, onMoveDown, gamepadSelected,
}: RowProps) {
  const t = useT();
  const [hovered, setHovered] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressClick = useRef(false);

  const locked = isLocked ?? false;
  const canAct = !isPreset || isAdmin;

  const openCtx = useCallback((clientX: number, clientY: number) => {
    if (!canAct) return;
    suppressClick.current = true;
    const menuW = 170, menuH = 160;
    setCtxMenu({ x: Math.min(clientX, window.innerWidth - menuW - 8), y: Math.min(clientY, window.innerHeight - menuH - 8) });
  }, [canAct]);

  const handleContextMenu = useCallback((e: MouseEvent) => {
    if (!canAct) return;
    e.preventDefault();
    openCtx(e.clientX, e.clientY);
  }, [canAct, openCtx]);

  const handlePointerDown = useCallback((e: PointerEvent) => {
    if (!canAct || e.button !== 0) return;
    longPressRef.current = setTimeout(() => openCtx(e.clientX, e.clientY), 550);
  }, [canAct, openCtx]);

  const cancelLongPress = useCallback(() => {
    if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null; }
  }, []);

  const handleClick = useCallback(() => {
    if (suppressClick.current) { suppressClick.current = false; return; }
    if (!locked) onPlay();
  }, [locked, onPlay]);

  const diffColor = level.difficulty ? DIFFICULTY_COLORS[level.difficulty] : undefined;
  const accent = diffColor || '#00c4ff';
  const active = hovered || gamepadSelected;

  return (
    <>
      <div
        onContextMenu={handleContextMenu}
        onPointerDown={handlePointerDown}
        onPointerUp={cancelLongPress}
        onPointerLeave={cancelLongPress}
        onPointerMove={cancelLongPress}
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative flex h-36 select-none flex-col justify-between rounded-xl p-3 outline-none transition-all duration-200"
        style={{
          background: active ? 'rgba(17,24,39,0.9)' : 'rgba(13,20,37,0.45)',
          border: `1px solid ${active ? accent : 'rgba(255,255,255,0.08)'}`,
          cursor: locked ? 'not-allowed' : 'pointer',
          boxShadow: active ? `0 0 15px ${accent}40, inset 0 0 10px ${accent}20` : '0 8px 24px rgba(0,0,0,0.35)',
        }}
      >
        {/* Üst satır */}
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <span
              className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] font-extrabold"
              style={{ color: accent, background: `${accent}15`, border: `1px solid ${accent}40` }}
            >
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="truncate text-[13px] font-bold" style={{ color: locked ? '#475569' : '#f1f5f9' }}>
              {locked ? (
                <span className="flex items-center gap-1" style={{ color: '#475569' }}>
                  <GameIcon name="lock" size={13} color="#475569" /> {t('levels.locked') || 'Kilitli'}
                </span>
              ) : level.name}
            </span>
          </div>

          {level.difficulty && (
            <span
              className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide"
              style={{ color: diffColor, background: `${diffColor}12`, border: `1px solid ${diffColor}30` }}
            >
              {t(`difficulty.${level.difficulty}`)}
            </span>
          )}
        </div>

        {/* Orta satır */}
        <div className="flex w-full flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium text-slate-500">{level.width}×{level.height} Grid</span>
            {level.creatorName && (
              <>
                <span className="text-[10px] text-white/15">•</span>
                <span className="max-w-[100px] truncate text-[11px] font-semibold text-cyan-400" title={level.creatorName}>
                  by {level.creatorName}
                </span>
              </>
            )}
          </div>
          {level.trailCollision && (
            <div className="mt-0.5 flex items-center">
              <span className="inline-flex items-center gap-1 rounded border border-red-500/25 bg-red-500/[0.08] px-1 py-0.5 text-[9px] font-extrabold tracking-wide text-red-500">
                <GameIcon name="lightning" size={11} color="#ef4444" /> {t('editor.trail_collision') || 'TRAIL'}
              </span>
            </div>
          )}
        </div>

        {/* Alt satır */}
        <div className="mt-auto flex w-full items-end justify-between">
          <div className="flex flex-col gap-0.5">
            {playedLevel ? (
              <>
                <StarDisplay stars={playedLevel.stars || 1} />
                <span className="mt-0.5 text-[10px] font-medium text-slate-400">
                  {playedLevel.moveCount} {t('hud.moves')?.replace(':', '') || 'Hamle'} · {formatTime(playedLevel.timeSpent)}
                </span>
              </>
            ) : isSkipped ? (
              <SkippedBadge />
            ) : (
              <span className="text-[10px] italic text-slate-600">{t('levels.not_played') || 'Oynanmadı'}</span>
            )}
          </div>

          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {canAct && !isMobile && active && (
              <div className="flex items-center gap-1">
                {!isPreset && (
                  <div className="flex flex-col gap-0.5">
                    <ArrowBtn onClick={onMoveUp} disabled={index === 0} label="▲" title={t('list.move_up')} />
                    <ArrowBtn onClick={onMoveDown} disabled={index >= total - 1} label="▼" title={t('list.move_down')} />
                  </div>
                )}
                <SmallBtn onClick={onEdit} color="#00c4ff" label={<GameIcon name="pencil" size={13} />} title={t('list.edit')} />
                <SmallBtn onClick={onDelete} color="#ef4444" label={<GameIcon name="close" size={13} />} title={t('list.delete')} />
              </div>
            )}

            {canAct && isMobile && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const rect = e.currentTarget.getBoundingClientRect();
                  openCtx(rect.left, rect.bottom);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-sm text-slate-400"
              >
                ⋮
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!locked) onPlay();
              }}
              disabled={locked}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-xs transition-all"
              style={{
                background: locked ? 'rgba(71,85,105,0.1)' : `linear-gradient(135deg, ${accent}15 0%, ${accent}30 100%)`,
                border: `1px solid ${locked ? 'rgba(71,85,105,0.2)' : `${accent}60`}`,
                color: locked ? '#475569' : '#fff',
                boxShadow: locked ? 'none' : `0 0 10px ${accent}20`,
                cursor: locked ? 'not-allowed' : 'pointer',
              }}
            >
              {locked ? <GameIcon name="lock" size={13} color="#475569" /> : '▶'}
            </button>
          </div>
        </div>
      </div>

      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x} y={ctxMenu.y} isPreset={isPreset} index={index} total={total}
          onEdit={onEdit} onDelete={onDelete} onMoveUp={onMoveUp} onMoveDown={onMoveDown}
          onClose={() => setCtxMenu(null)} t={t}
        />
      )}
    </>
  );
}

function ArrowBtn({ onClick, disabled, label, title }: { onClick: () => void; disabled: boolean; label: string; title?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex h-5 w-[22px] items-center justify-center rounded border border-white/[0.07] bg-white/[0.02] text-[11px]"
      style={{ color: disabled ? '#1e3a5f' : '#475569', cursor: disabled ? 'not-allowed' : 'pointer' }}
    >
      {label}
    </button>
  );
}

function SmallBtn({ onClick, color, label, title }: { onClick: () => void; color: string; label: ReactNode; title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex h-8 w-8 items-center justify-center rounded-[7px] text-[13px] transition-all"
      style={{ background: `${color}0d`, border: `1px solid ${color}30`, color }}
    >
      {label}
    </button>
  );
}
