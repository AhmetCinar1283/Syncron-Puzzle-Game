'use client';

import { FormEvent, RefObject } from 'react';
import { Copy, Check } from 'lucide-react';
import { useT, useLanguage } from '@/contexts/LanguageContext';
import BadgeIcon from '@/components/common/BadgeIcon';
import { UserSearchResult } from '@/services/api/friendsClient';

interface SearchPanelProps {
  isConnected: boolean;
  myTag: string | null;
  copied: boolean;
  onCopyMyTag: () => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
  searchInput: string;
  onTagInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSearchSubmit: (e: FormEvent) => void;
  searching: boolean;
  searchResults: UserSearchResult[];
  actionBusy: Record<string, boolean>;
  currentUserUid: string;
  onFriendClick: (friend: UserSearchResult) => void;
  onAcceptRequest: (uid: string) => void;
  onRejectRequest: (uid: string) => void;
  onSendRequest: (uid: string) => void;
}

export function SearchPanel({
  isConnected,
  myTag,
  copied,
  onCopyMyTag,
  searchInputRef,
  searchInput,
  onTagInputChange,
  onSearchSubmit,
  searching,
  searchResults,
  actionBusy,
  currentUserUid,
  onFriendClick,
  onAcceptRequest,
  onRejectRequest,
  onSendRequest,
}: SearchPanelProps) {
  const t = useT();
  const { lang } = useLanguage();

  return (
    <div
      style={{
        background: 'linear-gradient(to bottom, #0a0f1a, #070a12)',
        border: '1px solid rgba(0, 196, 255, 0.15)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 0 24px rgba(0, 196, 255, 0.02)',
      }}
    >
      <h3
        style={{
          fontSize: '11px',
          fontWeight: 800,
          letterSpacing: '0.15em',
          color: '#4b5563',
          textTransform: 'uppercase',
          margin: '0 0 14px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <span>{t('friends.search_title')}</span>
        {isConnected && (
          <span style={{ color: '#00c4ff', fontSize: 10, textTransform: 'none', letterSpacing: 'normal' }}>
            {lang === 'tr' ? 'Odaklanmak için (A) tuşuna basın' : 'Press (A) to focus'}
          </span>
        )}
      </h3>

      {myTag && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            padding: '8px 12px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid #111827',
            borderRadius: '8px',
          }}
        >
          <span style={{ fontSize: '12.5px', color: '#9ca3af', fontWeight: 600 }}>
            {lang === 'tr' ? 'Senin Etiketin:' : 'Your Tag:'}
          </span>
          <button
            onClick={onCopyMyTag}
            style={{
              background: 'rgba(0, 196, 255, 0.06)',
              border: '1px solid rgba(0, 196, 255, 0.25)',
              color: '#00c4ff',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              letterSpacing: '0.05em',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 196, 255, 0.15)';
              e.currentTarget.style.borderColor = 'rgba(0, 196, 255, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0, 196, 255, 0.06)';
              e.currentTarget.style.borderColor = 'rgba(0, 196, 255, 0.25)';
            }}
          >
            #{myTag}
            {copied ? (
              <Check size={12} style={{ color: '#00ff88' }} />
            ) : (
              <Copy size={12} />
            )}
          </button>
        </div>
      )}

      <form onSubmit={onSearchSubmit} style={{ display: 'flex', gap: '8px' }}>
        <input
          ref={searchInputRef}
          type="text"
          placeholder={t('friends.search_placeholder')}
          value={searchInput}
          onChange={onTagInputChange}
          maxLength={10}
          style={{
            flex: 1,
            padding: '10px 14px',
            background: '#060c16',
            border: '1px solid #1f2937',
            borderRadius: '8px',
            color: '#e5e7eb',
            fontSize: '14px',
            outline: 'none',
            fontFamily: 'inherit',
            textTransform: 'uppercase',
            boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.6)',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#00c4ff';
            e.target.style.boxShadow = '0 0 8px rgba(0, 196, 255, 0.3), inset 0 2px 4px rgba(0, 0, 0, 0.6)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = '#1f2937';
            e.target.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.6)';
          }}
        />
        <button
          type="submit"
          disabled={searching || !searchInput.trim()}
          style={{
            padding: '10px 20px',
            background: 'rgba(0, 196, 255, 0.1)',
            border: '1px solid rgba(0, 196, 255, 0.3)',
            borderRadius: '8px',
            color: '#00c4ff',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: '0 0 12px rgba(0, 196, 255, 0.08)',
          }}
          onMouseEnter={(e) => {
            if (!searching && searchInput.trim()) {
              e.currentTarget.style.background = '#00c4ff';
              e.currentTarget.style.color = '#030712';
              e.currentTarget.style.boxShadow = '0 0 18px rgba(0, 196, 255, 0.4)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0, 196, 255, 0.1)';
            e.currentTarget.style.color = '#00c4ff';
            e.currentTarget.style.boxShadow = '0 0 12px rgba(0, 196, 255, 0.08)';
          }}
        >
          {searching ? '...' : t('friends.search_btn')}
          {isConnected && typeof document !== 'undefined' && document.activeElement === searchInputRef.current && (
            <span style={{
              background: '#00c4ff',
              color: '#030712',
              fontSize: 9,
              fontWeight: 800,
              borderRadius: '50%',
              width: 14,
              height: 14,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: 6,
              boxShadow: '0 0 5px rgba(0, 196, 255, 0.5)'
            }}>
              A
            </span>
          )}
        </button>
      </form>

      {/* Search Results Display */}
      {searchResults.length > 0 && (
        <div style={{ marginTop: '20px', borderTop: '1px solid #111827', paddingTop: '16px' }}>
          {searchResults.map((result) => {
            const isBusy = actionBusy[result.uid];
            return (
              <div
                key={result.uid}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  background: 'rgba(255,255,255,0.01)',
                  border: '1px solid #111827',
                  borderRadius: '8px',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span
                    onClick={() => onFriendClick(result)}
                    style={{
                      fontSize: '13.5px',
                      fontWeight: 700,
                      color: '#e2e8f0',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                    onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                  >
                    {result.displayName}
                    {result.tag && (
                      <span style={{ fontSize: '9.5px', color: '#00c4ff', marginLeft: '4px', fontWeight: 800 }}>
                        [{result.tag}]
                      </span>
                    )}
                  </span>

                  {/* Showcase Badges */}
                  <div style={{ display: 'flex', gap: '3px', marginTop: '2px' }}>
                    {result.showcaseBadges && result.showcaseBadges.length > 0 ? (
                      result.showcaseBadges.map((badge, bIdx) => (
                        <BadgeIcon
                          key={badge.id || bIdx}
                          badgeType={badge.badgeType}
                          periodId={badge.periodId}
                          rank={badge.rank}
                          size="sm"
                        />
                      ))
                    ) : null}
                  </div>
                </div>

                {/* Action buttons based on state */}
                <div>
                  {result.friendshipStatus === 'accepted' && (
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#ec4899', opacity: 0.8 }}>
                      {t('friends.already_friends')}
                    </span>
                  )}

                  {result.friendshipStatus === 'pending' && result.friendshipRequestedBy === currentUserUid && (
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', opacity: 0.6 }}>
                      {t('friends.pending_outgoing')}
                    </span>
                  )}

                  {result.friendshipStatus === 'pending' && result.friendshipRequestedBy !== currentUserUid && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        onClick={() => onAcceptRequest(result.uid)}
                        disabled={isBusy}
                        style={{
                          padding: '5px 10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: 'rgba(0, 255, 136, 0.1)',
                          border: '1px solid rgba(0, 255, 136, 0.3)',
                          color: '#00ff88',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        {t('friends.accept')}
                      </button>
                      <button
                        onClick={() => onRejectRequest(result.uid)}
                        disabled={isBusy}
                        style={{
                          padding: '5px 10px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: 'rgba(255, 45, 85, 0.1)',
                          border: '1px solid rgba(255, 45, 85, 0.3)',
                          color: '#ff2d55',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}
                      >
                        {t('friends.reject')}
                      </button>
                    </div>
                  )}

                  {result.friendshipStatus === 'none' && (
                    <button
                      onClick={() => onSendRequest(result.uid)}
                      disabled={isBusy}
                      style={{
                        padding: '6px 12px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: 'rgba(0, 255, 136, 0.08)',
                        border: '1px solid rgba(0, 255, 136, 0.3)',
                        color: '#00ff88',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#00ff88';
                        e.currentTarget.style.color = '#030712';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 255, 136, 0.08)';
                        e.currentTarget.style.color = '#00ff88';
                      }}
                    >
                      {isBusy ? '...' : t('friends.add_friend')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default SearchPanel;
