'use client';

import { Copy, Check } from 'lucide-react';
import type { T } from '@/contexts/LanguageContext';
import { GameIcon } from '@/components/icons';
import FriendActionButtons from './FriendActionButtons';

interface Stats {
  score: number;
  completed: number;
  xp: number;
}

interface Props {
  t: T;
  lang: string;
  displayName: string;
  currentTag: string | null | undefined;
  isOwner: boolean;
  copied: boolean;
  handleCopyTag: () => void;
  currentUser: boolean;
  isCurrentAnonymous: boolean;
  viewUid: string | null;
  friendshipState: string;
  actionBusy: Record<string, boolean>;
  removeFriend: (uid: string) => void;
  acceptRequest: (uid: string) => void;
  rejectRequest: (uid: string) => void;
  sendRequest: (uid: string) => void;
  stats: Stats | null;
  queryScore: string | null;
  queryScoreCat: string | null;
}

export default function ProfileHeaderCard({
  t,
  lang,
  displayName,
  currentTag,
  isOwner,
  copied,
  handleCopyTag,
  currentUser,
  isCurrentAnonymous,
  viewUid,
  friendshipState,
  actionBusy,
  removeFriend,
  acceptRequest,
  rejectRequest,
  sendRequest,
  stats,
  queryScore,
  queryScoreCat,
}: Props) {
  return (
    <div
      style={{
        background: 'linear-gradient(to bottom, #0a0f1a, #070a12)',
        border: '1px solid #00ff8820',
        borderRadius: '16px',
        padding: '28px 24px',
        boxShadow: '0 0 30px rgba(0, 255, 136, 0.03)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      {/* Avatar Icon */}
      <div
        style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: 'rgba(0, 255, 136, 0.08)',
          border: '1.5px solid #00ff8840',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
          fontWeight: 900,
          color: '#00ff88',
          boxShadow: '0 0 20px rgba(0, 255, 136, 0.15)',
          marginBottom: '16px',
        }}
      >
        {displayName[0]?.toUpperCase()}
      </div>

      <h2
        style={{
          fontSize: '24px',
          fontWeight: 900,
          color: '#f3f4f6',
          margin: 0,
          letterSpacing: '0.04em',
        }}
      >
        {displayName}
      </h2>

      {/* User Tag */}
      {currentTag ? (
        <button
          onClick={handleCopyTag}
          title={lang === 'tr' ? 'Kopyala' : 'Copy tag'}
          style={{
            marginTop: '8px',
            fontSize: '14px',
            fontWeight: 800,
            color: '#00c4ff',
            textShadow: '0 0 10px rgba(0, 196, 255, 0.4)',
            background: 'rgba(0, 196, 255, 0.06)',
            border: '1px solid rgba(0, 196, 255, 0.25)',
            padding: '4px 12px',
            borderRadius: '6px',
            letterSpacing: '0.1em',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
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
          #{currentTag}
          {copied ? (
            <Check size={12} style={{ color: '#00ff88' }} />
          ) : (
            <Copy size={12} />
          )}
        </button>
      ) : (
        isOwner && (
          <span style={{ fontSize: '12px', color: '#4b5563', marginTop: '6px' }}>
            {t('auth.tag_no_tag')}
          </span>
        )
      )}

      {/* Friend Status Button for public profile views */}
      {!isOwner && currentUser && !isCurrentAnonymous && viewUid && (
        <FriendActionButtons
          t={t}
          friendshipState={friendshipState}
          viewUid={viewUid}
          actionBusy={actionBusy}
          removeFriend={removeFriend}
          acceptRequest={acceptRequest}
          rejectRequest={rejectRequest}
          sendRequest={sendRequest}
        />
      )}

      {/* XP Progress Section */}
      {stats && isOwner && (
        <div
          style={{
            width: '100%',
            marginTop: '24px',
            borderTop: '1px solid #111827',
            paddingTop: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
            <span style={{ fontWeight: 800, color: '#a855f7', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <GameIcon name="sparkles" size={14} color="#a855f7" /> {t('profile.level')} {Math.floor((stats.xp ?? 0) / 1000) + 1}
            </span>
            <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 600 }}>
              {(stats.xp ?? 0) % 1000} / 1000 {t('profile.xp')}
            </span>
          </div>
          {/* Progress Bar Container */}
          <div
            style={{
              width: '100%',
              height: '10px',
              background: '#111827',
              borderRadius: '999px',
              overflow: 'hidden',
              border: '1.5px solid rgba(168, 85, 247, 0.2)',
              boxShadow: '0 0 10px rgba(168, 85, 247, 0.05)',
              position: 'relative',
            }}
          >
            {/* Progress Fill */}
            <div
              style={{
                height: '100%',
                width: `${Math.min(100, Math.max(0, (((stats.xp ?? 0) % 1000) / 1000) * 100))}%`,
                background: 'linear-gradient(90deg, #a855f7 0%, #d8b4fe 100%)',
                boxShadow: '0 0 8px #a855f7',
                borderRadius: '999px',
                transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          </div>
        </div>
      )}

      {/* Statistics Grid */}
      {stats && (
        <div
          style={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns: isOwner ? '1fr 1fr 1fr' : '1fr 1fr',
            gap: '16px',
            marginTop: '24px',
            borderTop: isOwner ? 'none' : '1px solid #111827',
            paddingTop: isOwner ? '0' : '20px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '20px', fontWeight: 900, color: '#ffd700' }}>
              {stats.score}
            </span>
            <span style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>
              {t('leaderboard.score')} (Stars)
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '20px', fontWeight: 900, color: '#00c4ff' }}>
              {stats.completed}
            </span>
            <span style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>
              {t('levels.title')}
            </span>
          </div>
          {isOwner && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '20px', fontWeight: 900, color: '#a855f7', textShadow: '0 0 8px rgba(168, 85, 247, 0.4)' }}>
                {stats.xp}
              </span>
              <span style={{ fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>
                {t('profile.xp')}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Non-owner Score display if navigated from leaderboard */}
      {!isOwner && queryScore && (
        <div
          style={{
            marginTop: '16px',
            fontSize: '13px',
            fontWeight: 700,
            color: '#9ca3af',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {queryScoreCat === 'stars' && (
            <>
              <GameIcon name="star" size={14} color="#ffd700" />
              <span>{queryScore} Stars</span>
            </>
          )}
          {queryScoreCat === 'levels' && (
            <>
              <GameIcon name="mountain" size={14} color="#00c4ff" />
              <span>{queryScore} Levels</span>
            </>
          )}
          {queryScoreCat === 'records' && (
            <>
              <GameIcon name="medal" size={14} color="#f59e0b" />
              <span>{queryScore} Records</span>
            </>
          )}
          {queryScoreCat === 'creators' && (
            <>
              <GameIcon name="architect" size={14} color="#10b981" />
              <span>{queryScore} Points</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
