'use client';

import React from 'react';
import { LANGS, type Lang } from '@/lib/i18n';
import { GameIcon } from '@/components/icons';
import { useGameTheme } from '@/game-engine/contexts/GameThemeContext';
import { useSettings } from '@/features/settings';
import { useSoundManager } from '@/services/audio';

interface Props {
  t: (key: string) => string;
  lang: Lang;
  setLang: (lang: Lang) => void;
  isCurrentAnonymous: boolean;
  handleSignOut: () => void;
}

export default function SettingsPanel({
  t,
  lang,
  setLang,
  isCurrentAnonymous,
  handleSignOut,
}: Props) {
  const { themeConfig } = useGameTheme();
  const { openSettings } = useSettings();
  const { play: playSound } = useSoundManager('menu');

  const onSelectLang = (code: Lang) => {
    playSound('ui.confirm');
    setLang(code);
  };

  const onOpenFullSettings = () => {
    playSound('ui.navigate');
    openSettings();
  };

  const onSignOutClick = () => {
    playSound('ui.confirm');
    handleSignOut();
  };

  return (
    <div className="profile-card">
      <div className="profile-card__scan" aria-hidden="true" />
      <div className="profile-card__bracket profile-card__bracket--tl" aria-hidden="true" />
      <div className="profile-card__bracket profile-card__bracket--tr" aria-hidden="true" />
      <div className="profile-card__bracket profile-card__bracket--bl" aria-hidden="true" />
      <div className="profile-card__bracket profile-card__bracket--br" aria-hidden="true" />

      <div className="profile-card__content" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Dil Seçimi */}
        <div>
          <div className="profile-panel-header" style={{ marginBottom: '10px' }}>
            <h3 className="profile-panel-title">
              <GameIcon name="globe" size={14} color={themeConfig.accentColor} />
              <span>{t('auth.language')}</span>
            </h3>
          </div>

          <div className="profile-lang-group">
            {LANGS.map(({ code, label: lbl }) => {
              const active = lang === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => onSelectLang(code)}
                  className={`profile-lang-btn ${active ? 'profile-lang-btn--active' : 'profile-lang-btn--inactive'}`}
                >
                  {lbl}
                </button>
              );
            })}
          </div>
        </div>

        {/* Oyun Ayarları (Ses, Kontrol, Tema) Açma Kısayolu */}
        <div>
          <button
            type="button"
            onClick={onOpenFullSettings}
            className="profile-link-btn"
          >
            <GameIcon name="settings" size={15} color={themeConfig.accentColor} />
            <span>{t('settings.title') || 'Oyun Tercihleri & Ayarlar'}</span>
          </button>
        </div>

        {/* Çıkış Yap Butonu */}
        {!isCurrentAnonymous && (
          <div style={{ paddingTop: '6px' }}>
            <button
              type="button"
              onClick={onSignOutClick}
              className="profile-danger-btn"
            >
              <GameIcon name="logout" size={14} color="#ef4444" />
              <span>{t('auth.sign_out')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
