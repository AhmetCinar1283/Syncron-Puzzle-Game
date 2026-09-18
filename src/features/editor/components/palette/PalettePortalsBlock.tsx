'use client';

import { useState } from 'react';
import { CELL_COLOR, CELL_LABEL, type ToolType } from '../../lib/editorConfig';
import { useEditorContext } from '../../EditorContext';
import { BlockWrapper, ToolBtn, actionBtnStyle } from './paletteParts';

/**
 * "Portals" block: in/out tool per teleporter group. Groups = A, B, C + any
 * group letter found in the grid + groups added via "+G" (session-only; a
 * group persists once one of its cells is painted).
 */
export default function PalettePortalsBlock({ small, vertical }: { small: boolean; vertical: boolean }) {
  const { activeTool, setActiveTool, grid } = useEditorContext();
  const [addedGroups, setAddedGroups] = useState<string[]>([]);

  const foundGroups = new Set<string>(['A', 'B', 'C']);
  for (const row of grid) {
    for (const cell of row) {
      if (cell.startsWith('teleporter_in_') || cell.startsWith('teleporter_out_')) {
        const group = cell.substring(cell.lastIndexOf('_') + 1);
        foundGroups.add(group);
      }
    }
  }
  addedGroups.forEach(g => foundGroups.add(g));
  const telGroups = Array.from(foundGroups).sort();

  return (
    <BlockWrapper label="Portals" vertical={vertical}>
      {telGroups.map((g) => {
        const inTool = `teleporter_in_${g}` as ToolType;
        const outTool = `teleporter_out_${g}` as ToolType;
        return (
          <div key={g} style={{ display: 'flex', gap: 2, flexDirection: vertical ? 'row' : 'column' }}>
            <ToolBtn
              tool={inTool}
              active={activeTool === inTool}
              color={CELL_COLOR[inTool] || '#8b5cf6'}
              label={CELL_LABEL[inTool] || `Portal In ${g}`}
              onClick={() => setActiveTool(inTool)}
              small={small}
            />
            <ToolBtn
              tool={outTool}
              active={activeTool === outTool}
              color={CELL_COLOR[outTool] || '#a78bfa'}
              label={CELL_LABEL[outTool] || `Portal Out ${g}`}
              onClick={() => setActiveTool(outTool)}
              small={small}
            />
          </div>
        );
      })}

      {/* Add Group Button */}
      <button
        title="Add Teleporter Group"
        onClick={() => {
          const nextLetter = String.fromCharCode(65 + telGroups.length);
          setAddedGroups((prev) => [...prev, nextLetter]);
        }}
        style={actionBtnStyle(small, '1px solid rgba(139, 92, 246, 0.4)', 'rgba(139, 92, 246, 0.05)', '#a78bfa')}
      >
        <span>+G</span>
      </button>
    </BlockWrapper>
  );
}
