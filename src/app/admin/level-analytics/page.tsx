'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db as firestoreDb } from '@/services/firebase/config';
import { useT } from '@/contexts/LanguageContext';

// Types for data models
interface LevelStats {
  level_id: string;
  version: number;
  total_attempts: number;
  wins: number;
  quits: number;
  total_restarts: number;
  total_deaths: number;
  avg_time_win: number;
  likes: number;
  dislikes: number;
  votes_easy: number;
  votes_normal: number;
  votes_hard: number;
}

interface AlertCondition {
  metric: 'dropOff' | 'avgDeaths' | 'avgRestarts' | 'avgTime' | 'likeRatio';
  operator: '>' | '<' | '>=' | '<=' | '==';
  value: number;
  connector?: 'AND' | 'OR';
}

interface AlertRule {
  id: string;
  name: string;
  conditions: AlertCondition[];
  isActive: boolean;
}

interface StoredLevelInfo {
  firestoreId: string;
  name: string;
  part: string;
  position: number;
  version?: number;
  difficulty?: number;
  width?: number;
  height?: number;
  creatorName?: string;
  gameNotes?: string;
  creatorNotes?: string;
  createdAt?: number;
  updatedAt?: number;
}

const METRIC_LABELS = {
  dropOff: 'Drop-off Oranı (%)',
  avgDeaths: 'Ortalama Ölüm Sayısı',
  avgRestarts: 'Ortalama Restart Sayısı',
  avgTime: 'Ortalama Süre (sn)',
  likeRatio: 'Beğeni Oranı (%)',
};

const TREND_METRICS = [
  { key: 'dropOff', label: 'Drop-off Oranı (%)', color: '#10b981', glow: 'rgba(16, 185, 129, 0.4)' },
  { key: 'likeRatio', label: 'Beğeni Oranı (%)', color: '#ffd700', glow: 'rgba(255, 215, 0, 0.4)' },
  { key: 'avgDeaths', label: 'Ort. Ölüm Sayısı', color: '#ef4444', glow: 'rgba(239, 68, 68, 0.4)' },
  { key: 'avgRestarts', label: 'Ort. Restart Sayısı', color: '#f97316', glow: 'rgba(249, 115, 22, 0.4)' },
  { key: 'avgTime', label: 'Ort. Süre (sn)', color: '#06b6d4', glow: 'rgba(6, 182, 212, 0.4)' },
  { key: 'totalAttempts', label: 'Toplam Girişim', color: '#6366f1', glow: 'rgba(99, 102, 241, 0.4)' },
];

const OPERATORS = ['>', '<', '>=', '<=', '=='];

// ─── SVG Chart Components ─────────────────────────────────────────────────────

function DonutChart({ wins, quits }: { wins: number; quits: number }) {
  const t = useT();
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

function BarChart({ easy, normal, hard }: { easy: number; normal: number; hard: number }) {
  const total = easy + normal + hard;
  const maxVal = Math.max(easy, normal, hard, 1);
  const getPercent = (val: number) => (val / maxVal) * 100;

  const items = [
    { label: 'KOLAY', value: easy, color: '#10b981', glow: 'rgba(16, 185, 129, 0.3)' },
    { label: 'NORMAL', value: normal, color: '#00c4ff', glow: 'rgba(0, 196, 255, 0.3)' },
    { label: 'ZOR', value: hard, color: '#ef4444', glow: 'rgba(239, 68, 68, 0.3)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
      <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 800, margin: 0, textAlign: 'center', letterSpacing: '0.06em' }}>
        ZORLUK ANKETİ ({total} OY)
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'rgba(30, 41, 59, 0.15)', padding: 10, borderRadius: 12, border: '1px solid rgba(148, 163, 184, 0.05)' }}>
        {items.map((item) => {
          const pct = getPercent(item.value);
          return (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10 }}>
              <span style={{ width: 45, color: '#94a3b8', fontWeight: 700 }}>{item.label}</span>
              <div style={{ flex: 1, height: 8, background: 'rgba(15, 23, 42, 0.6)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: item.color,
                  borderRadius: 4,
                  boxShadow: `0 0 8px ${item.glow}`,
                  transition: 'width 0.6s cubic-bezier(0.22, 1, 0.36, 1)'
                }} />
              </div>
              <span style={{ width: 20, textAlign: 'right', fontWeight: 800, color: item.value > 0 ? '#fff' : '#4b5563' }}>{item.value}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MultiLineChart({
  history,
  selectedMetrics,
  alertRules,
}: {
  history: LevelStats[];
  selectedMetrics: string[];
  alertRules: AlertRule[];
}) {
  const sorted = [...history].sort((a, b) => a.version - b.version);

  const getMetricValue = (h: LevelStats, metricKey: string): number => {
    switch (metricKey) {
      case 'dropOff':
        return h.total_attempts > 0 ? (h.quits / h.total_attempts) * 100 : 0;
      case 'likeRatio': {
        const totalVotes = h.likes + h.dislikes;
        return totalVotes > 0 ? (h.likes / totalVotes) * 100 : 100;
      }
      case 'avgDeaths':
        return h.wins > 0 ? h.total_deaths / h.wins : 0;
      case 'avgRestarts':
        return h.wins > 0 ? h.total_restarts / h.wins : 0;
      case 'avgTime':
        return h.avg_time_win ?? 0;
      case 'totalAttempts':
        return h.total_attempts;
      default:
        return 0;
    }
  };

  const allValues: number[] = [];
  sorted.forEach((h) => {
    selectedMetrics.forEach((m) => {
      allValues.push(getMetricValue(h, m));
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
              const val = getMetricValue(h, metricKey);
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
                  const val = getMetricValue(h, metricKey);
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

const checkRuleViolation = (rule: AlertRule, stats: LevelStats) => {
  if (!rule.isActive || rule.conditions.length === 0) return false;

  const evalCond = (cond: AlertCondition) => {
    let val = 0;
    if (cond.metric === 'dropOff') {
      val = stats.total_attempts > 0 ? (stats.quits / stats.total_attempts) * 100 : 0;
    } else if (cond.metric === 'avgDeaths') {
      val = stats.wins > 0 ? stats.total_deaths / stats.wins : 0;
    } else if (cond.metric === 'avgRestarts') {
      val = stats.wins > 0 ? stats.total_restarts / stats.wins : 0;
    } else if (cond.metric === 'avgTime') {
      val = stats.avg_time_win ?? 0;
    } else if (cond.metric === 'likeRatio') {
      const totalVotes = stats.likes + stats.dislikes;
      val = totalVotes > 0 ? (stats.likes / totalVotes) * 100 : 100;
    }

    switch (cond.operator) {
      case '>': return val > cond.value;
      case '<': return val < cond.value;
      case '>=': return val >= cond.value;
      case '<=': return val <= cond.value;
      case '==': return val === cond.value;
      default: return false;
    }
  };

  let isViolated = evalCond(rule.conditions[0]);

  for (let i = 0; i < rule.conditions.length - 1; i++) {
    const cond = rule.conditions[i];
    const nextCond = rule.conditions[i + 1];
    const connector = cond.connector || 'AND';
    const nextResult = evalCond(nextCond);

    if (connector === 'AND') {
      isViolated = isViolated && nextResult;
    } else {
      isViolated = isViolated || nextResult;
    }
  }

  return isViolated;
};

function MainComparisonChart({
  levels,
  analytics,
  metricKey,
  alertRules,
  onLevelClick,
}: {
  levels: StoredLevelInfo[];
  analytics: LevelStats[];
  metricKey: 'dropOff' | 'likeRatio' | 'avgDeaths' | 'avgRestarts' | 'avgTime' | 'totalAttempts';
  alertRules: AlertRule[];
  onLevelClick: (levelId: string) => void;
}) {
  const getLevelMetricValue = (level: StoredLevelInfo) => {
    const stats = analytics.find((a) => a.level_id === level.firestoreId && a.version === level.version);
    if (!stats) return 0;
    switch (metricKey) {
      case 'dropOff':
        return stats.total_attempts > 0 ? (stats.quits / stats.total_attempts) * 100 : 0;
      case 'likeRatio': {
        const totalVotes = stats.likes + stats.dislikes;
        return totalVotes > 0 ? (stats.likes / totalVotes) * 100 : 100;
      }
      case 'avgDeaths':
        return stats.wins > 0 ? stats.total_deaths / stats.wins : 0;
      case 'avgRestarts':
        return stats.wins > 0 ? stats.total_restarts / stats.wins : 0;
      case 'avgTime':
        return stats.avg_time_win ?? 0;
      case 'totalAttempts':
        return stats.total_attempts;
      default:
        return 0;
    }
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

function LevelDetailModal({
  selectedLevelId,
  onClose,
  levels,
  analytics,
  alertRules,
  selectedTrendMetrics,
  setSelectedTrendMetrics,
}: {
  selectedLevelId: string;
  onClose: () => void;
  levels: StoredLevelInfo[];
  analytics: LevelStats[];
  alertRules: AlertRule[];
  selectedTrendMetrics: string[];
  setSelectedTrendMetrics: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const selectedLevel = levels.find((l) => l.firestoreId === selectedLevelId);
  if (!selectedLevel) return null;

  const versionStats = analytics
    .filter((a) => a.level_id === selectedLevelId)
    .sort((a, b) => b.version - a.version);

  const latestStats = analytics.find(
    (a) => a.level_id === selectedLevelId && a.version === selectedLevel.version
  );

  const getActiveThreshold = (metric: 'dropOff' | 'likeRatio') => {
    const activeRule = alertRules.find((r) =>
      r.isActive && r.conditions.some((c) => c.metric === metric)
    );
    return activeRule?.conditions.find((c) => c.metric === metric)?.value;
  };

  const dropOffThreshold = getActiveThreshold('dropOff');

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(3, 7, 18, 0.85)',
        backdropFilter: 'blur(8px)',
        padding: '24px',
        boxSizing: 'border-box',
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 1050,
          maxHeight: '90vh',
          overflowY: 'auto',
          background: '#090d16',
          border: '1px solid rgba(148, 163, 184, 0.15)',
          borderRadius: 20,
          padding: 24,
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)',
          boxSizing: 'border-box',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(148, 163, 184, 0.1)', paddingBottom: 14 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0, textTransform: 'uppercase' }}>
                <span style={{ color: '#10b981' }}>{selectedLevel.name}</span> Detay Analiz Raporu
              </h2>
              <p style={{ color: '#94a3b8', fontSize: 11, margin: '4px 0 0 0', fontWeight: 600 }}>
                Paket: {selectedLevel.part.toUpperCase()} | Sıra: #{selectedLevel.position !== undefined ? selectedLevel.position + 1 : 1}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                color: '#94a3b8',
                borderRadius: 8,
                width: 32,
                height: 32,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          </div>

          {(() => {
            const getDifficultyLabel = (diffVal: number | undefined) => {
              switch (diffVal) {
                case 1: return 'KOLAY';
                case 2: return 'ORTA';
                case 3: return 'ZOR';
                case 4: return 'ÇOK ZOR';
                default: return 'BELİRTİLMEMİŞ';
              }
            };

            const getPlayerVotedDifficulty = () => {
              if (!latestStats) return null;
              const { votes_easy, votes_normal, votes_hard } = latestStats;
              const maxVotes = Math.max(votes_easy, votes_normal, votes_hard);
              if (maxVotes === 0) return null;
              if (maxVotes === votes_easy) return 'KOLAY';
              if (maxVotes === votes_normal) return 'ORTA';
              return 'ZOR';
            };

            const designerDiffLabel = getDifficultyLabel(selectedLevel.difficulty);
            const playerDiffLabel = getPlayerVotedDifficulty();

            let gapWarning = null;
            if (selectedLevel.difficulty && playerDiffLabel) {
              const designerVal = selectedLevel.difficulty;
              if (designerVal <= 2 && playerDiffLabel === 'ZOR') {
                gapWarning = `⚠️ ZORLUK UYUMSUZLUĞU: Tasarımcı bu bölümü "${designerDiffLabel}" planlamış ancak oyuncular çoğunlukla "ZOR" olarak oylamış! Seviye tasarımını hafifletmeyi düşünebilirsiniz.`;
              } else if (designerVal >= 3 && playerDiffLabel === 'KOLAY') {
                gapWarning = `⚠️ ZORLUK UYUMSUZLUĞU: Tasarımcı bu bölümü "${designerDiffLabel}" planlamış ancak oyuncular çoğunlukla "KOLAY" olarak oylamış! Seviyeyi biraz daha zorlaştırmayı düşünebilirsiniz.`;
              }
            }

            return (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, background: 'rgba(30, 41, 59, 0.2)', padding: 14, borderRadius: 12, border: '1px solid rgba(148, 163, 184, 0.08)' }}>
                  <div>
                    <span style={{ fontSize: 9, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Izgara Boyutu</span>
                    <p style={{ margin: '4px 0 0 0', fontSize: 13, fontWeight: 800 }}>
                      {selectedLevel.width && selectedLevel.height ? `${selectedLevel.width} x ${selectedLevel.height}` : 'Belirtilmemiş'}
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: 9, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tasarımcı Zorluğu</span>
                    <p style={{ margin: '4px 0 0 0', fontSize: 13, fontWeight: 800, color: '#60a5fa' }}>
                      {designerDiffLabel}
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: 9, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Oyuncu Zorluk Oyu</span>
                    <p style={{ margin: '4px 0 0 0', fontSize: 13, fontWeight: 800, color: playerDiffLabel === 'ZOR' ? '#ef4444' : playerDiffLabel === 'KOLAY' ? '#10b981' : '#f59e0b' }}>
                      {playerDiffLabel || 'VERİ YOK'}
                    </p>
                  </div>
                  <div>
                    <span style={{ fontSize: 9, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tasarımcı / Oluşturan</span>
                    <p style={{ margin: '4px 0 0 0', fontSize: 13, fontWeight: 800 }}>
                      {selectedLevel.creatorName || 'Sistem'}
                    </p>
                  </div>
                </div>

                {gapWarning && (
                  <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.35)', borderRadius: 10, padding: '10px 14px', fontSize: 11, color: '#f59e0b', fontWeight: 700 }}>
                    {gapWarning}
                  </div>
                )}

                {(selectedLevel.creatorNotes || selectedLevel.gameNotes) && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                    {selectedLevel.creatorNotes && (
                      <div style={{ background: 'rgba(30, 41, 59, 0.1)', border: '1px solid rgba(148, 163, 184, 0.04)', padding: 12, borderRadius: 10 }}>
                        <span style={{ fontSize: 9, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Tasarım Notu</span>
                        <p style={{ margin: '4px 0 0 0', fontSize: 11, color: '#d1d5db', fontStyle: 'italic', lineHeight: '1.4' }}>
                          "{selectedLevel.creatorNotes}"
                        </p>
                      </div>
                    )}
                    {selectedLevel.gameNotes && (
                      <div style={{ background: 'rgba(30, 41, 59, 0.1)', border: '1px solid rgba(148, 163, 184, 0.04)', padding: 12, borderRadius: 10 }}>
                        <span style={{ fontSize: 9, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>Editör Çözüm İpuçları</span>
                        <p style={{ margin: '4px 0 0 0', fontSize: 11, color: '#94a3b8', lineHeight: '1.4', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                          {selectedLevel.gameNotes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            );
          })()}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 28 }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'space-between' }}>
                <DonutChart wins={latestStats?.wins ?? 0} quits={latestStats?.quits ?? 0} />
                <BarChart
                  easy={latestStats?.votes_easy ?? 0}
                  normal={latestStats?.votes_normal ?? 0}
                  hard={latestStats?.votes_hard ?? 0}
                />
              </div>

              {versionStats.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 800, margin: '0 0 6px 0', letterSpacing: '0.06em' }}>
                      GRAFİKTE GÖSTERİLECEK DEĞERLER (ÇOKLU SEÇİM)
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {TREND_METRICS.map((tm) => {
                        const isSelected = selectedTrendMetrics.includes(tm.key);
                        return (
                          <button
                            key={tm.key}
                            onClick={() => {
                              if (isSelected) {
                                if (selectedTrendMetrics.length > 1) {
                                  setSelectedTrendMetrics(selectedTrendMetrics.filter((m) => m !== tm.key));
                                }
                              } else {
                                setSelectedTrendMetrics([...selectedTrendMetrics, tm.key]);
                              }
                            }}
                            style={{
                              background: isSelected ? tm.color : 'rgba(30, 41, 59, 0.3)',
                              border: `1px solid ${isSelected ? tm.color : 'rgba(148, 163, 184, 0.15)'}`,
                              color: isSelected ? '#030712' : '#94a3b8',
                              padding: '4px 10px',
                              borderRadius: 20,
                              fontSize: 10,
                              fontWeight: 800,
                              cursor: 'pointer',
                              boxShadow: isSelected ? `0 0 8px ${tm.glow}` : 'none',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {tm.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <MultiLineChart
                    history={versionStats}
                    selectedMetrics={selectedTrendMetrics}
                    alertRules={alertRules}
                  />
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: 'rgba(30, 41, 59, 0.25)', padding: 12, borderRadius: 10, border: '1px solid rgba(148, 163, 184, 0.05)' }}>
                  <p style={{ color: '#64748b', fontSize: 9, fontWeight: 800, margin: 0, textTransform: 'uppercase' }}>Toplam Bitirme Oranı</p>
                  <p style={{ fontSize: 18, fontWeight: 900, color: '#10b981', margin: '4px 0 0 0' }}>
                    {latestStats && latestStats.total_attempts > 0 
                      ? `${((latestStats.wins / latestStats.total_attempts) * 100).toFixed(1)}%` 
                      : '0%'
                    }
                  </p>
                </div>

                <div style={{ background: 'rgba(30, 41, 59, 0.25)', padding: 12, borderRadius: 10, border: '1px solid rgba(148, 163, 184, 0.05)' }}>
                  <p style={{ color: '#64748b', fontSize: 9, fontWeight: 800, margin: 0, textTransform: 'uppercase' }}>Ortalama Çözüm Süresi</p>
                  <p style={{ fontSize: 18, fontWeight: 900, color: '#ffd700', margin: '4px 0 0 0' }}>
                    {latestStats && latestStats.wins > 0 
                      ? `${latestStats.avg_time_win.toFixed(1)} sn` 
                      : '-'
                    }
                  </p>
                </div>

                <div style={{ background: 'rgba(30, 41, 59, 0.25)', padding: 12, borderRadius: 10, border: '1px solid rgba(148, 163, 184, 0.05)' }}>
                  <p style={{ color: '#64748b', fontSize: 9, fontWeight: 800, margin: 0, textTransform: 'uppercase' }}>Ortalama Ölüm & Hata</p>
                  <p style={{ fontSize: 18, fontWeight: 900, color: '#ef4444', margin: '4px 0 0 0' }}>
                    {latestStats && latestStats.wins > 0 
                      ? `${(latestStats.total_deaths / latestStats.wins).toFixed(1)}` 
                      : '-'
                    }
                  </p>
                </div>

                <div style={{ background: 'rgba(30, 41, 59, 0.25)', padding: 12, borderRadius: 10, border: '1px solid rgba(148, 163, 184, 0.05)' }}>
                  <p style={{ color: '#64748b', fontSize: 9, fontWeight: 800, margin: 0, textTransform: 'uppercase' }}>Ortalama Manuel Restart</p>
                  <p style={{ fontSize: 18, fontWeight: 900, color: '#f59e0b', margin: '4px 0 0 0' }}>
                    {latestStats && latestStats.wins > 0 
                      ? `${(latestStats.total_restarts / latestStats.wins).toFixed(1)}` 
                      : '-'
                    }
                  </p>
                </div>
              </div>

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
                        const isCurrent = stats.version === selectedLevel.version;

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

            </div>

          </div>

        </div>
      </motion.div>
    </div>
  );
}
// ─── Main Component ───────────────────────────────────────────────────────────

export default function LevelAnalyticsPage() {
  const router = useRouter();
  const t = useT();
  const { user, role, loading: authLoading } = useAuth();

  const [levels, setLevels] = useState<StoredLevelInfo[]>([]);
  const [analytics, setAnalytics] = useState<LevelStats[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
  const [selectedTrendMetrics, setSelectedTrendMetrics] = useState<string[]>(['dropOff', 'likeRatio']);
  const [viewMode, setViewMode] = useState<'list' | 'chart'>('list');
  const [selectedComparisonMetric, setSelectedComparisonMetric] = useState<'dropOff' | 'likeRatio' | 'avgDeaths' | 'avgRestarts' | 'avgTime' | 'totalAttempts'>('dropOff');
  const [chartChunkSize, setChartChunkSize] = useState<number>(10);
  const [chartPageIndex, setChartPageIndex] = useState<number>(0);
  const detailPanelRef = useRef<HTMLDivElement>(null);

  const [isEditingRules, setIsEditingRules] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newConditions, setNewConditions] = useState<AlertCondition[]>([
    { metric: 'dropOff', operator: '>', value: 50 },
  ]);

  // Security Check
  useEffect(() => {
    if (!authLoading && role !== 'admin') {
      router.replace('/');
    }
  }, [role, authLoading, router]);

  // Fetch all levels from Dexie and D1 aggregation from Worker
  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { getDB } = await import('@/services/db');
      const db = getDB();
      const rawLevels = await db.presetLevels.toArray();
      const mappedLevels = rawLevels
        .filter((l) => l.firestoreId)
        .map((l) => ({
          firestoreId: l.firestoreId!,
          name: l.name,
          part: l.part ?? '',
          position: l.position,
          version: l.version ?? 1,
          difficulty: l.difficulty,
          width: l.width,
          height: l.height,
          creatorName: l.creatorName,
          gameNotes: l.gameNotes,
          creatorNotes: l.creatorNotes,
          createdAt: l.createdAt,
          updatedAt: l.updatedAt,
        }))
        .sort((a, b) => a.part.localeCompare(b.part) || a.position - b.position);

      setLevels(mappedLevels);

      const token = await user.getIdToken();
      const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL;
      const res = await fetch(`${WORKER_URL}/admin/level-analytics`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const body = await res.json();
        if (body.success && Array.isArray(body.analytics)) {
          setAnalytics(body.analytics);
        }
      }

      const docRef = doc(firestoreDb, 'settings', 'levelAnalyticsAlerts');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setAlertRules(docSnap.data().rules ?? []);
      } else {
        const defaultRules: AlertRule[] = [
          {
            id: 'rule-1',
            name: 'Kritik Pes Etme & Düşük Beğeni',
            conditions: [
              { metric: 'dropOff', operator: '>=', value: 60, connector: 'AND' },
              { metric: 'likeRatio', operator: '<', value: 50 },
            ],
            isActive: true,
          },
          {
            id: 'rule-2',
            name: 'Aşırı Hata ve Ölüm Oranı',
            conditions: [{ metric: 'avgDeaths', operator: '>=', value: 8 }],
            isActive: true,
          },
        ];
        setAlertRules(defaultRules);
        await setDoc(docRef, { rules: defaultRules });
      }
    } catch (err) {
      console.error('[Analytics] Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && role === 'admin') {
      loadData();
    }
  }, [user, role, loadData]);

  // Smooth scroll to details
  useEffect(() => {
    if (selectedLevelId && detailPanelRef.current) {
      setTimeout(() => {
        detailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [selectedLevelId]);

  // Evaluator function for custom alert rules
  const checkRuleViolation = (rule: AlertRule, stats: LevelStats) => {
    if (!rule.isActive || rule.conditions.length === 0) return false;

    const evalCond = (cond: AlertCondition) => {
      let val = 0;
      if (cond.metric === 'dropOff') {
        val = stats.total_attempts > 0 ? (stats.quits / stats.total_attempts) * 100 : 0;
      } else if (cond.metric === 'avgDeaths') {
        val = stats.wins > 0 ? stats.total_deaths / stats.wins : 0;
      } else if (cond.metric === 'avgRestarts') {
        val = stats.wins > 0 ? stats.total_restarts / stats.wins : 0;
      } else if (cond.metric === 'avgTime') {
        val = stats.avg_time_win ?? 0;
      } else if (cond.metric === 'likeRatio') {
        const totalVotes = stats.likes + stats.dislikes;
        val = totalVotes > 0 ? (stats.likes / totalVotes) * 100 : 100;
      }

      switch (cond.operator) {
        case '>': return val > cond.value;
        case '<': return val < cond.value;
        case '>=': return val >= cond.value;
        case '<=': return val <= cond.value;
        case '==': return val === cond.value;
        default: return false;
      }
    };

    let isViolated = evalCond(rule.conditions[0]);

    for (let i = 0; i < rule.conditions.length - 1; i++) {
      const cond = rule.conditions[i];
      const nextCond = rule.conditions[i + 1];
      const connector = cond.connector || 'AND';
      const nextResult = evalCond(nextCond);

      if (connector === 'AND') {
        isViolated = isViolated && nextResult;
      } else {
        isViolated = isViolated || nextResult;
      }
    }

    return isViolated;
  };

  const getViolatedRules = (stats: LevelStats | undefined) => {
    if (!stats) return [];
    return alertRules.filter((rule) => checkRuleViolation(rule, stats));
  };

  const handleAddRule = async () => {
    if (!newRuleName.trim()) return;

    const rule: AlertRule = {
      id: `rule-${Date.now()}`,
      name: newRuleName,
      conditions: [...newConditions],
      isActive: true,
    };

    const updatedRules = [...alertRules, rule];
    setAlertRules(updatedRules);

    try {
      await setDoc(doc(firestoreDb, 'settings', 'levelAnalyticsAlerts'), { rules: updatedRules });
      setNewRuleName('');
      setNewConditions([{ metric: 'dropOff', operator: '>', value: 50 }]);
    } catch (e) {
      console.error('Failed to save alert rule:', e);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    const updatedRules = alertRules.filter((r) => r.id !== ruleId);
    setAlertRules(updatedRules);
    try {
      await setDoc(doc(firestoreDb, 'settings', 'levelAnalyticsAlerts'), { rules: updatedRules });
    } catch (e) {
      console.error('Failed to delete alert rule:', e);
    }
  };

  const toggleRuleActive = async (ruleId: string) => {
    const updatedRules = alertRules.map((r) =>
      r.id === ruleId ? { ...r, isActive: !r.isActive } : r
    );
    setAlertRules(updatedRules);
    try {
      await setDoc(doc(firestoreDb, 'settings', 'levelAnalyticsAlerts'), { rules: updatedRules });
    } catch (e) {
      console.error('Failed to toggle alert rule:', e);
    }
  };

  // Find active thresholds for chart overlays
  const getActiveThreshold = (metric: 'dropOff' | 'likeRatio') => {
    const activeRule = alertRules.find((r) =>
      r.isActive && r.conditions.some((c) => c.metric === metric)
    );
    return activeRule?.conditions.find((c) => c.metric === metric)?.value;
  };

  if (authLoading || role !== 'admin') {
    return (
      <main style={{ minHeight: '100dvh', background: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#00ff88', fontSize: 12, letterSpacing: '0.15em' }}>VERIFYING AUTHORIZATION...</span>
      </main>
    );
  }

  return (
    <main style={{ minHeight: '100dvh', background: '#030712', color: '#f3f4f6', padding: '32px 24px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>

        {/* Header Block */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <button
              onClick={() => router.push('/admin')}
              style={{
                background: 'transparent',
                border: '1px solid #10b98140',
                color: '#10b981',
                padding: '6px 12px',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                marginBottom: 12,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#10b98115')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              ◄ BACK TO DASHBOARD
            </button>
            <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
              Level <span style={{ color: '#10b981' }}>Analytics</span>
            </h1>
            <p style={{ color: '#6b7280', fontSize: 12, margin: '4px 0 0 0' }}>
              Database-side aggregated play telemetry and player rating audits
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={() => setIsEditingRules(!isEditingRules)}
              style={{
                background: isEditingRules ? 'rgba(16, 185, 129, 0.15)' : 'rgba(30, 41, 59, 0.5)',
                border: isEditingRules ? '1px solid #10b981' : '1px solid rgba(148, 163, 184, 0.2)',
                color: '#10b981',
                padding: '10px 18px',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              ⚙ {isEditingRules ? 'UYARI KURALLARINI KAPAT' : 'ALARM / UYARI KURALLARI'}
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              style={{
                background: '#10b981',
                border: 'none',
                color: '#030712',
                padding: '10px 18px',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {loading ? 'YÜKLENİYOR...' : '🔄 YENİLE'}
            </button>
          </div>
        </div>

        {/* Alarm Warning System Settings Panel */}
        <AnimatePresence>
          {isEditingRules && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{
                background: 'rgba(17, 24, 39, 0.7)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: 16,
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
                overflow: 'hidden',
                backdropFilter: 'blur(10px)',
              }}
            >
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: '#10b981', letterSpacing: '0.04em' }}>
                UYARI VE ALARM LİMİTLERİ TANIMLAMA
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
                {/* Active Rules List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <h3 style={{ fontSize: 13, color: '#94a3b8', margin: '0 0 4px 0' }}>Aktif Kurallar ({alertRules.length})</h3>
                  {alertRules.length === 0 ? (
                    <p style={{ fontSize: 12, color: '#4b5563', margin: 0 }}>Tanımlanmış alarm kuralı bulunmuyor.</p>
                  ) : (
                    alertRules.map((rule) => (
                      <div
                        key={rule.id}
                        style={{
                          background: 'rgba(30, 41, 59, 0.3)',
                          border: '1px solid rgba(148, 163, 184, 0.1)',
                          borderRadius: 10,
                          padding: '10px 14px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 12,
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: rule.isActive ? '#fff' : '#64748b' }}>
                            {rule.name}
                          </span>
                          <span style={{ fontSize: 10, color: '#64748b' }}>
                            {rule.conditions.map((c, idx) => {
                              const label = METRIC_LABELS[c.metric];
                              const connector = c.connector ? ` ${c.connector} ` : '';
                              return `${label} ${c.operator} ${c.value}${connector}`;
                            }).join('')}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <button
                            onClick={() => toggleRuleActive(rule.id)}
                            style={{
                              background: rule.isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              border: `1px solid ${rule.isActive ? '#10b981' : '#ef4444'}`,
                              color: rule.isActive ? '#10b981' : '#ef4444',
                              borderRadius: 6,
                              padding: '4px 8px',
                              fontSize: 9,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            {rule.isActive ? 'AKTİF' : 'PASİF'}
                          </button>
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#64748b',
                              fontSize: 14,
                              cursor: 'pointer',
                            }}
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Add New Rule Form */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, background: 'rgba(30, 41, 59, 0.15)', padding: 16, borderRadius: 12, border: '1px solid rgba(148, 163, 184, 0.05)' }}>
                  <h3 style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Yeni Uyarı Kuralı Ekle</h3>
                  
                  <input
                    type="text"
                    placeholder="Kural İsmi (Örn: Yüksek Zorluk Alarmı)"
                    value={newRuleName}
                    onChange={(e) => setNewRuleName(e.target.value)}
                    style={{
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid rgba(148, 163, 184, 0.2)',
                      borderRadius: 8,
                      padding: '8px 12px',
                      color: '#fff',
                      fontSize: 12,
                    }}
                  />

                  {newConditions.map((cond, idx) => (
                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'rgba(15, 23, 42, 0.25)', padding: 10, borderRadius: 8, border: '1px solid rgba(148, 163, 184, 0.05)' }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <select
                          value={cond.metric}
                          onChange={(e) => {
                            const updated = [...newConditions];
                            updated[idx].metric = e.target.value as any;
                            setNewConditions(updated);
                          }}
                          style={{
                            flex: 2,
                            background: 'rgba(15, 23, 42, 0.8)',
                            border: '1px solid rgba(148, 163, 184, 0.2)',
                            borderRadius: 6,
                            padding: '6px',
                            color: '#fff',
                            fontSize: 11,
                          }}
                        >
                          {Object.entries(METRIC_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>

                        <select
                          value={cond.operator}
                          onChange={(e) => {
                            const updated = [...newConditions];
                            updated[idx].operator = e.target.value as any;
                            setNewConditions(updated);
                          }}
                          style={{
                            flex: 1,
                            background: 'rgba(15, 23, 42, 0.8)',
                            border: '1px solid rgba(148, 163, 184, 0.2)',
                            borderRadius: 6,
                            padding: '6px',
                            color: '#fff',
                            fontSize: 11,
                          }}
                        >
                          {OPERATORS.map((op) => (
                            <option key={op} value={op}>{op}</option>
                          ))}
                        </select>

                        <input
                          type="number"
                          value={cond.value}
                          onChange={(e) => {
                            const updated = [...newConditions];
                            updated[idx].value = Number(e.target.value);
                            setNewConditions(updated);
                          }}
                          style={{
                            width: 60,
                            background: 'rgba(15, 23, 42, 0.8)',
                            border: '1px solid rgba(148, 163, 184, 0.2)',
                            borderRadius: 6,
                            padding: '6px',
                            color: '#fff',
                            fontSize: 11,
                            textAlign: 'center',
                          }}
                        />
                      </div>

                      {idx < newConditions.length - 1 ? (
                        <select
                          value={cond.connector || 'AND'}
                          onChange={(e) => {
                            const updated = [...newConditions];
                            updated[idx].connector = e.target.value as any;
                            setNewConditions(updated);
                          }}
                          style={{
                            alignSelf: 'flex-start',
                            background: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            borderRadius: 4,
                            padding: '2px 8px',
                            color: '#10b981',
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        >
                          <option value="AND">VE (AND)</option>
                          <option value="OR">VEYA (OR)</option>
                        </select>
                      ) : (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => {
                              const updated = [...newConditions];
                              updated[idx].connector = 'AND';
                              setNewConditions([...updated, { metric: 'dropOff', operator: '>', value: 50 }]);
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#10b981',
                              fontSize: 10,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            + Koşul Ekle (AND/OR)
                          </button>
                          {newConditions.length > 1 && (
                            <button
                              onClick={() => {
                                const updated = newConditions.slice(0, -1);
                                if (updated[updated.length - 1]) {
                                  delete updated[updated.length - 1].connector;
                                }
                                setNewConditions(updated);
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#ef4444',
                                fontSize: 10,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              - Koşulu Kaldır
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  <button
                    onClick={handleAddRule}
                    style={{
                      background: '#10b981',
                      border: 'none',
                      color: '#030712',
                      padding: '8px 0',
                      borderRadius: 8,
                      fontWeight: 700,
                      fontSize: 11,
                      cursor: 'pointer',
                      marginTop: 8,
                    }}
                  >
                    KURALI KAYDET VE UYGULA
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* View Switcher Tabs */}
        <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid rgba(148, 163, 184, 0.1)', paddingBottom: 12 }}>
          <button
            onClick={() => setViewMode('list')}
            style={{
              background: viewMode === 'list' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
              border: `1px solid ${viewMode === 'list' ? '#10b981' : 'transparent'}`,
              color: viewMode === 'list' ? '#10b981' : '#64748b',
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            📋 LİSTE GÖRÜNÜMÜ
          </button>
          <button
            onClick={() => setViewMode('chart')}
            style={{
              background: viewMode === 'chart' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
              border: `1px solid ${viewMode === 'chart' ? '#10b981' : 'transparent'}`,
              color: viewMode === 'chart' ? '#10b981' : '#64748b',
              padding: '8px 16px',
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            📊 GRAFİK KARŞILAŞTIRMA
          </button>
        </div>

        {viewMode === 'list' ? (
          /* main level list analytics table */
          <div style={{ background: 'rgba(17, 24, 39, 0.4)', border: '1px solid rgba(148, 163, 184, 0.1)', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'rgba(30, 41, 59, 0.5)', borderBottom: '1px solid rgba(148, 163, 184, 0.1)' }}>
                    <th style={{ padding: '16px 20px', color: '#94a3b8', fontWeight: 700 }}>SEVİYE ADI</th>
                    <th style={{ padding: '16px 20px', color: '#94a3b8', fontWeight: 700 }}>PAKET / SIRA</th>
                    <th style={{ padding: '16px 20px', color: '#94a3b8', fontWeight: 700 }}>SÜRÜM</th>
                    <th style={{ padding: '16px 20px', color: '#94a3b8', fontWeight: 700 }}>TOPLAM GİRİŞİM</th>
                    <th style={{ padding: '16px 20px', color: '#94a3b8', fontWeight: 700 }}>PES ETME (DROP-OFF)</th>
                    <th style={{ padding: '16px 20px', color: '#94a3b8', fontWeight: 700 }}>ORT. ÖLÜM (RESTART)</th>
                    <th style={{ padding: '16px 20px', color: '#94a3b8', fontWeight: 700 }}>ORT. SÜRE</th>
                    <th style={{ padding: '16px 20px', color: '#94a3b8', fontWeight: 700 }}>BEĞENİ ORANI</th>
                    <th style={{ padding: '16px 20px', color: '#94a3b8', fontWeight: 700 }}>DURUM</th>
                  </tr>
                </thead>
                <tbody>
                  {levels.map((level) => {
                    const latestStats = analytics.find(
                      (a) => a.level_id === level.firestoreId && a.version === level.version
                    );

                    const totalAttempts = latestStats?.total_attempts ?? 0;
                    const dropOff = totalAttempts > 0 ? ((latestStats?.quits ?? 0) / totalAttempts) * 100 : 0;
                    const wins = latestStats?.wins ?? 0;
                    const avgDeaths = wins > 0 ? (latestStats?.total_deaths ?? 0) / wins : 0;
                    const avgRestarts = wins > 0 ? (latestStats?.total_restarts ?? 0) / wins : 0;
                    const avgTime = latestStats?.avg_time_win ?? 0;

                    const feedbackCount = (latestStats?.likes ?? 0) + (latestStats?.dislikes ?? 0);
                    const likeRatio = feedbackCount > 0 ? ((latestStats?.likes ?? 0) / feedbackCount) * 100 : null;

                    const violated = getViolatedRules(latestStats);

                    const dropOffColor = dropOff >= 60 ? '#ef4444' : dropOff >= 40 ? '#f59e0b' : '#10b981';
                    const likeColor = likeRatio === null ? '#6b7280' : likeRatio < 50 ? '#ef4444' : likeRatio < 75 ? '#f59e0b' : '#10b981';

                    const isSelected = selectedLevelId === level.firestoreId;

                    return (
                      <tr
                        key={level.firestoreId}
                        onClick={() => setSelectedLevelId(isSelected ? null : level.firestoreId)}
                        style={{
                          borderBottom: '1px solid rgba(148, 163, 184, 0.05)',
                          background: isSelected ? 'rgba(16, 185, 129, 0.04)' : 'transparent',
                          cursor: 'pointer',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = isSelected ? 'rgba(16, 185, 129, 0.06)' : 'rgba(255, 255, 255, 0.02)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = isSelected ? 'rgba(16, 185, 129, 0.04)' : 'transparent')}
                      >
                        <td style={{ padding: '16px 20px', fontWeight: 800 }}>{level.name}</td>
                        <td style={{ padding: '16px 20px', color: '#94a3b8', fontSize: 11, fontWeight: 700 }}>
                          {level.part.toUpperCase()} / #{level.position + 1}
                        </td>
                        <td style={{ padding: '16px 20px', color: '#60a5fa', fontWeight: 700 }}>v{level.version}</td>
                        <td style={{ padding: '16px 20px' }}>{totalAttempts}</td>
                        <td style={{ padding: '16px 20px', color: dropOffColor, fontWeight: 700 }}>
                          {totalAttempts > 0 ? `${dropOff.toFixed(1)}%` : '-'}
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          {totalAttempts > 0 ? (
                            <span>
                              {avgDeaths.toFixed(1)} <span style={{ opacity: 0.5, fontSize: 11 }}>({avgRestarts.toFixed(1)})</span>
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td style={{ padding: '16px 20px' }}>{wins > 0 ? `${avgTime.toFixed(1)} sn` : '-'}</td>
                        <td style={{ padding: '16px 20px', color: likeColor, fontWeight: 700 }}>
                          {likeRatio !== null ? `${likeRatio.toFixed(0)}%` : '-'}
                          {feedbackCount > 0 && <span style={{ color: '#64748b', fontSize: 10, fontWeight: 400 }}> ({feedbackCount} oy)</span>}
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          {violated.length > 0 ? (
                            <span
                              title={violated.map((r) => r.name).join('\n')}
                              style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                color: '#ef4444',
                                fontSize: 10,
                                fontWeight: 900,
                                padding: '4px 10px',
                                borderRadius: 100,
                                boxShadow: '0 0 10px rgba(239, 68, 68, 0.15)',
                                animation: 'pulse 2s infinite',
                              }}
                            >
                              ⚠️ UYARI ({violated.length})
                            </span>
                          ) : totalAttempts > 0 ? (
                            <span style={{ color: '#10b981', fontSize: 11, fontWeight: 700 }}>✓ STABİL</span>
                          ) : (
                            <span style={{ color: '#4b5563', fontSize: 11 }}>VERİ YOK</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* chart view layout */
          <div style={{ background: 'rgba(17, 24, 39, 0.4)', border: '1px solid rgba(148, 163, 184, 0.1)', borderRadius: 16, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <p style={{ fontSize: 10, color: '#94a3b8', fontWeight: 800, margin: '0 0 8px 0', letterSpacing: '0.06em' }}>
                Y-EKSENİ METRİĞİ SEÇİN
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {TREND_METRICS.map((tm) => {
                  const isSelected = selectedComparisonMetric === tm.key;
                  return (
                    <button
                      key={tm.key}
                      onClick={() => setSelectedComparisonMetric(tm.key as any)}
                      style={{
                        background: isSelected ? tm.color : 'rgba(30, 41, 59, 0.3)',
                        border: `1px solid ${isSelected ? tm.color : 'rgba(148, 163, 184, 0.15)'}`,
                        color: isSelected ? '#030712' : '#94a3b8',
                        padding: '6px 14px',
                        borderRadius: 20,
                        fontSize: 10,
                        fontWeight: 800,
                        cursor: 'pointer',
                        boxShadow: isSelected ? `0 0 8px ${tm.glow}` : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {tm.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16, borderTop: '1px solid rgba(148, 163, 184, 0.08)', paddingTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>Gösterilecek Seviye Sayısı:</span>
                <select
                  value={chartChunkSize}
                  onChange={(e) => {
                    setChartChunkSize(Number(e.target.value));
                    setChartPageIndex(0);
                  }}
                  style={{
                    background: 'rgba(15, 23, 42, 0.8)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: 6,
                    padding: '4px 10px',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  <option value={10}>10 Seviye</option>
                  <option value={15}>15 Seviye</option>
                  <option value={20}>20 Seviye</option>
                  <option value={-1}>Tümü</option>
                </select>
              </div>

              {chartChunkSize !== -1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    disabled={chartPageIndex === 0}
                    onClick={() => setChartPageIndex(prev => Math.max(0, prev - 1))}
                    style={{
                      background: 'rgba(30, 41, 59, 0.5)',
                      border: '1px solid rgba(148, 163, 184, 0.15)',
                      color: chartPageIndex === 0 ? '#4b5563' : '#10b981',
                      padding: '5px 12px',
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 800,
                      cursor: chartPageIndex === 0 ? 'default' : 'pointer',
                    }}
                  >
                    ◀ ÖNCEKİ
                  </button>
                  <span style={{ fontSize: 11, color: '#f3f4f6', fontWeight: 800 }}>
                    Seviyeler {chartPageIndex * chartChunkSize + 1} - {Math.min((chartPageIndex + 1) * chartChunkSize, levels.length)} ({levels.length} içinden)
                  </span>
                  <button
                    disabled={(chartPageIndex + 1) * chartChunkSize >= levels.length}
                    onClick={() => setChartPageIndex(prev => prev + 1)}
                    style={{
                      background: 'rgba(30, 41, 59, 0.5)',
                      border: '1px solid rgba(148, 163, 184, 0.15)',
                      color: (chartPageIndex + 1) * chartChunkSize >= levels.length ? '#4b5563' : '#10b981',
                      padding: '5px 12px',
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 800,
                      cursor: (chartPageIndex + 1) * chartChunkSize >= levels.length ? 'default' : 'pointer',
                    }}
                  >
                    SONRAKİ ▶
                  </button>
                </div>
              )}
            </div>

            <MainComparisonChart
              levels={
                chartChunkSize === -1
                  ? [...levels].sort((a, b) => a.part.localeCompare(b.part) || a.position - b.position)
                  : [...levels]
                      .sort((a, b) => a.part.localeCompare(b.part) || a.position - b.position)
                      .slice(chartPageIndex * chartChunkSize, (chartPageIndex + 1) * chartChunkSize)
              }
              analytics={analytics}
              metricKey={selectedComparisonMetric}
              alertRules={alertRules}
              onLevelClick={(levelId) => setSelectedLevelId(levelId)}
            />
            <p style={{ fontSize: 10, color: '#64748b', fontStyle: 'italic', margin: 0, textAlign: 'center' }}>
              * Grafikteki sütunlara veya seviye isimlerine tıklayarak o seviyenin detaylı sürüm analiz modülasyonunu açabilirsiniz.
            </p>
          </div>
        )}

        {/* Detailed Analysis Modal */}
        <AnimatePresence>
          {selectedLevelId && (
            <LevelDetailModal
              selectedLevelId={selectedLevelId}
              onClose={() => setSelectedLevelId(null)}
              levels={levels}
              analytics={analytics}
              alertRules={alertRules}
              selectedTrendMetrics={selectedTrendMetrics}
              setSelectedTrendMetrics={setSelectedTrendMetrics}
            />
          )}
        </AnimatePresence>

      </div>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            box-shadow: 0 0 10px rgba(239, 68, 68, 0.4);
          }
          50% {
            opacity: 0.65;
            box-shadow: 0 0 4px rgba(239, 68, 68, 0.1);
          }
        }
      `}</style>
    </main>
  );
}
