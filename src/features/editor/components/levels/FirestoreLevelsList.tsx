'use client';

import type { RefObject } from 'react';
import type { FirestoreLevel, LevelPart } from '@/services/firebase/admin';
import { useT } from '@/contexts/LanguageContext';

interface FirestoreLevelsListProps {
  parts: LevelPart[];
  selectedPartId: string;
  setSelectedPartId: (v: string) => void;
  firestoreLevels: FirestoreLevel[];
  firestoreEditId: string | null;
  currentLevelRef: RefObject<HTMLDivElement | null>;
  onLoad: (fl: FirestoreLevel) => void;
}

/** Moderator tab: part selector + Firestore (campaign) levels of that part. */
export default function FirestoreLevelsList({
  parts, selectedPartId, setSelectedPartId, firestoreLevels, firestoreEditId, currentLevelRef, onLoad,
}: FirestoreLevelsListProps) {
  const t = useT();

  return (
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
                  onClick={() => onLoad(fl)}
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
  );
}
