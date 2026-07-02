'use client';

import { useState } from 'react';
import GameCell from '@/app/src/games/components/GameCell';
import type { CellType } from '@/app/src/games/types';
import {
  CELL_TYPES_BASIC, CELL_TYPES_ICE, CELL_TYPES_POWER,
  CELL_TYPES_CONVEYOR, CELL_TYPES_TELEPORTER, CELL_TYPES_TRAMPOLINE,
  CELL_COLOR, CELL_LABEL, type ToolType,
} from '../editorConfig';
import { useEditorContext } from '../EditorContext';
import { getPlayerColor } from '@/app/src/game2/components/playerColors';

const CELL_SIZE = 36;
const CELL_SIZE_MOB = 28;

interface ToolBtnProps {
  tool: ToolType;
  active: boolean;
  color: string;
  label: string;
  onClick: () => void;
  small?: boolean;
  children?: React.ReactNode;
}

function ToolBtn({ tool, active, color, label, onClick, small, children }: ToolBtnProps) {
  const [hov, setHov] = useState(false);
  const sz = small ? CELL_SIZE_MOB : CELL_SIZE;
  return (
    <button
      title={label}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flexShrink: 0,
        width: sz, height: sz,
        padding: 0,
        border: `2px solid ${active ? color : hov ? `${color}60` : 'rgba(255,255,255,0.06)'}`,
        borderRadius: 6,
        background: active ? `${color}1a` : 'transparent',
        boxShadow: active ? `0 0 0 1px ${color}30, 0 0 10px ${color}30` : 'none',
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'border-color 0.1s, box-shadow 0.1s',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}
    >
      {children ?? <GameCell cellType={tool as CellType} cellSize={sz - 4} />}
      {active && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
          background: color, opacity: 0.8,
        }} />
      )}
    </button>
  );
}

function GroupLabel({ label, small, isLandscape }: { label: string; small?: boolean; isLandscape?: boolean }) {
  if (small || isLandscape) return null;
  return (
    <div style={{
      fontSize: 7, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
      color: '#1e3a5f', writingMode: 'vertical-lr', userSelect: 'none',
      display: 'flex', alignItems: 'center', paddingRight: 2,
    }}>
      {label}
    </div>
  );
}

function Divider({ small, isLandscape }: { small?: boolean; isLandscape?: boolean }) {
  if (small) {
    return isLandscape ? <div style={{ height: 6 }} /> : <div style={{ width: 6 }} />;
  }
  if (isLandscape) {
    return <div style={{ height: 1, background: 'rgba(30,58,95,0.4)', width: '100%', margin: '4px 0' }} />;
  }
  return <div style={{ width: 1, background: 'rgba(30,58,95,0.4)', alignSelf: 'stretch', margin: '4px 4px' }} />;
}

function BlockWrapper({ label, isLandscape, children }: { label: string; isLandscape: boolean; children: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: isLandscape ? 'column' : 'row',
      alignItems: 'center',
      gap: 6,
      padding: '6px 8px',
      borderRadius: 8,
      border: '1px solid rgba(0, 196, 255, 0.15)',
      background: 'rgba(15, 23, 42, 0.6)',
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      flexShrink: 0,
    }}>
      <span style={{
        fontSize: 8,
        fontWeight: 800,
        color: '#00c4ff',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        userSelect: 'none',
        display: 'block',
        textAlign: 'center',
        writingMode: isLandscape ? 'horizontal-tb' : 'horizontal-tb',
        marginBottom: isLandscape ? 4 : 0,
        marginRight: isLandscape ? 0 : 4,
        borderBottom: isLandscape ? '1px solid rgba(0, 196, 255, 0.2)' : 'none',
        borderRight: isLandscape ? 'none' : '1px solid rgba(0, 196, 255, 0.2)',
        paddingBottom: isLandscape ? 4 : 0,
        paddingRight: isLandscape ? 0 : 6,
      }}>
        {label}
      </span>
      <div style={{
        display: 'flex',
        flexDirection: isLandscape ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        flexWrap: 'wrap',
      }}>
        {children}
      </div>
    </div>
  );
}

export default function ToolPalette({ isMobile, isLandscape = false }: { isMobile: boolean; isLandscape?: boolean }) {
  const { activeTool, setActiveTool, objects, setObjects, grid, boxes, setBoxes, setActivePlacingBoxId, activePlacingBoxId, undo, canUndo } = useEditorContext();
  const small = isMobile;

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

        {/* Select */}
        <ToolBtn
          tool="select" active={activeTool === 'select'}
          color="#00c4ff" label="Select & Move"
          onClick={() => setActiveTool('select')} small={small}
        >
          <span style={{ fontSize: small ? 14 : 18, color: activeTool === 'select' ? '#00c4ff' : '#334155' }}>▣</span>
        </ToolBtn>

        {/* Erase */}
        <ToolBtn
          tool="erase" active={activeTool === 'erase'}
          color="#64748b" label="Erase"
          onClick={() => setActiveTool('erase')} small={small}
        >
          <span style={{ fontSize: small ? 14 : 18, color: activeTool === 'erase' ? '#94a3b8' : '#334155' }}>⌫</span>
        </ToolBtn>

        {/* Lock */}
        <ToolBtn
          tool="lock" active={activeTool === 'lock'}
          color="#fbbf24" label="Lock / Unlock Cell"
          onClick={() => setActiveTool('lock')} small={small}
        >
          <span style={{ fontSize: small ? 14 : 18, color: activeTool === 'lock' ? '#fbbf24' : '#334155' }}>🔒</span>
        </ToolBtn>
      </BlockWrapper>

      {/* Players & Targets Block */}
      <BlockWrapper label="Players" isLandscape={isLandscape}>
        {objects.map((obj) => {
          const id = obj.id;
          const playerTool = `place_obj${id}` as ToolType;
          const targetTool = `target_${id}` as ToolType;
          const { hex: color } = getPlayerColor(id - 1);
          const sz = small ? CELL_SIZE_MOB : CELL_SIZE;
          return (
            <div key={id} style={{ display: 'flex', gap: 2, flexDirection: isLandscape ? 'row' : 'column' }}>
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
        <div style={{ display: 'flex', flexDirection: isLandscape ? 'row' : 'column', gap: 2 }}>
          <button
            title="Add Player"
            onClick={() => {
              const newId = objects.length + 1;
              setObjects((os) => [...os, { id: newId, row: null, col: null, mode: 'normal', lockOnTarget: true }]);
            }}
            style={{
              flexShrink: 0,
              border: '1px solid rgba(0, 255, 136, 0.4)',
              background: 'rgba(0, 255, 136, 0.05)',
              color: '#00ff88', borderRadius: 6, cursor: 'pointer',
              height: small ? CELL_SIZE_MOB : CELL_SIZE,
              width: small ? CELL_SIZE_MOB : CELL_SIZE,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700,
            }}
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
              style={{
                flexShrink: 0,
                border: '1px solid rgba(239, 68, 68, 0.4)',
                background: 'rgba(239, 68, 68, 0.05)',
                color: '#ef4444', borderRadius: 6, cursor: 'pointer',
                height: small ? CELL_SIZE_MOB : CELL_SIZE,
                width: small ? CELL_SIZE_MOB : CELL_SIZE,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700,
              }}
            >
              <span>-P</span>
            </button>
          )}
        </div>
      </BlockWrapper>

      {/* Floor & Walls (Board) Block */}
      <BlockWrapper label="Board" isLandscape={isLandscape}>
        {['empty', 'obstacle', 'forbidden'].map((t) => (
          <ToolBtn
            key={t} tool={t as ToolType}
            active={activeTool === t}
            color={CELL_COLOR[t]}
            label={CELL_LABEL[t]}
            onClick={() => setActiveTool(t as ToolType)}
            small={small}
          />
        ))}
        {CELL_TYPES_ICE.map((t) => (
          <ToolBtn
            key={t} tool={t as ToolType}
            active={activeTool === t}
            color={CELL_COLOR[t]}
            label={CELL_LABEL[t]}
            onClick={() => setActiveTool(t as ToolType)}
            small={small}
          />
        ))}
        {CELL_TYPES_POWER.map((t) => (
          <ToolBtn
            key={t} tool={t as ToolType}
            active={activeTool === t}
            color={CELL_COLOR[t]}
            label={CELL_LABEL[t]}
            onClick={() => setActiveTool(t as ToolType)}
            small={small}
          />
        ))}
      </BlockWrapper>

      {/* Mechanisms Block */}
      <BlockWrapper label="Mechs" isLandscape={isLandscape}>
        {/* Conveyors 2x2 Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 2,
        }}>
          {CELL_TYPES_CONVEYOR.map((t) => (
            <ToolBtn
              key={t} tool={t as ToolType}
              active={activeTool === t}
              color={CELL_COLOR[t]}
              label={CELL_LABEL[t]}
              onClick={() => setActiveTool(t as ToolType)}
              small={small}
            />
          ))}
        </div>

        {/* Trampolines 2x2 Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 2,
        }}>
          {CELL_TYPES_TRAMPOLINE.map((t) => (
            <ToolBtn
              key={t} tool={t as ToolType}
              active={activeTool === t}
              color={CELL_COLOR[t]}
              label={CELL_LABEL[t]}
              onClick={() => setActiveTool(t as ToolType)}
              small={small}
            />
          ))}
        </div>

        {/* Other Mechanisms */}
        <ToolBtn
          tool="direction_toggle" active={activeTool === 'direction_toggle'}
          color={CELL_COLOR['direction_toggle']} label={CELL_LABEL['direction_toggle']}
          onClick={() => setActiveTool('direction_toggle')} small={small}
        />
        <ToolBtn
          tool="control_switch" active={activeTool === 'control_switch'}
          color={CELL_COLOR['control_switch']} label={CELL_LABEL['control_switch']}
          onClick={() => setActiveTool('control_switch')} small={small}
        />
        <ToolBtn
          tool="direction_deflector" active={activeTool === 'direction_deflector'}
          color={CELL_COLOR['direction_deflector']} label={CELL_LABEL['direction_deflector']}
          onClick={() => setActiveTool('direction_deflector')} small={small}
        />

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

      {/* Teleporters Block */}
      <BlockWrapper label="Portals" isLandscape={isLandscape}>
        {telGroups.map((g) => {
          const inTool = `teleporter_in_${g}` as ToolType;
          const outTool = `teleporter_out_${g}` as ToolType;
          return (
            <div key={g} style={{ display: 'flex', gap: 2, flexDirection: isLandscape ? 'row' : 'column' }}>
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
          style={{
            flexShrink: 0,
            border: '1px solid rgba(139, 92, 246, 0.4)',
            background: 'rgba(139, 92, 246, 0.05)',
            color: '#a78bfa', borderRadius: 6, cursor: 'pointer',
            height: small ? CELL_SIZE_MOB : CELL_SIZE,
            width: small ? CELL_SIZE_MOB : CELL_SIZE,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700,
          }}
        >
          <span>+G</span>
        </button>
      </BlockWrapper>
    </div>
  );
}
