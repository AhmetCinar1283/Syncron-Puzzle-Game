'use client';

import type { AlertRule } from '@/services/firebase/adminLevelAnalytics';
import { checkRuleViolation, getMetricValue } from '../lib/ruleEngine';
import { TREND_METRICS } from '../lib/types';
import type { LevelStats, MetricKey, StoredLevelInfo } from '../lib/types';

export function MainComparisonChart({
  levels,
  analytics,
  metricKey,
  alertRules,
  onLevelClick,
}: {
  levels: StoredLevelInfo[];
  analytics: LevelStats[];
  metricKey: MetricKey;
  alertRules: AlertRule[];
  onLevelClick: (levelId: string) => void;
}) {
  const getLevelMetricValue = (level: StoredLevelInfo) => {
    const stats = analytics.find((a) => a.level_id === level.firestoreId && a.version === level.version);
    if (!stats) return 0;
    return getMetricValue(stats, metricKey);
  };

  const getMetricColor = (key: string) => {
    const tm = TREND_METRICS.find((m) => m.key === key);
    return tm ? tm.color : '#10b981';
  };

  const getMetricGlow = (key: string) => {
    const tm = TREND_METRICS.find((m) => m.key === key);
    return tm ? tm.glow : 'rgba(16, 185, 129, 0.4)';
  };

  const metricValues = levels.map(getLevelMetricValue);
  const activeRulesForMetric = alertRules.filter(
    (r) => r.isActive && r.conditions.some((c) => c.metric === metricKey)
  );
  const thresholdValues = activeRulesForMetric
    .map((r) => r.conditions.find((c) => c.metric === metricKey)?.value)
    .filter((v): v is number => v !== undefined);

  const rawMax = Math.max(...metricValues, ...thresholdValues, 10);
  const yMax = Math.ceil(rawMax * 1.15);

  const width = 800;
  const height = 300;
  const paddingTop = 25;
  const paddingBottom = 65;
  const paddingLeft = 45;
  const paddingRight = 20;

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  const xStep = levels.length > 0 ? chartW / levels.length : chartW;
  const barWidth = levels.length > 0 ? Math.max(xStep * 0.65, 8) : 15;

  const getX = (index: number) => paddingLeft + index * xStep + (xStep - barWidth) / 2;
  const getY = (value: number) => paddingTop + chartH - (value / yMax) * chartH;

  const metricColor = getMetricColor(metricKey);
  const metricGlow = getMetricGlow(metricKey);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
      <div style={{ background: 'rgba(30, 41, 59, 0.15)', borderRadius: 16, padding: 16, border: '1px solid rgba(148, 163, 184, 0.05)', overflowX: 'auto' }}>
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ minWidth: 600 }}>
          {[0, 0.25, 0.5, 0.75, 1].map((pRatio) => {
            const gridVal = pRatio * yMax;
            return (
              <g key={pRatio}>
                <line
                  x1={paddingLeft}
                  y1={getY(gridVal)}
                  x2={width - paddingRight}
                  y2={getY(gridVal)}
                  stroke="rgba(148, 163, 184, 0.05)"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 6}
                  y={getY(gridVal) + 3}
                  fill="#64748b"
                  fontSize="8.5"
                  fontWeight="800"
                  textAnchor="end"
                >
                  {Math.round(gridVal)}
                </text>
              </g>
            );
          })}

          {thresholdValues.map((tVal, idx) => (
            <g key={idx}>
              <line
                x1={paddingLeft}
                y1={getY(tVal)}
                x2={width - paddingRight}
                y2={getY(tVal)}
                stroke="#ef4444"
                strokeWidth="1.2"
                strokeDasharray="4 4"
                opacity={0.8}
              />
              <text
                x={width - paddingRight - 6}
                y={getY(tVal) - 4}
                fill="#ef4444"
                fontSize="8.5"
                fontWeight="900"
                textAnchor="end"
              >
                Eşik: {tVal}
              </text>
            </g>
          ))}

          {levels.map((level, idx) => {
            const val = getLevelMetricValue(level);
            const x = getX(idx);
            const y = getY(val);
            const barH = chartH - (y - paddingTop);

            const latestStats = analytics.find((a) => a.level_id === level.firestoreId && a.version === level.version);
            const isViolated = latestStats ? alertRules.some((r) => r.isActive && checkRuleViolation(r, latestStats)) : false;

            return (
              <g key={level.firestoreId}>
                {val > 0 && (
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barH}
                    fill={metricColor}
                    rx="4"
                    opacity={0.15}
                    style={{
                      filter: `blur(4px)`,
                    }}
                  />
                )}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={Math.max(barH, 1)}
                  fill={isViolated ? '#ef4444' : metricColor}
                  rx="4"
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onClick={() => onLevelClick(level.firestoreId)}
                />

                {val > 0 && (
                  <text
                    x={x + barWidth / 2}
                    y={y - 6}
                    fill="#fff"
                    fontSize="8.5"
                    fontWeight="900"
                    textAnchor="middle"
                    style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.8))' }}
                  >
                    {val.toFixed(val % 1 === 0 ? 0 : 1)}
                  </text>
                )}

                <text
                  x={x + barWidth / 2}
                  y={paddingTop + chartH + 15}
                  transform={`rotate(-28, ${x + barWidth / 2}, ${paddingTop + chartH + 15})`}
                  fill={isViolated ? '#f87171' : '#94a3b8'}
                  fontSize="8.5"
                  fontWeight="850"
                  textAnchor="end"
                  style={{ cursor: 'pointer' }}
                  onClick={() => onLevelClick(level.firestoreId)}
                >
                  {isViolated ? '⚠️ ' : ''}{level.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
