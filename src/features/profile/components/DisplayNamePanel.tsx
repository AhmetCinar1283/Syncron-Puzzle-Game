'use client';

import { FormEvent } from 'react';

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
  const disabled = displayNameBusy || !displayNameInput.trim() || displayNameInput.trim() === displayName;

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
        {t('profile.displayName_section')}
      </h3>

      <form onSubmit={handleDisplayNameSubmit} style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          placeholder={t('profile.displayName_placeholder')}
          value={displayNameInput}
          onChange={(e) => setDisplayNameInput(e.target.value)}
          maxLength={25}
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
          disabled={disabled}
          style={{
            padding: '8px 16px',
            background: '#00ff8815',
            border: '1px solid #00ff8840',
            borderRadius: '8px',
            color: '#00ff88',
            fontSize: '13px',
            fontWeight: 700,
            cursor: disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!disabled) {
              e.currentTarget.style.background = '#00ff8825';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#00ff8815';
          }}
        >
          {displayNameBusy ? '...' : t('profile.displayName_save')}
        </button>
      </form>

      {displayNameError && <p style={{ color: '#ff2d55', fontSize: '12px', margin: '8px 0 0' }}>{displayNameError}</p>}
      {displayNameSuccess && <p style={{ color: '#00ff88', fontSize: '12px', margin: '8px 0 0' }}>{t('profile.displayName_updated')}</p>}
    </div>
  );
}
