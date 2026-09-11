'use client';

import { useMemo, useRef, useState } from 'react';
import type { LevelPart } from '@/services/firebase/admin';

interface Coords {
  x: number;
  y: number;
}

export function useMapDesigner(
  part: LevelPart,
  onSave: (
    partId: string,
    levelCoords: Record<string, { mapX: number; mapY: number }>,
    portalCoords: { portalX: number; portalY: number; portalStartX: number; portalStartY: number },
    theme: string
  ) => void,
  onClose: () => void,
) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [mapTheme, setMapTheme] = useState<string>(part.mapTheme || 'cyber-grid');

  const sortedLevels = useMemo(() => {
    return Object.values(part.order).sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }, [part.order]);

  // Local state for coordinates
  const [levelCoords, setLevelCoords] = useState<Record<string, Coords>>(() => {
    const coords: Record<string, Coords> = {};
    sortedLevels.forEach((lv, i) => {
      if (lv.mapX !== undefined && lv.mapY !== undefined) {
        coords[lv.id] = { x: lv.mapX, y: lv.mapY };
      } else {
        const count = sortedLevels.length;
        const ratio = count > 1 ? i / (count - 1) : 0.5;
        const y = Math.round(80 - ratio * 60); // Winding spline center
        const x = Math.round(50 + Math.sin(ratio * Math.PI * 3) * 32);
        coords[lv.id] = { x, y };
      }
    });
    return coords;
  });

  // Exit Portal state (Top portal)
  const [portalCoords, setPortalCoords] = useState<Coords>(() => {
    if (part.portalX !== undefined && part.portalY !== undefined) {
      return { x: part.portalX, y: part.portalY };
    }
    return { x: 50, y: 10 };
  });

  // Entry Portal state (Bottom portal)
  const [portalStartCoords, setPortalStartCoords] = useState<Coords>(() => {
    if (part.portalStartX !== undefined && part.portalStartY !== undefined) {
      return { x: part.portalStartX, y: part.portalStartY };
    }
    return { x: 50, y: 90 };
  });

  const [saving, setSaving] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const generatePreset = (type: 'snake' | 'spiral' | 'circle') => {
    const count = sortedLevels.length;
    const newCoords: Record<string, Coords> = {};

    if (type === 'snake') {
      sortedLevels.forEach((lv, i) => {
        const ratio = count > 1 ? i / (count - 1) : 0.5;
        const y = Math.round(80 - ratio * 60);
        const x = Math.round(50 + Math.sin(ratio * Math.PI * 3) * 32);
        newCoords[lv.id] = { x, y };
      });
      setPortalCoords({ x: 50, y: 10 });
      setPortalStartCoords({ x: 50, y: 90 });
    } else if (type === 'spiral') {
      sortedLevels.forEach((lv, i) => {
        const ratio = count > 0 ? i / count : 0.5;
        const angle = ratio * Math.PI * 4;
        const radius = 6 + ratio * 32;
        const x = Math.round(50 + Math.cos(angle) * radius);
        const y = Math.round(55 + Math.sin(angle) * radius);
        newCoords[lv.id] = { x, y };
      });
      setPortalStartCoords({ x: 50, y: 55 }); // Center spiral entry
      const portalAngle = 1.05 * Math.PI * 4;
      const portalRadius = 6 + 1.05 * 32;
      setPortalCoords({
        x: Math.max(5, Math.min(95, Math.round(50 + Math.cos(portalAngle) * portalRadius))),
        y: Math.max(5, Math.min(95, Math.round(55 + Math.sin(portalAngle) * portalRadius)))
      });
    } else if (type === 'circle') {
      sortedLevels.forEach((lv, i) => {
        const angle = (i / (count + 1)) * Math.PI * 1.6 - Math.PI * 0.8;
        const x = Math.round(50 + Math.cos(angle) * 32);
        const y = Math.round(50 + Math.sin(angle) * 32);
        newCoords[lv.id] = { x, y };
      });
      setPortalStartCoords({ x: 50, y: 90 });
      setPortalCoords({ x: 50, y: 10 });
    }

    setLevelCoords(newCoords);
  };

  const handlePointerDown = (id: string, e: React.PointerEvent) => {
    e.preventDefault();
    setActiveDragId(id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeDragId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(2, Math.min(98, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
    const y = Math.max(2, Math.min(98, Math.round(((e.clientY - rect.top) / rect.height) * 100)));

    if (activeDragId === 'portal') {
      setPortalCoords({ x, y });
    } else if (activeDragId === 'portalStart') {
      setPortalStartCoords({ x, y });
    } else {
      setLevelCoords(prev => ({ ...prev, [activeDragId]: { x, y } }));
    }
  };

  const handlePointerUp = (id: string, e: React.PointerEvent) => {
    if (activeDragId) {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      setActiveDragId(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { updatePartMapLayout } = await import('@/services/firebase/admin');

      const levelCoordsSave: Record<string, { mapX: number; mapY: number }> = {};
      Object.entries(levelCoords).forEach(([levelId, c]) => {
        levelCoordsSave[levelId] = { mapX: c.x, mapY: c.y };
      });

      await updatePartMapLayout(
        part.partId,
        levelCoordsSave,
        {
          portalX: portalCoords.x,
          portalY: portalCoords.y,
          portalStartX: portalStartCoords.x,
          portalStartY: portalStartCoords.y
        },
        mapTheme
      );

      onSave(
        part.partId,
        levelCoordsSave,
        {
          portalX: portalCoords.x,
          portalY: portalCoords.y,
          portalStartX: portalStartCoords.x,
          portalStartY: portalStartCoords.y
        },
        mapTheme
      );
      onClose();
    } catch (err) {
      console.error('[MapDesigner]', err);
    } finally {
      setSaving(false);
    }
  };

  return {
    canvasRef,
    mapTheme,
    setMapTheme,
    sortedLevels,
    levelCoords,
    portalCoords,
    portalStartCoords,
    saving,
    generatePreset,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleSave,
  };
}
