'use client';

import { motion } from 'framer-motion';
import type { AlertRule } from '@/services/firebase/adminLevelAnalytics';
import { TREND_METRICS } from '../lib/types';
import type { LevelStats, StoredLevelInfo } from '../lib/types';
import { DonutChart } from './DonutChart';
import { BarChart } from './BarChart';
import { MultiLineChart } from './MultiLineChart';
import { DifficultyGapPanel } from './DifficultyGapPanel';
import { VersionComparisonTable } from './VersionComparisonTable';

function SummaryMetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: 'rgba(30, 41, 59, 0.25)', padding: 12, borderRadius: 10, border: '1px solid rgba(148, 163, 184, 0.05)' }}>
      <p style={{ color: '#64748b', fontSize: 9, fontWeight: 800, margin: 0, textTransform: 'uppercase' }}>{label}</p>
      <p style={{ fontSize: 18, fontWeight: 900, color, margin: '4px 0 0 0' }}>{value}</p>
    </div>
  );
}

export function LevelDetailModal({
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

          <DifficultyGapPanel selectedLevel={selectedLevel} latestStats={latestStats} />

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
                <SummaryMetricCard
                  label="Toplam Bitirme Oranı"
                  color="#10b981"
                  value={latestStats && latestStats.total_attempts > 0
                    ? `${((latestStats.wins / latestStats.total_attempts) * 100).toFixed(1)}%`
                    : '0%'
                  }
                />
                <SummaryMetricCard
                  label="Ortalama Çözüm Süresi"
                  color="#ffd700"
                  value={latestStats && latestStats.wins > 0
                    ? `${latestStats.avg_time_win.toFixed(1)} sn`
                    : '-'
                  }
                />
                <SummaryMetricCard
                  label="Ortalama Ölüm & Hata"
                  color="#ef4444"
                  value={latestStats && latestStats.wins > 0
                    ? `${(latestStats.total_deaths / latestStats.wins).toFixed(1)}`
                    : '-'
                  }
                />
                <SummaryMetricCard
                  label="Ortalama Manuel Restart"
                  color="#f59e0b"
                  value={latestStats && latestStats.wins > 0
                    ? `${(latestStats.total_restarts / latestStats.wins).toFixed(1)}`
                    : '-'
                  }
                />
              </div>

              <VersionComparisonTable versionStats={versionStats} currentVersion={selectedLevel.version} />

            </div>

          </div>

        </div>
      </motion.div>
    </div>
  );
}
