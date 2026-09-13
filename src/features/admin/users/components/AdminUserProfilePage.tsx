'use client';

import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { GameIcon } from '@/components/icons';
import { AdminGuard } from '@/components/common/AdminGuard';
import { useAdminUserProfile } from '../hooks/useAdminUserProfile';
import { ActiveBanBanner } from './ActiveBanBanner';
import { ProfileSummaryPanel } from './ProfileSummaryPanel';
import { ActivityStatsPanel } from './ActivityStatsPanel';
import { PlayedLevelsPanel } from './PlayedLevelsPanel';
import { BanManagementSection } from './BanManagementSection';
import { AuditLogTimeline } from './AuditLogTimeline';
import { IssueBanModal } from './IssueBanModal';

export function AdminUserProfilePage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const isTr = lang === 'tr';

  const {
    uid,
    profile,
    stats,
    lastActivity,
    playedLevels,
    playedSort,
    setPlayedSort,
    getSortedLevels,

    logs,
    logsHasMore,
    logsLoadingMore,
    fetchMoreLogs,

    activeCategory,
    setActiveCategory,
    actionQuery,
    setActionQuery,
    dateAfter,
    setDateAfter,
    dateBefore,
    setDateBefore,

    loadingProfile,
    loadingLogs,

    bans,
    activeBans,
    handleLiftBan,

    showBanModal,
    setShowBanModal,
    banType,
    setBanType,
    durationOption,
    setDurationOption,
    expiresAt,
    setExpiresAt,
    banReason,
    setBanReason,
    submittingBan,
    banError,
    setBanError,
    handleIssueBan,
  } = useAdminUserProfile(isTr);

  // Render loading placeholder if no uid present in the query parameter yet
  if (!uid) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          background: '#030712',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ color: '#9333ea', fontSize: '12px', letterSpacing: '0.15em' }}>NO UID SPECIFIED IN PARAMETERS.</span>
      </div>
    );
  }

  return (
    <AdminGuard>
      <div
        style={{
          minHeight: '100dvh',
          background: '#030712',
          color: '#e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Top Header */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 24px',
            background: 'rgba(3, 7, 18, 0.97)',
            borderBottom: '1px solid rgba(147, 51, 234, 0.15)',
            zIndex: 10,
          }}
        >
          <button
            onClick={() => router.push('/admin/users')}
            style={{
              background: 'none',
              border: 'none',
              color: '#475569',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: '0.06em',
              transition: 'color 0.2s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#9333ea')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
          >
            <GameIcon name="arrow-left" size={11} color="currentColor" />
            <span>{isTr ? 'KULLANICILAR' : 'USERS DIRECTORY'}</span>
          </button>

          <h1
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 800,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#9333ea',
              textShadow: '0 0 12px rgba(147, 51, 234, 0.4)',
            }}
          >
            {isTr ? 'KULLANICI ÇALIŞMA ALANI' : 'USER WORKSPACE'}
          </h1>

          <span style={{ fontSize: '11px', color: '#475569', fontFamily: 'monospace' }}>ID: {uid ? `${uid.slice(0, 8)}...` : ''}</span>
        </div>

        {/* Content Container */}
        <main
          style={{
            flex: 1,
            maxWidth: '1200px',
            width: '100%',
            margin: '0 auto',
            padding: '32px 24px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: '32px',
          }}
        >
          {/* Skeleton Loaders or Main Workspace Board */}
          {loadingProfile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Profile Skeleton */}
              <div
                style={{
                  height: '180px',
                  background: 'rgba(255,255,255,0.01)',
                  borderRadius: '16px',
                  border: '1px solid rgba(147, 51, 234, 0.08)',
                  animation: 'pulse 1.5s infinite ease-in-out',
                }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div
                  style={{
                    height: '240px',
                    background: 'rgba(255,255,255,0.01)',
                    borderRadius: '16px',
                    border: '1px solid rgba(147, 51, 234, 0.08)',
                    animation: 'pulse 1.5s infinite ease-in-out',
                  }}
                />
                <div
                  style={{
                    height: '240px',
                    background: 'rgba(255,255,255,0.01)',
                    borderRadius: '16px',
                    border: '1px solid rgba(147, 51, 234, 0.08)',
                    animation: 'pulse 1.5s infinite ease-in-out',
                  }}
                />
              </div>
            </div>
          ) : !profile ? (
            <div style={{ textAlign: 'center', padding: '80px 0', border: '1px dashed #ef4444', borderRadius: '16px' }}>
              <p style={{ color: '#ef4444', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <GameIcon name="error" size={16} color="#ef4444" />
                <span>{isTr ? 'Kullanıcı profili yüklenemedi veya bulunamadı.' : 'Failed to retrieve user profile.'}</span>
              </p>
            </div>
          ) : (
            <>
              <ActiveBanBanner activeBans={activeBans} isTr={isTr} />

              <ProfileSummaryPanel profile={profile} isTr={isTr} />

              {/* Grid 2: Statistics and Levels Played */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                  gap: '24px',
                }}
              >
                <ActivityStatsPanel stats={stats} lastActivity={lastActivity} isTr={isTr} />
                <PlayedLevelsPanel
                  playedLevels={playedLevels}
                  sortedLevels={getSortedLevels()}
                  playedSort={playedSort}
                  setPlayedSort={setPlayedSort}
                  isTr={isTr}
                />
              </div>

              <BanManagementSection
                activeBans={activeBans}
                bans={bans}
                isTr={isTr}
                onIssueBan={() => {
                  setBanError(null);
                  setShowBanModal(true);
                }}
                onLiftBan={handleLiftBan}
              />

              <AuditLogTimeline
                isTr={isTr}
                logs={logs}
                loadingLogs={loadingLogs}
                logsHasMore={logsHasMore}
                logsLoadingMore={logsLoadingMore}
                fetchMoreLogs={fetchMoreLogs}
                activeCategory={activeCategory}
                setActiveCategory={setActiveCategory}
                actionQuery={actionQuery}
                setActionQuery={setActionQuery}
                dateAfter={dateAfter}
                setDateAfter={setDateAfter}
                dateBefore={dateBefore}
                setDateBefore={setDateBefore}
              />
            </>
          )}
        </main>
      </div>

      <IssueBanModal
        isTr={isTr}
        show={showBanModal}
        onClose={() => setShowBanModal(false)}
        onSubmit={handleIssueBan}
        banError={banError}
        banType={banType}
        setBanType={setBanType}
        durationOption={durationOption}
        setDurationOption={setDurationOption}
        expiresAt={expiresAt}
        setExpiresAt={setExpiresAt}
        banReason={banReason}
        setBanReason={setBanReason}
        submittingBan={submittingBan}
      />
    </AdminGuard>
  );
}
