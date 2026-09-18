'use client';

import { useRef } from 'react';
import GameCellAdapter from '@/game-engine/components/GameCellAdapter';
import type { EdgeBehavior } from '@/game-engine/level-format';
import { EDGE_COLOR } from '../../lib/editorConfig';
import { useEditorContext } from '../../EditorContext';
import { getPlayerColor } from '@/game-engine/components/playerColors';
import { useGameTheme } from '@/game-engine/contexts/GameThemeContext';
import { PlayerGraphic } from '@/game-engine/components/entities/PlayerGraphic';
import { BoxGraphic } from '@/game-engine/components/entities/BoxGraphic';
import type { Entity } from '@/game-engine/logic/entityTypes';
import { GameIcon } from '@/components/icons';

export default function GridCore() {
  const { grid, objects, boxes, cellSize, edges, paintCell, lockedCells, activeRoomId } = useEditorContext();
  const { themeConfig } = useGameTheme();

  // Boyama durumu tek bir pointer üzerinden yürür. Fare ve dokunma için ayrı
  // dinleyiciler kullanmak, dokunmatikte tarayıcının ürettiği "taklit fare"
  // olayları yüzünden aynı hücreyi iki kez tetikliyordu (parmağı kaldırınca
  // duvarın silinmesi). Pointer Events + `touch-action: none` ile tek olay
  // akışı kalır ve tıklama tam olarak bir kez işlenir.
  const activePointerId = useRef<number | null>(null);
  const lastCell = useRef<string | null>(null);

  /** Ekran koordinatındaki hücreyi bulur (çocuk katmanlar pointer-events:none). */
  const cellAt = (clientX: number, clientY: number): { row: number; col: number } | null => {
    const el = document.elementFromPoint(clientX, clientY);
    const cell = el?.closest('[data-cell]') as HTMLElement | null;
    if (!cell) return null;
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    if (Number.isNaN(row) || Number.isNaN(col)) return null;
    return { row, col };
  };

  const endPaint = (e?: React.PointerEvent<HTMLDivElement>) => {
    if (e && activePointerId.current !== null) {
      try { e.currentTarget.releasePointerCapture(activePointerId.current); } catch { /* zaten serbest */ }
    }
    activePointerId.current = null;
    lastCell.current = null;
  };

  return (
    <div
      style={{
        border: '3px solid transparent',
        borderTopColor: EDGE_COLOR[edges.top.type as EdgeBehavior],
        borderBottomColor: EDGE_COLOR[edges.bottom.type as EdgeBehavior],
        borderLeftColor: EDGE_COLOR[edges.left.type as EdgeBehavior],
        borderRightColor: EDGE_COLOR[edges.right.type as EdgeBehavior],
        borderRadius: themeConfig.board.borderRadius ?? 6,
        overflow: 'hidden',
        background: themeConfig.board.background ?? '#060d1a',
        cursor: 'crosshair',
        userSelect: 'none',
        boxShadow: themeConfig.board.boxShadow(true),
        touchAction: 'none',
        position: 'relative',
        transition: 'background 0.3s, box-shadow 0.3s',
      }}
      onPointerDown={(e) => {
        // Sadece birincil düğme/parmak boyar; ikinci parmak (pinch) yok sayılır.
        if (activePointerId.current !== null) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        const hit = cellAt(e.clientX, e.clientY);
        if (!hit) return;
        e.preventDefault();
        activePointerId.current = e.pointerId;
        lastCell.current = `${hit.row},${hit.col}`;
        // Pointer yakalama: parmak/fare hücreden çıksa da hareketler bize gelir,
        // ayrıca dokunmada sonradan gelen taklit fare olayları engellenir.
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* destek yoksa sorun değil */ }
        paintCell(hit.row, hit.col, false);
      }}
      onPointerMove={(e) => {
        if (activePointerId.current !== e.pointerId) return;
        const hit = cellAt(e.clientX, e.clientY);
        if (!hit) return;
        const key = `${hit.row},${hit.col}`;
        // Aynı hücrede kalan küçük titremeler tekrar boyamayı tetiklemesin.
        if (lastCell.current === key) return;
        lastCell.current = key;
        paintCell(hit.row, hit.col, true);
      }}
      onPointerUp={endPaint}
      onPointerCancel={endPaint}
      onLostPointerCapture={() => { activePointerId.current = null; lastCell.current = null; }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {grid.map((row, r) => (
        <div key={r} style={{ display: 'flex' }}>
          {row.map((cell, c) => {
            const cellObjects = objects.filter((o) => (o.roomId ?? 'main') === activeRoomId && o.row === r && o.col === c);
            const isLocked = !!lockedCells[`${r},${c}`];
            return (
              <div
                key={c}
                style={{ position: 'relative' }}
                data-cell="" data-row={r} data-col={c}
              >
                <GameCellAdapter cellType={cell} cellSize={cellSize} />
                
                {/* 100% In-Game Matching Player Graphic */}
                {cellObjects.map((obj) => {
                  const playerEntity = {
                    id: obj.id,
                    type: 'player' as const,
                    position: { row: r, col: c },
                    physics: { direction: 'up' as const, force: 0, z: 0 },
                    def: { mass: 1, resistance: 0, isSolid: true },
                    traits: new Set<never>(),
                    isElectrified: false,
                    customData: {
                      playerIndex: obj.id - 1,
                      mode: (obj as any).mode ?? 'normal',
                      isLocked: isLocked,
                    },
                  } as Entity;

                  return (
                    <div
                      key={obj.id}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: 64,
                        height: 64,
                        transform: `scale(${cellSize / 64})`,
                        transformOrigin: 'top left',
                        pointerEvents: 'none',
                        zIndex: 10,
                      }}
                    >
                      <PlayerGraphic entity={playerEntity} />
                      {/* Player number badge for clear editor identification */}
                      <div style={{
                        position: 'absolute',
                        top: 3,
                        left: 3,
                        minWidth: 16,
                        height: 16,
                        borderRadius: 8,
                        background: '#000000',
                        border: `1.5px solid ${getPlayerColor(obj.id - 1).hex}`,
                        color: '#ffffff',
                        fontSize: 10,
                        fontWeight: 900,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: 1,
                        boxShadow: '0 0 4px rgba(0,0,0,0.9)',
                        zIndex: 15,
                        userSelect: 'none',
                        padding: '0 3px',
                      }}>
                        {obj.id}
                      </div>
                    </div>
                  );
                })}

                {/* 100% In-Game Matching Box Graphic */}
                {boxes.map((b) => {
                  if ((b.roomId ?? 'main') !== activeRoomId || b.row !== r || b.col !== c) return null;
                  const boxEntity = {
                    id: b.id,
                    type: 'box' as const,
                    position: { row: r, col: c },
                    physics: { direction: 'up' as const, force: 0, z: 0 },
                    def: { mass: 1, resistance: 0, isSolid: true },
                    traits: new Set<never>(),
                    isElectrified: !b.requiresPower,
                    customData: {
                      requiresPower: b.requiresPower,
                      durabilityEnabled: b.durabilityEnabled,
                      durability: b.durability,
                      colorFilterEnabled: b.colorFilterEnabled,
                      colorFilterIndex: b.colorFilterIndex,
                    },
                  } as Entity;

                  return (
                    <div
                      key={b.id}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: 64,
                        height: 64,
                        transform: `scale(${cellSize / 64})`,
                        transformOrigin: 'top left',
                        pointerEvents: 'none',
                        zIndex: 10,
                      }}
                    >
                      <BoxGraphic entity={boxEntity} />
                    </div>
                  );
                })}

                {isLocked && (
                  <div style={{
                    position: 'absolute', top: 2, right: 2, zIndex: 12,
                    pointerEvents: 'none', userSelect: 'none',
                    filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.8))'
                  }}>
                    <GameIcon name="lock" size={Math.max(10, Math.round(cellSize * 0.3))} color="#facc15" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
