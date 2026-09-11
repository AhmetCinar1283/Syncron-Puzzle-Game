'use client';

import React from 'react';
import AuthModal from '@/components/common/AuthModal';
import LeaderboardHeader from './components/LeaderboardHeader';
import CategoryTabs from './components/CategoryTabs';
import PeriodTabs from './components/PeriodTabs';
import FriendsGate from './components/FriendsGate';
import PodiumSection from './components/PodiumSection';
import LeaderboardListSection from './components/LeaderboardListSection';
import StandingSection from './components/StandingSection';
import { useLeaderboardPage } from './hooks/useLeaderboardPage';

export default function LeaderboardPage() {
  const {
    t,
    user,
    isAnonymous,
    catIndex,
    setCatIndex,
    periodIndex,
    setPeriodIndex,
    authModalOpen,
    setAuthModalOpen,
    activeCategory,
    isFriendsCategory,
    loading,
    error,
    refresh,
    podiumEntries,
    listEntries,
    entries,
    formatScore,
    standingSection,
    handlePlayClick,
    handleUserClick,
  } = useLeaderboardPage();

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
      }}
    >
      <LeaderboardHeader
        t={t}
        activeColor={activeCategory.color}
        activeGlow={activeCategory.glow}
        isFriendsCategory={isFriendsCategory}
        onRefresh={refresh}
      />

      <CategoryTabs
        t={t}
        catIndex={catIndex}
        onSelect={(idx) => {
          setCatIndex(idx);
          setPeriodIndex(0);
        }}
      />

      {!isFriendsCategory && (
        <PeriodTabs t={t} catIndex={catIndex} periodIndex={periodIndex} onSelect={setPeriodIndex} />
      )}

      {/* Main Content Area */}
      <div
        style={{
          width: '100%',
          maxWidth: '600px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
        }}
      >
        {isFriendsCategory && isAnonymous ? (
          <FriendsGate
            t={t}
            activeColor={activeCategory.color}
            variant="unauthenticated"
            onSignIn={() => setAuthModalOpen(true)}
          />
        ) : isFriendsCategory && entries.length === 0 && !loading ? (
          <FriendsGate
            t={t}
            activeColor={activeCategory.color}
            variant="no_friends"
            onSignIn={() => setAuthModalOpen(true)}
          />
        ) : loading ? (
          /* Loading Indicator */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                border: `3px solid ${activeCategory.color}20`,
                borderTopColor: activeCategory.color,
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginBottom: '16px',
              }}
            />
            <span style={{ fontSize: '12px', letterSpacing: '0.1em', color: '#6b7280' }}>
              {t('leaderboard.loading').toUpperCase()}
            </span>
          </div>
        ) : error ? (
          /* Error State */
          <div
            style={{
              width: '100%',
              padding: '20px',
              textAlign: 'center',
              border: '1px solid #ff2d5530',
              background: '#ff2d5508',
              color: '#ff2d55',
              borderRadius: '8px',
              fontSize: '13px',
            }}
          >
            ⚠️ {t('leaderboard.error')}
          </div>
        ) : (
          /* Normal List Render */
          <>
            {entries.length > 0 && (
              <PodiumSection
                podiumEntries={podiumEntries}
                selfUid={user?.uid}
                activeCategoryId={activeCategory.id}
                activeColor={activeCategory.color}
                formatScore={formatScore}
                onUserClick={handleUserClick}
              />
            )}

            <LeaderboardListSection
              listEntries={listEntries}
              selfUid={user?.uid}
              activeCategoryId={activeCategory.id}
              formatScore={formatScore}
              onUserClick={handleUserClick}
            />
          </>
        )}
      </div>

      {/* "Senin Yerin" (My Standing) Sticky Section */}
      {!isFriendsCategory && (
        <StandingSection
          t={t}
          standingSection={standingSection}
          selfUid={user?.uid}
          activeCategoryId={activeCategory.id}
          formatScore={formatScore}
          onUserClick={handleUserClick}
          onSignIn={() => setAuthModalOpen(true)}
          onPlayClick={handlePlayClick}
        />
      )}

      {/* Authentication Modal */}
      {authModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} />}

      <style jsx global>{`
        /* Hide scrollbar for Chrome, Safari and Opera */
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        /* Hide scrollbar for IE, Edge and Firefox */
        .no-scrollbar {
          -ms-overflow-style: none; /* IE and Edge */
          scrollbar-width: none; /* Firefox */
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
