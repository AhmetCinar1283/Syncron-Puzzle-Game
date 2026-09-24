'use client';

import { useAppRouter } from '@/lib/navigation';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectUser } from '@/store/userSlice';
import { useT } from '@/contexts/LanguageContext';
import { useCapabilities } from '@/contexts/MonetizationContext';
import { useGamepad } from '@/hooks/useGamepad';
import { useSoundManager } from '@/services/audio';
import { isDailyAvailable } from '@/features/daily';
import type { IconName } from '@/components/icons';
import { useSettings } from '@/features/settings';
import { moveMenuSelection, PROFILE_INDEX } from '../lib/menuGrid';
import { useMotionTier } from '../lib/motionTier';
import { findNextCampaignTarget, type NextCampaignTarget } from '@/features/levels/lib/progression';

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
  const user = useSelector(selectUser);
  const capabilities = useCapabilities();
  const { devTools, accountLogin } = capabilities;
  const dailyAvailable = isDailyAvailable(capabilities);

  /*
   * Sesler Web Audio tabanlı tekil motordan menü ses ayarıyla çalınır.
   */
  const { play: playSound } = useSoundManager('menu');

  const motionTier = useMotionTier();
  const [slidePhase, setSlidePhase] = useState<SlidePhase>('idle');
  const [activeIndex, setActiveIndex] = useState(0);
  const [inputMode, setInputMode] = useState<'touch' | 'controller'>('touch');
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { isSettingsOpen } = useSettings();
  const [nextTarget, setNextTarget] = useState<NextCampaignTarget | null>(null);

  const selectIndex = useCallback(
    (index: number) => {
      if (slidePhase !== 'idle') return;
      setActiveIndex((prev) => {
        if (prev !== index) {
          playSound('ui.tick');
        }
        return index;
      });
    },
    [slidePhase, playSound]
  );

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

  /** Kampanyada sıradaki oynanabilir level; belirsizse null (PLAY → levels sayfası). */
  const resolveNextTarget = useCallback(async (): Promise<NextCampaignTarget | null> => {
    const { getPresetLevels, getAllPlayedLevels, getAllSkippedLevels } = await import('@/services/db');
    const { getCampaignParts } = await import('@/services/levels/campaignParts');
    const [parts, presets, played, skipped] = await Promise.all([
      getCampaignParts(),
      getPresetLevels(),
      getAllPlayedLevels(),
      getAllSkippedLevels(),
    ]);
    if (parts.length === 0 || presets.length === 0) return null;

    const byFirestoreId = new Map<string, number>();
    for (const lv of presets) {
      if (lv.firestoreId) byFirestoreId.set(lv.firestoreId, lv.id);
    }
    const totalStars = played.reduce((sum, p) => sum + (p.stars ?? 0), 0);
    return findNextCampaignTarget(
      parts,
      byFirestoreId,
      {
        played: new Set(played.map((p) => p.levelId)),
        skipped: new Set(skipped.map((s) => s.levelId)),
      },
      totalStars,
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    resolveNextTarget()
      .then((target) => {
        if (!cancelled) setNextTarget(target);
      })
      .catch((err) => console.warn('[Home] Next level lookup failed:', err));
    return () => {
      cancelled = true;
    };
  }, [resolveNextTarget]);

  const handlePlayNavigate = useCallback(async () => {
    playSound('ui.navigate');
    try {
      const target = await resolveNextTarget();
      if (target) {
        router.push(`/play?id=${target.levelId}&source=preset`);
        return;
      }
    } catch (err) {
      console.warn('[PlayClick] Failed to resolve next level:', err);
    }

    router.push('/levels');
  }, [router, playSound, resolveNextTarget]);

  /** Tahtanın kahraman şeridi: her zaman tek ve tartışmasız birincil eylem. */
  const playItem: HomeMenuItem = useMemo(
    () => ({
      id: 'play',
      label: t('home.play'),
      sub: nextTarget
        ? t('home.play_next', { sector: nextTarget.sectorNumber, level: nextTarget.levelNumber })
        : t('home.play_sub'),
      color: '#00ff88',
      icon: 'gamepad',
      onClick: handlePlayNavigate,
    }),
    [t, nextTarget, handlePlayNavigate]
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
        onClick: () => { playSound('ui.navigate'); router.push('/daily'); },
      });
    }

    items.push({
      id: 'levels',
      label: t('home.levels'),
      sub: t('home.levels_sub'),
      color: '#00c4ff',
      icon: 'trophy',
      onClick: () => { playSound('ui.navigate'); router.push('/levels'); },
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
        onClick: () => { playSound('ui.navigate'); router.push('/friends'); },
      });
    }

    items.push({
      id: 'controls',
      label: t('home.controls'),
      sub: t('home.controls_sub'),
      color: '#fbbf24',
      icon: 'joystick',
      onClick: () => { playSound('ui.navigate'); router.push('/controls'); },
    });

    if (devTools) {
      items.push({
        id: 'editor',
        label: t('home.editor'),
        sub: t('home.editor_sub'),
        color: '#f43f5e',
        icon: 'tools',
        onClick: () => { playSound('ui.navigate'); router.push('/editor'); },
      });
    }

    if (devTools && user?.role === 'admin') {
      items.push({
        id: 'admin',
        label: t('home.admin'),
        sub: t('home.admin_sub'),
        color: '#10b981',
        icon: 'lightning',
        onClick: () => { playSound('ui.navigate'); router.push('/admin'); },
      });
    }

    items.push({
      id: 'settings',
      label: t('settings.title'),
      sub: t('home.settings_sub') || t('settings.subtitle'),
      color: '#38bdf8',
      icon: 'settings',
      onClick: () => { playSound('ui.navigate'); router.push('/settings'); },
    });

    return items;
  }, [t, router, playSound, dailyAvailable, accountLogin, devTools, user?.role]);

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
    playSound('game.ice');

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
    playSound('game.win');
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
      playSound('ui.confirm');
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
    } else {
      const legacyMq = mq as unknown as {
        addListener?: (cb: () => void) => void;
        removeListener?: (cb: () => void) => void;
      };
      legacyMq.addListener?.(update);
      return () => legacyMq.removeListener?.(update);
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
        if (next !== prev) playSound('ui.tick');
        return next;
      });
    },
    [slidePhase, heroFlags, columns, playSound]
  );

  // Menü kısalırsa (ör. çıkış yapılınca) seçim listenin dışında kalmasın.
  useEffect(() => {
    setActiveIndex((prev) => (prev > tiles.length ? 0 : prev));
  }, [tiles.length]);

  const isOverlayOpen = isThemeModalOpen || isSheetOpen || isSettingsOpen;

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
    selectIndex,
    slidePhase,
    isSliding,
    triggerPlay,
    onSlideEnd,
    activateIndex,
    resetSlidePhase,
    inputMode,
    isConnected,
    isThemeModalOpen,
    setIsThemeModalOpen,
    isSheetOpen,
    setIsSheetOpen,
  };
}
