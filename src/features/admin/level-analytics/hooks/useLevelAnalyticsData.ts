'use client';

import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import type { UserRole } from '@/contexts/AuthContext';
import { getLevelAnalyticsData } from '@/services/api/adminClient';
import {
  getLevelAnalyticsAlertRules,
  saveLevelAnalyticsAlertRules,
  type AlertRule,
} from '@/services/firebase/adminLevelAnalytics';
import { getAllPresetLevelsRaw } from '@/services/db';
import type { LevelStats, StoredLevelInfo } from '../lib/types';

/** Loads levels + D1 analytics aggregates + Firestore alert rules, and exposes rule CRUD. */
export function useLevelAnalyticsData(user: User | null, role: UserRole) {
  const [levels, setLevels] = useState<StoredLevelInfo[]>([]);
  const [analytics, setAnalytics] = useState<LevelStats[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const rawLevels = await getAllPresetLevelsRaw();
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

      const analyticsData = await getLevelAnalyticsData();
      if (analyticsData) {
        setAnalytics(analyticsData);
      }

      const existingRules = await getLevelAnalyticsAlertRules();
      if (existingRules !== null) {
        setAlertRules(existingRules);
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
        await saveLevelAnalyticsAlertRules(defaultRules);
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

  const handleAddRule = useCallback(async (newRuleName: string, newConditions: AlertRule['conditions']): Promise<boolean> => {
    if (!newRuleName.trim()) return false;

    const rule: AlertRule = {
      id: `rule-${Date.now()}`,
      name: newRuleName,
      conditions: [...newConditions],
      isActive: true,
    };

    const updatedRules = [...alertRules, rule];
    setAlertRules(updatedRules);

    try {
      await saveLevelAnalyticsAlertRules(updatedRules);
      return true;
    } catch (e) {
      console.error('Failed to save alert rule:', e);
      return false;
    }
  }, [alertRules]);

  const handleDeleteRule = useCallback(async (ruleId: string) => {
    const updatedRules = alertRules.filter((r) => r.id !== ruleId);
    setAlertRules(updatedRules);
    try {
      await saveLevelAnalyticsAlertRules(updatedRules);
    } catch (e) {
      console.error('Failed to delete alert rule:', e);
    }
  }, [alertRules]);

  const toggleRuleActive = useCallback(async (ruleId: string) => {
    const updatedRules = alertRules.map((r) =>
      r.id === ruleId ? { ...r, isActive: !r.isActive } : r
    );
    setAlertRules(updatedRules);
    try {
      await saveLevelAnalyticsAlertRules(updatedRules);
    } catch (e) {
      console.error('Failed to toggle alert rule:', e);
    }
  }, [alertRules]);

  return {
    levels,
    analytics,
    alertRules,
    loading,
    loadData,
    handleAddRule,
    handleDeleteRule,
    toggleRuleActive,
  };
}
