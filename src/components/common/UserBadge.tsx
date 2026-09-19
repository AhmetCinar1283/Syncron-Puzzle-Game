'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { useCapabilities } from '@/contexts/MonetizationContext';
import { useAppSelector } from '@/store/hooks';
import AuthModal from './AuthModal';
import { useT } from '@/contexts/LanguageContext';
import { subscribeToUserTickets } from '@/services/firebase/support';
import { LogIn } from 'lucide-react';

/**
 * Top-right badge on navigation pages.
 * Hidden on gameplay, editor, level select, profile, and admin screens
 * to avoid overlapping game controls, toolbars, or being redundant.
 */
const HIDDEN_PREFIXES = ['/play', '/editor', '/levels', '/profile', '/admin'];

export default function UserBadge() {
  const t = useT();
  const { user, isAnonymous, loading } = useAuthContext();
  const reduxDisplayName = useAppSelector((state) => state.user.displayName);
  const { accountLogin } = useCapabilities();
  const [open, setOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const [isFocused, setIsFocused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Subscribe to user tickets for live unread updates
  useEffect(() => {
    if (loading || !user || isAnonymous) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasUnread(false);
      return;
    }

    try {
      const unsubscribe = subscribeToUserTickets(user.uid, (tickets) => {
        const unread = tickets.some((t) => t.hasUnreadUser === true);
        setHasUnread(unread);
      });
      return () => unsubscribe();
    } catch (err) {
      console.warn('[UserBadge] Failed to subscribe to user tickets:', err);
    }
  }, [user, isAnonymous, loading]);

  // Listen for focus changes on home page
  useEffect(() => {
    if (pathname !== '/') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsFocused(false);
      return;
    }

    const handleFocus = (e: Event) => {
      const customEvent = e as CustomEvent;
      setIsFocused(customEvent.detail?.focused ?? false);
    };

    window.addEventListener('home-profile-focus', handleFocus);
    return () => {
      window.removeEventListener('home-profile-focus', handleFocus);
    };
  }, [pathname]);

  const isHiddenPage = !pathname || HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (loading || !accountLogin || isHiddenPage) return null;

  const displayName = user?.displayName || reduxDisplayName || user?.email?.split('@')[0] || null;
  const initial = displayName?.[0]?.toUpperCase() ?? '?';
  const signed = user !== null && !isAnonymous;
  const active = isFocused || isHovered;
  const badgeHeight = 34;

  return (
    <>
      <button
        id="user-profile-badge"
        onClick={() => {
          if (signed) {
            router.push('/profile');
          } else {
            setOpen(true);
          }
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={
          isFocused
            ? (signed ? (hasUnread ? 'profile-focused-emerald' : 'profile-focused-cyan') : 'profile-focused-emerald')
            : ''
        }
        title={signed ? (displayName ?? t('auth.my_account')) : t('auth.sign_in')}
        style={{
          position: 'fixed',
          top: 14,
          right: 14,
          zIndex: 200,
          cursor: 'pointer',
          boxSizing: 'border-box',
          border: `1.5px solid ${
            active
              ? (signed ? (hasUnread ? '#00ff88' : '#00c4ff') : '#00ff88')
              : (signed ? (hasUnread ? '#00ff8870' : '#00c4ff35') : '#00ff8830')
          }`,
          borderRadius: signed ? (badgeHeight / 2) : 8,
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
          transformOrigin: 'right center',
          boxShadow: active
            ? (signed
                ? (hasUnread ? '0 0 24px rgba(0, 255, 136, 0.45)' : '0 0 24px rgba(0, 196, 255, 0.45)')
                : '0 0 24px rgba(0, 255, 136, 0.45)')
            : (signed
                ? (hasUnread ? '0 0 14px rgba(0, 255, 136, 0.18)' : '0 0 14px rgba(0, 196, 255, 0.1)')
                : '0 0 14px rgba(0, 255, 136, 0.1)'),
          transform: active ? 'scale(1.05)' : 'scale(1)',
          transition:
            'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s ease, border-color 0.15s ease, box-shadow 0.2s ease, color 0.15s ease, padding 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {signed ? (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: active ? 6 : 0,
              transition: 'gap 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              overflow: 'hidden',
            }}
          >
            <span
              style={{
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: active ? 'auto' : 14,
                lineHeight: 1,
                fontSize: 12,
                fontWeight: 800,
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
                verticalAlign: 'middle',
                transition:
                  'max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.04em',
                lineHeight: 1,
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

        {/* Pulse unread dot */}
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
              boxShadow: '0 0 8px #00ff88, 0 0 16px #00ff88',
              border: '2px solid #030712',
              zIndex: 5,
            }}
          />
        )}
      </button>

      {open && <AuthModal onClose={() => setOpen(false)} />}
    </>
  );
}
