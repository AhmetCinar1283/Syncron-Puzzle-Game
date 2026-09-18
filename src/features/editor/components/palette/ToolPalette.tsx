'use client';

import { CELL_TYPES_ICE, CELL_TYPES_POWER, type ToolType } from '../../lib/editorConfig';
import { useEditorContext } from '../../EditorContext';
import { BlockWrapper, CellToolList, ToolBtn, CELL_SIZE, CELL_SIZE_MOB } from './paletteParts';
import PalettePlayersBlock from './PalettePlayersBlock';
import PaletteMechsBlock from './PaletteMechsBlock';
import PalettePortalsBlock from './PalettePortalsBlock';
import { GameIcon } from '@/components/icons';
import type { IconName } from '@/components/icons/types';

const BOARD_BASIC = ['empty', 'obstacle', 'forbidden'];

interface SysToolDef {
  tool: ToolType;
  color: string;
  label: string;
  icon: IconName;
  activeColor: string;
}

/** System tools rendered as icon buttons. */
const SYS_TOOLS: SysToolDef[] = [
  { tool: 'select', color: '#00c4ff', label: 'Select & Move', icon: 'retro-block', activeColor: '#00c4ff' },
  { tool: 'erase', color: '#64748b', label: 'Erase', icon: 'erase', activeColor: '#94a3b8' },
  { tool: 'lock', color: '#fbbf24', label: 'Lock / Unlock Cell', icon: 'lock', activeColor: '#fbbf24' },
];

interface ToolPaletteProps {
  isMobile: boolean;
  /** `column` = tuvalin yanında dikey sütun, `row` = üstünde yatay şerit. */
  orientation: 'row' | 'column';
}

/**
 * Araç paleti. Geniş ekranlarda tuvalin solunda sabit bir sütun, dar
 * ekranlarda tuvalin üstünde kaydırılabilir yatay şerittir — böylece araçlar
 * her iki düzende de ızgaranın hemen yanında kalır.
 */
export default function ToolPalette({ isMobile, orientation }: ToolPaletteProps) {
  const { activeTool, setActiveTool, undo, canUndo } = useEditorContext();
  const small = isMobile;
  const vertical = orientation === 'column';
  const btnSize = small ? CELL_SIZE_MOB : CELL_SIZE;

  return (
    <div style={{
      flexShrink: 0,
      display: 'flex',
      flexDirection: vertical ? 'column' : 'row',
      alignItems: vertical ? 'stretch' : 'center',
      gap: 8,
      padding: vertical ? '10px 8px' : '6px 10px',
      borderRight: vertical ? '1px solid rgba(0,196,255,0.15)' : 'none',
      borderBottom: vertical ? 'none' : '1px solid rgba(0,196,255,0.15)',
      overflowY: vertical ? 'auto' : 'hidden',
      overflowX: vertical ? 'hidden' : 'auto',
      width: vertical ? btnSize + 46 : 'auto',
      height: vertical ? '100%' : 'auto',
      whiteSpace: vertical ? 'normal' : 'nowrap',
      scrollbarWidth: 'thin',
      WebkitOverflowScrolling: 'touch',
      background: 'rgba(3,7,18,0.95)',
    }}>

      {/* System Block */}
      <BlockWrapper label="Sys" vertical={vertical}>
        {/* Undo */}
        <button
          title="Undo (Ctrl+Z)"
          onClick={undo}
          disabled={!canUndo}
          style={{
            flexShrink: 0,
            width: btnSize,
            height: btnSize,
            padding: 0,
            border: `1px solid ${canUndo ? 'rgba(148,163,184,0.35)' : 'rgba(255,255,255,0.05)'}`,
            borderRadius: 6,
            background: canUndo ? 'rgba(148,163,184,0.07)' : 'transparent',
            color: canUndo ? '#94a3b8' : '#334155',
            cursor: canUndo ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'opacity 0.15s',
          }}
        >
          <GameIcon name="arrow-left" size={small ? 16 : 18} color={canUndo ? '#94a3b8' : '#334155'} />
        </button>

        {/* Select / Erase / Lock */}
        {SYS_TOOLS.map((item) => (
          <ToolBtn
            key={item.tool}
            tool={item.tool} active={activeTool === item.tool}
            color={item.color} label={item.label}
            onClick={() => setActiveTool(item.tool)} small={small}
          >
            <GameIcon name={item.icon} size={small ? 16 : 18} color={activeTool === item.tool ? item.activeColor : '#334155'} />
          </ToolBtn>
        ))}
      </BlockWrapper>

      {/* Players & Targets Block */}
      <PalettePlayersBlock small={small} vertical={vertical} />

      {/* Floor & Walls (Board) Block */}
      <BlockWrapper label="Board" vertical={vertical}>
        <CellToolList types={BOARD_BASIC} activeTool={activeTool} setActiveTool={setActiveTool} small={small} />
        <CellToolList types={CELL_TYPES_ICE} activeTool={activeTool} setActiveTool={setActiveTool} small={small} />
        <CellToolList types={CELL_TYPES_POWER} activeTool={activeTool} setActiveTool={setActiveTool} small={small} />
      </BlockWrapper>

      {/* Mechanisms Block */}
      <PaletteMechsBlock small={small} vertical={vertical} />

      {/* Teleporters Block */}
      <PalettePortalsBlock small={small} vertical={vertical} />
    </div>
  );
}
