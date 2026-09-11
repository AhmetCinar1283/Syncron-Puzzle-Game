'use client';

import { NBtn, iStyle, Lbl } from '../EditorUI';
import type { GeneratorFormApi } from '../../hooks/useGeneratorForm';
import type { GeneratorForm } from '../../lib/generatorFilters';
import { GEN_SECTION_STYLE, GEN_SECTION_TITLE_STYLE } from './GeneratorGeneralSection';

/** Group 1.5: multi-room generation settings. */
export default function GeneratorRoomsSection({ g }: { g: GeneratorFormApi }) {
  const { form, update } = g;
  const {
    numRooms, roomPlacementMode, roomPortalConnection, playerDistribution, controlModeSelect,
    roomFogMode, roomFogVisibility, roomFogPersist,
  } = form;

  return (
    <div style={GEN_SECTION_STYLE}>
      <span style={GEN_SECTION_TITLE_STYLE}>1.5. Multiple Rooms Settings</span>

      {/* Number of Rooms */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Lbl style={{ margin: 0 }}>Room Count</Lbl>
          <span style={{ fontSize: 10, color: '#00c4ff', fontWeight: 'bold' }}>{numRooms} {numRooms === 1 ? 'Room' : 'Rooms'}</span>
        </div>
        <input
          type="range" min={1} max={4} step={1}
          value={numRooms}
          onChange={(e) => update({ numRooms: Number(e.target.value) })}
          style={{ width: '100%', accentColor: '#00c4ff' }}
        />
      </div>

      {numRooms > 1 && (
        <>
          {/* Room Placement & Portal Connections */}
          <div style={{ display: 'flex', gap: 14 }}>
            <div style={{ flex: 1 }}>
              <Lbl>Placement Mode</Lbl>
              <div style={{ display: 'flex', gap: 3 }}>
                {(['grid', 'random'] as const).map((mode) => (
                  <NBtn key={mode} onClick={() => update({ roomPlacementMode: mode })} active={roomPlacementMode === mode} color="#00c4ff" style={{ flex: 1, padding: '5px 1px', fontSize: 8, textTransform: 'uppercase' }}>
                    {mode}
                  </NBtn>
                ))}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <Lbl>Portal Connections</Lbl>
              <div style={{ display: 'flex', gap: 3 }}>
                {(['connected', 'disconnected', 'random'] as const).map((mode) => (
                  <NBtn key={mode} onClick={() => update({ roomPortalConnection: mode })} active={roomPortalConnection === mode} color="#00c4ff" style={{ flex: 1, padding: '5px 1px', fontSize: 7, textTransform: 'uppercase' }}>
                    {mode === 'disconnected' ? 'None' : mode}
                  </NBtn>
                ))}
              </div>
            </div>
          </div>

          {/* Player Distribution & Control Mode */}
          <div style={{ display: 'flex', gap: 14 }}>
            <div style={{ flex: 1 }}>
              <Lbl>Player Distribution</Lbl>
              <div style={{ display: 'flex', gap: 3 }}>
                {(['same_room', 'random_rooms'] as const).map((dist) => (
                  <NBtn key={dist} onClick={() => update({ playerDistribution: dist })} active={playerDistribution === dist} color="#00c4ff" style={{ flex: 1, padding: '5px 1px', fontSize: 8, textTransform: 'uppercase' }}>
                    {dist === 'same_room' ? 'Same' : 'Random'}
                  </NBtn>
                ))}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <Lbl>Movement Sync Mode</Lbl>
              <div style={{ display: 'flex', gap: 3 }}>
                {(['all_rooms', 'selected_room', 'random'] as const).map((mode) => (
                  <NBtn key={mode} onClick={() => update({ controlModeSelect: mode })} active={controlModeSelect === mode} color="#00c4ff" style={{ flex: 1, padding: '5px 1px', fontSize: 7, textTransform: 'uppercase' }}>
                    {mode === 'all_rooms' ? 'Sync' : mode === 'selected_room' ? 'Single' : 'Rand'}
                  </NBtn>
                ))}
              </div>
            </div>
          </div>

          {/* Fog of War Mode & Visibility Distance */}
          <div style={{ display: 'flex', gap: 14 }}>
            <div style={{ flex: 1 }}>
              <Lbl>Fog of War Mode</Lbl>
              <select
                value={roomFogMode}
                onChange={(e) => update({ roomFogMode: e.target.value as GeneratorForm['roomFogMode'] })}
                style={{ ...iStyle, width: '100%', background: '#060d1a', border: '1px solid rgba(30,58,95,0.5)', height: 28, fontSize: 10 }}
              >
                <option value="all_light">All Light</option>
                <option value="all_dark">All Dark</option>
                <option value="random">Random Per Room</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <Lbl>Visibility Distance</Lbl>
              <select
                value={roomFogVisibility}
                onChange={(e) => {
                  const val = e.target.value;
                  update({ roomFogVisibility: isNaN(Number(val)) ? val : Number(val) });
                }}
                style={{ ...iStyle, width: '100%', background: '#060d1a', border: '1px solid rgba(30,58,95,0.5)', height: 28, fontSize: 10 }}
              >
                <option value={1.0}>1.0 cells</option>
                <option value={1.5}>1.5 cells (Default)</option>
                <option value={2.0}>2.0 cells</option>
                <option value={2.5}>2.5 cells</option>
                <option value={3.0}>3.0 cells</option>
                <option value="random">Random</option>
              </select>
            </div>
          </div>

          {/* Fog Persistence */}
          <div>
            <Lbl>Keep Revealed (Fog Persistence)</Lbl>
            <div style={{ display: 'flex', gap: 3 }}>
              {(['yes', 'no', 'random'] as const).map((persist) => (
                <NBtn key={persist} onClick={() => update({ roomFogPersist: persist })} active={roomFogPersist === persist} color="#00c4ff" style={{ flex: 1, padding: '5px 1px', fontSize: 8, textTransform: 'uppercase' }}>
                  {persist === 'yes' ? 'Persistent' : persist === 'no' ? 'Temporary' : 'Random'}
                </NBtn>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
