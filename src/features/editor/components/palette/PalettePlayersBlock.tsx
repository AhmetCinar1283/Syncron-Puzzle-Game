'use client';

import { getPlayerColor } from '@/game-engine/components/playerColors';
import { CELL_COLOR, type ToolType } from '../../lib/editorConfig';
import { useEditorContext } from '../../EditorContext';
import { BlockWrapper, ToolBtn, actionBtnStyle, CELL_SIZE, CELL_SIZE_MOB } from './paletteParts';

/** "Players" block: place-player / place-target tool per player, +P / -P. */
export default function PalettePlayersBlock({ small, vertical }: { small: boolean; vertical: boolean }) {
  const { activeTool, setActiveTool, objects, setObjects } = useEditorContext();

  return (
    <BlockWrapper label="Players" vertical={vertical}>
      {objects.map((obj) => {
        const id = obj.id;
        const playerTool = `place_obj${id}` as ToolType;
        const targetTool = `target_${id}` as ToolType;
        const { hex: color } = getPlayerColor(id - 1);
        const sz = small ? CELL_SIZE_MOB : CELL_SIZE;
        return (
          <div key={id} style={{ display: 'flex', gap: 2, flexDirection: vertical ? 'row' : 'column' }}>
            {/* Player placing button */}
            <ToolBtn
              tool={playerTool} active={activeTool === playerTool}
              color={color}
              label={`Place Player ${id}`}
              onClick={() => setActiveTool(playerTool)} small={small}
            >
              <div style={{
                width: sz - 10, height: sz - 10,
                borderRadius: '50%', background: color,
                boxShadow: `0 0 6px ${color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: (sz - 10) * 0.4, fontWeight: 900, color: '#000000' }}>
                  {id}
                </span>
              </div>
            </ToolBtn>

            {/* Target placing button */}
            <ToolBtn
              tool={targetTool} active={activeTool === targetTool}
              color={CELL_COLOR[targetTool] || '#10b981'}
              label={`Place Target ${id}`}
              onClick={() => setActiveTool(targetTool)} small={small}
            />
          </div>
        );
      })}

      {/* Add/Remove Player Controls */}
      <div style={{ display: 'flex', flexDirection: vertical ? 'row' : 'column', gap: 2 }}>
        <button
          title="Add Player"
          onClick={() => {
            const newId = objects.length + 1;
            setObjects((os) => [...os, { id: newId, row: null, col: null, mode: 'normal', lockOnTarget: true }]);
          }}
          style={actionBtnStyle(small, '1px solid rgba(0, 255, 136, 0.4)', 'rgba(0, 255, 136, 0.05)', '#00ff88')}
        >
          <span>+P</span>
        </button>
        {objects.length > 1 && (
          <button
            title="Remove Player"
            onClick={() => {
              setObjects((os) => os.slice(0, -1));
              const lastId = objects.length;
              if (activeTool === `place_obj${lastId}`) {
                setActiveTool('obstacle');
              }
            }}
            style={actionBtnStyle(small, '1px solid rgba(239, 68, 68, 0.4)', 'rgba(239, 68, 68, 0.05)', '#ef4444')}
          >
            <span>-P</span>
          </button>
        )}
      </div>
    </BlockWrapper>
  );
}
