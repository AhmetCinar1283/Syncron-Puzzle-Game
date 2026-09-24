'use client';

import { useT } from '@/contexts/LanguageContext';
import AuthModal from '@/components/common/AuthModal';
import { MascotBuddy } from '@/components/ui';
import { useFriendsPage } from '../hooks/useFriendsPage';
import { FriendsNavBar } from './FriendsNavBar';
import { StatusMessages } from './StatusMessages';
import { UnauthPanel } from './UnauthPanel';
import { SearchPanel } from './SearchPanel';
import { RequestsPanel } from './RequestsPanel';
import { FriendsListPanel } from './FriendsListPanel';
import { BlockedPanel } from './BlockedPanel';

export function FriendsPage() {
  const t = useT();
  const {
    friends,
    requests,
    blocked,
    loadingFriends,
    loadingBlocked,
    searchResults,
    loadingRequests,
    searching,
    actionBusy,
    error,
    successMsg,
    search,
    sendRequest,
    acceptRequest,
    rejectRequest,
    removeFriend,
    blockUser,
    unblockUser,
    user,
    isAuth,
    authModalOpen,
    setAuthModalOpen,
    searchInput,
    myTag,
    copied,
    handleCopyMyTag,
    searchInputRef,
    isConnected,
    handleSearchSubmit,
    handleTagInputChange,
    handleFriendClick,
  } = useFriendsPage();

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: 'transparent',
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
      {/* Main Container */}
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
        <FriendsNavBar isConnected={isConnected} />

        {isAuth && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '4px' }}>
            <MascotBuddy size={44} playerIndex={0} moods={['love', 'happy', 'wink']} />
            <MascotBuddy size={44} playerIndex={1} moods={['love', 'happy', 'wink']} />
          </div>
        )}

        {/* Title */}
        <h1
          style={{
            fontSize: '32px',
            fontWeight: 900,
            letterSpacing: '0.12em',
            textAlign: 'center',
            color: '#ec4899',
            textShadow: '0 0 16px rgba(236, 72, 153, 0.4), 0 0 32px rgba(236, 72, 153, 0.2)',
            margin: '0 0 8px 0',
            textTransform: 'uppercase',
          }}
        >
          {t('friends.title')}
        </h1>

        <StatusMessages error={error} successMsg={successMsg} />

        {/* Main Content Card logic */}
        {!isAuth ? (
          <UnauthPanel onSignIn={() => setAuthModalOpen(true)} />
        ) : (
          <>
            <SearchPanel
              isConnected={isConnected}
              myTag={myTag}
              copied={copied}
              onCopyMyTag={handleCopyMyTag}
              searchInputRef={searchInputRef}
              searchInput={searchInput}
              onTagInputChange={handleTagInputChange}
              onSearchSubmit={handleSearchSubmit}
              searching={searching}
              searchResults={searchResults}
              actionBusy={actionBusy}
              currentUserUid={user?.uid ?? ''}
              onFriendClick={handleFriendClick}
              onAcceptRequest={acceptRequest}
              onRejectRequest={rejectRequest}
              onSendRequest={sendRequest}
            />

            <RequestsPanel
              requests={requests}
              loadingRequests={loadingRequests}
              actionBusy={actionBusy}
              onFriendClick={handleFriendClick}
              onAcceptRequest={acceptRequest}
              onRejectRequest={rejectRequest}
            />

            <FriendsListPanel
              friends={friends}
              loadingFriends={loadingFriends}
              actionBusy={actionBusy}
              onFriendClick={handleFriendClick}
              onRemoveFriend={removeFriend}
              onBlockUser={blockUser}
            />

            <BlockedPanel
              blocked={blocked}
              loadingBlocked={loadingBlocked}
              actionBusy={actionBusy}
              onUnblockUser={unblockUser}
            />
          </>
        )}
      </div>

      {/* Auth Modal for Sign In */}
      {authModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} />}

      <style jsx global>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

export default FriendsPage;
