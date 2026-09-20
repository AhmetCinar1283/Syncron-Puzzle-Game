'use client';

import { useState, useEffect, useRef, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useGamepad } from '@/hooks/useGamepad';
import { useAppSelector } from '@/store/hooks';
import { useFriends } from './useFriends';

export interface FriendLike {
  uid: string;
  displayName: string;
  tag: string | null;
  showcaseBadges?: any[];
}

// Combines the friends data hook with all Friends-page-level UI state (search input,
// tag copy, keyboard/gamepad navigation). Behavior mirrors the former FriendsClient component 1:1.
export function useFriendsPage() {
  const { lang } = useLanguage();
  const router = useRouter();
  const { user, isAnonymous } = useAuthContext();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  const myTag = useAppSelector((state) => state.user.tag);
  const [copied, setCopied] = useState(false);

  const handleCopyMyTag = () => {
    if (!myTag) return;
    const tagText = `#${myTag}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(tagText)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch((err) => console.error('Copy failed', err));
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = tagText;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Fallback copy failed', err);
      }
      document.body.removeChild(textarea);
    }
  };

  const friendsState = useFriends();

  // Ref to the search input for gamepad focus
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement === searchInputRef.current) {
        return;
      }
      if (e.key === 'Escape') {
        router.push('/');
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        window.scrollBy({ top: -180, behavior: 'smooth' });
      } else if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        window.scrollBy({ top: 180, behavior: 'smooth' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  // Gamepad controls: B/Start → back, A → focus the search input, Stick/D-pad → scroll page
  const { isConnected } = useGamepad({
    onMenu: () => {
      router.push('/');
    },
    onConfirm: () => {
      // If input is already focused, submit the search
      if (document.activeElement === searchInputRef.current) {
        if (searchInput.trim()) friendsState.search(searchInput.trim());
      } else {
        // Otherwise focus the search input
        searchInputRef.current?.focus();
      }
    },
    onMove: (dir) => {
      if (document.activeElement === searchInputRef.current) return;
      if (dir === 'up') {
        window.scrollBy({ top: -180, behavior: 'smooth' });
      } else if (dir === 'down') {
        window.scrollBy({ top: 180, behavior: 'smooth' });
      }
    },
    onAxisMove: (axisIndex, value) => {
      if (document.activeElement === searchInputRef.current) return;
      if (axisIndex === 3 && Math.abs(value) > 0.15) {
        window.scrollBy({ top: value * 22, behavior: 'auto' });
      }
    }
  });

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    friendsState.search(searchInput.trim());
  };

  // Safe tag input handler (removes '#', filters non-[A-Z2-9] chars, converts to uppercase, max 10 chars)
  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/#/g, '').toUpperCase();
    // Keep only A-Z and 2-9
    value = value.split('').filter((char) => /^[A-Z2-9]$/.test(char)).join('');
    if (value.length <= 10) {
      setSearchInput(value);
    }
  };

  const handleFriendClick = (friend: FriendLike) => {
    const nameParam = friend.displayName || 'Player';
    const tagParam = friend.tag ? `&tag=${friend.tag}` : '';
    const showcaseIds = (friend.showcaseBadges || [])
      .map((b) => b.id || b.badgeId)
      .filter(Boolean)
      .join(',');
    const showcaseParam = showcaseIds ? `&showcase=${showcaseIds}` : '';
    router.push(`/profile?uid=${friend.uid}&name=${encodeURIComponent(nameParam)}${tagParam}${showcaseParam}`);
  };

  const isAuth = !!user && !isAnonymous;

  return {
    ...friendsState,
    lang,
    router,
    user,
    isAuth,
    authModalOpen,
    setAuthModalOpen,
    searchInput,
    setSearchInput,
    myTag,
    copied,
    handleCopyMyTag,
    searchInputRef,
    isConnected,
    handleSearchSubmit,
    handleTagInputChange,
    handleFriendClick,
  };
}

export default useFriendsPage;
