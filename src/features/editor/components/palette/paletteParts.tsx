'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import GameCellAdapter from '@/game-engine/components/GameCellAdapter';
import { CELL_COLOR, CELL_LABEL, type ToolType } from '../../lib/editorConfig';

export const CELL_SIZE = 34;
// Dokunmatikte parmakla isabetli seçim için daha büyük hedef alanı.
export const CELL_SIZE_MOB = 38;

interface ToolBtnProps {
  tool: ToolType;
  active: boolean;
  color: string;
  label: string;
  onClick: () => void;
  small?: boolean;
  children?: ReactNode;
}

/** Square palette button; renders the cell preview for `tool` unless children are given. */
export function ToolBtn({ tool, active, color, label, onClick, small, children }: ToolBtnProps) {
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
      {children ?? <GameCellAdapter cellType={tool as string} cellSize={sz - 4} />}
      {active && (
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
          background: color, opacity: 0.8,
        }} />
      )}
    </button>
  );
}

/** One ToolBtn per cell type, colored/labelled from editorConfig. */
export function CellToolList({ types, activeTool, setActiveTool, small }: {
  types: readonly string[];
  activeTool: ToolType;
  setActiveTool: (t: ToolType) => void;
  small: boolean;
}) {
  return (
    <>
      {types.map((t) => (
        <ToolBtn
          key={t} tool={t as ToolType}
          active={activeTool === t}
          color={CELL_COLOR[t]}
          label={CELL_LABEL[t]}
          onClick={() => setActiveTool(t as ToolType)}
          small={small}
        />
      ))}
    </>
  );
}

/** Labelled group box of the palette (`vertical` = palette rendered as a side column). */
export function BlockWrapper({ label, vertical, children }: { label: string; vertical: boolean; children: ReactNode }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: vertical ? 'column' : 'row',
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
        writingMode: 'horizontal-tb',
        marginBottom: vertical ? 4 : 0,
        marginRight: vertical ? 0 : 4,
        borderBottom: vertical ? '1px solid rgba(0, 196, 255, 0.2)' : 'none',
        borderRight: vertical ? 'none' : '1px solid rgba(0, 196, 255, 0.2)',
        paddingBottom: vertical ? 4 : 0,
        paddingRight: vertical ? 0 : 6,
      }}>
        {label}
      </span>
      <div style={{
        display: 'flex',
        flexDirection: vertical ? 'column' : 'row',
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

/** Style of the small square "+P / -P / +G / add box" action buttons. */
export function actionBtnStyle(small: boolean, border: string, background: string, color: string) {
  return {
    flexShrink: 0,
    border,
    background,
    color, borderRadius: 6, cursor: 'pointer',
    height: small ? CELL_SIZE_MOB : CELL_SIZE,
    width: small ? CELL_SIZE_MOB : CELL_SIZE,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 10, fontWeight: 700,
  } as const;
}
