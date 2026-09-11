'use client';

import { useState } from 'react';
import type { LevelPart } from '@/services/firebase/admin';
import { useT } from '@/contexts/LanguageContext';
import { sortedEntries, INPUT_STYLE } from '../lib/helpers';
import { NeonBtn } from './NeonBtn';
import { LevelRow } from './LevelRow';

export function PartCard({
  part,
  onUpdateName,
  onUpdateUnlock,
  onDelete,
  onReorderLevel,
  onDeleteLevel,
  onEditLevel,
  onDesignMap,
}: {
  part: LevelPart;
  onUpdateName: (name: string) => void;
  onUpdateUnlock: (req: number) => void;
  onDelete: () => void;
  onReorderLevel: (levelId: string, dir: 'up' | 'down') => void;
  onDeleteLevel: (levelId: string) => void;
  onEditLevel: (levelId: string) => void;
  onDesignMap: () => void;
}) {
  const t = useT();
  const [editMode, setEditMode] = useState(false);
  const [nameVal, setNameVal] = useState(part.name);
  const [unlockVal, setUnlockVal] = useState(String(part.unlockRequirement));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  const levels = sortedEntries(part.order);

  const handleSave = async () => {
    setSaving(true);
    const { updatePart } = await import('@/services/firebase/admin');
    await updatePart(part.partId, {
      name: nameVal.trim() || part.name,
      unlockRequirement: Math.max(0, Number(unlockVal) || 0),
    });
    onUpdateName(nameVal.trim() || part.name);
    onUpdateUnlock(Math.max(0, Number(unlockVal) || 0));
    setSaving(false);
    setEditMode(false);
  };

  const handleDelete = async () => {
    const { deletePart } = await import('@/services/firebase/admin');
    await deletePart(part.partId);
    onDelete();
  };

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(0,196,255,0.15)',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 16,
      }}
    >
      {/* Part header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          borderBottom: '1px solid rgba(0,196,255,0.08)',
          background: 'rgba(0,196,255,0.03)',
        }}
      >
        {editMode ? (
          <div style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              placeholder="Part name"
              style={{ ...INPUT_STYLE, flex: '1 1 140px', maxWidth: 260 }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, color: '#475569', whiteSpace: 'nowrap' }}>Unlock after</span>
              <input
                type="number"
                value={unlockVal}
                onChange={(e) => setUnlockVal(e.target.value)}
                style={{ ...INPUT_STYLE, width: 60 }}
                min={0}
              />
              <span style={{ fontSize: 10, color: '#475569' }}>levels</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <NeonBtn color="#00ff88" onClick={handleSave} disabled={saving} small>
                {saving ? '...' : 'Save'}
              </NeonBtn>
              <NeonBtn color="#475569" onClick={() => { setEditMode(false); setNameVal(part.name); setUnlockVal(String(part.unlockRequirement)); }} small>
                Cancel
              </NeonBtn>
            </div>
          </div>
        ) : (
          <>
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#00c4ff', letterSpacing: '0.06em' }}>
                {part.name}
              </span>
              <span style={{ fontSize: 10, color: '#334155', marginLeft: 10 }}>
                Unlock after {part.unlockRequirement} levels &nbsp;·&nbsp; {levels.length} level{levels.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <NeonBtn color="#fbbf24" small onClick={() => setEditMode(true)}>Edit</NeonBtn>
              {confirmDelete ? (
                <>
                  <NeonBtn color="#ef4444" small onClick={handleDelete}>Confirm Delete</NeonBtn>
                  <NeonBtn color="#475569" small onClick={() => setConfirmDelete(false)}>Cancel</NeonBtn>
                </>
              ) : (
                <NeonBtn color="#ef4444" small onClick={() => setConfirmDelete(true)}>Delete Part</NeonBtn>
              )}
            </div>
          </>
        )}
      </div>

      {/* Levels list */}
      <div style={{ padding: '12px 16px' }}>
        {levels.length === 0 ? (
          <p style={{ color: '#1e3a5f', fontSize: 11, margin: '4px 0 8px', fontStyle: 'italic' }}>
            No levels yet. Publish a level to this part from the editor.
          </p>
        ) : (
          levels.map((entry, idx) => (
            <LevelRow
              key={entry.id}
              entry={entry}
              isFirst={idx === 0}
              isLast={idx === levels.length - 1}
              onMoveUp={() => onReorderLevel(entry.id, 'up')}
              onMoveDown={() => onReorderLevel(entry.id, 'down')}
              onEdit={() => onEditLevel(entry.id)}
              onDelete={() => onDeleteLevel(entry.id)}
            />
          ))
        )}
        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
          <NeonBtn color="#00ff88" onClick={() => onEditLevel('')} small>
            + Add Level via Editor
          </NeonBtn>
          <NeonBtn color="#00c4ff" onClick={onDesignMap} small>
            {t('admin.design_map')}
          </NeonBtn>
        </div>
      </div>
    </div>
  );
}
