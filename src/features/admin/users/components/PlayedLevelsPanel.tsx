'use client';

import type { PlayedLevelEntry, PlayedLevelSort } from '../lib/types';
import { GameIcon } from '@/components/icons';

export function PlayedLevelsPanel({
  playedLevels,
  sortedLevels,
  playedSort,
  setPlayedSort,
  isTr,
}: {
  playedLevels: PlayedLevelEntry[];
  sortedLevels: PlayedLevelEntry[];
  playedSort: PlayedLevelSort;
  setPlayedSort: (s: PlayedLevelSort) => void;
  isTr: boolean;
}) {
  return (
    <section
      style={{
        background: 'rgba(255, 255, 255, 0.01)',
        border: '1px solid rgba(147, 51, 234, 0.12)',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 800, letterSpacing: '0.1em', color: '#9333ea', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
          <GameIcon name="flag" size={14} color="#9333ea" />
          <span>{isTr ? 'OYNANAN SEVİYELER' : 'PLAYED LEVELS SUBGRID'}</span>
        </h3>

        {/* Sort buttons */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {(['date', 'stars', 'time'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setPlayedSort(s)}
              style={{
                background: playedSort === s ? 'rgba(147,51,234,0.15)' : 'transparent',
                border: '1px solid ' + (playedSort === s ? '#9333ea' : 'rgba(255,255,255,0.06)'),
                color: playedSort === s ? '#9333ea' : '#475569',
                fontSize: '9px',
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: '5px',
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
            >
              {s === 'date' ? (isTr ? 'Tarih' : 'Date') : s === 'stars' ? (isTr ? 'Yıldız' : 'Stars') : isTr ? 'Süre' : 'Time'}
            </button>
          ))}
        </div>
      </div>

      {playedLevels.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '140px', color: '#475569', fontSize: '12px' }}>
          {isTr ? 'Henüz hiçbir oyun seviyesi tamamlanmadı.' : 'No completed levels found.'}
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            maxHeight: '220px',
            overflowY: 'auto',
            paddingRight: '4px',
          }}
        >
          {sortedLevels.map((lvl) => {
            const starsString = Array.from({ length: 3 }, (_, i) => (
              <GameIcon
                key={i}
                name="star"
                size={12}
                color={i < lvl.stars ? '#ffd700' : 'rgba(255,255,255,0.1)'}
              />
            ));

            return (
              <div
                key={lvl.levelId}
                style={{
                  background: 'rgba(255,255,255,0.01)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontWeight: 700, color: '#e2e8f0' }}>{lvl.levelId}</span>
                  <span style={{ fontSize: '10px', color: '#475569' }}>
                    {lvl.completedAt ? new Date(lvl.completedAt).toLocaleDateString(isTr ? 'tr-TR' : 'en-US') : ''}
                  </span>
                </div>

                {/* Center stars */}
                <div style={{ fontSize: '13px', display: 'flex', gap: '2px' }}>{starsString}</div>

                {/* Right hand score / time metrics */}
                <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: '#94a3b8' }}>
                  {lvl.timeSpent !== null && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <GameIcon name="timer" size={11} color="#94a3b8" />
                      <b>{lvl.timeSpent}s</b>
                    </span>
                  )}
                  {lvl.moveCount !== null && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <GameIcon name="footsteps" size={11} color="#94a3b8" />
                      <b>{lvl.moveCount}</b>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
