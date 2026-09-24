'use client';

import React, { useMemo, useState } from 'react';
import BadgeShowcase from '@/components/common/BadgeShowcase';
import BadgePicker from '@/components/common/BadgePicker';
import { GameIcon } from '@/components/icons';
import { useGameTheme } from '@/game-engine/contexts/GameThemeContext';
import { ThemeSelectorModal } from '@/game-engine/components/play-screen/ThemeSelectorModal';
import { useSoundManager } from '@/services/audio';
import { useProfileState } from '../hooks/useProfileState';
import ProfileHeaderCard from './ProfileHeaderCard';
import DisplayNamePanel from './DisplayNamePanel';
import TagPanel from './TagPanel';
import BadgesGridPanel from './BadgesGridPanel';
import SettingsPanel from './SettingsPanel';

export default function ProfileClient() {
  const { theme, themeConfig } = useGameTheme();
  const { play: playSound } = useSoundManager('menu');
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  const {
    t,
    router,
    lang,
    setLang,
    currentUser,
    isCurrentAnonymous,
    viewUid,
    isOwner,
    queryScore,
    queryScoreCat,
    pickerOpen,
    setPickerOpen,
    tagInput,
    setTagInput,
    tagBusy,
    tagError,
    tagSuccess,
    displayNameInput,
    setDisplayNameInput,
    displayNameBusy,
    displayNameError,
    displayNameSuccess,
    copied,
    handleCopyTag,
    badges,
    loadingBadges,
    badgesError,
    saveShowcase,
    savingShowcase,
    actionBusy,
    sendRequest,
    acceptRequest,
    rejectRequest,
    removeFriend,
    currentTag,
    friendshipState,
    isConnected,
    displayName,
    showcaseBadges,
    stats,
    changesLeft,
    daysRemaining,
    canChangeTag,
    handleTagSubmit,
    handleDisplayNameSubmit,
    handleSignOut,
  } = useProfileState();

  const themeVars = useMemo(() => {
    const accent = themeConfig.accentColor;
    return {
      '--profile-accent': accent,
      '--profile-accent-glow': themeConfig.accentGlow,
      '--profile-accent-08': `${accent}14`,
      '--profile-accent-15': `${accent}26`,
      '--profile-accent-25': `${accent}40`,
      '--profile-accent-40': `${accent}66`,
      '--profile-radius': theme === 'arcade' ? '0px' : '14px',
      '--profile-bg': themeConfig.board.background || '#070e1c',
    } as React.CSSProperties;
  }, [theme, themeConfig]);

  const onCopyTagWithSound = () => {
    playSound('ui.confirm');
    handleCopyTag();
  };

  return (
    <div className="profile-root" style={themeVars}>
      <div className="profile-container">
        {/* Üst Navigasyon & Tema Çipi */}
        <div className="profile-topbar">
          <button
            type="button"
            onClick={() => {
              playSound('ui.navigate');
              router.push('/');
            }}
            className="profile-back-btn"
          >
            <GameIcon name="arrow-left" size={13} color={themeConfig.accentColor} />
            <span>{t('common.back_menu')}</span>
            {isConnected && (
              <span
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: 9,
                  fontWeight: 800,
                  borderRadius: '50%',
                  width: 14,
                  height: 14,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 4,
                  boxShadow: '0 0 5px #ef4444',
                }}
              >
                B
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              playSound('ui.confirm');
              setIsThemeModalOpen(true);
            }}
            className="profile-theme-chip"
            title={t('home.change_theme') || 'Temayı Değiştir'}
            style={{ cursor: 'pointer' }}
          >
            <GameIcon name="palette" size={13} color={themeConfig.accentColor} />
            <span>{t(themeConfig.nameKey) || themeConfig.defaultName}</span>
          </button>
        </div>

        {/* Oyuncu Kartı (Profile Header Card) */}
        <ProfileHeaderCard
          t={t}
          displayName={displayName}
          currentTag={currentTag}
          isOwner={isOwner}
          copied={copied}
          handleCopyTag={onCopyTagWithSound}
          currentUser={!!currentUser}
          isCurrentAnonymous={isCurrentAnonymous}
          viewUid={viewUid}
          friendshipState={friendshipState}
          actionBusy={actionBusy}
          removeFriend={removeFriend}
          acceptRequest={acceptRequest}
          rejectRequest={rejectRequest}
          sendRequest={sendRequest}
          stats={stats}
          queryScore={queryScore}
          queryScoreCat={queryScoreCat}
        />

        {/* Rozet Vitrini (Badge Showcase) */}
        <BadgeShowcase
          uid={viewUid || ''}
          isOwner={isOwner}
          showcaseBadges={showcaseBadges}
          onEditClick={() => {
            playSound('ui.confirm');
            setPickerOpen(true);
          }}
        />

        {/* Kullanıcı Adı Değiştirme (Yalnızca Sahip) */}
        {isOwner && !isCurrentAnonymous && (
          <DisplayNamePanel
            t={t}
            displayNameInput={displayNameInput}
            setDisplayNameInput={setDisplayNameInput}
            displayNameBusy={displayNameBusy}
            displayNameError={displayNameError}
            displayNameSuccess={displayNameSuccess}
            displayName={displayName}
            handleDisplayNameSubmit={handleDisplayNameSubmit}
          />
        )}

        {/* Tag Değiştirme Paneli (Yalnızca Sahip) */}
        {isOwner && !isCurrentAnonymous && (
          <TagPanel
            t={t}
            changesLeft={changesLeft}
            daysRemaining={daysRemaining}
            canChangeTag={canChangeTag}
            tagInput={tagInput}
            setTagInput={setTagInput}
            tagBusy={tagBusy}
            tagError={tagError}
            tagSuccess={tagSuccess}
            handleTagSubmit={handleTagSubmit}
          />
        )}

        {/* Kazanılmış Tüm Rozetler Dolabı */}
        <BadgesGridPanel
          t={t}
          loadingBadges={loadingBadges}
          badgesError={badgesError}
          badges={badges}
        />

        {/* Profil İçi Hızlı Ayarlar (Yalnızca Sahip) */}
        {isOwner && (
          <SettingsPanel
            t={t}
            lang={lang}
            setLang={setLang}
            isCurrentAnonymous={isCurrentAnonymous}
            handleSignOut={handleSignOut}
          />
        )}
      </div>

      {/* Rozet Seçici Modal */}
      {isOwner && (
        <BadgePicker
          isOpen={pickerOpen}
          onClose={() => setPickerOpen(false)}
          badges={badges}
          initialShowcaseIds={showcaseBadges.map((b: { id: string }) => b.id)}
          onSave={async (ids) => {
            await saveShowcase(ids);
          }}
          saving={savingShowcase}
        />
      )}

      {/* Tema Seçici Modal */}
      {isThemeModalOpen && (
        <ThemeSelectorModal
          onClose={() => setIsThemeModalOpen(false)}
        />
      )}

      {/* Gamepad İpucu */}
      {isConnected && !pickerOpen && !isThemeModalOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: 'calc(16px + var(--ad-banner-height))',
            right: 16,
            background: 'rgba(8, 12, 28, 0.88)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${themeConfig.accentColor}40`,
            borderRadius: 8,
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 10,
            color: themeConfig.accentColor,
            boxShadow: `0 4px 16px rgba(0, 0, 0, 0.5), 0 0 10px ${themeConfig.accentGlow}`,
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          <GameIcon name="gamepad" size={12} color={themeConfig.accentColor} />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            D-pad
            <GameIcon name="arrow-up" size={9} color={themeConfig.accentColor} />
            /
            <GameIcon name="arrow-down" size={9} color={themeConfig.accentColor} />: {t('profile.scroll')}
          </span>
        </div>
      )}
    </div>
  );
}
