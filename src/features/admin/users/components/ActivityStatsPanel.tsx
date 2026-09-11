'use client';

import { CATEGORY_DETAILS, type AuditLogStat } from '../lib/types';

export function ActivityStatsPanel({
  stats,
  lastActivity,
  isTr,
}: {
  stats: AuditLogStat[];
  lastActivity: string | null;
  isTr: boolean;
}) {
  const totalLogs = stats.reduce((acc, curr) => acc + curr.count, 0);
  let accumulatedAngle = 0;

  return (
    <section
      style={{
        background: 'rgba(255, 255, 255, 0.01)',
        border: '1px solid rgba(147, 51, 234, 0.12)',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 800, letterSpacing: '0.1em', color: '#9333ea', textTransform: 'uppercase' }}>
        📊 {isTr ? 'KATEGORİSEL ETKİNLİK' : 'ACTIVITY STATISTICS'}
      </h3>

      {totalLogs === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: '160px', color: '#475569', fontSize: '12px' }}>
          {isTr ? 'Etkinlik istatistiği mevcut değil.' : 'No activity logged yet.'}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>
          {/* Premium Glowing SVG Donut Chart */}
          <div style={{ width: '130px', height: '130px', position: 'relative' }}>
            <svg width="100%" height="100%" viewBox="0 0 42 42">
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="rgba(255,255,255,0.02)" strokeWidth="3" />
              {stats.map((st) => {
                const percent = (st.count / totalLogs) * 100;
                const strokeDasharray = `${percent} ${100 - percent}`;
                const strokeDashoffset = 100 - accumulatedAngle + 25; // 25 is offset to start from top
                accumulatedAngle += percent;
                const catColor = CATEGORY_DETAILS[st.category]?.color || '#ffffff';

                return (
                  <circle
                    key={st.category}
                    cx="21"
                    cy="21"
                    r="15.915"
                    fill="transparent"
                    stroke={catColor}
                    strokeWidth="3.2"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    style={{
                      transition: 'stroke-width 0.2s',
                      filter: `drop-shadow(0 0 2px ${catColor})`,
                    }}
                  />
                );
              })}
            </svg>
            {/* Summary counter inside ring */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontSize: '18px', fontWeight: 900, color: '#f1f5f9' }}>{totalLogs}</span>
              <span style={{ fontSize: '8px', color: '#64748b', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {isTr ? 'ETKİNLİK' : 'EVENTS'}
              </span>
            </div>
          </div>

          {/* Legend / Custom Horizontal Bar list */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '160px' }}>
            {stats.map((st) => {
              const percent = Math.round((st.count / totalLogs) * 100);
              const details = CATEGORY_DETAILS[st.category];
              if (!details) return null;

              return (
                <div key={st.category} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: details.color }} />
                      <span style={{ color: '#94a3b8', fontWeight: 600 }}>{details.label[isTr ? 'tr' : 'en']}</span>
                    </div>
                    <span style={{ color: '#64748b' }}>
                      {st.count} ({percent}%)
                    </span>
                  </div>
                  <div style={{ height: '3px', background: 'rgba(255,255,255,0.02)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${percent}%`, background: details.color, boxShadow: details.glow }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Last Active Timestamp highlighted */}
      {lastActivity && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            background: 'rgba(147, 51, 234, 0.05)',
            border: '1px solid rgba(147, 51, 234, 0.12)',
            borderRadius: '8px',
            fontSize: '11px',
            color: '#94a3b8',
          }}
        >
          <span style={{ color: '#9333ea', textShadow: '0 0 6px #9333ea' }}>●</span>
          <span>
            {isTr ? 'Son Aktiflik Zamanı:' : 'Last System Activity at:'}{' '}
            <b>{new Date(lastActivity).toLocaleString(isTr ? 'tr-TR' : 'en-US')}</b>
          </span>
        </div>
      )}
    </section>
  );
}
