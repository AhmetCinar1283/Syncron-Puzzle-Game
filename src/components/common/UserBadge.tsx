/**
 * DOSYA AMACI: Sayfalarda sağ üstte yer alan kullanıcı rozeti ve açılır menüsüdür (UserBadge).
 * Kullanıcının giriş durumuna göre (Giriş Yap / Profilim) ve ayarlar sayfasına (/settings)
 * yönlendiren seçenekleri sunar. Fare (hover/tık), dokunmatik, klavye ve gamepad'i eksiksiz destekler.
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useAppRouter } from '@/lib/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { useCapabilities } from '@/contexts/MonetizationContext';
import { useAppSelector } from '@/store/hooks';
import AuthModal from './AuthModal';
import { useT } from '@/contexts/LanguageContext';
import { useGamepad } from '@/hooks/useGamepad';
import { subscribeToUserTickets } from '@/services/firebase/support';
import { LogIn, User as UserIcon, Settings as SettingsIcon } from 'lucide-react';

const HIDDEN_PREFIXES = ['/play', '/editor', '/levels', '/profile', '/admin', '/settings'];

export default function UserBadge() {
  const t = useT();
  const { user, isAnonymous, loading } = useAuthContext();
  const reduxDisplayName = useAppSelector((state) => state.user.displayName);
  const { accountLogin } = useCapabilities();
  const router = useAppRouter();
  const pathname = usePathname();

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuIndex, setMenuIndex] = useState<number>(0); // 0: Profil/Giriş, 1: Ayarlar
  const [hasUnread, setHasUnread] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const badgeContainerRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Canlı okunmamış destek bildirimlerini dinle
  useEffect(() => {
    if (loading || !user || isAnonymous) {
      setHasUnread(false);
      return;
    }

    try {
      const unsubscribe = subscribeToUserTickets(user.uid, (tickets) => {
        const unread = tickets.some((tk) => tk.hasUnreadUser === true);
        setHasUnread(unread);
      });
      return () => unsubscribe();
    } catch (err) {
      console.warn('[UserBadge] Destek biletleri dinlenemedi:', err);
    }
  }, [user, isAnonymous, loading]);

  // Ana sayfadan gelen profil odak olayını dinle (gamepad/klavye ile üst bar seçimi)
  useEffect(() => {
    if (pathname !== '/') {
      setIsFocused(false);
      return;
    }

    const handleFocus = (e: Event) => {
      const customEvent = e as CustomEvent<{ focused?: boolean }>;
      const focused = customEvent.detail?.focused ?? false;
      setIsFocused(focused);
      if (focused) {
        setIsMenuOpen(true);
      }
    };

    window.addEventListener('home-profile-focus', handleFocus);
    return () => {
      window.removeEventListener('home-profile-focus', handleFocus);
    };
  }, [pathname]);

  // Menü dışına tıklandığında menüyü kapat
  useEffect(() => {
    if (!isMenuOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (badgeContainerRef.current && !badgeContainerRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [isMenuOpen]);

  const signed = user !== null && !isAnonymous;
  const displayName = user?.displayName || reduxDisplayName || user?.email?.split('@')[0] || null;
  const initial = displayName?.[0]?.toUpperCase() ?? '?';
  const active = isFocused || isHovered || isMenuOpen;
  const badgeHeight = 34;

  const handleSelectOption = useCallback((index: number) => {
    setIsMenuOpen(false);
    setIsFocused(false);
    if (index === 0) {
      if (signed) {
        router.push('/profile');
      } else {
        setAuthModalOpen(true);
      }
    } else if (index === 1) {
      router.push('/settings');
    }
  }, [signed, router]);

  // Gamepad etkileşimi
  useGamepad({
    enabled: isFocused || isMenuOpen,
    onMove: (dir) => {
      if (!isMenuOpen) {
        setIsMenuOpen(true);
        return;
      }
      if (dir === 'up') {
        setMenuIndex(0);
      } else if (dir === 'down') {
        setMenuIndex(1);
      }
    },
    onConfirm: () => {
      if (!isMenuOpen) {
        setIsMenuOpen(true);
      } else {
        handleSelectOption(menuIndex);
      }
    },
    onCancel: () => {
      setIsMenuOpen(false);
    },
  });

  // Klavye etkileşimi (Menü açıkken)
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        setMenuIndex(0);
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setMenuIndex(1);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSelectOption(menuIndex);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setIsMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen, menuIndex, handleSelectOption]);

  const onMouseEnterBadge = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setIsHovered(true);
    setIsMenuOpen(true);
  };

  const onMouseLeaveBadge = () => {
    hoverTimerRef.current = setTimeout(() => {
      setIsHovered(false);
      setIsMenuOpen(false);
    }, 250);
  };

  const isHiddenPage = !pathname || HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (loading || !accountLogin || isHiddenPage) return null;

  return (
    <div
      ref={badgeContainerRef}
      onMouseEnter={onMouseEnterBadge}
      onMouseLeave={onMouseLeaveBadge}
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
      {/* Üst Rozet Butonu */}
      <button
        id="user-profile-badge"
        type="button"
        onClick={() => setIsMenuOpen((prev) => !prev)}
        className={
          isFocused
            ? (signed ? (hasUnread ? 'profile-focused-emerald' : 'profile-focused-cyan') : 'profile-focused-emerald')
            : ''
        }
        title={signed ? (displayName ?? t('auth.my_account')) : t('auth.sign_in')}
        style={{
          cursor: 'pointer',
          boxSizing: 'border-box',
          border: `1.5px solid ${
            active
              ? (signed ? (hasUnread ? '#00ff88' : '#00c4ff') : '#00ff88')
              : (signed ? (hasUnread ? '#00ff8870' : '#00c4ff35') : '#00ff8830')
          }`,
          borderRadius: signed ? badgeHeight / 2 : 8,
          background: signed
            ? (active ? 'rgba(0, 196, 255, 0.22)' : '#00c4ff0d')
            : (active ? 'rgba(0, 255, 136, 0.22)' : '#00ff880d'),
          color: signed
            ? (active ? '#fff' : (hasUnread ? '#00ff88' : '#00c4ff'))
            : (active ? '#fff' : '#00ff88'),
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: signed ? '0.04em' : '0.08em',
          width: 'auto',
          minWidth: signed ? badgeHeight : undefined,
          height: badgeHeight,
          padding: signed ? (active ? '0 12px 0 10px' : '0') : '0 14px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: active
            ? (signed
                ? (hasUnread ? '0 0 24px rgba(0, 255, 136, 0.45)' : '0 0 24px rgba(0, 196, 255, 0.45)')
                : '0 0 24px rgba(0, 255, 136, 0.45)')
            : '0 0 14px rgba(0, 255, 136, 0.1)',
          transform: active ? 'scale(1.04)' : 'scale(1)',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          outline: 'none',
        }}
      >
        {signed ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: active ? 6 : 0, overflow: 'hidden' }}>
            <span style={{ flexShrink: 0, width: active ? 'auto' : 14, lineHeight: 1, fontSize: 12, fontWeight: 800 }}>
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
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <LogIn size={13} />
            <span>{t('auth.sign_in')}</span>
          </span>
        )}

        {signed && hasUnread && (
          <span
            style={{
              position: 'absolute',
              top: -1,
              right: -1,
              width: '9px',
              height: '9px',
              background: '#00ff88',
              borderRadius: '50%',
              boxShadow: '0 0 8px #00ff88',
              border: '2px solid #030712',
              zIndex: 5,
            }}
          />
        )}
      </button>

      {/* Açılır Menü (Popover Dropdown) */}
      {isMenuOpen && (
        <div
          style={{
            marginTop: 8,
            minWidth: 180,
            background: 'rgba(8, 14, 26, 0.98)',
            border: '1.5px solid rgba(0, 255, 136, 0.35)',
            borderRadius: 12,
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.9), 0 0 20px rgba(0, 255, 136, 0.18)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            padding: 6,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            animation: 'fadeIn 0.15s ease',
          }}
        >
          {/* 1. Seçenek: Profil / Giriş Yap */}
          <button
            type="button"
            onClick={() => handleSelectOption(0)}
            onMouseEnter={() => setMenuIndex(0)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: 8,
              border: menuIndex === 0 ? '1px solid #00ff88' : '1px solid transparent',
              background: menuIndex === 0 ? 'rgba(0, 255, 136, 0.12)' : 'transparent',
              color: menuIndex === 0 ? '#00ff88' : '#e2e8f0',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 700,
              textAlign: 'left',
              transition: 'all 0.15s ease',
              outline: 'none',
            }}
          >
            {signed ? <UserIcon size={15} color={menuIndex === 0 ? '#00ff88' : '#38bdf8'} /> : <LogIn size={15} color={menuIndex === 0 ? '#00ff88' : '#94a3b8'} />}
            <span>{signed ? (displayName || t('auth.my_account')) : t('auth.sign_in')}</span>
          </button>

          <div style={{ height: 1, background: 'rgba(255, 255, 255, 0.08)', margin: '2px 4px' }} />

          {/* 2. Seçenek: Ayarlar / Tercihler */}
          <button
            type="button"
            onClick={() => handleSelectOption(1)}
            onMouseEnter={() => setMenuIndex(1)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: 8,
              border: menuIndex === 1 ? '1px solid #00ff88' : '1px solid transparent',
              background: menuIndex === 1 ? 'rgba(0, 255, 136, 0.12)' : 'transparent',
              color: menuIndex === 1 ? '#00ff88' : '#e2e8f0',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 700,
              textAlign: 'left',
              transition: 'all 0.15s ease',
              outline: 'none',
            }}
          >
            <SettingsIcon size={15} color={menuIndex === 1 ? '#00ff88' : '#94a3b8'} />
            <span>{t('settings.title')}</span>
          </button>
        </div>
      )}

      {authModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} />}
    </div>
  );
}
