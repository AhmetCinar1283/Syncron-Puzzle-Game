'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { User, ShieldAlert, Award, Compass, RefreshCw } from 'lucide-react';
import type { LevelData, CellType } from '@/game-engine/level-format';
import type { StoredPlayedLevel } from '@/services/db';
import LevelMiniPreview from '@/game-engine/components/LevelMiniPreview';
import PlayTestOverlay from '@/game-engine/components/PlayTestOverlay';
import { DIFFICULTY_COLORS, DIFFICULTY_LABELS } from '@/features/editor/lib/editorConfig';
import { Modal, type ModalRef } from '@/components/ui';
import { GameIcon } from '@/components/icons';
import { soundEngine } from '@/services/audio';
import { useGamepad } from '@/hooks/useGamepad';
import { useT } from '@/contexts/LanguageContext';

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
  const t = useT();
  const [data, setData] = useState<LevelData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [focusedActionIndex, setFocusedActionIndex] = useState(0);

  const modalRef = useRef<ModalRef>(null);
  const actionButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);

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
        const { getFirestoreLevel } = await import('@/services/firebase/adminLevels');
        const fl = await getFirestoreLevel(levelId);
        if (fl) {
          setData(normalizeToLevelData(fl));
        } else {
          setError('Seviye verisi bulunamadı.');
        }
      } else if (typeof levelId === 'number') {
        const { getPresetLevelById, getUserLevelById } = await import('@/services/db');
        let lvl = (await getPresetLevelById(levelId)) || (await getUserLevelById(levelId));

        if (lvl && (!lvl.grid || (Array.isArray(lvl.grid) && lvl.grid.length === 0) || lvl.isNeedSync) && lvl.firestoreId) {
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
      setFocusedActionIndex(0);
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

  // Aksiyon butonları listesi (Klavye ve Gamepad D-pad için)
  type ActionDef = {
    id: string;
    label: string;
    icon?: React.ReactNode;
    primary?: boolean;
    danger?: boolean;
    disabled?: boolean;
    onClick: () => void;
  };

  const actions = useMemo<ActionDef[]>(() => {
    const list: ActionDef[] = [];

    if (mode === 'play') {
      const canPlay = !!data && !loading && !metadata?.isLocked;
      list.push({
        id: 'play',
        label: metadata?.isLocked ? 'KİLİTLİ' : 'OYNA ▶',
        icon: <Compass size={14} />,
        primary: true,
        disabled: !canPlay,
        onClick: () => {
          if (data && onPlay && canPlay) {
            onPlay(data);
          }
        },
      });
      list.push({
        id: 'close',
        label: t('common.close') || 'KAPAT',
        onClick: () => {
          if (modalRef.current) modalRef.current.close();
          else onClose();
        },
      });
    } else {
      // mode === 'test'
      if (firestoreId) {
        list.push({
          id: 'edit',
          label: 'Editörde Aç',
          icon: <GameIcon name="pencil" size={13} />,
          onClick: () => {
            if (onEdit) {
              onEdit(firestoreId);
            } else {
              window.location.href = `/editor?firestoreId=${firestoreId}`;
            }
          },
        });
      }

      list.push({
        id: 'test',
        label: 'Test Modunda Oyna',
        icon: <GameIcon name="play" size={13} />,
        primary: true,
        disabled: !data || loading,
        onClick: () => {
          setIsTesting(true);
        },
      });

      list.push({
        id: 'close',
        label: t('common.close') || 'KAPAT',
        onClick: () => {
          if (modalRef.current) modalRef.current.close();
          else onClose();
        },
      });
    }

    return list;
  }, [mode, data, loading, metadata?.isLocked, firestoreId, onPlay, onEdit, onClose, t]);

  const moveAction = useCallback((dir: 1 | -1) => {
    if (actions.length <= 1) return;
    setFocusedActionIndex((prev) => {
      let next = (prev + dir + actions.length) % actions.length;
      soundEngine.play('ui.tick');
      return next;
    });
  }, [actions.length]);

  const executeAction = useCallback((index: number) => {
    const action = actions[index];
    if (action && !action.disabled) {
      soundEngine.play('ui.confirm');
      action.onClick();
    }
  }, [actions]);

  // Gamepad desteği - priority: 'modal'
  useGamepad({
    enabled: isOpen && !isTesting,
    priority: 'modal',
    onMove: (dir) => {
      if (dir === 'left' || dir === 'up') {
        moveAction(-1);
      } else if (dir === 'right' || dir === 'down') {
        moveAction(1);
      }
    },
    onConfirm: () => {
      executeAction(focusedActionIndex);
    },
    onCancel: () => {
      if (modalRef.current) modalRef.current.close();
      else onClose();
    },
  });

  // Klavye ok tuşları ve WASD desteği
  useEffect(() => {
    if (!isOpen || isTesting) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'arrowleft' || key === 'arrowup' || key === 'a' || key === 'w') {
        e.preventDefault();
        moveAction(-1);
      } else if (key === 'arrowright' || key === 'arrowdown' || key === 'd' || key === 's') {
        e.preventDefault();
        moveAction(1);
      } else if (key === 'enter' || key === ' ') {
        e.preventDefault();
        executeAction(focusedActionIndex);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isTesting, moveAction, executeAction, focusedActionIndex]);

  // Odak butonunu görünür kıl
  useEffect(() => {
    actionButtonRefs.current[focusedActionIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [focusedActionIndex]);

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
    <Modal
      ref={modalRef}
      open={isOpen}
      onClose={onClose}
      accentColor={difficultyColor}
      maxWidth={520}
      maxHeight="88dvh"
      showCloseButton={false}
      title={displayName}
      icon={
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: difficultyColor,
            boxShadow: `0 0 10px ${difficultyColor}`,
            flexShrink: 0,
          }}
        />
      }
      subtitle={
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ color: difficultyColor, fontWeight: 700 }}>{dimensionsLabel}</span>
          {difficultyLabel && (
            <>
              <span style={{ opacity: 0.35 }}>·</span>
              <span style={{ color: difficultyColor, fontWeight: 800 }}>{difficultyLabel}</span>
            </>
          )}
          {creator && (
            <>
              <span style={{ opacity: 0.35 }}>·</span>
              <span style={{ color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <User size={11} /> {creator}
              </span>
            </>
          )}
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: 12 }}>
            <RefreshCw size={26} className="animate-spin" style={{ color: difficultyColor }} />
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: '#94a3b8' }}>
              Harita yükleniyor...
            </span>
          </div>
        ) : error ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0', gap: 10, textAlign: 'center' }}>
            <ShieldAlert size={30} style={{ color: '#f43f5e' }} />
            <span style={{ fontSize: 12, color: '#f43f5e', fontWeight: 600 }}>{error}</span>
            <button
              type="button"
              onClick={loadData}
              style={{
                marginTop: 6,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 8,
                border: `1px solid ${difficultyColor}60`,
                background: `${difficultyColor}18`,
                color: difficultyColor,
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={12} /> Tekrar Dene
            </button>
          </div>
        ) : data ? (
          <>
            {/* Bulmaca Haritası Önizlemesi */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 10,
                borderRadius: 12,
                border: `1px solid ${difficultyColor}25`,
                background: 'rgba(3, 6, 13, 0.8)',
                boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.6)',
                minHeight: 160,
                overflow: 'hidden',
              }}
            >
              <LevelMiniPreview level={data} maxBoardSize={250} />
            </div>

            {/* Seviye Detay Rozetleri & İstatistikleri */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 8,
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  borderRadius: 10,
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  padding: '8px 4px',
                }}
              >
                <span style={{ display: 'block', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', fontWeight: 800 }}>
                  Hedefler
                </span>
                <span style={{ fontSize: 14, fontWeight: 900, color: '#34d399' }}>
                  {data.targets?.length ?? 0}
                </span>
              </div>

              <div
                style={{
                  borderRadius: 10,
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  padding: '8px 4px',
                }}
              >
                <span style={{ display: 'block', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', fontWeight: 800 }}>
                  Oyuncular
                </span>
                <span style={{ fontSize: 14, fontWeight: 900, color: '#38bdf8' }}>
                  {data.initialObjects?.length ?? 0}
                </span>
              </div>

              <div
                style={{
                  borderRadius: 10,
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  padding: '8px 4px',
                }}
              >
                <span style={{ display: 'block', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', fontWeight: 800 }}>
                  Kutular
                </span>
                <span style={{ fontSize: 14, fontWeight: 900, color: '#fbbf24' }}>
                  {data.initialBoxes?.length ?? 0}
                </span>
              </div>

              <div
                style={{
                  borderRadius: 10,
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  padding: '8px 4px',
                }}
              >
                <span style={{ display: 'block', fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', fontWeight: 800 }}>
                  Çarpışma
                </span>
                <span style={{ fontSize: 11, fontWeight: 800, color: data.trailCollision ? '#f43f5e' : '#94a3b8' }}>
                  {data.trailCollision ? 'Açık' : 'Kapalı'}
                </span>
              </div>
            </div>

            {/* Varsa Oynanış / Başarı Bilgisi (/levels için) */}
            {metadata?.playedData && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderRadius: 12,
                  border: '1px solid rgba(250, 204, 21, 0.25)',
                  background: 'rgba(250, 204, 21, 0.06)',
                  padding: '10px 14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Award size={20} style={{ color: '#facc15' }} />
                  <div style={{ textAlign: 'left' }}>
                    <span style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', fontWeight: 800, color: '#facc15', letterSpacing: '0.08em' }}>
                      En İyi Derece
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#f1f5f9' }}>
                      {metadata.playedData.moveCount ?? '?'} Hamle · {formatDuration(metadata.playedData.timeSpent)}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {[1, 2, 3].map((star) => (
                    <span
                      key={star}
                      style={{
                        fontSize: 15,
                        color: star <= (metadata.playedData?.stars ?? 0) ? '#ffd700' : 'rgba(255, 255, 255, 0.15)',
                        textShadow: star <= (metadata.playedData?.stars ?? 0) ? '0 0 8px rgba(255, 215, 0, 0.5)' : 'none',
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
              <div
                style={{
                  borderRadius: 10,
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  background: 'rgba(15, 23, 42, 0.45)',
                  padding: '10px 12px',
                  textAlign: 'left',
                }}
              >
                <span
                  style={{
                    display: 'block',
                    fontWeight: 800,
                    color: difficultyColor,
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: 4,
                  }}
                >
                  Bölüm Notu
                </span>
                <p style={{ margin: 0, fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.5 }}>
                  {data.gameNotes || data.creatorNotes}
                </p>
              </div>
            )}
          </>
        ) : null}

        {/* Aksiyon Butonları (Klavye & D-pad ile Odaklanabilir) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: 8,
            marginTop: 4,
            width: '100%',
          }}
        >
          {actions.map((action, idx) => {
            const isFocused = focusedActionIndex === idx;
            const isPrimary = action.primary;

            return (
              <button
                key={action.id}
                ref={(el) => {
                  actionButtonRefs.current[idx] = el;
                }}
                type="button"
                data-active={isFocused}
                disabled={action.disabled}
                onClick={() => executeAction(idx)}
                onPointerEnter={() => setFocusedActionIndex(idx)}
                style={{
                  flex: isPrimary ? 2 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '12px 14px',
                  borderRadius: 10,
                  cursor: action.disabled ? 'not-allowed' : 'pointer',
                  opacity: action.disabled ? 0.4 : 1,
                  outline: 'none',
                  fontSize: 11.5,
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  touchAction: 'manipulation',
                  transition: 'all 160ms cubic-bezier(0.22, 1, 0.36, 1)',
                  transform: isFocused ? 'scale(1.02)' : 'scale(1)',
                  background: isPrimary
                    ? isFocused
                      ? `linear-gradient(135deg, ${difficultyColor} 0%, #0099ff 100%)`
                      : `linear-gradient(135deg, ${difficultyColor}cc 0%, #0088e0cc 100%)`
                    : isFocused
                    ? 'rgba(255, 255, 255, 0.12)'
                    : 'rgba(255, 255, 255, 0.04)',
                  color: isPrimary ? '#030712' : isFocused ? '#ffffff' : '#94a3b8',
                  border: isFocused
                    ? `1.5px solid ${difficultyColor}`
                    : isPrimary
                    ? `1.5px solid ${difficultyColor}80`
                    : '1.5px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: isFocused
                    ? `0 0 16px ${difficultyColor}60, 0 4px 12px rgba(0, 0, 0, 0.4)`
                    : 'none',
                }}
              >
                {action.icon}
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </Modal>
  );
}
