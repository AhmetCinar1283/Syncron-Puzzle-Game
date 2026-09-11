'use client';

import type { AlertRule } from '@/services/firebase/adminLevelAnalytics';
import { TREND_METRICS } from '../lib/types';
import type { LevelStats, MetricKey, StoredLevelInfo } from '../lib/types';
import { MainComparisonChart } from './MainComparisonChart';

/** "GRAFİK KARŞILAŞTIRMA" view: metric picker, page-size/pagination controls, and the bar chart. */
export function ChartComparisonView({
  levels,
  analytics,
  alertRules,
  selectedComparisonMetric,
  setSelectedComparisonMetric,
  chartChunkSize,
  setChartChunkSize,
  chartPageIndex,
  setChartPageIndex,
  onLevelClick,
}: {
  levels: StoredLevelInfo[];
  analytics: LevelStats[];
  alertRules: AlertRule[];
  selectedComparisonMetric: MetricKey;
  setSelectedComparisonMetric: (key: MetricKey) => void;
  chartChunkSize: number;
  setChartChunkSize: (size: number) => void;
  chartPageIndex: number;
  setChartPageIndex: React.Dispatch<React.SetStateAction<number>>;
  onLevelClick: (levelId: string) => void;
}) {
  const sortedLevels = [...levels].sort((a, b) => a.part.localeCompare(b.part) || a.position - b.position);
  const pagedLevels = chartChunkSize === -1
    ? sortedLevels
    : sortedLevels.slice(chartPageIndex * chartChunkSize, (chartPageIndex + 1) * chartChunkSize);

  return (
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
                onClick={() => setSelectedComparisonMetric(tm.key)}
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
              onClick={() => setChartPageIndex((prev) => Math.max(0, prev - 1))}
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
              onClick={() => setChartPageIndex((prev) => prev + 1)}
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
        levels={pagedLevels}
        analytics={analytics}
        metricKey={selectedComparisonMetric}
        alertRules={alertRules}
        onLevelClick={onLevelClick}
      />
      <p style={{ fontSize: 10, color: '#64748b', fontStyle: 'italic', margin: 0, textAlign: 'center' }}>
        * Grafikteki sütunlara veya seviye isimlerine tıklayarak o seviyenin detaylı sürüm analiz modülasyonunu açabilirsiniz.
      </p>
    </div>
  );
}
