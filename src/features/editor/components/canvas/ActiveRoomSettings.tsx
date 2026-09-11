import type { CSSProperties } from 'react';
import { useEditorContext } from '../../EditorContext';

const CARD_STYLE: CSSProperties = {
  background: 'rgba(15, 23, 42, 0.6)',
  border: '1px solid rgba(148, 163, 184, 0.15)',
  height: 32,
  boxSizing: 'border-box',
};

const POS_INPUT_STYLE: CSSProperties = {
  background: 'rgba(15, 23, 42, 0.4)',
  border: '1px solid rgba(148, 163, 184, 0.1)',
  borderRadius: 4,
  color: '#e2e8f0',
  width: 32,
  height: 22,
  fontSize: 11,
  fontWeight: 700,
  textAlign: 'center',
  outline: 'none',
};

/** One segment of the control-mode switch. */
function ControlModeButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? '#00c4ff' : 'transparent',
        border: 'none',
        color: active ? '#0f172a' : '#94a3b8',
        padding: '4px 10px',
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 700,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        boxShadow: active ? '0 0 8px rgba(0, 196, 255, 0.3)' : 'none',
      }}
    >
      {label}
    </button>
  );
}

/** Labelled pill with an on/off switch (FOG OF WAR, PERSIST). */
function ToggleChip({ on, label, onToggle, title }: { on: boolean; label: string; onToggle: () => void; title?: string }) {
  return (
    <div
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        userSelect: 'none',
        padding: '0 10px',
        borderRadius: 8,
        background: on ? 'rgba(0, 196, 255, 0.1)' : 'rgba(30, 41, 59, 0.3)',
        border: `1px solid ${on ? '#00c4ff' : 'rgba(148, 163, 184, 0.15)'}`,
        height: 32,
        boxSizing: 'border-box',
        transition: 'all 0.2s ease',
        boxShadow: on ? '0 0 10px rgba(0, 196, 255, 0.15)' : 'none',
      }}
      title={title}
    >
      <span style={{ fontSize: 10, color: on ? '#00c4ff' : '#94a3b8', fontWeight: 800, letterSpacing: '0.05em' }}>{label}</span>
      <div style={{
        width: 32,
        height: 18,
        borderRadius: 9,
        backgroundColor: on ? '#00c4ff' : '#1e293b',
        position: 'relative',
        transition: 'background-color 0.2s ease',
      }}>
        <div style={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          backgroundColor: '#fff',
          position: 'absolute',
          top: 2,
          left: on ? 16 : 2,
          transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }} />
      </div>
    </div>
  );
}

/** Settings of the active room: control mode, layout X/Y, fog of war. Renders nothing if no active room. */
export default function ActiveRoomSettings() {
  const {
    rooms, activeRoomId, controlMode, setControlMode, updateRoomLayoutPosition,
    fogOfWar, setFogOfWar, fogVisibilityDistance, setFogVisibilityDistance, fogKeepRevealed, setFogKeepRevealed,
  } = useEditorContext();

  const activeRoom = rooms.find((r) => r.id === activeRoomId);
  if (!activeRoom) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderLeft: '1px solid rgba(148, 163, 184, 0.15)', paddingLeft: 12, marginLeft: 'auto', flexWrap: 'wrap' }}>

      {/* Control Mode Segmented Buttons */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: CARD_STYLE.background,
        borderRadius: 8,
        border: CARD_STYLE.border,
        padding: 2,
        height: 32,
        boxSizing: 'border-box',
      }}>
        <ControlModeButton active={controlMode === 'all_rooms'} label="All Rooms" onClick={() => setControlMode('all_rooms')} />
        <ControlModeButton active={controlMode === 'selected_room'} label="Selected Room" onClick={() => setControlMode('selected_room')} />
      </div>

      {/* Unified Coordinates Card */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: CARD_STYLE.background,
        padding: '0 8px',
        borderRadius: 8,
        border: CARD_STYLE.border,
        height: 32,
        boxSizing: 'border-box',
      }}>
        <span style={{ fontSize: 10, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', marginRight: 4 }}>Room POS:</span>

        <span style={{ fontSize: 10, color: '#475569', fontWeight: 800 }}>X</span>
        <input
          type="number"
          value={activeRoom.x}
          onChange={(e) => updateRoomLayoutPosition(activeRoom.id, Number(e.target.value), activeRoom.y)}
          style={POS_INPUT_STYLE}
        />

        <span style={{ fontSize: 10, color: '#475569', fontWeight: 800, margin: '0 2px' }}>×</span>

        <span style={{ fontSize: 10, color: '#475569', fontWeight: 800 }}>Y</span>
        <input
          type="number"
          value={activeRoom.y}
          onChange={(e) => updateRoomLayoutPosition(activeRoom.id, activeRoom.x, Number(e.target.value))}
          style={POS_INPUT_STYLE}
        />
      </div>

      {/* FOW premium toggle container */}
      <ToggleChip on={fogOfWar} label="FOG OF WAR" onToggle={() => setFogOfWar(!fogOfWar)} />

      {/* Fog of War specific options */}
      {fogOfWar && (
        <>
          {/* Fog Visibility Distance Range Slider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: CARD_STYLE.background,
            padding: '0 12px',
            borderRadius: 8,
            border: CARD_STYLE.border,
            height: 32,
            boxSizing: 'border-box',
          }}>
            <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 800, whiteSpace: 'nowrap' }}>
              DIST: <span style={{ color: '#00c4ff', fontWeight: 'bold' }}>{fogVisibilityDistance}</span>
            </span>
            <input
              type="range"
              step="0.5"
              min="1"
              max="10"
              value={fogVisibilityDistance}
              onChange={(e) => setFogVisibilityDistance(Number(e.target.value))}
              style={{
                width: 70,
                accentColor: '#00c4ff',
                cursor: 'pointer',
                height: 4,
                borderRadius: 2,
                background: '#1e293b',
                outline: 'none',
              }}
            />
          </div>

          {/* FOW PERSIST toggle container */}
          <ToggleChip
            on={fogKeepRevealed}
            label="PERSIST"
            onToggle={() => setFogKeepRevealed(!fogKeepRevealed)}
            title="Daha önce açılan yerler hafif görünür kalmaya devam etsin mi? Kapatılırsa sadece anlık görüş alanındaki hücreler görünür, arkası tekrar tamamen kararır."
          />
        </>
      )}
    </div>
  );
}
