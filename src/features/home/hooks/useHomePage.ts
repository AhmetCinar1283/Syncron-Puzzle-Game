'use client';

import { useAppRouter } from '@/lib/navigation';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useUserStorage } from '@/lib/userStorage';
import { useSelector } from 'react-redux';
import { selectUser } from '@/store/userSlice';
import { useT } from '@/contexts/LanguageContext';
import { useCapabilities } from '@/contexts/MonetizationContext';
import { useGamepad } from '@/hooks/useGamepad';
import { useSoundManager } from '@/game-engine/hooks/useSoundManager';
import { isDailyAvailable } from '@/features/daily';
import type { IconName } from '@/components/icons';
import { moveMenuSelection, PROFILE_INDEX } from '../lib/menuGrid';
import { useMotionTier } from '../lib/motionTier';

export type SlidePhase = 'idle' | 'freeze' | 'sliding' | 'won';

export interface HomeMenuItem {
  id: string;
  label: string;
  sub: string;
  color: string;
  icon: IconName;
  badge?: string | null;
  onClick: () => void;
}

/**
 * Izgarada en fazla bu kadar hücre gösterilir; fazlası "Daha fazla" sayfasına
 * taşınır. Böylece menünün yüksekliği platform yeteneklerine (devTools,
 * accountLogin, daily...) göre değişmez ve birincil bölge tek ekranda kalır.
 */
const MAX_TILES = 4;

/** Kayma animasyonunun CSS'teki süresi; animationend gelmezse kullanılan tavan. */
const SLIDE_FALLBACK_MS = 700;
/** Donma anı — buz katmanının görünmesi ile kaymanın başlaması arası. */
const FREEZE_MS = 90;
/** Zafer patlaması ile gerçek navigasyon arası. */
const WIN_HOLD_MS = 320;

export function useHomePage() {
  const t = useT();
  const router = useAppRouter();
  const { getItem: storageGet } = useUserStorage();
  const user = useSelector(selectUser);
  const capabilities = useCapabilities();
  const { devTools, accountLogin } = capabilities;
  const dailyAvailable = isDailyAvailable(capabilities);

  /*
   * Sesler Web Audio tabanlı tekil motordan çalınır. Önceki sürüm her tık için
   * `new Audio()` açıyordu; Android WebView'de bu, dokunuş ile sesin duyulması
   * arasında 50–200ms gecikme ve her seferinde yeni decoder demekti.
   */
  const { play: playSound } = useSoundManager();

  const motionTier = useMotionTier();
  const [slidePhase, setSlidePhase] = useState<SlidePhase>('idle');
  const [activeIndex, setActiveIndex] = useState(0);
  const [inputMode, setInputMode] = useState<'touch' | 'controller'>('touch');
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [lastPlayedLevelId, setLastPlayedLevelId] = useState<string | null>(null);

  const isSliding = slidePhase !== 'idle';
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    timersRef.current.push(setTimeout(fn, ms));
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  useEffect(() => {
    // Kaba işaretçi (parmak) yoksa varsayılan ipucu klavye/kol olmalı.
    try {
      if (!window.matchMedia?.('(pointer: coarse)').matches) {
         
        setInputMode('controller');
      }
    } catch {
      // matchMedia yoksa dokunmatik varsayımıyla devam.
    }

    const handleTouch = () => setInputMode('touch');
    window.addEventListener('touchstart', handleTouch, { passive: true });
    return () => window.removeEventListener('touchstart', handleTouch);
  }, []);

  useEffect(() => {
    setLastPlayedLevelId(storageGet('lastPlayedLevelId'));
  }, [storageGet]);

  const handlePlayNavigate = useCallback(async () => {
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

  /** Tahtanın kahraman şeridi: her zaman tek ve tartışmasız birincil eylem. */
  const playItem: HomeMenuItem = useMemo(
    () => ({
      id: 'play',
      label: t('home.play'),
      sub: lastPlayedLevelId
        ? t('home.resume_level', { id: lastPlayedLevelId })
        : t('home.play_sub'),
      color: '#00ff88',
      icon: 'gamepad',
      onClick: handlePlayNavigate,
    }),
    [t, lastPlayedLevelId, handlePlayNavigate]
  );

  /** İkincil eylemler — öncelik sırasına göre. İlk 4'ü ızgarada görünür. */
  const secondaryItems: HomeMenuItem[] = useMemo(() => {
    const items: HomeMenuItem[] = [];

    if (dailyAvailable) {
      items.push({
        id: 'daily',
        label: t('home.daily'),
        sub: t('home.daily_sub'),
        color: '#ffd700',
        icon: 'star',
        badge: t('home.badge_daily'),
        onClick: () => router.push('/daily'),
      });
    }

    items.push({
      id: 'levels',
      label: t('home.levels'),
      sub: t('home.levels_sub'),
      color: '#00c4ff',
      icon: 'trophy',
      onClick: () => router.push('/levels'),
    });

    items.push({
      id: 'theme',
      label: t('theme.title'),
      sub: t('home.theme_sub'),
      color: '#a78bfa',
      icon: 'palette',
      onClick: () => setIsThemeModalOpen(true),
    });

    if (accountLogin) {
      items.push({
        id: 'friends',
        label: t('friends.title'),
        sub: t('home.friends_sub'),
        color: '#ec4899',
        icon: 'friends',
        onClick: () => router.push('/friends'),
      });
    }

    items.push({
      id: 'controls',
      label: t('home.controls'),
      sub: t('home.controls_sub'),
      color: '#fbbf24',
      icon: 'joystick',
      onClick: () => router.push('/controls'),
    });

    if (devTools) {
      items.push({
        id: 'editor',
        label: t('home.editor'),
        sub: t('home.editor_sub'),
        color: '#f43f5e',
        icon: 'tools',
        onClick: () => router.push('/editor'),
      });
    }

    if (devTools && user?.role === 'admin') {
      items.push({
        id: 'admin',
        label: t('home.admin'),
        sub: t('home.admin_sub'),
        color: '#10b981',
        icon: 'lightning',
        onClick: () => router.push('/admin'),
      });
    }

    return items;
  }, [t, router, dailyAvailable, accountLogin, devTools, user?.role]);

  /*
   * Izgara 4 hücreyi aşmaz: tam sığıyorsa hepsi görünür, aşıyorsa ilk 3 + bir
   * "Daha fazla" hücresi gösterilir. Izgara böylece her zaman 2 satır.
   */
  const { tiles, overflowItems } = useMemo(() => {
    if (secondaryItems.length <= MAX_TILES) {
      return { tiles: secondaryItems, overflowItems: [] as HomeMenuItem[] };
    }

    const visible = secondaryItems.slice(0, MAX_TILES - 1);
    const overflow = secondaryItems.slice(MAX_TILES - 1);

    const moreTile: HomeMenuItem = {
      id: 'more',
      label: t('home.more'),
      sub: t('home.more_sub'),
      color: '#94a3b8',
      icon: 'menu',
      onClick: () => setIsSheetOpen(true),
    };

    return { tiles: [...visible, moreTile], overflowItems: overflow };
  }, [secondaryItems, t]);

  // Gezinme haritası: 0 = hero (tam satır), sonrası 2 sütunlu ızgara.
  const heroFlags = useMemo(
    () => [true, ...tiles.map(() => false)],
    [tiles]
  );

  const hasLaunchedRef = useRef(false);

  const resetSlidePhase = useCallback(() => {
    clearTimers();
    hasLaunchedRef.current = false;
    setSlidePhase('idle');
  }, [clearTimers]);

  /**
   * Hero'nun buzda kayma seremonisi. Süreyi CSS animasyonu belirler; burada
   * yalnızca faz geçişleri var. `onSlideEnd` runner'ın animationend olayından
   * çağrılır, `SLIDE_FALLBACK_MS` ise olay hiç gelmezse devreye giren ağdır.
   */
  const triggerPlay = useCallback(() => {
    if (slidePhase !== 'idle') return;

    setActiveIndex(0);
    setSlidePhase('freeze');
    playSound('ice');

    schedule(() => setSlidePhase('sliding'), FREEZE_MS);
    schedule(() => {
      setSlidePhase((current) => (current === 'sliding' ? 'won' : current));
    }, FREEZE_MS + SLIDE_FALLBACK_MS);
  }, [slidePhase, playSound, schedule]);

  const onSlideEnd = useCallback(() => {
    setSlidePhase((current) => (current === 'sliding' ? 'won' : current));
  }, []);

  // 'won' fazına girildiğinde zafer sesi + navigasyon tek yerden tetiklenir;
  // animationend ile yedek zamanlayıcı yarışsa bile iki kez çalışmaz.
  useEffect(() => {
    if (slidePhase !== 'won' || hasLaunchedRef.current) return;
    hasLaunchedRef.current = true;
    playSound('win');
    const timer = setTimeout(() => {
      void playItem.onClick();
    }, WIN_HOLD_MS);
    return () => clearTimeout(timer);
  }, [slidePhase, playSound, playItem]);

  /** Izgara hücreleri seremonisiz çalışır — anında tepki daha akıcı hissettirir. */
  const activateIndex = useCallback(
    (index: number) => {
      if (slidePhase !== 'idle') return;

      if (index === PROFILE_INDEX) {
        document.getElementById('user-profile-badge')?.click();
        return;
      }

      if (index === 0) {
        triggerPlay();
        return;
      }

      const tile = tiles[index - 1];
      if (!tile) return;
      setActiveIndex(index);
      playSound('toggle');
      tile.onClick();
    },
    [slidePhase, tiles, triggerPlay, playSound]
  );

  // Izgara sütun sayısı: CSS @media (min-width: 560px) kuralıyla eşleşir.
  const [columns, setColumns] = useState<number>(() => {
    if (typeof window === 'undefined') return 4;
    return window.matchMedia('(min-width: 560px)').matches ? 4 : 2;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 560px)');
    const update = () => setColumns(mq.matches ? 4 : 2);
    update();
    if (mq.addEventListener) {
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    } else if ((mq as any).addListener) {
      (mq as any).addListener(update);
      return () => (mq as any).removeListener(update);
    }
  }, []);

  const preferredColRef = useRef(0);

  useEffect(() => {
    if (activeIndex > 0) {
      preferredColRef.current = (activeIndex - 1) % columns;
    }
  }, [activeIndex, columns]);

  const moveSelection = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right') => {
      if (slidePhase !== 'idle') return;
      setActiveIndex((prev) => {
        const next = moveMenuSelection(prev, direction, heroFlags, columns, preferredColRef.current);
        if (next !== prev) playSound('move');
        return next;
      });
    },
    [slidePhase, heroFlags, columns, playSound]
  );

  // Menü kısalırsa (ör. çıkış yapılınca) seçim listenin dışında kalmasın.
  useEffect(() => {
    setActiveIndex((prev) => (prev > tiles.length ? 0 : prev));
  }, [tiles.length]);

  const isOverlayOpen = isThemeModalOpen || isSheetOpen;

  const { isConnected } = useGamepad({
    onMove: (dir) => {
      setInputMode('controller');
      if (isOverlayOpen) return;
      if (dir === 'up' || dir === 'down' || dir === 'left' || dir === 'right') {
        moveSelection(dir);
      }
    },
    onConfirm: () => {
      setInputMode('controller');
      if (isOverlayOpen) return;
      activateIndex(activeIndex);
    },
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOverlayOpen) {
        if (e.key === 'Escape') {
          setIsSheetOpen(false);
          setIsThemeModalOpen(false);
        }
        return;
      }

      const key = e.key;
      const dir =
        key === 'ArrowUp' || key === 'w' || key === 'W'
          ? 'up'
          : key === 'ArrowDown' || key === 's' || key === 'S'
          ? 'down'
          : key === 'ArrowLeft' || key === 'a' || key === 'A'
          ? 'left'
          : key === 'ArrowRight' || key === 'd' || key === 'D'
          ? 'right'
          : null;

      if (dir) {
        e.preventDefault();
        setInputMode('controller');
        moveSelection(dir);
        return;
      }

      if (key === 'Enter' || key === ' ') {
        e.preventDefault();
        setInputMode('controller');
        activateIndex(activeIndex);
        return;
      }

      if (key === 't' || key === 'T') {
        e.preventDefault();
        setIsThemeModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moveSelection, activateIndex, activeIndex, isOverlayOpen]);

  // Profil rozeti kendi odak durumunu bu olaydan okur (bkz. UserBadge).
  useEffect(() => {
    const focused = activeIndex === PROFILE_INDEX;
    window.dispatchEvent(new CustomEvent('home-profile-focus', { detail: { focused } }));
    return () => {
      window.dispatchEvent(new CustomEvent('home-profile-focus', { detail: { focused: false } }));
    };
  }, [activeIndex]);

  return {
    t,
    motionTier,
    playItem,
    tiles,
    overflowItems,
    activeIndex,
    setActiveIndex,
    slidePhase,
    isSliding,
    triggerPlay,
    onSlideEnd,
    activateIndex,
    resetSlidePhase,
    inputMode,
    isConnected,
    lastPlayedLevelId,
    isThemeModalOpen,
    setIsThemeModalOpen,
    isSheetOpen,
    setIsSheetOpen,
  };
}
