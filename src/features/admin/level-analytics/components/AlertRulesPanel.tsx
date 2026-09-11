'use client';

import { AnimatePresence, motion } from 'framer-motion';
import type { AlertCondition, AlertRule } from '@/services/firebase/adminLevelAnalytics';
import { METRIC_LABELS, OPERATORS } from '../lib/types';

/** Collapsible "ALARM / UYARI KURALLARI" settings panel (list + add-rule form). */
export function AlertRulesPanel({
  isOpen,
  alertRules,
  toggleRuleActive,
  handleDeleteRule,
  newRuleName,
  setNewRuleName,
  newConditions,
  setNewConditions,
  handleAddRule,
}: {
  isOpen: boolean;
  alertRules: AlertRule[];
  toggleRuleActive: (ruleId: string) => void;
  handleDeleteRule: (ruleId: string) => void;
  newRuleName: string;
  setNewRuleName: (v: string) => void;
  newConditions: AlertCondition[];
  setNewConditions: React.Dispatch<React.SetStateAction<AlertCondition[]>>;
  handleAddRule: () => void;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
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
                        {rule.conditions.map((c) => {
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
                        updated[idx].metric = e.target.value as AlertCondition['metric'];
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
                        updated[idx].operator = e.target.value as AlertCondition['operator'];
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
                        updated[idx].connector = e.target.value as AlertCondition['connector'];
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
  );
}
