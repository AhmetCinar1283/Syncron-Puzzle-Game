'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEditorContext } from '../../EditorContext';
import { useT } from '@/contexts/LanguageContext';
import { NBtn } from '../EditorUI';
import { useLevelReorderDrag } from '../../hooks/useLevelReorderDrag';
import SavedLevelsList from './SavedLevelsList';
import FirestoreLevelsList from './FirestoreLevelsList';
import { GameIcon } from '@/components/icons';

interface LevelsManagerDialogProps {
  open: boolean;
  onClose: () => void;
}

/** "Saved levels" overlay: local levels (reorder/load/delete) and, for moderators, Firestore levels. */
export default function LevelsManagerDialog({ open, onClose }: LevelsManagerDialogProps) {
  const t = useT();
  const searchParams = useSearchParams();
  const editId = searchParams.get('id') ? Number(searchParams.get('id')) : null;
  const {
    savedLevels,
    levelsLoading,
    isModerator,
    firestoreLevels,
    firestoreEditId,
    selectedPartId,
    setSelectedPartId,
    handleLoadLevel,
    handleNewLevel,
    loadFirestoreLevel,
    handleReorderLevels,
    handleDeleteLevel,
    parts,
    setShowFirestoreLevels,
  } = useEditorContext();

  const [activeTab, setActiveTab] = useState<'saved' | 'firestore'>('saved');
  const drag = useLevelReorderDrag(savedLevels, handleReorderLevels);

  const currentLevelRef = useRef<HTMLDivElement | null>(null);

  // Trigger loading of Firestore levels when switching to Firestore tab
  useEffect(() => {
    if (open && activeTab === 'firestore') {
      setShowFirestoreLevels(true);
    }
  }, [open, activeTab, setShowFirestoreLevels]);

  // Scroll active level into view when modal is opened or tab is changed
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        if (currentLevelRef.current) {
          currentLevelRef.current.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
          });
        }
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [open, activeTab, savedLevels, firestoreLevels]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(2, 5, 14, 0.85)',
        backdropFilter: 'blur(5px)',
        zIndex: 110,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'rgba(6, 13, 26, 0.98)',
          border: '1px solid rgba(0, 196, 255, 0.25)',
          borderRadius: 14,
          padding: '20px 24px',
          boxShadow: '0 0 40px rgba(0, 196, 255, 0.15)',
          width: '90%',
          maxWidth: 600,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#00c4ff',
              textShadow: '0 0 10px rgba(0,196,255,0.3)',
            }}
          >
            {t('editor.saved_levels')}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#475569',
              fontSize: 16,
              cursor: 'pointer',
              transition: 'color 0.15s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
          >
            <GameIcon name="close" size={14} />
          </button>
        </div>

        {/* Tab Buttons & New Level Button */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(30, 58, 95, 0.4)',
            paddingBottom: 10,
            marginBottom: 14,
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', gap: 6 }}>
            <NBtn active={activeTab === 'saved'} onClick={() => setActiveTab('saved')} color="#00c4ff" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <GameIcon name="save" size={12} /> {t('editor.saved_levels')}
            </NBtn>
            {isModerator && (
              <NBtn active={activeTab === 'firestore'} onClick={() => setActiveTab('firestore')} color="#fbbf24" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <GameIcon name="globe" size={12} /> Firestore
              </NBtn>
            )}
          </div>
          <button
            onClick={() => {
              handleNewLevel();
              onClose();
            }}
            style={{
              padding: '6px 12px',
              fontSize: 11,
              fontWeight: 600,
              background: 'rgba(0, 255, 136, 0.06)',
              border: '1px solid rgba(0, 255, 136, 0.3)',
              color: '#00ff88',
              borderRadius: 6,
              cursor: 'pointer',
              transition: 'all 0.15s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0, 255, 136, 0.12)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(0, 255, 136, 0.06)')}
          >
            <GameIcon name="plus" size={12} /> {t('common.new_level')}
          </button>
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4, minHeight: 180 }}>
          {activeTab === 'saved' ? (
            levelsLoading ? (
              <div style={{ color: '#1e3a5f', fontSize: 12, padding: '12px 0' }}>{t('common.loading')}</div>
            ) : savedLevels.length === 0 ? (
              <div style={{ color: '#475569', fontSize: 12, padding: '16px 4px', fontStyle: 'italic' }}>
                {t('editor.no_saved')}
              </div>
            ) : (
              <SavedLevelsList
                savedLevels={savedLevels}
                editId={editId}
                drag={drag}
                currentLevelRef={currentLevelRef}
                onLoad={(lv) => {
                  handleLoadLevel(lv);
                  onClose();
                }}
                onDelete={(id) => handleDeleteLevel(id)}
              />
            )
          ) : (
            /* Firestore Tab */
            isModerator && (
              <FirestoreLevelsList
                parts={parts}
                selectedPartId={selectedPartId}
                setSelectedPartId={setSelectedPartId}
                firestoreLevels={firestoreLevels}
                firestoreEditId={firestoreEditId}
                currentLevelRef={currentLevelRef}
                onLoad={(fl) => {
                  loadFirestoreLevel(fl);
                  onClose();
                }}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}
