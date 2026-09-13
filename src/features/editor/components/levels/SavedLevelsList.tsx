'use client';

import type { RefObject } from 'react';
import type { StoredLevel } from '@/services/db';
import { useT } from '@/contexts/LanguageContext';
import type { LevelReorderDragApi } from '../../hooks/useLevelReorderDrag';
import { GameIcon } from '@/components/icons';

interface SavedLevelsListProps {
  savedLevels: (StoredLevel & { id: number })[];
  editId: number | null;
  drag: LevelReorderDragApi;
  currentLevelRef: RefObject<HTMLDivElement | null>;
  onLoad: (lv: StoredLevel & { id: number }) => void;
  onDelete: (id: number) => void;
}

/** Local (Dexie) levels: draggable rows with load ("update") and delete actions. */
export default function SavedLevelsList({ savedLevels, editId, drag, currentLevelRef, onLoad, onDelete }: SavedLevelsListProps) {
  const t = useT();
  const { draggedIndex, dragOverIndex, handleDragStart, handleDragOver, handleDrop, handleDragEnd } = drag;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {savedLevels.map((lv, idx) => {
        const isDragging = draggedIndex === idx;
        const isDragOver = dragOverIndex === idx;
        const isCurrent = editId === lv.id;

        return (
          <div
            key={lv.id}
            ref={isCurrent ? currentLevelRef : null}
            draggable
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={(e) => handleDrop(e, idx)}
            onDragEnd={handleDragEnd}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: isDragOver
                ? 'rgba(0, 196, 255, 0.15)'
                : isCurrent
                ? 'rgba(0, 196, 255, 0.06)'
                : 'rgba(255, 255, 255, 0.02)',
              border: isDragOver
                ? '1px dashed #00c4ff'
                : `1px solid ${isCurrent ? 'rgba(0, 196, 255, 0.35)' : 'rgba(255, 255, 255, 0.05)'}`,
              borderRadius: 8,
              boxSizing: 'border-box',
              opacity: isDragging ? 0.4 : 1,
              cursor: 'grab',
              transition: 'background 0.2s, border 0.2s',
            }}
          >
            {/* Left: Drag Handle and Level Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ color: '#334155', cursor: 'grab', userSelect: 'none', display: 'flex', alignItems: 'center' }}>
                <GameIcon name="menu" size={14} />
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 9, color: isCurrent ? '#00c4ff' : '#1e3a5f', fontWeight: 'bold' }}>
                    #{idx + 1}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 'bold',
                      color: isCurrent ? '#00c4ff' : '#e2e8f0',
                    }}
                  >
                    {lv.name}
                  </span>
                </div>
                <span style={{ fontSize: 10, color: '#475569' }}>
                  {lv.width}×{lv.height}
                </span>
              </div>
            </div>

            {/* Right: Actions */}
            <div style={{ display: 'flex', gap: 6 }} onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => onLoad(lv)}
                style={{
                  padding: '5px 12px',
                  fontSize: 11,
                  fontWeight: 'bold',
                  background: isCurrent ? 'rgba(0, 196, 255, 0.2)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${isCurrent ? '#00c4ff' : 'rgba(255,255,255,0.1)'}`,
                  color: isCurrent ? '#00c4ff' : '#94a3b8',
                  borderRadius: 6,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  if (!isCurrent) {
                    e.currentTarget.style.background = 'rgba(0, 196, 255, 0.1)';
                    e.currentTarget.style.borderColor = '#00c4ff';
                    e.currentTarget.style.color = '#00c4ff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isCurrent) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                    e.currentTarget.style.color = '#94a3b8';
                  }
                }}
              >
                {t('editor.update')}
              </button>
              <button
                onClick={() => onDelete(lv.id)}
                style={{
                  padding: '5px 10px',
                  fontSize: 11,
                  fontWeight: 'bold',
                  background: 'rgba(239, 68, 68, 0.02)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#f87171',
                  borderRadius: 6,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
                  e.currentTarget.style.borderColor = '#ef4444';
                  e.currentTarget.style.color = '#f87171';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.02)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                  e.currentTarget.style.color = '#f87171';
                }}
              >
                {t('list.delete')}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
