/**
 * DOSYA AMACI: Ayarlar ekranının odak (focus) yönetimi ile klavye ve gamepad
 * gezinmesi. Odaklanabilir öğeleri sıralı bir liste olarak alır; satır türünü
 * bilmez (eylemler öğenin kendi `step` / `activate` işlevlerinden gelir).
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGamepad } from '@/hooks/useGamepad';
import type { StepDirection } from '../lib/rowActions';

export interface FocusItem {
  id: string;
  /** Sol/sağ girdisi. */
  step?: (direction: StepDirection) => void;
  /** Onay (Enter / boşluk / gamepad A). */
  activate?: () => void;
}

interface Options {
  items: FocusItem[];
  enabled: boolean;
  /** Escape / gamepad iptali. */
  onCancel: () => void;
}

/** Odaklanan öğeyi görünür alana kaydırır (`data-focus-id` işaretli öğe). */
function scrollToFocus(id: string): void {
  requestAnimationFrame(() => {
    const el = document.querySelector<HTMLElement>(`[data-focus-id="${CSS.escape(id)}"]`);
    el?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  });
}

export function useSettingsNavigation({ items, enabled, onCancel }: Options) {
  const [requestedId, setFocusId] = useState<string | null>(null);

  // Odak listede yoksa (ör. satır gizlendi) ilk öğeye düşer.
  const focusId = items.some((i) => i.id === requestedId) ? requestedId : (items[0]?.id ?? null);

  // Dinleyiciler her render'da yeniden bağlanmasın diye son değerler ref'te tutulur.
  const latest = useRef({ items, focusId, onCancel });
  useEffect(() => {
    latest.current = { items, focusId, onCancel };
  });

  const move = useCallback((delta: 1 | -1) => {
    const { items: list, focusId: current } = latest.current;
    if (list.length === 0) return;
    const index = Math.max(0, list.findIndex((i) => i.id === current));
    const next = list[(index + delta + list.length) % list.length].id;
    setFocusId(next);
    scrollToFocus(next);
  }, []);

  const currentItem = () => latest.current.items.find((i) => i.id === latest.current.focusId);
  const step = useCallback((direction: StepDirection) => currentItem()?.step?.(direction), []);
  const activate = useCallback(() => currentItem()?.activate?.(), []);
  const cancel = useCallback(() => latest.current.onCancel(), []);

  useGamepad({
    enabled,
    priority: 'modal',
    onMove: (dir) => {
      if (dir === 'up') move(-1);
      else if (dir === 'down') move(1);
      else if (dir === 'left') step(-1);
      else if (dir === 'right') step(1);
    },
    onConfirm: activate,
    onCancel: cancel,
  });

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'arrowup' || key === 'w') move(-1);
      else if (key === 'arrowdown' || key === 's') move(1);
      else if (key === 'arrowleft' || key === 'a') step(-1);
      else if (key === 'arrowright' || key === 'd') step(1);
      else if (key === 'enter' || key === ' ') activate();
      else if (key === 'escape') cancel();
      else return;
      // Range slider üzerinde ok/boşluk sayfayı kaydırmasın veya değeri ikinci kez değiştirmesin
      e.preventDefault();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled, move, step, activate, cancel]);

  return { focusId, setFocusId };
}
