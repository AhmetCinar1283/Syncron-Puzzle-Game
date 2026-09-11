'use client';

import { useState } from 'react';
import type { LevelOrderEntry } from '@/services/firebase/admin';
import { DIFFICULTY_COLORS, DIFFICULTY_LABELS } from '@/features/editor/lib/editorConfig';
import { NeonBtn } from './NeonBtn';

export function LevelRow({
  entry,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
}: {
  entry: LevelOrderEntry;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 12px',
        background: 'rgba(255,255,255,0.015)',
        border: '1px solid rgba(30,58,95,0.3)',
        borderRadius: 8,
        marginBottom: 6,
      }}
    >
      {/* Reorder arrows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
        <button
          onClick={onMoveUp}
          disabled={isFirst}
          style={{
            background: 'none', border: 'none', color: isFirst ? '#1e3a5f' : '#475569',
            cursor: isFirst ? 'default' : 'pointer', fontSize: 10, lineHeight: 1, padding: '1px 4px',
          }}
        >▲</button>
        <button
          onClick={onMoveDown}
          disabled={isLast}
          style={{
            background: 'none', border: 'none', color: isLast ? '#1e3a5f' : '#475569',
            cursor: isLast ? 'default' : 'pointer', fontSize: 10, lineHeight: 1, padding: '1px 4px',
          }}
        >▼</button>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {entry.name || <span style={{ color: '#1e3a5f', fontStyle: 'italic' }}>Untitled</span>}
        </span>
        <span style={{ fontSize: 10, color: '#475569' }}>
          {entry.width}×{entry.height}
          {entry.difficulty != undefined && (
            <span style={{ color: DIFFICULTY_COLORS[entry.difficulty], fontWeight: 700 }}>
              &nbsp;·&nbsp;{DIFFICULTY_LABELS[entry.difficulty]}
            </span>
          )}
          {entry.creatorName && (
            <span style={{ color: '#a78bfa' }}>&nbsp;·&nbsp;{entry.creatorName}</span>
          )}
        </span>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {confirmDelete ? (
          <>
            <NeonBtn color="#ef4444" small onClick={onDelete}>Confirm</NeonBtn>
            <NeonBtn color="#475569" small onClick={() => setConfirmDelete(false)}>Cancel</NeonBtn>
          </>
        ) : (
          <>
            <NeonBtn color="#00c4ff" small onClick={onEdit}>Edit</NeonBtn>
            <NeonBtn color="#ef4444" small onClick={() => setConfirmDelete(true)}>Delete</NeonBtn>
          </>
        )}
      </div>
    </div>
  );
}
