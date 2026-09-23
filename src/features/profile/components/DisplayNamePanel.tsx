'use client';

import React, { FormEvent } from 'react';
import { GameIcon } from '@/components/icons';
import { useGameTheme } from '@/game-engine/contexts/GameThemeContext';

interface Props {
  t: (key: string) => string;
  displayNameInput: string;
  setDisplayNameInput: (v: string) => void;
  displayNameBusy: boolean;
  displayNameError: string;
  displayNameSuccess: boolean;
  displayName: string;
  handleDisplayNameSubmit: (e: FormEvent) => void;
}

export default function DisplayNamePanel({
  t,
  displayNameInput,
  setDisplayNameInput,
  displayNameBusy,
  displayNameError,
  displayNameSuccess,
  displayName,
  handleDisplayNameSubmit,
}: Props) {
  const { themeConfig } = useGameTheme();
  const disabled = displayNameBusy || !displayNameInput.trim() || displayNameInput.trim() === displayName;

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
            <GameIcon name="gamepad" size={14} color={themeConfig.accentColor} />
            <span>{t('profile.displayName_section')}</span>
          </h3>
        </div>

        <form onSubmit={handleDisplayNameSubmit} className="profile-input-group">
          <input
            type="text"
            placeholder={t('profile.displayName_placeholder')}
            value={displayNameInput}
            onChange={(e) => setDisplayNameInput(e.target.value)}
            maxLength={25}
            className="profile-input"
          />
          <button
            type="submit"
            disabled={disabled}
            className="profile-action-btn"
          >
            {displayNameBusy ? '...' : t('profile.displayName_save')}
          </button>
        </form>

        {displayNameError && (
          <p style={{ color: '#ff2d55', fontSize: '12px', margin: '8px 0 0', fontWeight: 600 }}>
            {displayNameError}
          </p>
        )}
        {displayNameSuccess && (
          <p style={{ color: themeConfig.accentColor, fontSize: '12px', margin: '8px 0 0', fontWeight: 600 }}>
            {t('profile.displayName_updated')}
          </p>
        )}
      </div>
    </div>
  );
}
