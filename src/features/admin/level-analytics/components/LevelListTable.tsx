'use client';

import type { AlertRule } from '@/services/firebase/adminLevelAnalytics';
import { getViolatedRules } from '../lib/ruleEngine';
import type { LevelStats, StoredLevelInfo } from '../lib/types';

/** Ana liste görünümü tablosu ("SEVİYE ADI" ... "DURUM" sütunları). */
export function LevelListTable({
  levels,
  analytics,
  alertRules,
  selectedLevelId,
  setSelectedLevelId,
}: {
  levels: StoredLevelInfo[];
  analytics: LevelStats[];
  alertRules: AlertRule[];
  selectedLevelId: string | null;
  setSelectedLevelId: (id: string | null) => void;
}) {
  return (
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

              const violated = getViolatedRules(alertRules, latestStats);

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
  );
}
