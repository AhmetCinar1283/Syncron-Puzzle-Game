/**
 * DOSYA AMACI: Seviye detaylarını ve harita önizlemesini gösteren modalın ana orkestrasyon
 * bileşeni. Sunum, durum yönetimi ve girdi dinleyicilerini bir araya getirir.
 */

'use client';

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';
import PlayTestOverlay from '@/game-engine/components/PlayTestOverlay';
import { Modal, type ModalRef } from '@/components/ui';
import { useT } from '@/contexts/LanguageContext';
import { useGameTheme } from '@/game-engine/contexts/GameThemeContext';
import { getLevelTheme } from '@/features/levels';
import type { LevelPreviewModalProps } from './types';
import { useLevelPreviewData } from './hooks/useLevelPreviewData';
import { useLevelPreviewNav } from './hooks/useLevelPreviewNav';
import { LevelPreviewHeader } from './components/LevelPreviewHeader';
import { LevelPreviewBoard } from './components/LevelPreviewBoard';
import { LevelPreviewStats } from './components/LevelPreviewStats';
import { LevelPreviewRecord } from './components/LevelPreviewRecord';
import { LevelPreviewNotes } from './components/LevelPreviewNotes';
import { LevelPreviewActions } from './components/LevelPreviewActions';

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
  const { theme, themeConfig } = useGameTheme();
  const themeDef = useMemo(() => getLevelTheme(theme), [theme]);

  const [isTesting, setIsTesting] = useState(false);
  const modalRef = useRef<ModalRef>(null);

  const isArcade = theme === 'arcade';
  const isBlueprint = theme === 'blueprint';
  const radius = isArcade ? 0 : isBlueprint ? 3 : 12;
  const innerRadius = isArcade ? 0 : isBlueprint ? 2 : 8;
  const accent = themeConfig?.accentColor || themeDef.accentColor;
  const glow = themeConfig?.accentGlow || themeDef.accentGlow;
  const boardBg = themeConfig?.board?.background || '#050508';

  const { data, loading, error, reload } = useLevelPreviewData({
    isOpen,
    levelId,
    initialLevelData,
  });

  const handleCloseModal = useCallback(() => {
    if (modalRef.current) {
      modalRef.current.close();
    } else {
      onClose();
    }
  }, [onClose]);

  const displayName = useMemo(() => {
    return data?.name || metadata?.name || 'Untitled Level';
  }, [data?.name, metadata?.name]);

  const isMultiRoom = Boolean(data?.rooms && data.rooms.length > 0);
  const dimensionsLabel = isMultiRoom
    ? (t('levels.multi_room_label', { count: data!.rooms!.length }) || `${data!.rooms!.length} Odalı Harita`)
    : `${data?.width ?? metadata?.width ?? '?'}×${data?.height ?? metadata?.height ?? '?'}`;

  const firestoreId = data?.firestoreId || metadata?.firestoreId || (typeof levelId === 'string' ? levelId : undefined);

  const {
    actions,
    focusedActionIndex,
    setFocusedActionIndex,
    actionButtonRefs,
    executeAction,
    isGamepadConnected,
  } = useLevelPreviewNav({
    isOpen,
    isTesting,
    mode,
    data,
    loading,
    metadata,
    firestoreId,
    onPlay,
    onEdit,
    onClose: handleCloseModal,
    onStartTest: () => setIsTesting(true),
  });

  if (!isOpen) return null;

  if (isTesting && data) {
    return (
      <PlayTestOverlay
        testLevel={data}
        setTestLevel={() => setIsTesting(false)}
      />
    );
  }

  const { titleNode, iconNode, subtitleNode } = LevelPreviewHeader({
    displayName,
    position: metadata?.position,
    partName: metadata?.partName,
    difficulty: data?.difficulty ?? metadata?.difficulty,
    dimensionsLabel,
    creator: data?.creatorName || metadata?.creatorName,
    isSkipped: metadata?.isSkipped,
    isLocked: metadata?.isLocked,
    playedData: metadata?.playedData,
    accent,
    glow,
    isArcade,
  });

  return (
    <Modal
      ref={modalRef}
      open={isOpen}
      onClose={onClose}
      accentColor={accent}
      maxWidth={460}
      maxHeight="88dvh"
      showCloseButton={false}
      showHandle={true}
      title={titleNode}
      icon={iconNode}
      subtitle={subtitleNode}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: 12 }}>
            <RefreshCw size={26} className="animate-spin" style={{ color: accent }} />
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', color: '#94a3b8' }}>
              {t('common.loading') || 'Harita yükleniyor...'}
            </span>
          </div>
        ) : error ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0', gap: 10, textAlign: 'center' }}>
            <ShieldAlert size={30} style={{ color: '#f43f5e' }} />
            <span style={{ fontSize: 12, color: '#f43f5e', fontWeight: 600 }}>{error}</span>
            <button
              type="button"
              onClick={reload}
              style={{
                marginTop: 6,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: radius,
                border: `1px solid ${accent}60`,
                background: `${accent}18`,
                color: accent,
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={12} /> {t('common.retry') || 'Tekrar Dene'}
            </button>
          </div>
        ) : data ? (
          <>
            <LevelPreviewBoard
              level={data}
              radius={radius}
              accent={accent}
              glow={glow}
              boardBg={boardBg}
              isArcade={isArcade}
            />

            <LevelPreviewStats
              data={data}
              innerRadius={innerRadius}
              fontClass={themeDef.fontClass}
            />

            {metadata?.playedData && (
              <LevelPreviewRecord
                playedData={metadata.playedData}
                radius={radius}
                accent={accent}
                glow={glow}
                isArcade={isArcade}
              />
            )}

            <LevelPreviewNotes
              notes={data.gameNotes || data.creatorNotes}
              radius={radius}
              accent={accent}
            />
          </>
        ) : null}

        <LevelPreviewActions
          actions={actions}
          focusedActionIndex={focusedActionIndex}
          setFocusedActionIndex={setFocusedActionIndex}
          executeAction={executeAction}
          actionButtonRefs={actionButtonRefs}
          isGamepadConnected={isGamepadConnected}
          radius={radius}
          accent={accent}
          glow={glow}
        />
      </div>
    </Modal>
  );
}
