/**
 * DOSYA AMACI: LevelPreviewModal için durum ve moda göre aksiyon butonlarını oluşturan,
 * Gamepad (D-pad, A, B) ve klavye (Ok tuşları, WASD, Enter, Space, Escape) girdi yönetimini,
 * capture-phase olay yalıtımını ve buton odak senkronizasyonunu yöneten özel hook.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { LevelData } from '@/game-engine/level-format';
import { GameIcon } from '@/components/icons';
import { soundEngine } from '@/services/audio';
import { useGamepad } from '@/hooks/useGamepad';
import { useT } from '@/contexts/LanguageContext';
import type { LevelPreviewMetadata, LevelPreviewAction } from '../types';

interface UseLevelPreviewNavOptions {
  isOpen: boolean;
  isTesting: boolean;
  mode: 'test' | 'play';
  data: LevelData | null;
  loading: boolean;
  metadata?: LevelPreviewMetadata;
  firestoreId?: string;
  onPlay?: (level: LevelData) => void;
  onEdit?: (firestoreIdOrId: string | number) => void;
  onClose: () => void;
  onStartTest: () => void;
}

export function useLevelPreviewNav({
  isOpen,
  isTesting,
  mode,
  data,
  loading,
  metadata,
  firestoreId,
  onPlay,
  onEdit,
  onClose,
  onStartTest,
}: UseLevelPreviewNavOptions) {
  const t = useT();
  const [focusedActionIndex, setFocusedActionIndex] = useState(0);
  const actionButtonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Aksiyon listesini oluştur
  const actions = useMemo<LevelPreviewAction[]>(() => {
    const list: LevelPreviewAction[] = [];

    if (mode === 'play') {
      const canPlay = Boolean(data && !loading && !metadata?.isLocked);
      list.push({
        id: 'play',
        label: metadata?.isLocked
          ? (t('levels.locked_level') || 'KİLİTLİ')
          : (t('levels.play_btn_upper') || 'OYNA ▶'),
        icon: <GameIcon name={metadata?.isLocked ? 'lock' : 'play'} size={14} />,
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
        icon: <GameIcon name="close" size={12} />,
        onClick: onClose,
      });
    } else {
      if (firestoreId) {
        list.push({
          id: 'edit',
          label: t('levels.open_in_editor') || 'Editörde Aç',
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
        label: t('levels.play_test_mode') || 'Test Modunda Oyna',
        icon: <GameIcon name="play" size={13} />,
        primary: true,
        disabled: !data || loading,
        onClick: onStartTest,
      });

      list.push({
        id: 'close',
        label: t('common.close') || 'KAPAT',
        icon: <GameIcon name="close" size={12} />,
        onClick: onClose,
      });
    }

    return list;
  }, [mode, data, loading, metadata?.isLocked, firestoreId, onPlay, onEdit, onClose, onStartTest, t]);

  // Modal açıldığında odaklanılacak ilk buton (Kilitliyse kapat butonu, değilse oyna butonu)
  useEffect(() => {
    if (isOpen) {
      setFocusedActionIndex(metadata?.isLocked ? 1 : 0);
    }
  }, [isOpen, metadata?.isLocked]);

  const moveAction = useCallback((dir: 1 | -1) => {
    if (actions.length <= 1) return;
    setFocusedActionIndex((prev) => {
      const next = (prev + dir + actions.length) % actions.length;
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

  // Gamepad desteği - modal önceliği ile
  const { isConnected: isGamepadConnected } = useGamepad({
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
    onCancel: onClose,
  });

  // Klavye olayları - Capture fazında yakalayarak arka plana sızmayı engeller
  useEffect(() => {
    if (!isOpen || isTesting) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      if (
        key === 'arrowleft' ||
        key === 'arrowup' ||
        key === 'a' ||
        key === 'w' ||
        key === 'arrowright' ||
        key === 'arrowdown' ||
        key === 'd' ||
        key === 's' ||
        key === 'enter' ||
        key === ' ' ||
        key === 'escape'
      ) {
        e.stopImmediatePropagation();
      }

      if (key === 'arrowleft' || key === 'arrowup' || key === 'a' || key === 'w') {
        e.preventDefault();
        moveAction(-1);
      } else if (key === 'arrowright' || key === 'arrowdown' || key === 'd' || key === 's') {
        e.preventDefault();
        moveAction(1);
      } else if (key === 'enter' || key === ' ') {
        e.preventDefault();
        executeAction(focusedActionIndex);
      } else if (key === 'escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isOpen, isTesting, moveAction, executeAction, focusedActionIndex, onClose]);

  // Odaklanan butonu görünür alana kaydır
  useEffect(() => {
    actionButtonRefs.current[focusedActionIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [focusedActionIndex]);

  return {
    actions,
    focusedActionIndex,
    setFocusedActionIndex,
    actionButtonRefs,
    executeAction,
    isGamepadConnected,
  };
}
