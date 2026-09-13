'use client';

import { useState } from 'react';
import type { LevelRequest } from '@/services/firebase/firestore';
import type { LevelPart } from '@/services/firebase/admin';
import type { CellType } from '@/game-engine/level-format';
import { useT } from '@/contexts/LanguageContext';
import { GameIcon } from '@/components/icons';
import { GridPreview } from './GridPreview';
import { DIFFICULTY_COLORS, timeAgo } from '../lib/helpers';

export interface RequestRowProps {
  req: LevelRequest;
  parts: LevelPart[];
  onApprove: (req: LevelRequest, partId: string) => Promise<void>;
  onReject: (req: LevelRequest, note?: string) => Promise<void>;
}

export function RequestRow({ req, parts, onApprove, onReject }: RequestRowProps) {
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  const [approving, setApproving] = useState(false);
  const [selectedPart, setSelectedPart] = useState(parts[0]?.partId ?? '1');
  const [rejectNote, setRejectNote] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [busy, setBusy] = useState(false);

  const iStyle: React.CSSProperties = {
    background: '#060d1a', border: '1px solid rgba(30,58,95,0.6)',
    color: '#94a3b8', borderRadius: 6, padding: '4px 8px', fontSize: 11,
    outline: 'none', boxSizing: 'border-box',
  };

  const handleApprove = async () => {
    setBusy(true);
    await onApprove(req, selectedPart);
    setBusy(false);
  };

  const handleReject = async () => {
    setBusy(true);
    await onReject(req, rejectNote || undefined);
    setBusy(false);
  };

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(30,58,95,0.35)', borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {req.name}
          </span>
          <span style={{ fontSize: 11, color: '#475569' }}>
            by <span style={{ color: '#a78bfa' }}>{req.creatorName}</span>
            {req.creatorTag && <span style={{ color: '#475569' }}> #{req.creatorTag}</span>}
            &nbsp;·&nbsp;{req.width}×{req.height}
            {req.difficulty != undefined && <span style={{ color: DIFFICULTY_COLORS[req.difficulty], fontWeight: 700 }}>&nbsp;·&nbsp;{t(`difficulty.${req.difficulty}`)}</span>}
            &nbsp;·&nbsp;{timeAgo(req.submittedAt, t)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button
            onClick={() => { setExpanded((v) => !v); setApproving(false); setRejecting(false); }}
            style={{ padding: '5px 12px', fontSize: 11, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#475569', borderRadius: 6, cursor: 'pointer' }}
          >
            {expanded ? t('admin.preview_close') : t('admin.preview_open')}
          </button>
          <button
            onClick={() => { setApproving((v) => !v); setRejecting(false); }}
            style={{ padding: '5px 12px', fontSize: 11, background: approving ? 'rgba(0,255,136,0.12)' : 'rgba(0,255,136,0.05)', border: `1px solid ${approving ? 'rgba(0,255,136,0.6)' : 'rgba(0,255,136,0.3)'}`, color: '#00ff88', borderRadius: 6, cursor: 'pointer' }}
          >
            {t('admin.approve')}
          </button>
          <button
            onClick={() => { setRejecting((v) => !v); setApproving(false); }}
            style={{ padding: '5px 12px', fontSize: 11, background: rejecting ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.05)', border: `1px solid ${rejecting ? 'rgba(239,68,68,0.6)' : 'rgba(239,68,68,0.3)'}`, color: '#ef4444', borderRadius: 6, cursor: 'pointer' }}
          >
            {t('admin.reject')}
          </button>
        </div>
      </div>

      {/* Expanded: preview + action panels */}
      {(expanded || approving || rejecting) && (
        <div style={{ padding: '0 16px 14px', borderTop: '1px solid rgba(30,58,95,0.25)', paddingTop: 14, display: 'flex', flexWrap: 'wrap', gap: 20 }}>
          {/* Grid preview */}
          {expanded && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: '1 1 200px' }}>
              <GridPreview grid={req.grid as CellType[][]} cellSize={Math.max(14, Math.min(24, Math.floor(200 / req.width)))} />
              {(req.gameNotes || req.creatorNotes) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 10, background: 'rgba(6,13,26,0.5)', border: '1px solid rgba(30,58,95,0.4)', borderRadius: 8, fontSize: 11 }}>
                  {req.gameNotes && (
                    <div>
                      <span style={{ color: '#00c4ff', fontWeight: 800, textTransform: 'uppercase', fontSize: 9 }}>{t('editor.game_notes')}: </span>
                      <p style={{ color: '#94a3b8', margin: '4px 0 0', whiteSpace: 'pre-wrap', lineHeight: 1.3 }}>{req.gameNotes}</p>
                    </div>
                  )}
                  {req.creatorNotes && (
                    <div style={{ marginTop: req.gameNotes ? 8 : 0 }}>
                      <span style={{ color: '#fbbf24', fontWeight: 800, textTransform: 'uppercase', fontSize: 9 }}>{t('editor.creator_notes')}: </span>
                      <p style={{ color: '#94a3b8', margin: '4px 0 0', whiteSpace: 'pre-wrap', lineHeight: 1.3 }}>{req.creatorNotes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Approve panel */}
          {approving && (
            <div style={{ flex: 1, minWidth: 200 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#1e3a5f', display: 'block', marginBottom: 8 }}>{t('admin.which_part')}</span>
              <select
                value={selectedPart}
                onChange={(e) => setSelectedPart(e.target.value)}
                style={{ ...iStyle, width: '100%', marginBottom: 10 }}
              >
                {parts.length === 0 ? (
                  <option value="1">Part 1</option>
                ) : (
                  parts.map((p) => (
                    <option key={p.partId} value={p.partId}>
                      Part {p.partId} — {p.name}
                    </option>
                  ))
                )}
              </select>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleApprove}
                  disabled={busy}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 18px', fontSize: 12, fontWeight: 700, background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.5)', color: '#00ff88', borderRadius: 7, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1 }}
                >
                  {busy ? '...' : (
                    <>
                      <GameIcon name="check" size={12} color="#00ff88" />
                      {t('admin.approve_publish')}
                    </>
                  )}
                </button>
                <button
                  onClick={() => setApproving(false)}
                  style={{ padding: '7px 14px', fontSize: 12, background: 'none', border: '1px solid rgba(255,255,255,0.08)', color: '#475569', borderRadius: 7, cursor: 'pointer' }}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}

          {/* Reject panel */}
          {rejecting && (
            <div style={{ flex: 1, minWidth: 200 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#1e3a5f', display: 'block', marginBottom: 8 }}>{t('admin.reject_reason_label')}</span>
              <input
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                placeholder={t('admin.reject_reason_placeholder')}
                style={{ ...iStyle, width: '100%', marginBottom: 10 }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handleReject}
                  disabled={busy}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 18px', fontSize: 12, fontWeight: 700, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.5)', color: '#ef4444', borderRadius: 7, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.6 : 1 }}
                >
                  {busy ? '...' : (
                    <>
                      <GameIcon name="close" size={12} color="#ef4444" />
                      {t('admin.reject_confirm')}
                    </>
                  )}
                </button>
                <button
                  onClick={() => setRejecting(false)}
                  style={{ padding: '7px 14px', fontSize: 12, background: 'none', border: '1px solid rgba(255,255,255,0.08)', color: '#475569', borderRadius: 7, cursor: 'pointer' }}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
