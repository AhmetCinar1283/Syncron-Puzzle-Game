'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { GameIcon } from '@/components/icons';
import type { AlertCondition } from '@/services/firebase/adminLevelAnalytics';
import { useLevelAnalyticsData } from '../hooks/useLevelAnalyticsData';
import type { MetricKey } from '../lib/types';
import { AlertRulesPanel } from './AlertRulesPanel';
import { LevelListTable } from './LevelListTable';
import { ChartComparisonView } from './ChartComparisonView';
import { LevelDetailModal } from './LevelDetailModal';

export default function LevelAnalyticsPage() {
  const router = useRouter();
  const { user, role, loading: authLoading } = useAuth();

  const {
    levels,
    analytics,
    alertRules,
    loading,
    loadData,
    handleAddRule,
    handleDeleteRule,
    toggleRuleActive,
  } = useLevelAnalyticsData(user, role);

  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
  const [selectedTrendMetrics, setSelectedTrendMetrics] = useState<string[]>(['dropOff', 'likeRatio']);
  const [viewMode, setViewMode] = useState<'list' | 'chart'>('list');
  const [selectedComparisonMetric, setSelectedComparisonMetric] = useState<MetricKey>('dropOff');
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

  // Smooth scroll to details
  useEffect(() => {
    if (selectedLevelId && detailPanelRef.current) {
      setTimeout(() => {
        detailPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [selectedLevelId]);

  const onAddRule = async () => {
    const success = await handleAddRule(newRuleName, newConditions);
    if (success) {
      setNewRuleName('');
      setNewConditions([{ metric: 'dropOff', operator: '>', value: 50 }]);
    }
  };

  if (authLoading || role !== 'admin') {
    return (
      <main style={{ position: 'relative', zIndex: 1, minHeight: '100dvh', background: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#00ff88', fontSize: 12, letterSpacing: '0.15em' }}>VERIFYING AUTHORIZATION...</span>
      </main>
    );
  }

  return (
    <main style={{ position: 'relative', zIndex: 1, minHeight: '100dvh', background: '#030712', color: '#f3f4f6', padding: '32px 24px', boxSizing: 'border-box' }}>
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
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#10b98115')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <GameIcon name="arrow-left" size={11} color="#10b981" />
              <span>BACK TO DASHBOARD</span>
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
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <GameIcon name="settings" size={12} color="#10b981" />
              <span>{isEditingRules ? 'UYARI KURALLARINI KAPAT' : 'ALARM / UYARI KURALLARI'}</span>
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
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {loading ? (
                'YÜKLENİYOR...'
              ) : (
                <>
                  <GameIcon name="refresh" size={12} color="#030712" />
                  <span>YENİLE</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Alarm Warning System Settings Panel */}
        <AlertRulesPanel
          isOpen={isEditingRules}
          alertRules={alertRules}
          toggleRuleActive={toggleRuleActive}
          handleDeleteRule={handleDeleteRule}
          newRuleName={newRuleName}
          setNewRuleName={setNewRuleName}
          newConditions={newConditions}
          setNewConditions={setNewConditions}
          handleAddRule={onAddRule}
        />

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
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <GameIcon name="clipboard" size={13} color={viewMode === 'list' ? '#10b981' : '#64748b'} />
            <span>LİSTE GÖRÜNÜMÜ</span>
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
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <GameIcon name="bar-chart" size={13} color={viewMode === 'chart' ? '#10b981' : '#64748b'} />
            <span>GRAFİK KARŞILAŞTIRMA</span>
          </button>
        </div>

        {viewMode === 'list' ? (
          <LevelListTable
            levels={levels}
            analytics={analytics}
            alertRules={alertRules}
            selectedLevelId={selectedLevelId}
            setSelectedLevelId={setSelectedLevelId}
          />
        ) : (
          <ChartComparisonView
            levels={levels}
            analytics={analytics}
            alertRules={alertRules}
            selectedComparisonMetric={selectedComparisonMetric}
            setSelectedComparisonMetric={setSelectedComparisonMetric}
            chartChunkSize={chartChunkSize}
            setChartChunkSize={setChartChunkSize}
            chartPageIndex={chartPageIndex}
            setChartPageIndex={setChartPageIndex}
            onLevelClick={(levelId) => setSelectedLevelId(levelId)}
          />
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

