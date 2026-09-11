'use client';

import { NBtn, iStyle, Lbl } from '../EditorUI';
import type { GeneratorFormApi } from '../../hooks/useGeneratorForm';
import { GEN_SECTION_STYLE, GEN_SECTION_TITLE_STYLE } from './GeneratorGeneralSection';

/** Group 2: player count, movement mode, lock-on-target, trail collision. */
export default function GeneratorPlayersSection({ g }: { g: GeneratorFormApi }) {
  const { form, update } = g;
  const { playerCount, playerMode, playerLock, trailCollision } = form;

  return (
    <div style={GEN_SECTION_STYLE}>
      <span style={GEN_SECTION_TITLE_STYLE}>2. Player & Entity Settings</span>

      {/* Players Count Dropdown */}
      <div>
        <Lbl>Player Count (Specific count or random range)</Lbl>
        <select
          value={playerCount}
          onChange={(e) => {
            const val = e.target.value;
            if (!isNaN(Number(val))) {
              update({ playerCount: Number(val) });
            } else {
              update({ playerCount: val });
            }
          }}
          style={{ ...iStyle, width: '100%', background: '#060d1a', border: '1px solid rgba(30,58,95,0.5)', height: 28, fontSize: 10 }}
        >
          <option value={1}>1 Player</option>
          <option value={2}>2 Players</option>
          <option value={3}>3 Players</option>
          <option value={4}>4 Players</option>
          <option value="1-2">Random 1-2 Players</option>
          <option value="2-3">Random 2-3 Players</option>
          <option value="2-4">Random 2-4 Players</option>
          <option value="3-4">Random 3-4 Players</option>
          <option value="1-4">Random 1-4 Players</option>
        </select>
      </div>

      {/* Player Behaviors: Directions & Locks */}
      <div style={{ display: 'flex', gap: 14 }}>
        <div style={{ flex: 1 }}>
          <Lbl>Player Movement Mode</Lbl>
          <div style={{ display: 'flex', gap: 3 }}>
            {(['normal', 'reversed', 'random'] as const).map((mode) => (
              <NBtn key={mode} onClick={() => update({ playerMode: mode })} active={playerMode === mode} color="#00c4ff" style={{ flex: 1, padding: '5px 1px', fontSize: 8, textTransform: 'uppercase' }}>
                {mode === 'reversed' ? 'Rev' : mode}
              </NBtn>
            ))}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <Lbl>Lock Target On Reach</Lbl>
          <div style={{ display: 'flex', gap: 3 }}>
            {(['lock', 'nolock', 'random'] as const).map((lock) => (
              <NBtn key={lock} onClick={() => update({ playerLock: lock })} active={playerLock === lock} color="#00c4ff" style={{ flex: 1, padding: '5px 1px', fontSize: 8, textTransform: 'uppercase' }}>
                {lock === 'nolock' ? 'NoLock' : lock}
              </NBtn>
            ))}
          </div>
        </div>
      </div>

      {/* Trail Collision Row */}
      <div>
        <Lbl>Trail Collision</Lbl>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['yes', 'no', 'random'] as const).map((tc) => (
            <NBtn key={tc} onClick={() => update({ trailCollision: tc })} active={trailCollision === tc} color="#00c4ff" style={{ flex: 1, padding: '4px 2px', fontSize: 9, textTransform: 'capitalize' }}>
              {tc}
            </NBtn>
          ))}
        </div>
      </div>
    </div>
  );
}
