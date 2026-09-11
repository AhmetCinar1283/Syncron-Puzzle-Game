'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useEditorContext } from '../EditorContext';
import { useT } from '@/contexts/LanguageContext';
import { NBtn } from './EditorUI';

interface LevelsManagerDialogProps {
  open: boolean;
  onClose: () => void;
}

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
    showFirestoreLevels,
    setShowFirestoreLevels,
  } = useEditorContext();

  const [activeTab, setActiveTab] = useState<'saved' | 'firestore'>('saved');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

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

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const updatedLevels = [...savedLevels];
    const [draggedItem] = updatedLevels.splice(draggedIndex, 1);
    updatedLevels.splice(index, 0, draggedItem);

    const newOrder = updatedLevels.map((lv) => lv.id);
    handleReorderLevels(newOrder);

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

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
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
          >
            ✕
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
            <NBtn active={activeTab === 'saved'} onClick={() => setActiveTab('saved')} color="#00c4ff">
              💾 {t('editor.saved_levels')}
            </NBtn>
            {isModerator && (
              <NBtn active={activeTab === 'firestore'} onClick={() => setActiveTab('firestore')} color="#fbbf24">
                🌐 Firestore
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
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(0, 255, 136, 0.12)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(0, 255, 136, 0.06)')}
          >
            ➕ {t('common.new_level')}
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
                        <span style={{ fontSize: 14, color: '#334155', cursor: 'grab', userSelect: 'none' }}>☰</span>
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
                          onClick={() => {
                            handleLoadLevel(lv);
                            onClose();
                          }}
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
                          onClick={() => handleDeleteLevel(lv.id)}
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
            )
          ) : (
            /* Firestore Tab */
            isModerator && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Part Selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', fontWeight: 'bold' }}>
                    {t('editor.part_label')}:
                  </span>
                  <select
                    value={selectedPartId}
                    onChange={(e) => setSelectedPartId(e.target.value)}
                    style={{
                      background: '#060d1a',
                      border: '1px solid rgba(30, 58, 95, 0.6)',
                      color: '#fbbf24',
                      borderRadius: 6,
                      padding: '4px 8px',
                      fontSize: 11,
                      outline: 'none',
                    }}
                  >
                    {parts.length === 0 ? (
                      <option value="1">{t('editor.part_default')}</option>
                    ) : (
                      parts.map((p) => (
                        <option key={p.partId} value={p.partId}>
                          Part {p.partId} — {p.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Firestore Levels List */}
                {firestoreLevels.length === 0 ? (
                  <div style={{ color: '#475569', fontSize: 11, fontStyle: 'italic', padding: '8px 0' }}>
                    {t('editor.no_fs_levels', { id: selectedPartId })}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {firestoreLevels.map((fl, idx) => {
                      const isCurrent = firestoreEditId === fl.firestoreId;
                      return (
                        <div
                          key={fl.firestoreId}
                          ref={isCurrent ? currentLevelRef : null}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            background: isCurrent ? 'rgba(251, 191, 36, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                            border: `1px solid ${isCurrent ? 'rgba(251, 191, 36, 0.35)' : 'rgba(255, 255, 255, 0.05)'}`,
                            borderRadius: 8,
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span
                                style={{ fontSize: 9, color: isCurrent ? '#fbbf24' : '#1e3a5f', fontWeight: 'bold' }}
                              >
                                FS #{idx + 1}
                              </span>
                              <span
                                style={{
                                  fontSize: 13,
                                  fontWeight: 'bold',
                                  color: isCurrent ? '#fbbf24' : '#e2e8f0',
                                }}
                              >
                                {fl.name}
                              </span>
                            </div>
                            <span style={{ fontSize: 9, color: '#475569' }}>{fl.firestoreId}</span>
                          </div>

                          <button
                            onClick={() => {
                              loadFirestoreLevel(fl);
                              onClose();
                            }}
                            style={{
                              padding: '5px 12px',
                              fontSize: 11,
                              fontWeight: 'bold',
                              background: isCurrent ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255,255,255,0.03)',
                              border: `1px solid ${isCurrent ? '#fbbf24' : 'rgba(255,255,255,0.1)'}`,
                              color: isCurrent ? '#fbbf24' : '#94a3b8',
                              borderRadius: 6,
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={(e) => {
                              if (!isCurrent) {
                                e.currentTarget.style.background = 'rgba(251, 191, 36, 0.1)';
                                e.currentTarget.style.borderColor = '#fbbf24';
                                e.currentTarget.style.color = '#fbbf24';
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
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
