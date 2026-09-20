'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Edit3, X, User, ShieldAlert, Award, Compass, RefreshCw } from 'lucide-react';
import type { LevelData, CellType } from '@/game-engine/level-format';
import type { StoredPlayedLevel } from '@/services/db';
import LevelMiniPreview from '@/game-engine/components/LevelMiniPreview';
import PlayTestOverlay from '@/game-engine/components/PlayTestOverlay';
import { DIFFICULTY_COLORS, DIFFICULTY_LABELS } from '@/features/editor/lib/editorConfig';

export interface LevelPreviewMetadata {
  name?: string;
  width?: number;
  height?: number;
  difficulty?: 1 | 2 | 3 | 4;
  creatorName?: string;
  position?: number;
  partName?: string;
  firestoreId?: string;
  playedData?: StoredPlayedLevel;
  isSkipped?: boolean;
  isLocked?: boolean;
}

export interface LevelPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  levelId?: string | number | null;
  levelData?: LevelData | null;
  metadata?: LevelPreviewMetadata;
  mode: 'test' | 'play';
  onPlay?: (level: LevelData) => void;
  onEdit?: (firestoreIdOrId: string | number) => void;
}

function normalizeToLevelData(raw: any): LevelData {
  let grid: CellType[][] = [];
  if (typeof raw.grid === 'string') {
    try {
      grid = JSON.parse(raw.grid);
    } catch {
      grid = [];
    }
  } else if (Array.isArray(raw.grid)) {
    grid = raw.grid;
  }

  let rooms = raw.rooms;
  if (Array.isArray(rooms)) {
    rooms = rooms.map((r: any) => ({
      ...r,
      grid: typeof r.grid === 'string' ? JSON.parse(r.grid) : r.grid,
    }));
  }

  const parsedW = raw.width || (grid[0]?.length ?? 5);
  const parsedH = raw.height || (grid.length ?? 5);

  return {
    ...raw,
    id: typeof raw.id === 'number' ? raw.id : 0,
    firestoreId: raw.firestoreId ?? (typeof raw.id === 'string' ? raw.id : undefined),
    name: raw.name ?? 'Untitled Level',
    width: parsedW,
    height: parsedH,
    grid,
    rooms: rooms && rooms.length > 0 ? rooms : undefined,
    initialObjects: raw.initialObjects ?? [],
    targets: raw.targets ?? [],
    initialBoxes: raw.initialBoxes ?? [],
    edges: raw.edges ?? { top: 'wall', bottom: 'wall', left: 'wall', right: 'wall' },
    trailCollision: !!raw.trailCollision,
    difficulty: raw.difficulty,
    creatorName: raw.creatorName,
    gameNotes: raw.gameNotes,
    creatorNotes: raw.creatorNotes,
  };
}

function formatDuration(s = 0): string {
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, '0')}`;
}

export default function LevelPreviewModal({
  isOpen,
  onClose,
  levelId,
  levelData: initialLevelData,
  metadata,
  mode,
  onPlay,
  onEdit,
}: LevelPreviewModalProps) {
  const [data, setData] = useState<LevelData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Esc tuşu ile kapatma
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isTesting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isTesting, onClose]);

  // Seviye verisini yükleme
  const loadData = useCallback(async () => {
    if (initialLevelData) {
      setData(normalizeToLevelData(initialLevelData));
      setLoading(false);
      setError(null);
      return;
    }

    if (!levelId) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (typeof levelId === 'string') {
        // Firestore ID ile çek
        const { getFirestoreLevel } = await import('@/services/firebase/adminLevels');
        const fl = await getFirestoreLevel(levelId);
        if (fl) {
          setData(normalizeToLevelData(fl));
        } else {
          setError('Seviye verisi bulunamadı.');
        }
      } else if (typeof levelId === 'number') {
        // Dexie ID ile yerel veritabanından çek
        const { getPresetLevelById, getUserLevelById } = await import('@/services/db');
        let lvl = (await getPresetLevelById(levelId)) || (await getUserLevelById(levelId));

        if (lvl && (!lvl.grid || (Array.isArray(lvl.grid) && lvl.grid.length === 0) || lvl.isNeedSync) && lvl.firestoreId) {
          // İhtiyaç varsa Firestore'dan önbelleğe tazele
          try {
            const { fetchAndCacheLevel } = await import('@/services/firebase/sync');
            await fetchAndCacheLevel(lvl.firestoreId, levelId);
            lvl = (await getPresetLevelById(levelId)) || lvl;
          } catch (syncErr) {
            console.warn('[LevelPreviewModal] Sync failed:', syncErr);
          }
        }

        if (lvl) {
          setData(normalizeToLevelData(lvl));
        } else {
          setError('Yerel veritabanında seviye bulunamadı.');
        }
      }
    } catch (err) {
      console.error('[LevelPreviewModal] Error loading level:', err);
      setError('Veri yüklenirken bir sorun oluştu.');
    } finally {
      setLoading(false);
    }
  }, [initialLevelData, levelId]);

  useEffect(() => {
    if (isOpen) {
      setIsTesting(false);
      loadData();
    } else {
      setData(null);
      setIsTesting(false);
      setError(null);
    }
  }, [isOpen, loadData]);

  const displayName = useMemo(() => {
    return data?.name || metadata?.name || 'Untitled Level';
  }, [data?.name, metadata?.name]);

  const difficulty = data?.difficulty ?? metadata?.difficulty;
  const difficultyColor = difficulty ? DIFFICULTY_COLORS[difficulty] : '#00c4ff';
  const difficultyLabel = difficulty ? DIFFICULTY_LABELS[difficulty] : null;

  const isMultiRoom = data?.rooms && data.rooms.length > 0;
  const dimensionsLabel = isMultiRoom
    ? `${data.rooms!.length} Odalı Harita`
    : `${data?.width ?? metadata?.width ?? '?'}×${data?.height ?? metadata?.height ?? '?'}`;

  const creator = data?.creatorName || metadata?.creatorName;
  const firestoreId = data?.firestoreId || metadata?.firestoreId || (typeof levelId === 'string' ? levelId : undefined);

  if (!isOpen) return null;

  // Test modu aktifse tam ekran overlay'i aç
  if (isTesting && data) {
    return (
      <PlayTestOverlay
        testLevel={data}
        setTestLevel={() => setIsTesting(false)}
      />
    );
  }

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 select-none"
        style={{
          background: 'rgba(3, 7, 18, 0.88)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-cyan-500/25 bg-[#060a14] shadow-[0_12px_45px_rgba(0,0,0,0.8),0_0_35px_rgba(0,196,255,0.1)] flex flex-col"
          style={{ maxHeight: '92vh' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 1. Üst Başlık Barı */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-cyan-500/15 bg-gradient-to-r from-cyan-950/30 to-transparent">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#00c4ff]" />
              <div className="min-w-0">
                <h2 className="text-base font-extrabold tracking-wide text-slate-100 truncate">
                  {displayName}
                </h2>
                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                  <span className="font-semibold text-cyan-300">{dimensionsLabel}</span>
                  {difficulty && (
                    <>
                      <span>·</span>
                      <span className="font-bold" style={{ color: difficultyColor }}>
                        {difficultyLabel}
                      </span>
                    </>
                  )}
                  {creator && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <User size={11} /> {creator}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/60 bg-slate-800/40 text-slate-400 hover:text-white hover:border-cyan-400/40 transition-colors"
              title="Kapat (Esc)"
            >
              <X size={16} />
            </button>
          </div>

          {/* 2. Gövde / İçerik */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <RefreshCw size={24} className="text-cyan-400 animate-spin" />
                <span className="text-xs tracking-wider text-slate-400 font-medium">
                  Harita yükleniyor...
                </span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
                <ShieldAlert size={28} className="text-rose-400" />
                <span className="text-xs text-rose-300 font-medium">{error}</span>
                <button
                  onClick={loadData}
                  className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-400/40 bg-cyan-500/10 text-xs font-semibold text-cyan-300 hover:bg-cyan-500/20"
                >
                  <RefreshCw size={12} /> Tekrar Dene
                </button>
              </div>
            ) : data ? (
              <>
                {/* Bulmaca Haritası Önizlemesi */}
                <div className="flex flex-col items-center justify-center p-3 rounded-xl border border-cyan-500/15 bg-[#03060d] shadow-inner min-h-[170px] overflow-hidden">
                  <LevelMiniPreview level={data} maxBoardSize={280} />
                </div>

                {/* Seviye Detay Rozetleri & İstatistikleri */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2">
                    <span className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                      Hedefler
                    </span>
                    <span className="text-sm font-black text-emerald-400">
                      {data.targets?.length ?? 0}
                    </span>
                  </div>
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2">
                    <span className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                      Oyuncular
                    </span>
                    <span className="text-sm font-black text-cyan-400">
                      {data.initialObjects?.length ?? 0}
                    </span>
                  </div>
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2">
                    <span className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                      Kutular
                    </span>
                    <span className="text-sm font-black text-amber-400">
                      {data.initialBoxes?.length ?? 0}
                    </span>
                  </div>
                  <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2">
                    <span className="block text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                      Çarpışma
                    </span>
                    <span
                      className={`text-xs font-extrabold ${
                        data.trailCollision ? 'text-rose-400' : 'text-slate-400'
                      }`}
                    >
                      {data.trailCollision ? 'Açık' : 'Kapalı'}
                    </span>
                  </div>
                </div>

                {/* Varsa Oynanış / Başarı Bilgisi (/levels için) */}
                {metadata?.playedData && (
                  <div className="flex items-center justify-between rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-3.5 py-2.5">
                    <div className="flex items-center gap-2">
                      <Award size={18} className="text-yellow-400" />
                      <div className="text-left">
                        <span className="block text-[10px] uppercase font-bold text-yellow-500 tracking-wider">
                          En İyi Derece
                        </span>
                        <span className="text-xs font-semibold text-slate-200">
                          {metadata.playedData.moveCount ?? '?'} Hamle · {formatDuration(metadata.playedData.timeSpent)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3].map((star) => (
                        <span
                          key={star}
                          className="text-sm"
                          style={{
                            color: star <= (metadata.playedData?.stars ?? 0) ? '#ffd700' : '#334155',
                          }}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Varsa Tasarımcı / Oyun Notu */}
                {(data.gameNotes || data.creatorNotes) && (
                  <div className="rounded-lg border border-slate-700/40 bg-slate-900/40 p-2.5 text-left text-[11px] text-slate-300">
                    <span className="block font-bold text-cyan-400 text-[10px] uppercase mb-1">
                      Bölüm Notu
                    </span>
                    <p className="line-clamp-3 leading-relaxed">
                      {data.gameNotes || data.creatorNotes}
                    </p>
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* 3. Alt Butonlar */}
          <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-cyan-500/15 bg-slate-950/70">
            {mode === 'test' ? (
              <>
                {firestoreId && (
                  <button
                    onClick={() => {
                      if (onEdit) {
                        onEdit(firestoreId);
                      } else {
                        window.location.href = `/editor?firestoreId=${firestoreId}`;
                      }
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-cyan-400/40 bg-cyan-500/10 text-xs font-bold text-cyan-300 hover:bg-cyan-500/20 active:scale-95 transition-all"
                  >
                    <Edit3 size={13} />
                    <span>Editörde Aç</span>
                  </button>
                )}

                <button
                  disabled={!data || loading}
                  onClick={() => setIsTesting(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-emerald-500/50 bg-gradient-to-r from-emerald-600 to-teal-500 text-xs font-extrabold text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.35)] hover:from-emerald-500 hover:to-teal-400 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play size={13} fill="currentColor" />
                  <span>Test Modunda Oyna</span>
                </button>
              </>
            ) : (
              <button
                disabled={!data || loading}
                onClick={() => {
                  if (data && onPlay) {
                    onPlay(data);
                  }
                }}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-cyan-400/50 bg-gradient-to-r from-cyan-500 to-blue-600 text-xs font-extrabold text-slate-950 shadow-[0_0_20px_rgba(0,196,255,0.4)] hover:from-cyan-400 hover:to-blue-500 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Compass size={14} />
                <span>OYNA ▶</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl border border-slate-700/60 bg-transparent text-xs font-semibold text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
            >
              Kapat
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
