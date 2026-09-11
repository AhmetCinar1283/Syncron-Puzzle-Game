'use client';

import BadgeShowcase from '@/components/common/BadgeShowcase';
import BadgePicker from '@/components/common/BadgePicker';
import { useProfileState } from '../hooks/useProfileState';
import BackgroundParticles from './BackgroundParticles';
import ProfileHeaderCard from './ProfileHeaderCard';
import DisplayNamePanel from './DisplayNamePanel';
import TagPanel from './TagPanel';
import BadgesGridPanel from './BadgesGridPanel';
import SettingsPanel from './SettingsPanel';

export default function ProfileClient() {
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
    particles,
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

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#030712',
        color: '#e2e8f0',
        fontFamily: 'var(--font-sans)',
        padding: '24px 16px 48px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        overflowY: 'auto',
        position: 'relative',
      }}
    >
      {/* Background neon particles */}
      <BackgroundParticles particles={particles} />

      {/* Main Content Card */}
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        {/* Navigation Bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <button
            onClick={() => router.push('/')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9ca3af',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              padding: '8px 12px',
              borderRadius: '6px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#e5e7eb';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#9ca3af';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            {t('common.back_menu')}
            {isConnected && (
              <span style={{
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
                marginLeft: 6,
                boxShadow: '0 0 5px #ef4444'
              }}>
                B
              </span>
            )}
          </button>
        </div>

        {/* Profile Card Header */}
        <ProfileHeaderCard
          t={t}
          lang={lang}
          displayName={displayName}
          currentTag={currentTag}
          isOwner={isOwner}
          copied={copied}
          handleCopyTag={handleCopyTag}
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

        {/* Badge Showcase Component */}
        <BadgeShowcase
          uid={viewUid || ''}
          isOwner={isOwner}
          showcaseBadges={showcaseBadges}
          onEditClick={() => setPickerOpen(true)}
        />

        {/* Display Name Management Panel (Owner only) */}
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

        {/* Tag Management Panel (Owner only) */}
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

        {/* All Earned Badges Grid */}
        <BadgesGridPanel t={t} loadingBadges={loadingBadges} badgesError={badgesError} badges={badges} />

        {/* Profile Settings (Owner only) */}
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

      {/* Badge Picker Modal */}
      {isOwner && (
        <BadgePicker
          isOpen={pickerOpen}
          onClose={() => setPickerOpen(false)}
          badges={badges}
          initialShowcaseIds={showcaseBadges.map((b: any) => b.id)}
          onSave={async (ids) => { await saveShowcase(ids); }}
          saving={savingShowcase}
        />
      )}
      {isConnected && !pickerOpen && (
        <div style={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          background: 'rgba(8, 12, 28, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(0, 255, 136, 0.2)',
          borderRadius: 8,
          padding: '6px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 10,
          color: '#00ff88',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
          zIndex: 10,
          pointerEvents: 'none',
        }}>
          <span>🎮 D-pad ↑/↓: {lang === 'tr' ? 'Kaydır' : 'Scroll'}</span>
        </div>
      )}
    </div>
  );
}
