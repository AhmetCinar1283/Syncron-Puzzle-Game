'use client';

import { CELL_TYPES_ICE, CELL_TYPES_POWER, type ToolType } from '../../lib/editorConfig';
import { useEditorContext } from '../../EditorContext';
import { BlockWrapper, CellToolList, ToolBtn, CELL_SIZE, CELL_SIZE_MOB } from './paletteParts';
import PalettePlayersBlock from './PalettePlayersBlock';
import PaletteMechsBlock from './PaletteMechsBlock';
import PalettePortalsBlock from './PalettePortalsBlock';

const BOARD_BASIC = ['empty', 'obstacle', 'forbidden'];

/** System tools rendered as glyph buttons: [tool, color, label, glyph, active glyph color]. */
const SYS_TOOLS: [ToolType, string, string, string, string][] = [
  ['select', '#00c4ff', 'Select & Move', '▣', '#00c4ff'],
  ['erase', '#64748b', 'Erase', '⌫', '#94a3b8'],
  ['lock', '#fbbf24', 'Lock / Unlock Cell', '🔒', '#fbbf24'],
];

/** Tool palette strip (top bar on portrait, right column on landscape). */
export default function ToolPalette({ isMobile, isLandscape = false }: { isMobile: boolean; isLandscape?: boolean }) {
  const { activeTool, setActiveTool, undo, canUndo } = useEditorContext();
  const small = isMobile;

  return (
    <div style={{
      flexShrink: 0,
      display: 'flex',
      flexDirection: isLandscape ? 'column' : 'row',
      alignItems: 'center',
      gap: 8,
      padding: isLandscape ? '10px 6px' : '6px 10px',
      borderLeft: isLandscape ? '1px solid rgba(0,196,255,0.15)' : 'none',
      borderBottom: isLandscape ? 'none' : '1px solid rgba(0,196,255,0.15)',
      overflowY: isLandscape ? 'auto' : 'hidden',
      overflowX: isLandscape ? 'hidden' : 'auto',
      width: isLandscape ? 84 : 'auto',
      height: isLandscape ? '100%' : 'auto',
      whiteSpace: isLandscape ? 'normal' : 'nowrap',
      scrollbarWidth: 'none',
      background: 'rgba(3,7,18,0.95)',
    }}>

      {/* System Block */}
      <BlockWrapper label="Sys" isLandscape={isLandscape}>
        {/* Undo */}
        <button
          title="Undo (Ctrl+Z)"
          onClick={undo}
          disabled={!canUndo}
          style={{
            flexShrink: 0,
            width: small ? CELL_SIZE_MOB : CELL_SIZE,
            height: small ? CELL_SIZE_MOB : CELL_SIZE,
            padding: 0,
            border: `1px solid ${canUndo ? 'rgba(148,163,184,0.35)' : 'rgba(255,255,255,0.05)'}`,
            borderRadius: 6,
            background: canUndo ? 'rgba(148,163,184,0.07)' : 'transparent',
            color: canUndo ? '#94a3b8' : '#334155',
            cursor: canUndo ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: small ? 14 : 18,
            transition: 'opacity 0.15s',
          }}
        >↩</button>

        {/* Select / Erase / Lock */}
        {SYS_TOOLS.map(([tool, color, label, glyph, activeGlyphColor]) => (
          <ToolBtn
            key={tool}
            tool={tool} active={activeTool === tool}
            color={color} label={label}
            onClick={() => setActiveTool(tool)} small={small}
          >
            <span style={{ fontSize: small ? 14 : 18, color: activeTool === tool ? activeGlyphColor : '#334155' }}>{glyph}</span>
          </ToolBtn>
        ))}
      </BlockWrapper>

      {/* Players & Targets Block */}
      <PalettePlayersBlock small={small} isLandscape={isLandscape} />

      {/* Floor & Walls (Board) Block */}
      <BlockWrapper label="Board" isLandscape={isLandscape}>
        <CellToolList types={BOARD_BASIC} activeTool={activeTool} setActiveTool={setActiveTool} small={small} />
        <CellToolList types={CELL_TYPES_ICE} activeTool={activeTool} setActiveTool={setActiveTool} small={small} />
        <CellToolList types={CELL_TYPES_POWER} activeTool={activeTool} setActiveTool={setActiveTool} small={small} />
      </BlockWrapper>

      {/* Mechanisms Block */}
      <PaletteMechsBlock small={small} isLandscape={isLandscape} />

      {/* Teleporters Block */}
      <PalettePortalsBlock small={small} isLandscape={isLandscape} />
    </div>
  );
}
