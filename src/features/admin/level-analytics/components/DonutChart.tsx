'use client';

export function DonutChart({ wins, quits }: { wins: number; quits: number }) {
  const total = wins + quits;
  const winPercentage = total > 0 ? Math.round((wins / total) * 100) : 0;

  const radius = 32;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (winPercentage / 100) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, flex: 1 }}>
      <div style={{ position: 'relative', width: 90, height: 90 }}>
        <svg width="90" height="90" viewBox="0 0 90 90" style={{ transform: 'rotate(-90deg)' }}>
          {/* Base/Quit circle */}
          <circle
            cx="45"
            cy="45"
            r={radius}
            fill="transparent"
            stroke={total > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(148, 163, 184, 0.1)'}
            strokeWidth={strokeWidth}
          />
          {total > 0 && (
            <circle
              cx="45"
              cy="45"
              r={radius}
              fill="transparent"
              stroke="#ef4444"
              strokeWidth={strokeWidth}
            />
          )}
          {/* Win circle progress overlay */}
          {total > 0 && (
            <circle
              cx="45"
              cy="45"
              r={radius}
              fill="transparent"
              stroke="#10b981"
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.22, 1, 0.36, 1)', filter: 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.4))' }}
            />
          )}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 15, fontWeight: 900, color: total > 0 ? '#10b981' : '#64748b' }}>
            {winPercentage}%
          </span>
          <span style={{ fontSize: 8, color: '#64748b', fontWeight: 800, letterSpacing: '0.04em' }}>PASS RATE</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', fontSize: 10, color: '#94a3b8', fontWeight: 700 }}>
        <span style={{ color: '#10b981' }}>● KAZANMA: {wins}</span>
        <span style={{ color: '#ef4444' }}>● PES ETME: {quits}</span>
      </div>
    </div>
  );
}
