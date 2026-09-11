'use client';

import type { AlertRule } from '@/services/firebase/adminLevelAnalytics';
import { getMetricValue } from '../lib/ruleEngine';
import { TREND_METRICS } from '../lib/types';
import type { LevelStats, MetricKey } from '../lib/types';

export function MultiLineChart({
  history,
  selectedMetrics,
  alertRules,
}: {
  history: LevelStats[];
  selectedMetrics: string[];
  alertRules: AlertRule[];
}) {
  const sorted = [...history].sort((a, b) => a.version - b.version);

  const allValues: number[] = [];
  sorted.forEach((h) => {
    selectedMetrics.forEach((m) => {
      allValues.push(getMetricValue(h, m as MetricKey));
    });
  });

  const thresholds: { metric: string; val: number; color: string; ruleName: string }[] = [];
  selectedMetrics.forEach((m) => {
    const activeRulesForMetric = alertRules.filter(
      (r) => r.isActive && r.conditions.some((c) => c.metric === m)
    );
    activeRulesForMetric.forEach((rule) => {
      const cond = rule.conditions.find((c) => c.metric === m);
      if (cond) {
        allValues.push(cond.value);
        thresholds.push({
          metric: m,
          val: cond.value,
          color: TREND_METRICS.find((tm) => tm.key === m)?.color ?? '#ef4444',
          ruleName: rule.name,
        });
      }
    });
  });

  const rawMax = Math.max(...allValues, 10);
  const yMax = Math.ceil(rawMax * 1.15);

  const width = 500;
  const height = 180;
  const paddingTop = 20;
  const paddingBottom = 25;
  const paddingLeft = 35;
  const paddingRight = 20;

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  const xStep = sorted.length > 1 ? chartW / (sorted.length - 1) : chartW;

  const getX = (index: number) => paddingLeft + index * xStep;
  const getY = (value: number) => paddingTop + chartH - (value / yMax) * chartH;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
      <div style={{ background: 'rgba(30, 41, 59, 0.15)', borderRadius: 12, padding: 12, border: '1px solid rgba(148, 163, 184, 0.05)' }}>
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
          {/* Y Axis Grid and Labels */}
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
                  fontSize="8"
                  fontWeight="700"
                  textAnchor="end"
                >
                  {Math.round(gridVal)}
                </text>
              </g>
            );
          })}

          {/* Active thresholds guide lines */}
          {thresholds.map((t, idx) => (
            <g key={`${t.metric}-${idx}`}>
              <line
                x1={paddingLeft}
                y1={getY(t.val)}
                x2={width - paddingRight}
                y2={getY(t.val)}
                stroke={t.color}
                strokeWidth="1.2"
                strokeDasharray="3 3"
                opacity={0.6}
              />
              <text
                x={width - paddingRight - 6}
                y={getY(t.val) - 4}
                fill={t.color}
                fontSize="8"
                fontWeight="900"
                textAnchor="end"
                style={{ opacity: 0.85 }}
              >
                Limit: {t.val}
              </text>
            </g>
          ))}

          {/* Metric lines & dots */}
          {sorted.length > 0 && selectedMetrics.map((metricKey) => {
            const metricDef = TREND_METRICS.find((tm) => tm.key === metricKey);
            if (!metricDef) return null;

            let pathD = '';
            sorted.forEach((h, idx) => {
              const x = getX(idx);
              const val = getMetricValue(h, metricKey as MetricKey);
              const y = getY(val);
              if (idx === 0) {
                pathD = `M ${x} ${y}`;
              } else {
                pathD += ` L ${x} ${y}`;
              }
            });

            return (
              <g key={metricKey}>
                {pathD && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke={metricDef.color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ filter: `drop-shadow(0 0 4px ${metricDef.glow})` }}
                  />
                )}
                {sorted.map((h, idx) => {
                  const val = getMetricValue(h, metricKey as MetricKey);
                  return (
                    <g key={idx}>
                      <circle
                        cx={getX(idx)}
                        cy={getY(val)}
                        r="4"
                        fill={metricDef.color}
                        stroke="#030712"
                        strokeWidth="1.5"
                      />
                      <text
                        x={getX(idx)}
                        y={getY(val) - 8}
                        fill="#fff"
                        fontSize="7.5"
                        fontWeight="900"
                        textAnchor="middle"
                        style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}
                      >
                        {val.toFixed(val % 1 === 0 ? 0 : 1)}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>

        {/* X Axis versions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: paddingLeft, paddingRight: paddingRight, paddingTop: 4, fontSize: 9, color: '#64748b', fontWeight: 800, borderTop: '1px solid rgba(148, 163, 184, 0.08)' }}>
          {sorted.map((h, idx) => (
            <span key={idx}>v{h.version}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
