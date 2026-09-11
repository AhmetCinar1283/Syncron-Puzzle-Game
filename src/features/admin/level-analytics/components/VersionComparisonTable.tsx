'use client';

import type { LevelStats } from '../lib/types';

/** SÜRÜM KARŞILAŞTIRMA DETAYLARI table inside the level detail modal. */
export function VersionComparisonTable({
  versionStats,
  currentVersion,
}: {
  versionStats: LevelStats[];
  currentVersion: number | undefined;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <h3 style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 2px 0', fontWeight: 800 }}>SÜRÜM KARŞILAŞTIRMA DETAYLARI</h3>
      <div style={{ background: 'rgba(15, 23, 42, 0.3)', border: '1px solid rgba(148, 163, 184, 0.05)', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.1)', color: '#94a3b8', background: 'rgba(30, 41, 59, 0.2)' }}>
              <th style={{ padding: '8px 10px', fontWeight: 700 }}>SÜRÜM</th>
              <th style={{ padding: '8px 10px', fontWeight: 700 }}>GİRİŞİM</th>
              <th style={{ padding: '8px 10px', fontWeight: 700 }}>BAŞARI</th>
              <th style={{ padding: '8px 10px', fontWeight: 700 }}>DROP-OFF</th>
              <th style={{ padding: '8px 10px', fontWeight: 700 }}>ÖLÜM (REST)</th>
              <th style={{ padding: '8px 10px', fontWeight: 700 }}>ORT. SÜRE</th>
              <th style={{ padding: '8px 10px', fontWeight: 700 }}>BEĞENİ</th>
              <th style={{ padding: '8px 10px', fontWeight: 700 }}>ZORLUK (K/N/Z)</th>
            </tr>
          </thead>
          <tbody>
            {versionStats.map((stats, idx) => {
              const total = stats.total_attempts;
              const dropOff = total > 0 ? (stats.quits / total) * 100 : 0;
              const wins = stats.wins;
              const avgDeaths = wins > 0 ? stats.total_deaths / wins : 0;
              const avgRestarts = wins > 0 ? stats.total_restarts / wins : 0;
              const avgTime = stats.avg_time_win ?? 0;
              const isCurrent = stats.version === currentVersion;

              const nextStats = versionStats[idx + 1];

              let dropOffDiffStr = '';
              let dropOffDiffColor = '#94a3b8';
              if (nextStats) {
                const prevTotal = nextStats.total_attempts;
                const prevDropOff = prevTotal > 0 ? (nextStats.quits / prevTotal) * 100 : 0;
                const diff = dropOff - prevDropOff;
                if (diff > 0.1) {
                  dropOffDiffStr = ` (↑+${diff.toFixed(0)}%)`;
                  dropOffDiffColor = '#ef4444';
                } else if (diff < -0.1) {
                  dropOffDiffStr = ` (↓${diff.toFixed(0)}%)`;
                  dropOffDiffColor = '#10b981';
                }
              }

              let likeDiffStr = '';
              let likeDiffColor = '#94a3b8';
              const currVotes = stats.likes + stats.dislikes;
              const currLikeRatio = currVotes > 0 ? (stats.likes / currVotes) * 100 : 100;
              if (nextStats) {
                const prevVotes = nextStats.likes + nextStats.dislikes;
                const prevLikeRatio = prevVotes > 0 ? (nextStats.likes / prevVotes) * 100 : 100;
                const diff = currLikeRatio - prevLikeRatio;
                if (diff > 0.1) {
                  likeDiffStr = ` (↑+${diff.toFixed(0)}%)`;
                  likeDiffColor = '#10b981';
                } else if (diff < -0.1) {
                  likeDiffStr = ` (↓${diff.toFixed(0)}%)`;
                  likeDiffColor = '#ef4444';
                }
              }

              let deathDiffStr = '';
              let deathDiffColor = '#94a3b8';
              if (nextStats) {
                const prevWins = nextStats.wins;
                const prevDeaths = prevWins > 0 ? nextStats.total_deaths / prevWins : 0;
                const diff = avgDeaths - prevDeaths;
                if (diff > 0.05) {
                  deathDiffStr = ` (↑+${diff.toFixed(1)})`;
                  deathDiffColor = '#ef4444';
                } else if (diff < -0.05) {
                  deathDiffStr = ` (↓${diff.toFixed(1)})`;
                  deathDiffColor = '#10b981';
                }
              }

              let timeDiffStr = '';
              let timeDiffColor = '#94a3b8';
              if (nextStats) {
                const prevTime = nextStats.avg_time_win ?? 0;
                const diff = avgTime - prevTime;
                if (diff > 0.1) {
                  timeDiffStr = ` (↑+${diff.toFixed(0)}s)`;
                  timeDiffColor = '#ef4444';
                } else if (diff < -0.1) {
                  timeDiffStr = ` (↓${diff.toFixed(0)}s)`;
                  timeDiffColor = '#10b981';
                }
              }

              return (
                <tr
                  key={stats.version}
                  style={{
                    borderBottom: '1px solid rgba(148, 163, 184, 0.04)',
                    background: isCurrent ? 'rgba(16, 185, 129, 0.03)' : 'transparent',
                  }}
                >
                  <td style={{ padding: '8px 10px', fontWeight: 800 }}>
                    v{stats.version} {isCurrent && <span style={{ color: '#10b981', fontSize: 9 }}>[AKTİF]</span>}
                  </td>
                  <td style={{ padding: '8px 10px' }}>{total}</td>
                  <td style={{ padding: '8px 10px', color: '#10b981', fontWeight: 700 }}>{wins}</td>
                  <td style={{ padding: '8px 10px', color: dropOff >= 60 ? '#ef4444' : '#10b981', fontWeight: 700 }}>
                    {total > 0 ? `${dropOff.toFixed(0)}%` : '-'}
                    {dropOffDiffStr && <span style={{ color: dropOffDiffColor, fontSize: 9, fontWeight: 800 }}>{dropOffDiffStr}</span>}
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    {wins > 0 ? `${avgDeaths.toFixed(0)} (${avgRestarts.toFixed(0)})` : '-'}
                    {deathDiffStr && <span style={{ color: deathDiffColor, fontSize: 9, fontWeight: 800 }}>{deathDiffStr}</span>}
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    {wins > 0 ? `${avgTime.toFixed(0)}s` : '-'}
                    {timeDiffStr && <span style={{ color: timeDiffColor, fontSize: 9, fontWeight: 800 }}>{timeDiffStr}</span>}
                  </td>
                  <td style={{ padding: '8px 10px', color: '#ffd700', fontWeight: 700 }}>
                    {stats.likes + stats.dislikes > 0
                      ? `${((stats.likes / (stats.likes + stats.dislikes)) * 100).toFixed(0)}%`
                      : '-'
                    }
                    {likeDiffStr && <span style={{ color: likeDiffColor, fontSize: 9, fontWeight: 800 }}>{likeDiffStr}</span>}
                  </td>
                  <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', fontWeight: 700 }}>
                    <span style={{ color: '#10b981' }}>{stats.votes_easy}</span>/
                    <span style={{ color: '#00c4ff' }}>{stats.votes_normal}</span>/
                    <span style={{ color: '#ef4444' }}>{stats.votes_hard}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
