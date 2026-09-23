'use client';

import { useEffect, useRef } from 'react';
import { soundEngine } from './soundEngine';

/**
 * Bir modal/sheet'in `open` durumuna göre açılış ve kapanış sesi çalar.
 * İlk render'daki (zaten kapalı ya da zaten açık) durum ses çıkarmaz.
 */
export function useModalSound(open: boolean): void {
  const prev = useRef(open);
  useEffect(() => {
    if (open !== prev.current) {
      soundEngine.play(open ? 'modal.open' : 'modal.close');
    }
    prev.current = open;
  }, [open]);
}

/** Yalnızca açıkken mount edilen modallar için: mount'ta açılış, unmount'ta kapanış sesi. */
export function useMountedModalSound(): void {
  useEffect(() => {
    soundEngine.play('modal.open');
    return () => soundEngine.play('modal.close');
  }, []);
}
