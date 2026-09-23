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
import { useSoundManager } from '@/services/audio';
import { subscribeToUserTickets } from '@/services/firebase/support';
import { useGameTheme } from '@/game-engine/contexts/GameThemeContext';
import { LogIn, User as UserIcon, Settings as SettingsIcon, Sparkles, Gamepad2 } from 'lucide-react';

const HIDDEN_PREFIXES = ['/play', '/editor', '/levels', '/profile', '/admin', '/settings'];

export default function UserBadge() {
  const t = useT();
  const { play: playSound } = useSoundManager('menu');
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

  const closeMenuAndReturn = useCallback(() => {
    setIsMenuOpen(false);
    setIsFocused(false);
    playSound('ui.tick');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('profile-menu-state', { detail: { open: false } }));
    }
  }, [playSound]);

  // Menü açık durumunu global olarak duyur (ana sayfa ve diğer bileşenlerle senkronizasyon)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('profile-menu-state', { detail: { open: isMenuOpen } }));
    return () => {
      window.dispatchEvent(new CustomEvent('profile-menu-state', { detail: { open: false } }));
    };
  }, [isMenuOpen]);

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
      if (pathname !== '/') return;
      const customEvent = e as CustomEvent<{ focused?: boolean }>;
      const focused = customEvent.detail?.focused ?? false;
      setIsFocused(focused);
      if (focused) {
        setIsMenuOpen(true);
        setMenuIndex(0);
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
        closeMenuAndReturn();
      }
    };
    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [isMenuOpen, closeMenuAndReturn]);

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
  const active = isFocused || isHovered || isMenuOpen;
  const badgeHeight = 34;

  const handleSelectOption = useCallback((index: number) => {
    playSound('ui.confirm');
    setIsMenuOpen(false);
    setIsFocused(false);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('profile-menu-state', { detail: { open: false } }));
    }
    if (index === 0) {
      if (signed) {
        router.push('/profile');
      } else {
        setAuthModalOpen(true);
      }
    } else if (index === 1) {
      router.push('/settings');
    }
  }, [signed, router, playSound]);

  // Gamepad etkileşimi (Menü açıkken modal öncelikli, arka planı bloke eder)
  useGamepad({
    enabled: isFocused || isMenuOpen,
    priority: isMenuOpen ? 'modal' : 'normal',
    onMove: (dir) => {
      if (!isMenuOpen) {
        setIsMenuOpen(true);
        setMenuIndex(0);
        return;
      }
      if (dir === 'up') {
        if (menuIndex === 1) {
          setMenuIndex(0);
          playSound('ui.tick');
        } else if (menuIndex === 0) {
          closeMenuAndReturn();
        }
      } else if (dir === 'down') {
        if (menuIndex === 0) {
          setMenuIndex(1);
          playSound('ui.tick');
        } else if (menuIndex === 1) {
          closeMenuAndReturn();
        }
      } else if (dir === 'left') {
        closeMenuAndReturn();
      }
    },
    onConfirm: () => {
      if (!isMenuOpen) {
        setIsMenuOpen(true);
        setMenuIndex(0);
      } else {
        handleSelectOption(menuIndex);
      }
    },
    onCancel: () => {
      closeMenuAndReturn();
    },
  });

  // Klavye etkileşimi (Menü açıkken - capture modunda diğer dinleyicileri ezer)
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const isUp = e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W';
      const isDown = e.key === 'ArrowDown' || e.key === 's' || e.key === 'S';
      const isLeft = e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A';
      const isConfirm = e.key === 'Enter' || e.key === ' ';
      const isEscape = e.key === 'Escape';

      if (!isUp && !isDown && !isLeft && !isConfirm && !isEscape) return;

      e.preventDefault();
      e.stopImmediatePropagation();

      if (isUp) {
        if (menuIndex === 1) {
          setMenuIndex(0);
          playSound('ui.tick');
        } else if (menuIndex === 0) {
          closeMenuAndReturn();
        }
      } else if (isDown) {
        if (menuIndex === 0) {
          setMenuIndex(1);
          playSound('ui.tick');
        } else if (menuIndex === 1) {
          closeMenuAndReturn();
        }
      } else if (isLeft || isEscape) {
        closeMenuAndReturn();
      } else if (isConfirm) {
        handleSelectOption(menuIndex);
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [isMenuOpen, menuIndex, handleSelectOption, closeMenuAndReturn, playSound]);

  const onMouseEnterBadge = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    if (!isHovered && !isMenuOpen) {
      playSound('ui.tick');
    }
    setIsHovered(true);
    setIsMenuOpen(true);
  };

  const onMouseLeaveBadge = () => {
    hoverTimerRef.current = setTimeout(() => {
      setIsHovered(false);
      closeMenuAndReturn();
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
            {/* Canlı bağlantı / misafir durumu ışığı */}
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

      {/* Açılır Menü (Popover Dropdown) */}
      {isMenuOpen && (
        <div
          style={{
            marginTop: 8,
            minWidth: 180,
            background: themeConfig?.board?.background || themeConfig?.bgDark || 'rgba(8, 14, 26, 0.98)',
            border: isArcade ? `2px solid ${accent}` : `1.5px solid ${accent}50`,
            borderRadius: isArcade ? 0 : isBlueprint ? 4 : isLegacy ? 8 : 12,
            boxShadow: isArcade
              ? `4px 4px 0 #000, 0 0 20px ${glow}`
              : `0 16px 40px rgba(0, 0, 0, 0.9), 0 0 24px ${glow}`,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
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
            onMouseEnter={() => {
              if (menuIndex !== 0) {
                playSound('ui.tick');
                setMenuIndex(0);
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: isArcade ? 0 : isBlueprint ? 3 : 8,
              border: menuIndex === 0 ? `1px solid ${accent}` : '1px solid transparent',
              background: menuIndex === 0 ? `${accent}1f` : 'transparent',
              color: menuIndex === 0 ? accent : '#e2e8f0',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 700,
              textAlign: 'left',
              transition: 'all 0.15s ease',
              outline: 'none',
            }}
          >
            {signed ? (
              <UserIcon size={15} color={menuIndex === 0 ? accent : `${accent}aa`} />
            ) : (
              <LogIn size={15} color={menuIndex === 0 ? accent : `${accent}aa`} />
            )}
            <span>{signed ? (displayName || t('auth.my_account')) : t('auth.sign_in')}</span>
          </button>

          <div style={{ height: 1, background: 'rgba(255, 255, 255, 0.08)', margin: '2px 4px' }} />

          {/* 2. Seçenek: Ayarlar / Tercihler */}
          <button
            type="button"
            onClick={() => handleSelectOption(1)}
            onMouseEnter={() => {
              if (menuIndex !== 1) {
                playSound('ui.tick');
                setMenuIndex(1);
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: isArcade ? 0 : isBlueprint ? 3 : 8,
              border: menuIndex === 1 ? `1px solid ${accent}` : '1px solid transparent',
              background: menuIndex === 1 ? `${accent}1f` : 'transparent',
              color: menuIndex === 1 ? accent : '#e2e8f0',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 700,
              textAlign: 'left',
              transition: 'all 0.15s ease',
              outline: 'none',
            }}
          >
            <SettingsIcon size={15} color={menuIndex === 1 ? accent : '#94a3b8'} />
            <span>{t('settings.title')}</span>
          </button>
        </div>
      )}

      {authModalOpen && <AuthModal onClose={() => setAuthModalOpen(false)} />}
    </div>
  );
}
