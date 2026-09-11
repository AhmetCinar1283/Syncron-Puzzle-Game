'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthContext } from '@/contexts/AuthContext';
import { useT, useLanguage } from '@/contexts/LanguageContext';
import { getUserProfileData } from '@/services/firebase/users';
import { useBadges } from '@/hooks/useBadges';
import { Badge } from '@/services/api/badgesClient';
import { useFriends } from '@/hooks/useFriends';
import { useGamepad } from '@/hooks/useGamepad';
import { NEON_TYPES, Particle, ProfileDoc } from '../lib/constants';

/**
 * Core profile page data: auth/owner resolution, Firestore profile doc,
 * badges/friends hooks, derived stats, background particles, and
 * gamepad/keyboard navigation. Tag/display-name edit forms live in
 * `useProfileEditForms`.
 */
export function useProfileData(pickerOpen: boolean) {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lang, setLang } = useLanguage();
  const { user: currentUser, isAnonymous: isCurrentAnonymous, signOut } = useAuthContext();

  // Determine who we are viewing
  const paramUid = searchParams.get('uid');
  const viewUid = paramUid || currentUser?.uid || null;
  const isOwner = !paramUid || paramUid === currentUser?.uid;

  // Retrieve query params for non-owner fallback
  const queryName = searchParams.get('name') || 'Player';
  const queryTag = searchParams.get('tag');
  const queryShowcaseStr = searchParams.get('showcase');
  const queryScore = searchParams.get('score');
  const queryScoreCat = searchParams.get('scoreCat');

  // Firestore local state for owner profile
  const [profileDoc, setProfileDoc] = useState<ProfileDoc>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Background particles
  const [particles, setParticles] = useState<Particle[]>([]);

  // Load badges API
  const { badges, loading: loadingBadges, error: badgesError, saveShowcase, saving: savingShowcase } = useBadges(viewUid);

  // Load friends hook
  const {
    friends,
    requests,
    searchResults,
    search,
    sendRequest,
    acceptRequest,
    rejectRequest,
    removeFriend,
    actionBusy,
  } = useFriends();

  const currentTag = isOwner ? profileDoc?.tag : queryTag;

  // Search target tag on mount if public profile
  useEffect(() => {
    if (!isOwner && currentTag && currentUser && !isCurrentAnonymous) {
      search(currentTag);
    }
  }, [isOwner, currentTag, currentUser, isCurrentAnonymous, search]);

  const friendshipState = useMemo(() => {
    if (!currentUser || isCurrentAnonymous || isOwner || !viewUid) return 'none';

    // 1. Try search results
    const searchMatch = searchResults.find((u) => u.uid === viewUid);
    if (searchMatch) {
      if (searchMatch.friendshipStatus === 'accepted') return 'accepted';
      if (searchMatch.friendshipStatus === 'pending') {
        return searchMatch.friendshipRequestedBy === currentUser.uid
          ? 'pending_outgoing'
          : 'pending_incoming';
      }
      return 'none';
    }

    // 2. Scan friends list
    const isFriend = friends.some((f) => f.uid === viewUid);
    if (isFriend) return 'accepted';

    // 3. Scan incoming requests
    const isIncoming = requests.some((r) => r.uid === viewUid);
    if (isIncoming) return 'pending_incoming';

    return 'none';
  }, [currentUser, isCurrentAnonymous, isOwner, viewUid, searchResults, friends, requests]);

  // Generate floating neon background particles
  useEffect(() => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 800;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 600;
    const list = Array.from({ length: 20 }, (_, i) => {
      const type = NEON_TYPES[i % NEON_TYPES.length];
      return {
        id: i,
        color: type.color,
        glow: type.glow,
        size: 8 + Math.random() * 14,
        startX: Math.random() * vw,
        startY: Math.random() * vh,
        driftX: (Math.random() - 0.5) * 80,
        duration: 15 + Math.random() * 15,
        delay: -(Math.random() * 20),
        opacity: 0.08 + Math.random() * 0.15,
      };
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time client-only randomized decoration, needs window size at mount; behavior preserved from pre-refactor code.
    setParticles(list);
  }, []);

  // Redirect unauthenticated guests away from their own profile page
  useEffect(() => {
    if (isOwner && !currentUser) {
      router.push('/');
    }
  }, [currentUser, isOwner, router]);

  // Fetch Firestore owner profile details
  useEffect(() => {
    if (!viewUid) return;
    if (isOwner) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- kicks off async Firestore fetch; behavior preserved from pre-refactor code.
      setLoadingProfile(true);
      getUserProfileData(viewUid)
        .then((data) => {
          if (data) {
            setProfileDoc(data);
          }
        })
        .catch((err) => console.error('[Profile] Failed to fetch firestore profile:', err))
        .finally(() => setLoadingProfile(false));
    }
  }, [viewUid, isOwner]);

  // Gamepad / Keyboard back support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (e.key === 'Escape' && !pickerOpen) {
        router.push('/');
      }
      // Page scrolling via keyboard
      if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        window.scrollBy({ top: -180, behavior: 'smooth' });
      }
      if (e.key === 'ArrowDown' || e.key === 'PageDown') {
        e.preventDefault();
        window.scrollBy({ top: 180, behavior: 'smooth' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, pickerOpen]);

  const { isConnected } = useGamepad({
    onMenu: () => {
      if (!pickerOpen) router.push('/');
    },
    // Gamepad D-Pad / Left Stick → scroll the profile page
    onMove: (dir) => {
      if (pickerOpen) return; // don't scroll behind modal
      if (dir === 'up') {
        window.scrollBy({ top: -180, behavior: 'smooth' });
      } else if (dir === 'down') {
        window.scrollBy({ top: 180, behavior: 'smooth' });
      }
    },
    onAxisMove: (axisIndex, value) => {
      if (pickerOpen) return;
      // Scroll page vertically using Right Stick Y (axis 3)
      if (axisIndex === 3 && Math.abs(value) > 0.15) {
        window.scrollBy({ top: value * 22, behavior: 'auto' });
      }
    }
  });

  // Handle display names & tags
  const displayName = isOwner
    ? (profileDoc?.displayName || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Player')
    : queryName;

  // Resolve showcase badges
  const showcaseBadges = useMemo(() => {
    if (isOwner) {
      // Use array directly from Firestore user doc
      return profileDoc?.showcaseBadges || [];
    } else {
      // Filter the D1 public badge list using ID list from query param
      if (!queryShowcaseStr) return [];
      const ids = queryShowcaseStr.split(',');
      const badgeMap = new Map(badges.map((b) => [b.id, b]));
      return ids
        .map((id) => badgeMap.get(id))
        .filter((b): b is Badge => b !== undefined);
    }
  }, [isOwner, profileDoc?.showcaseBadges, queryShowcaseStr, badges]);

  // Resolve stats
  const stats = useMemo(() => {
    if (isOwner) {
      return {
        score: profileDoc?.totalScore ?? 0,
        completed: profileDoc?.completedCount ?? 0,
        xp: profileDoc?.xp ?? 0,
      };
    }
    return null;
  }, [isOwner, profileDoc]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (err) {
      console.error('[Profile] Sign out failed:', err);
    }
  };

  return {
    t,
    router,
    lang,
    setLang,
    currentUser,
    isCurrentAnonymous,
    viewUid,
    isOwner,
    queryScore,
    queryScoreCat,
    profileDoc,
    setProfileDoc,
    loadingProfile,
    particles,
    badges,
    loadingBadges,
    badgesError,
    saveShowcase,
    savingShowcase,
    actionBusy,
    sendRequest,
    acceptRequest,
    rejectRequest,
    removeFriend,
    currentTag,
    friendshipState,
    isConnected,
    displayName,
    showcaseBadges,
    stats,
    handleSignOut,
  };
}
