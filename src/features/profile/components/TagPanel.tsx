'use client';

import { FormEvent } from 'react';
import type { T } from '@/contexts/LanguageContext';

interface Props {
  t: T;
  changesLeft: number;
  daysRemaining: number;
  canChangeTag: boolean;
  tagInput: string;
  setTagInput: (v: string) => void;
  tagBusy: boolean;
  tagError: string;
  tagSuccess: boolean;
  handleTagSubmit: (e: FormEvent) => void;
}

export default function TagPanel({
  t,
  changesLeft,
  daysRemaining,
  canChangeTag,
  tagInput,
  setTagInput,
  tagBusy,
  tagError,
  tagSuccess,
  handleTagSubmit,
}: Props) {
  return (
    <div
      style={{
        background: '#0a0f1a50',
        border: '1px solid #111827',
        borderRadius: '16px',
        padding: '20px 24px',
        boxSizing: 'border-box',
      }}
    >
      <h3
        style={{
          fontSize: '11px',
          fontWeight: 800,
          letterSpacing: '0.15em',
          color: '#4b5563',
          textTransform: 'uppercase',
          margin: '0 0 12px 0',
        }}
      >
        {t('auth.tag_section')}
      </h3>

      {changesLeft > 0 ? (
        <p style={{ color: '#9ca3af', fontSize: '12px', margin: '0 0 12px' }}>
          {t('auth.tag_changes_remaining', { n: changesLeft })}
        </p>
      ) : (
        <p style={{ color: '#ff2d55', fontSize: '12px', margin: '0 0 12px' }}>
          {t('auth.tag_max_reached')}
        </p>
      )}

      {daysRemaining > 0 && (
        <p style={{ color: '#4b5563', fontSize: '12px', margin: '0 0 12px' }}>
          {t('auth.tag_cooldown', { n: daysRemaining })}
        </p>
      )}

      {canChangeTag && (
        <form onSubmit={handleTagSubmit} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            placeholder={t('auth.tag_placeholder')}
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value.toUpperCase())}
            maxLength={10}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: '#060c16',
              border: '1px solid #1f2937',
              borderRadius: '8px',
              color: '#e5e7eb',
              fontSize: '13px',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <button
            type="submit"
            disabled={tagBusy || !tagInput.trim()}
            style={{
              padding: '8px 16px',
              background: '#00ff8815',
              border: '1px solid #00ff8840',
              borderRadius: '8px',
              color: '#00ff88',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {tagBusy ? '...' : t('auth.tag_save')}
          </button>
        </form>
      )}

      {tagError && <p style={{ color: '#ff2d55', fontSize: '12px', margin: '8px 0 0' }}>{tagError}</p>}
      {tagSuccess && <p style={{ color: '#00ff88', fontSize: '12px', margin: '8px 0 0' }}>{t('auth.tag_updated')}</p>}
    </div>
  );
}
