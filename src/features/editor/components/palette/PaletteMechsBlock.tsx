'use client';

import { CELL_TYPES_CONVEYOR, CELL_TYPES_TRAMPOLINE, CELL_COLOR, CELL_LABEL } from '../../lib/editorConfig';
import { useEditorContext } from '../../EditorContext';
import { BlockWrapper, CellToolList, ToolBtn, CELL_SIZE, CELL_SIZE_MOB } from './paletteParts';

const OTHER_MECHS = ['direction_toggle', 'control_switch', 'direction_deflector'] as const;

/** "Mechs" block: conveyors/trampolines (2x2 grids), toggle/switch/deflector, add box. */
export default function PaletteMechsBlock({ small, isLandscape }: { small: boolean; isLandscape: boolean }) {
  const { activeTool, setActiveTool, setBoxes, setActivePlacingBoxId } = useEditorContext();

  return (
    <BlockWrapper label="Mechs" isLandscape={isLandscape}>
      {/* Conveyors 2x2 Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 2,
      }}>
        <CellToolList types={CELL_TYPES_CONVEYOR} activeTool={activeTool} setActiveTool={setActiveTool} small={small} />
      </div>

      {/* Trampolines 2x2 Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 2,
      }}>
        <CellToolList types={CELL_TYPES_TRAMPOLINE} activeTool={activeTool} setActiveTool={setActiveTool} small={small} />
      </div>

      {/* Other Mechanisms */}
      {OTHER_MECHS.map((t) => (
        <ToolBtn
          key={t}
          tool={t} active={activeTool === t}
          color={CELL_COLOR[t]} label={CELL_LABEL[t]}
          onClick={() => setActiveTool(t)} small={small}
        />
      ))}

      {/* Add Box Button */}
      <button
        title="Add Box"
        onClick={() => {
          const newId = Date.now();
          setBoxes((bs) => [...bs, {
            id: newId,
            row: null,
            col: null,
            requiresPower: false,
            durabilityEnabled: false,
            durability: 3,
            colorFilterEnabled: false,
            colorFilterIndex: 0,
          }]);
          setActivePlacingBoxId(newId);
          setActiveTool('place_box');
        }}
        style={{
          flexShrink: 0,
          border: `1px solid ${activeTool === 'place_box' ? 'rgba(249,115,22,0.6)' : 'rgba(249,115,22,0.3)'}`,
          background: activeTool === 'place_box' ? 'rgba(249,115,22,0.15)' : 'rgba(249,115,22,0.05)',
          color: '#f97316', borderRadius: 6, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          height: small ? CELL_SIZE_MOB : CELL_SIZE,
          width: small ? CELL_SIZE_MOB : CELL_SIZE,
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 'bold' }}>▣</span>
      </button>
    </BlockWrapper>
  );
}
