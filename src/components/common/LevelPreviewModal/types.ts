/**
 * DOSYA AMACI: LevelPreviewModal bileşeni ve alt bileşenlerinin (Header, Stats, Actions vb.)
 * veri modellerini ve prop tiplerini barındıran merkezi tip tanımları.
 */

import type React from 'react';
import type { LevelData } from '@/game-engine/level-format';
import type { StoredPlayedLevel } from '@/services/db';

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

export interface LevelPreviewAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  primary?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export interface StatCardItem {
  label: string;
  value: number | string;
  color: string;
  isText?: boolean;
}
