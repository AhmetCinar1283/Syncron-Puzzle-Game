import { useCallback, useEffect, useRef, useState } from 'react';

export type EditorMobileTab = 'grid' | 'settings';

export const EDITOR_TABS: readonly EditorMobileTab[] = ['grid', 'settings'];

/** Izgara çevresinde her zaman yer ayrılan kontroller (satır/sütun ekle-sil, kenar şeritleri). */
const RESERVE_W = 98;
const RESERVE_H = 136;
/** Kaydırma çubuğu payı — ölçüm ile gerçek yerleşim arasında salınımı önler. */
const SCROLLBAR_ALLOWANCE = 16;

const MIN_CELL = 22;
const MAX_CELL = 56;

interface Viewport {
  w: number;
  h: number;
}

function readViewport(): Viewport {
  if (typeof window === 'undefined') return { w: 1280, h: 800 };
  return { w: window.innerWidth, h: window.innerHeight };
}

/**
 * Editör ekranının yerleşim durumu: kırılım noktaları, aktif mobil sekme ve
 * hücre boyutu.
 *
 * Hücre boyutu artık sabit "sihirli sayı" çıkarmalarıyla değil, tuvalin gerçek
 * ölçüsünden (ResizeObserver) hesaplanır; böylece panel açılıp kapandığında,
 * pencere yeniden boyutlandığında veya mobilde adres çubuğu gizlendiğinde
 * ızgara gerçekten kalan alana oturur.
 */
export function useEditorLayout(width: number, height: number) {
  const [viewport, setViewport] = useState<Viewport>(readViewport);
  const [activeTab, setActiveTab] = useState<EditorMobileTab>('grid');
  const [cellSize, setCellSize] = useState(44);

  const canvasAreaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onResize() {
      setViewport(readViewport());
    }
    onResize();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  // Tuval alanı: tek kaynak ölçüm. Element yoksa (ilk render, mobilde gizli
  // sekme) pencereden türetilen makul bir tahmine düşer.
  const measure = useCallback(() => {
    const el = canvasAreaRef.current;
    const gw = width;
    const gh = height;
    if (!gw || !gh) return;

    const availW = (el?.clientWidth || readViewport().w * 0.6) - RESERVE_W - SCROLLBAR_ALLOWANCE;
    const availH = (el?.clientHeight || readViewport().h * 0.6) - RESERVE_H - SCROLLBAR_ALLOWANCE;

    const next = Math.max(
      MIN_CELL,
      Math.min(MAX_CELL, Math.floor(Math.min(availW / gw, availH / gh))),
    );
    setCellSize((prev) => (prev === next ? prev : next));
  }, [width, height]);

  // ResizeObserver geri çağrısı her zaman en güncel ölçüm fonksiyonunu kullansın.
  const measureRef = useRef(measure);
  useEffect(() => {
    measureRef.current = measure;
    // Ölçüm bir sonraki kareye ertelenir: yerleşim (panel açılması, sekme
    // değişimi, yeni ızgara boyutu) tamamlandıktan sonra okunsun.
    const id = requestAnimationFrame(() => measureRef.current());
    return () => cancelAnimationFrame(id);
  }, [measure, viewport.w, viewport.h, activeTab]);

  useEffect(() => {
    const el = canvasAreaRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measureRef.current());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isMobile = viewport.w < 900;
  /** Araç paletinin dikey sütun olarak sığamayacağı kadar dar ekranlar. */
  const isNarrow = viewport.w < 620;
  /** Üst çubukta metin etiketleri yerine yalnız simge gösterilecek genişlik. */
  const isCompactBar = viewport.w < 1180;

  return {
    isMobile,
    isNarrow,
    isCompactBar,
    /** Palet dar ekranda tuvalin üstünde yatay şerit, aksi halde solda sütun. */
    paletteOrientation: (isNarrow ? 'row' : 'column') as 'row' | 'column',
    activeTab,
    setActiveTab,
    tabs: EDITOR_TABS,
    cellSize,
    canvasAreaRef,
    remeasure: measure,
  };
}
