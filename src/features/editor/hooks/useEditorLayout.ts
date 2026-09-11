import { useEffect, useState } from 'react';

export type EditorMobileTab = 'alternatives' | 'grid' | 'settings';

/**
 * Viewport-driven layout state for the editor screen: mobile/landscape flags,
 * active mobile tab and the computed grid cell size. Effects are in the same
 * order as the original `EditorInner` (tab sync, resize flags, cell size).
 */
export function useEditorLayout(width: number, height: number, candidateCount: number) {
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<EditorMobileTab>('grid');
  const [cellSize, setCellSize] = useState(44);

  // Sync activeTab when candidates list becomes empty
  useEffect(() => {
    if (candidateCount === 0 && activeTab === 'alternatives') {
      setActiveTab('grid');
    }
  }, [candidateCount, activeTab]);

  // Dynamically calculate mobile tabs: show "Alternatifler" tab only if there are generated candidates
  const tabs = candidateCount > 0
    ? (['grid', 'settings', 'alternatives'] as const)
    : (['grid', 'settings'] as const);

  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    function check() {
      setIsMobile(window.innerWidth < 900);
      setIsLandscape(window.innerWidth > window.innerHeight);
    }
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    function compute() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const mob = vw < 900;
      const hasLeftPanel = !mob && candidateCount > 0;
      const leftPanelWidth = hasLeftPanel ? 170 : 0;
      const paletteWidth = isLandscape ? 48 : 0;
      // Subtract: left panel, right panel, palette, row/col controls (34px), edge strips (20px), padding (20px)
      const availW = mob ? vw - 76 : vw - leftPanelWidth - paletteWidth - 220 - 80;

      const paletteHeight = isLandscape ? 0 : 52;
      // Subtract: top bar, tab bar (mob), tool palette, bottom panel, col controls, edge, padding
      const availH = vh - (mob ? 130 : 44) - paletteHeight - 40 - 22 - 28;
      setCellSize(Math.max(24, Math.min(56, Math.floor(availW / width), Math.floor(availH / height))));
    }
    compute();
    window.addEventListener('resize', compute);
    return () => window.removeEventListener('resize', compute);
  }, [width, height, candidateCount, isLandscape]);

  return { isMobile, isLandscape, activeTab, setActiveTab, tabs, cellSize };
}
