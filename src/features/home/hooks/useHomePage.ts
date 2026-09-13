'use client';
import { useAppRouter } from '@/lib/navigation';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useUserStorage } from '@/lib/userStorage';
import { useSelector } from 'react-redux';
import { selectUser } from '@/store/userSlice';
import { useT } from '@/contexts/LanguageContext';
import { useCapabilities } from '@/contexts/MonetizationContext';
import { useGamepad } from '@/hooks/useGamepad';

export function useHomePage() {
  const t = useT();
  const router = useAppRouter();
  const { getItem: storageGet } = useUserStorage();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const user = useSelector(selectUser);
  const { devTools, accountLogin } = useCapabilities();
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen size on mount and window resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Menu music (loop, low volume)
  useEffect(() => {
    // const audio = new Audio('/sounds/menu.mp3');
    // audio.loop = true;
    // audio.volume = 0.18;
    // audioRef.current = audio;

    // audio.play().catch(() => {
    //   // Autoplay blocked — unlock on first interaction
    //   const unlock = () => {
    //     audio.play().catch(() => {});
    //   };
    //   window.addEventListener('click', unlock, { once: true });
    //   window.addEventListener('keydown', unlock, { once: true });
    //   window.addEventListener('touchstart', unlock, { once: true });
    // });

    // return () => {
    //   audio.pause();
    //   audio.src = '';
    // };
  }, []);

  const [activeMenuIndex, setActiveMenuIndex] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handlePlayClick = useCallback(async () => {
    const id = storageGet('lastPlayedLevelId');
    const src = storageGet('lastPlayedSource');
    if (id) {
      router.push(src === 'preset' ? `/play?id=${id}&source=preset` : `/play?id=${id}`);
      return;
    }

    try {
      const { getPresetLevels } = await import('@/services/db');
      let presets = await getPresetLevels();
      if (!presets || presets.length === 0) {
        const { syncLevelsMeta } = await import('@/services/firebase/sync');
        await syncLevelsMeta();
        presets = await getPresetLevels();
      }
      if (presets && presets.length > 0) {
        router.push(`/play?id=${presets[0].id}&source=preset`);
        return;
      }
    } catch (err) {
      console.warn('[PlayClick] Failed to fetch first level:', err);
    }

    router.push('/levels');
  }, [router, storageGet]);

  const options = useMemo(() => {
    const opts = [
      { id: 'play', label: t('home.play'), sub: t('home.play_sub'), color: '#00ff88', onClick: handlePlayClick },
      { id: 'levels', label: t('home.levels'), sub: t('home.levels_sub'), color: '#ffd700', onClick: () => router.push('/levels') },
    ];
    // Editör bir geliştirici aracıdır — portal oyuncusunu ilgilendirmez.
    if (devTools) {
      opts.push({ id: 'editor', label: t('home.editor'), sub: t('home.editor_sub'), color: '#00c4ff', onClick: () => router.push('/editor') });
    }
    // Arkadaşlar girişe bağlı bir özellik — portallar yalnızca misafir oynanışa izin verir.
    if (accountLogin) {
      opts.push({ id: 'friends', label: t('friends.title'), sub: t('home.friends_sub'), color: '#ec4899', onClick: () => router.push('/friends') });
    }
    opts.push({ id: 'controls', label: t('home.controls'), sub: t('home.controls_sub'), color: '#fbbf24', onClick: () => router.push('/controls') });
    if (devTools && user?.role === 'admin') {
      opts.push({ id: 'admin', label: t('home.admin'), sub: t('home.admin_sub'), color: '#00ff88', onClick: () => router.push('/admin') });
    }
    return opts;
  }, [t, user?.role, router, handlePlayClick, devTools, accountLogin]);

  const handleMoveMenu = useCallback((dir: 'up' | 'down' | 'left' | 'right') => {
    setActiveMenuIndex((prev) => {
      // Aşağıdaki 2 sütunlu grid haritası yalnızca tam kart setini (5 veya 6 kart:
      // play/levels/editor/friends/controls[/admin]) varsayar — bu, web/android/electron
      // ve mock'ta değişmedi. Portal build'lerinde (devTools=false, accountLogin=false)
      // kart sayısı azaldığı için tek sütun gibi basitçe döngüsel gezinilir.
      if (options.length <= 4) {
        const len = options.length;
        if (dir === 'up') return prev === -1 ? len - 1 : prev === 0 ? -1 : prev - 1;
        if (dir === 'down') return prev === -1 ? 0 : prev === len - 1 ? -1 : prev + 1;
        return prev; // left/right: tek sütunda anlamsız
      }
      const hasAdmin = options.length > 5;
      switch (dir) {
        case 'up':
          if (prev === -1) return hasAdmin ? 5 : 4; // Wrap from Profile to bottom
          if (prev === 0) return -1; // Go up from Play to Profile
          if (prev === 1 || prev === 2) return 0;
          if (prev === 3) return 1;
          if (prev === 4) return 2;
          if (prev === 5) return 3;
          return prev;
        case 'down':
          if (prev === -1) return 0; // Go down from Profile to Play
          if (prev === 0) return 1;
          if (prev === 1) return 3;
          if (prev === 2) return 4;
          if (prev === 3 || prev === 4) return hasAdmin ? 5 : 0;
          if (prev === 5) return 0;
          return prev;
        case 'left':
          if (prev === -1) return prev;
          if (prev === 2) return 1;
          if (prev === 4) return 3;
          return prev;
        case 'right':
          if (prev === -1) return prev;
          if (prev === 1) return 2;
          if (prev === 3) return 4;
          return prev;
      }
      return prev;
    });
  }, [options.length]);

  const { isConnected } = useGamepad({
    onMove: (dir) => handleMoveMenu(dir),
    onConfirm: () => {
      if (activeMenuIndex === -1) {
        document.getElementById('user-profile-badge')?.click();
      } else {
        options[activeMenuIndex]?.onClick();
      }
    },
  });

  // Keyboard navigation for menu cards
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleMoveMenu('up');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleMoveMenu('down');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleMoveMenu('left');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleMoveMenu('right');
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (activeMenuIndex === -1) {
          document.getElementById('user-profile-badge')?.click();
        } else {
          options[activeMenuIndex]?.onClick();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleMoveMenu, activeMenuIndex, options]);

  // Synchronize profile badge focus state
  useEffect(() => {
    const isProfileActive = activeMenuIndex === -1;
    window.dispatchEvent(
      new CustomEvent('home-profile-focus', {
        detail: { focused: isProfileActive },
      })
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent('home-profile-focus', {
          detail: { focused: false },
        })
      );
    };
  }, [activeMenuIndex]);

  return {
    t,
    isMobile,
    options,
    activeMenuIndex,
    setActiveMenuIndex,
    isConnected,
    audioRef,
  };
}
