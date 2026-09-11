'use client';

import { useT } from '@/contexts/LanguageContext';
import type { LevelPart } from '@/services/firebase/admin';
import { getThemeColor } from '../lib/designerThemes';
import { useMapDesigner } from '../hooks/useMapDesigner';
import { DesignerSidebar } from './DesignerSidebar';
import { DesignerCanvas } from './DesignerCanvas';

export interface MapDesignerModalProps {
  part: LevelPart;
  onClose: () => void;
  onSave: (
    partId: string,
    levelCoords: Record<string, { mapX: number; mapY: number }>,
    portalCoords: { portalX: number; portalY: number; portalStartX: number; portalStartY: number },
    theme: string
  ) => void;
}

export function MapDesignerModal({ part, onClose, onSave }: MapDesignerModalProps) {
  const t = useT();
  const {
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
  } = useMapDesigner(part, onSave, onClose);

  const activeThemeColor = getThemeColor(mapTheme);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(3,7,18,0.92)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          background: '#070a13',
          border: `1px solid ${activeThemeColor}40`,
          borderRadius: 16,
          width: '100%',
          maxWidth: 960,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: `0 0 50px ${activeThemeColor}15`
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 900, color: '#fff', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {t('admin.designer_title')} <span style={{ color: activeThemeColor }}>· {part.name}</span>
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 20, cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, display: 'flex', overflowY: 'auto', flexWrap: 'wrap' }}>

          <DesignerSidebar
            mapTheme={mapTheme}
            setMapTheme={setMapTheme}
            activeThemeColor={activeThemeColor}
            saving={saving}
            onSave={handleSave}
            onClose={onClose}
            onGeneratePreset={generatePreset}
          />

          <div style={{ flex: 1, padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#03050a', boxSizing: 'border-box' }}>
            <DesignerCanvas
              canvasRef={canvasRef}
              mapTheme={mapTheme}
              activeThemeColor={activeThemeColor}
              sortedLevels={sortedLevels}
              levelCoords={levelCoords}
              portalCoords={portalCoords}
              portalStartCoords={portalStartCoords}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            />
          </div>

        </div>

      </div>
    </div>
  );
}
