'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useT } from '@/contexts/LanguageContext';
import { useGameTheme } from '@/game-engine/contexts/GameThemeContext';
import { getUserTagData, requestNewTag, type UserTagData } from '@/services/firebase/users';

const TWO_WEEKS_MS = 14 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_TAG_CHANGES = 5;

interface Props {
  error: string;
  signOutBusy: boolean;
  onSignOut: () => void;
}

/** "Hesabım": kullanıcı bilgisi, etiket (tag) yönetimi, dil ve çıkış. */
export function AccountView({ error, signOutBusy, onSignOut }: Props) {
  const t = useT();
  const { theme, themeConfig } = useGameTheme();
  const accent = themeConfig?.accentColor || '#00ff88';
  const glow = themeConfig?.accentGlow || 'rgba(0, 255, 136, 0.4)';
  const isArcade = theme === 'arcade';
  const isBlueprint = theme === 'blueprint';
  const isLegacy = theme === 'legacy';
  const { user } = useAuthContext();

  const [tagData, setTagData] = useState<UserTagData | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [tagBusy, setTagBusy] = useState(false);
  const [tagError, setTagError] = useState('');
  const [tagSuccess, setTagSuccess] = useState(false);

  const uid = user?.uid;
  useEffect(() => {
    if (!uid) return;
    getUserTagData(uid).then((data) => {
      if (data) setTagData(data);
    });
  }, [uid]);

  const name = user?.displayName ?? user?.email ?? t('auth.sign_in');
  const provider = user?.providerData?.[0]?.providerId ?? '';
  const providerLabel = provider === 'google.com' ? 'Google' : provider === 'password' ? t('auth.email') : '';

  const lastChangeMs = tagData?.tagChangedAt?.getTime() ?? 0;
  const daysRemaining = tagData?.tagChangedAt
    ? Math.max(0, Math.ceil((lastChangeMs + TWO_WEEKS_MS - Date.now()) / DAY_MS))
    : 0;
  const changesLeft = Math.max(0, MAX_TAG_CHANGES - (tagData?.tagChangeCount ?? 0));
  const canChange = changesLeft > 0 && daysRemaining === 0;

  const handleTagSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!tagInput.trim()) return;
    setTagBusy(true);
    setTagError('');
    setTagSuccess(false);
    try {
      const newTag = await requestNewTag(tagInput.trim());
      setTagData((prev) =>
        prev
          ? { ...prev, tag: newTag, tagChangeCount: prev.tagChangeCount + 1, tagChangedAt: new Date() }
          : prev,
      );
      setTagInput('');
      setTagSuccess(true);
    } catch (err) {
      const msg = (err as { message?: string }).message ?? '';
      if (msg === 'TAG_INVALID_CHARS') setTagError(t('auth.err_tag_chars'));
      else if (msg.startsWith('TAG_LENGTH')) setTagError(t('auth.err_tag_length'));
      else if (msg === 'TAG_TAKEN') setTagError(t('auth.err_tag_taken'));
      else if (msg.includes('EMAIL_NOT_VERIFIED')) setTagError(t('auth.err_email_not_verified'));
      else if (msg.startsWith('TAG_COOLDOWN')) {
        const days = msg.split(':')[1] ?? '14';
        setTagError(t('auth.err_tag_cooldown', { n: days }));
      } else if (msg === 'TAG_MAX_CHANGES') setTagError(t('auth.err_tag_max'));
      else setTagError(t('auth.err_generic'));
    } finally {
      setTagBusy(false);
    }
  };

  return (
    <>
      {/* Oyuncu Profil Kartı */}
      <div className="home-sheet__game-hero" style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: isArcade ? 0 : isBlueprint ? 4 : isLegacy ? 8 : 12,
              border: `2px solid ${accent}`,
              boxShadow: isArcade ? `2px 2px 0 #000, 0 0 10px ${glow}` : `0 0 14px ${glow}`,
              background: `${accent}1f`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              fontWeight: 900,
              color: '#ffffff',
              flexShrink: 0,
            }}
          >
            {name?.[0]?.toUpperCase() ?? '?'}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#f8fafc' }}>{name}</span>
              <span className="home-sheet__theme-pill" style={{ padding: '2px 7px', fontSize: 9 }}>
                {themeConfig?.defaultName}
              </span>
            </div>
            {providerLabel && (
              <span style={{ fontSize: 11, color: '#94a3b8' }}>
                {t('auth.signed_in_with', { provider: providerLabel })}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="home-sheet__section">
        <p className="home-sheet__label">{t('auth.tag_section')}</p>
        {tagData === null ? (
          <p className="home-sheet__text home-sheet__text--dim">...</p>
        ) : (
          <>
            {tagData.tag ? (
              <p className="home-sheet__value">#{tagData.tag}</p>
            ) : (
              <p className="home-sheet__text home-sheet__text--dim">{t('auth.tag_no_tag')}</p>
            )}
            <p className="home-sheet__text home-sheet__text--dim">
              {changesLeft > 0 ? t('auth.tag_changes_remaining', { n: changesLeft }) : t('auth.tag_max_reached')}
            </p>
            {tagData.tagChangedAt && daysRemaining > 0 && (
              <p className="home-sheet__text home-sheet__text--dim">{t('auth.tag_cooldown', { n: daysRemaining })}</p>
            )}
            {canChange && (
              <form onSubmit={handleTagSubmit} style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  className="home-sheet__input"
                  placeholder={t('auth.tag_placeholder')}
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value.toUpperCase())}
                  maxLength={10}
                />
                <button
                  type="submit"
                  className="home-sheet__btn home-sheet__btn--compact"
                  data-variant="primary"
                  disabled={tagBusy || !tagInput.trim()}
                >
                  {tagBusy ? '...' : t('auth.tag_save')}
                </button>
              </form>
            )}
            {tagError && <p className="home-sheet__text home-sheet__text--error">{tagError}</p>}
            {tagSuccess && <p className="home-sheet__text home-sheet__text--ok">{t('auth.tag_updated')}</p>}
          </>
        )}
      </div>

      <div className="home-sheet__section">
        <button
          type="button"
          className="home-sheet__btn"
          data-variant="danger"
          onClick={onSignOut}
          disabled={signOutBusy}
        >
          {signOutBusy ? '...' : t('auth.sign_out')}
        </button>
        {error && <p className="home-sheet__text home-sheet__text--error">{error}</p>}
      </div>
    </>
  );
}
