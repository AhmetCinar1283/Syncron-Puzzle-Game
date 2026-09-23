'use client';

import React, { FormEvent } from 'react';
import type { T } from '@/contexts/LanguageContext';
import { GameIcon } from '@/components/icons';
import { useGameTheme } from '@/game-engine/contexts/GameThemeContext';

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
  const { themeConfig } = useGameTheme();

  return (
    <div className="profile-card">
      <div className="profile-card__scan" aria-hidden="true" />
      <div className="profile-card__bracket profile-card__bracket--tl" aria-hidden="true" />
      <div className="profile-card__bracket profile-card__bracket--tr" aria-hidden="true" />
      <div className="profile-card__bracket profile-card__bracket--bl" aria-hidden="true" />
      <div className="profile-card__bracket profile-card__bracket--br" aria-hidden="true" />

      <div className="profile-card__content">
        <div className="profile-panel-header">
          <h3 className="profile-panel-title">
            <GameIcon name="lightning" size={14} color={themeConfig.accentColor} />
            <span>{t('auth.tag_section')}</span>
          </h3>
        </div>

        {changesLeft > 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '12px', margin: '0 0 12px', fontWeight: 600 }}>
            {t('auth.tag_changes_remaining', { n: changesLeft })}
          </p>
        ) : (
          <p style={{ color: '#ff2d55', fontSize: '12px', margin: '0 0 12px', fontWeight: 600 }}>
            {t('auth.tag_max_reached')}
          </p>
        )}

        {daysRemaining > 0 && (
          <p style={{ color: '#f59e0b', fontSize: '12px', margin: '0 0 12px', fontWeight: 600 }}>
            {t('auth.tag_cooldown', { n: daysRemaining })}
          </p>
        )}

        {canChangeTag && (
          <form onSubmit={handleTagSubmit} className="profile-input-group">
            <input
              type="text"
              placeholder={t('auth.tag_placeholder')}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value.toUpperCase())}
              maxLength={10}
              className="profile-input"
              style={{ letterSpacing: '0.12em', fontWeight: 800 }}
            />
            <button
              type="submit"
              disabled={tagBusy || !tagInput.trim()}
              className="profile-action-btn"
            >
              {tagBusy ? '...' : t('auth.tag_save')}
            </button>
          </form>
        )}

        {tagError && (
          <p style={{ color: '#ff2d55', fontSize: '12px', margin: '8px 0 0', fontWeight: 600 }}>
            {tagError}
          </p>
        )}
        {tagSuccess && (
          <p style={{ color: themeConfig.accentColor, fontSize: '12px', margin: '8px 0 0', fontWeight: 600 }}>
            {t('auth.tag_updated')}
          </p>
        )}
      </div>
    </div>
  );
}
