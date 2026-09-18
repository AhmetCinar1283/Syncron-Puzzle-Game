'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import type { LevelPart, LevelOrderEntry } from '@/services/firebase/admin';
import { useT } from '@/contexts/LanguageContext';
import { sortedEntries, INPUT_STYLE } from '../lib/helpers';
import { NeonBtn } from './NeonBtn';
import { PartStats } from './PartStats';
import { LevelReorderList } from './LevelReorderList';

export function PartCard({
  part,
  onUpdateName,
  onUpdateUnlock,
  onDelete,
  onReorderLevels,
  onReorderLevel,
  onDeleteLevel,
  onEditLevel,
  onDesignMap,
}: {
  part: LevelPart;
  onUpdateName: (name: string) => void;
  onUpdateUnlock: (req: number) => void;
  onDelete: () => void;
  onReorderLevels: (newLevels: LevelOrderEntry[]) => void;
  onReorderLevel: (levelId: string, dir: 'up' | 'down') => void;
  onDeleteLevel: (levelId: string) => void;
  onEditLevel: (levelId: string) => void;
  onDesignMap: () => void;
}) {
  const t = useT();
  const [isExpanded, setIsExpanded] = useState(false);
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

  const toggleExpand = () => {
    if (!editMode) {
      setIsExpanded((prev) => !prev);
    }
  };

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: isExpanded ? '1px solid rgba(0,196,255,0.3)' : '1px solid rgba(0,196,255,0.15)',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 16,
        boxShadow: isExpanded ? '0 4px 20px rgba(0,196,255,0.05)' : 'none',
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      }}
    >
      {/* Part header / Collapsible trigger */}
      <div
        onClick={toggleExpand}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '12px 16px',
          background: isExpanded ? 'rgba(0,196,255,0.05)' : 'rgba(0,196,255,0.02)',
          cursor: editMode ? 'default' : 'pointer',
          transition: 'background-color 0.2s ease',
          userSelect: 'none',
        }}
      >
        {editMode ? (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ flex: 1, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}
          >
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
              <NeonBtn
                color="#475569"
                onClick={() => {
                  setEditMode(false);
                  setNameVal(part.name);
                  setUnlockVal(String(part.unlockRequirement));
                }}
                small
              >
                Cancel
              </NeonBtn>
            </div>
          </div>
        ) : (
          <>
            {/* Header left: Chevron, Title, and Metadata Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#00c4ff',
                    transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                    transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  <ChevronDown size={18} />
                </span>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#00c4ff', letterSpacing: '0.06em' }}>
                  {part.name}
                </span>
              </div>

              {/* Meta stats badges (total levels, difficulties breakdown, unlock condition) */}
              <PartStats levels={levels} unlockRequirement={part.unlockRequirement} />
            </div>

            {/* Header right: Action buttons */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}
            >
              <NeonBtn
                color="#fbbf24"
                small
                onClick={() => setEditMode(true)}
              >
                Edit
              </NeonBtn>
              {confirmDelete ? (
                <>
                  <NeonBtn color="#ef4444" small onClick={handleDelete}>
                    Confirm Delete
                  </NeonBtn>
                  <NeonBtn
                    color="#475569"
                    small
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </NeonBtn>
                </>
              ) : (
                <NeonBtn
                  color="#ef4444"
                  small
                  onClick={() => setConfirmDelete(true)}
                >
                  Delete Part
                </NeonBtn>
              )}
            </div>
          </>
        )}
      </div>

      {/* Levels list (Collapsible with smooth animation) */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                padding: '14px 16px',
                borderTop: '1px solid rgba(0,196,255,0.08)',
                background: 'rgba(3,7,18,0.4)',
              }}
            >
              <LevelReorderList
                levels={levels}
                onReorder={onReorderLevels}
                onMoveUp={(levelId) => onReorderLevel(levelId, 'up')}
                onMoveDown={(levelId) => onReorderLevel(levelId, 'down')}
                onEditLevel={onEditLevel}
                onDeleteLevel={onDeleteLevel}
              />
              <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <NeonBtn color="#00ff88" onClick={() => onEditLevel('')} small>
                  + Add Level via Editor
                </NeonBtn>
                <NeonBtn color="#00c4ff" onClick={onDesignMap} small>
                  {t('admin.design_map')}
                </NeonBtn>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
