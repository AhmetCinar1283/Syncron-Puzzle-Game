'use client';

import React from 'react';
import { Copy, Check } from 'lucide-react';
import type { T } from '@/contexts/LanguageContext';
import { GameIcon } from '@/components/icons';
import { useGameTheme } from '@/game-engine/contexts/GameThemeContext';
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
  const { themeConfig } = useGameTheme();
  const currentLevel = Math.floor((stats?.xp ?? 0) / 1000) + 1;
  const currentLevelXp = (stats?.xp ?? 0) % 1000;
  const xpPercentage = Math.min(100, Math.max(0, (currentLevelXp / 1000) * 100));

  return (
    <div className="profile-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      {/* Scanline dokusu */}
      <div className="profile-card__scan" aria-hidden="true" />

      {/* Siber köşe braketleri */}
      <div className="profile-card__bracket profile-card__bracket--tl" aria-hidden="true" />
      <div className="profile-card__bracket profile-card__bracket--tr" aria-hidden="true" />
      <div className="profile-card__bracket profile-card__bracket--bl" aria-hidden="true" />
      <div className="profile-card__bracket profile-card__bracket--br" aria-hidden="true" />

      <div className="profile-card__content" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Oyuncu Kartı Başlık Plakası */}
        <div className="profile-dossier-tag">
          <span className="profile-status-dot" />
          <span>{lang === 'tr' ? 'OYUNCU KARTI // SYNC' : 'PLAYER DOSSIER // SYNC'}</span>
        </div>

        {/* Neon Avatar */}
        <div className="profile-avatar-outer">
          <div className="profile-avatar-ring" aria-hidden="true" />
          <div className="profile-avatar-inner">
            {displayName[0]?.toUpperCase() || 'P'}
          </div>
        </div>

        {/* Oyuncu İsmi */}
        <h2
          style={{
            fontSize: 'clamp(20px, 5.5vw, 26px)',
            fontWeight: 900,
            color: '#f8fafc',
            margin: 0,
            letterSpacing: '0.04em',
            textShadow: '0 2px 10px rgba(0, 0, 0, 0.8)',
            wordBreak: 'break-word',
            maxWidth: '100%',
          }}
        >
          {displayName}
        </h2>

        {/* Gamer Tag Butonu */}
        {currentTag ? (
          <button
            type="button"
            onClick={handleCopyTag}
            title={lang === 'tr' ? 'Etiketi Kopyala' : 'Copy Tag'}
            className="profile-tag-chip"
          >
            <span>#{currentTag}</span>
            {copied ? (
              <Check size={13} style={{ color: themeConfig.accentColor }} />
            ) : (
              <Copy size={13} style={{ opacity: 0.8 }} />
            )}
          </button>
        ) : (
          isOwner && (
            <span style={{ fontSize: '11.5px', color: '#64748b', marginTop: '6px', fontWeight: 600 }}>
              {t('auth.tag_no_tag')}
            </span>
          )
        )}

        {/* Başka Kullanıcı Profilinde Arkadaşlık Butonları */}
        {!isOwner && currentUser && !isCurrentAnonymous && viewUid && (
          <div style={{ marginTop: '14px', width: '100%' }}>
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
          </div>
        )}

        {/* Seviye & XP HUD Göstergesi (Yalnızca Sahip veya Stats Varsa) */}
        {stats && isOwner && (
          <div className="profile-xp-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
              <span
                style={{
                  fontWeight: 900,
                  color: themeConfig.accentColor,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                <GameIcon name="sparkles" size={14} color={themeConfig.accentColor} />
                {t('profile.level')} {currentLevel}
              </span>
              <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.04em' }}>
                {currentLevelXp} / 1000 {t('profile.xp')}
              </span>
            </div>

            {/* İlerleme Çubuğu */}
            <div className="profile-xp-track">
              <div
                className="profile-xp-fill"
                style={{
                  width: `${xpPercentage}%`,
                  background: `linear-gradient(90deg, ${themeConfig.accentColor} 0%, #ffffff 100%)`,
                  boxShadow: `0 0 10px ${themeConfig.accentColor}`,
                }}
              />
            </div>
          </div>
        )}

        {/* 3'lü İstatistik Kapsülleri (Stars / Levels / XP) */}
        {stats && (
          <div className="profile-stats-grid">
            {/* 1. Skor / Yıldızlar */}
            <div className="profile-stat-pod">
              <span className="profile-stat-pod__val" style={{ color: '#ffd700' }}>
                <GameIcon name="star" size={16} color="#ffd700" />
                {stats.score}
              </span>
              <span className="profile-stat-pod__lbl">
                {t('leaderboard.score')}
              </span>
            </div>

            {/* 2. Tamamlanan Bölümler */}
            <div className="profile-stat-pod">
              <span className="profile-stat-pod__val" style={{ color: '#00c4ff' }}>
                <GameIcon name="mountain" size={16} color="#00c4ff" />
                {stats.completed}
              </span>
              <span className="profile-stat-pod__lbl">
                {t('levels.title')}
              </span>
            </div>

            {/* 3. XP (veya Ziyaretçi ise Yıldız/Seviye dengesi) */}
            {isOwner ? (
              <div className="profile-stat-pod">
                <span className="profile-stat-pod__val" style={{ color: themeConfig.accentColor }}>
                  <GameIcon name="sparkles" size={15} color={themeConfig.accentColor} />
                  {stats.xp}
                </span>
                <span className="profile-stat-pod__lbl">
                  {t('profile.xp')}
                </span>
              </div>
            ) : (
              <div className="profile-stat-pod">
                <span className="profile-stat-pod__val" style={{ color: themeConfig.accentColor }}>
                  <GameIcon name="sparkles" size={15} color={themeConfig.accentColor} />
                  Lvl {currentLevel}
                </span>
                <span className="profile-stat-pod__lbl">
                  {t('profile.level')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Liderlik Tablosundan Gelen Ziyaretçi Skoru */}
        {!isOwner && queryScore && (
          <div
            style={{
              marginTop: '14px',
              fontSize: '12px',
              fontWeight: 800,
              color: '#cbd5e1',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '6px 14px',
              borderRadius: '999px',
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
    </div>
  );
}
