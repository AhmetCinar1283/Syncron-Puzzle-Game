'use client';

import { useT } from '@/contexts/LanguageContext';
import { Modal } from '@/components/ui';
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
    <Modal
      open={true}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>{t('admin.designer_title')}</span>
          <span style={{ color: activeThemeColor }}>· {part.name}</span>
        </div>
      }
      accentColor={activeThemeColor}
      maxWidth={980}
      maxHeight="92dvh"
      showCloseButton={false}
    >
      <div style={{ flex: 1, display: 'flex', overflowY: 'auto', flexWrap: 'wrap', minHeight: 0 }}>
        <DesignerSidebar
          mapTheme={mapTheme}
          setMapTheme={setMapTheme}
          activeThemeColor={activeThemeColor}
          saving={saving}
          onSave={handleSave}
          onClose={onClose}
          onGeneratePreset={generatePreset}
        />

        <div style={{ flex: 1, padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#03050a', boxSizing: 'border-box', minWidth: 320 }}>
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
    </Modal>
  );
}
