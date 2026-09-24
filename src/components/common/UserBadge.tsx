/**
 * DOSYA AMACI: Sayfalarda sağ üstte yer alan kullanıcı rozeti ve açılır menüsüdür (UserBadge).
 * Kullanıcının giriş durumuna göre (Giriş Yap / Profilim) ve ayarlar sayfasına (/settings)
 * yönlendiren seçenekleri sunar. Fare (hover/tık), dokunmatik, klavye ve gamepad'i eksiksiz destekler.
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppRouter } from '@/lib/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { useCapabilities } from '@/contexts/MonetizationContext';
import { useAppSelector } from '@/store/hooks';
import AuthModal from './AuthModal';
import { useT } from '@/contexts/LanguageContext';
import { useSoundManager } from '@/services/audio';
import { subscribeToUserTickets } from '@/services/firebase/support';
import { useGameTheme } from '@/game-engine/contexts/GameThemeContext';
import { LogIn, Sparkles, Gamepad2 } from 'lucide-react';

export default function UserBadge() {
  const t = useT();
  const { play: playSound } = useSoundManager('menu');
  const { user, isAnonymous, loading } = useAuthContext();
  const reduxDisplayName = useAppSelector((state) => state.user.displayName);
  const { accountLogin } = useCapabilities();
  const router = useAppRouter();

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Canlı okunmamış destek bildirimlerini dinle
  useEffect(() => {
    if (loading || !user || isAnonymous) {
      return;
    }

    try {
      const unsubscribe = subscribeToUserTickets(user.uid, (tickets) => {
        const unread = tickets.some((tk) => tk.hasUnreadUser === true);
        setHasUnread(unread);
      });
      return () => {
        unsubscribe();
        setHasUnread(false);
      };
    } catch (err) {
      console.warn('[UserBadge] Destek biletleri dinlenemedi:', err);
    }
  }, [user, isAnonymous, loading]);

  // Ana sayfadan gelen profil odak olayını dinle (gamepad/klavye ile üst bar seçimi)
  useEffect(() => {
    const handleFocus = (e: Event) => {
      const customEvent = e as CustomEvent<{ focused?: boolean }>;
      setIsFocused(customEvent.detail?.focused ?? false);
    };

    window.addEventListener('home-profile-focus', handleFocus);
    return () => {
      window.removeEventListener('home-profile-focus', handleFocus);
    };
  }, []);

  const { theme, themeConfig } = useGameTheme();
  const accent = themeConfig?.accentColor || '#00ff88';
  const glow = themeConfig?.accentGlow || 'rgba(0, 255, 136, 0.4)';
  const isArcade = theme === 'arcade';
  const isBlueprint = theme === 'blueprint';
  const isCosmic = theme === 'cosmic';
  const isLegacy = theme === 'legacy';

  const signed = user !== null && !isAnonymous;
  const displayName = user?.displayName || reduxDisplayName || user?.email?.split('@')[0] || null;
  const initial = displayName?.[0]?.toUpperCase() ?? '?';
  const active = isFocused || isHovered;
  const badgeHeight = 34;

  const handleClick = useCallback(() => {
    playSound('ui.confirm');
    if (signed) {
      router.push('/profile');
    } else {
      setAuthModalOpen(true);
    }
  }, [signed, router, playSound]);

  const onMouseEnterBadge = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    if (!isHovered) {
      playSound('ui.tick');
    }
    setIsHovered(true);
  };

  const onMouseLeaveBadge = () => {
    hoverTimerRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 150);
  };

  if (loading || !accountLogin) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 14,
        right: 14,
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
      }}
    >
      <button
        id="user-profile-badge"
        type="button"
        onClick={handleClick}
        onMouseEnter={onMouseEnterBadge}
        onMouseLeave={onMouseLeaveBadge}
        title={signed ? (displayName ?? t('auth.my_account')) : t('auth.sign_in')}
        style={{
          cursor: 'pointer',
          boxSizing: 'border-box',
          border: isArcade
            ? `2px solid ${active ? accent : `${accent}bb`}`
            : isBlueprint
              ? `1.5px solid ${active ? accent : `${accent}70`}`
              : `1.5px solid ${active ? accent : `${accent}50`}`,
          borderRadius: signed
            ? (isArcade ? 0 : isBlueprint ? 4 : badgeHeight / 2)
            : (isArcade ? 0 : isBlueprint ? 3 : isLegacy ? 6 : 8),
          background: signed
            ? (active ? `${accent}33` : `${accent}14`)
            : (active ? `${accent}28` : isArcade ? '#18181b' : `${accent}10`),
          color: active ? '#ffffff' : accent,
          fontSize: isArcade ? 11 : 12,
          fontWeight: 800,
          letterSpacing: isArcade ? '0.12em' : '0.06em',
          textTransform: isArcade ? 'uppercase' : undefined,
          width: 'auto',
          minWidth: signed ? badgeHeight : undefined,
          height: badgeHeight,
          padding: signed ? (active ? '0 12px 0 10px' : '0') : '0 14px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isArcade
            ? (active ? `3px 3px 0 #000, 0 0 16px ${glow}` : `2px 2px 0 #000, 0 0 6px ${accent}40`)
            : (active ? `0 0 20px ${glow}, inset 0 0 8px ${accent}22` : `0 0 10px ${accent}18`),
          transform: active ? 'scale(1.04)' : 'scale(1)',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          outline: isFocused ? `2px solid ${accent}` : 'none',
          outlineOffset: isFocused ? 2 : 0,
        }}
      >
        {signed ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: active ? 6 : 0, overflow: 'hidden' }}>
            <span
              style={{
                flexShrink: 0,
                width: active ? 'auto' : 16,
                lineHeight: 1,
                fontSize: 12,
                fontWeight: 900,
                color: active ? '#fff' : accent,
              }}
            >
              {initial}
            </span>
            <span
              style={{
                maxWidth: active ? 140 : 0,
                opacity: active ? 1 : 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'inline-block',
                fontSize: 11,
                fontWeight: 700,
                lineHeight: 1,
                transition: 'max-width 0.25s ease, opacity 0.2s ease',
              }}
            >
              {displayName || t('auth.my_account')}
            </span>
          </div>
        ) : (
          <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: isArcade ? 0 : '50%',
                background: accent,
                boxShadow: `0 0 8px ${accent}`,
                display: 'inline-block',
                flexShrink: 0,
              }}
            />
            {isArcade ? (
              <Gamepad2 size={13} style={{ color: active ? '#fff' : accent }} />
            ) : isCosmic ? (
              <Sparkles size={13} style={{ color: active ? '#fff' : accent }} />
            ) : (
              <LogIn size={13} style={{ color: active ? '#fff' : accent }} />
            )}
            <span>
              {isBlueprint ? `[ ${t('auth.sign_in')} ]` : t('auth.sign_in')}
            </span>
          </span>
        )}

        {signed && hasUnread && (
          <span
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              width: '9px',
              height: '9px',
              background: '#00ff88',
              borderRadius: isArcade ? 0 : '50%',
              boxShadow: '0 0 8px #00ff88',
              border: '2px solid #030712',
              zIndex: 5,
            }}
          />
        )}
      </button>

      {authModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} />}
    </div>
  );
}
