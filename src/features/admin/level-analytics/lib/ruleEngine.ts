import type { AlertCondition, AlertRule } from '@/services/firebase/adminLevelAnalytics';
import type { LevelStats, MetricKey } from './types';

/** Computes the numeric value of a metric for a given stats row (shared by charts, table, rule engine). */
export function getMetricValue(stats: LevelStats, metricKey: MetricKey): number {
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
}

/** Evaluates whether a stats row violates an alert rule (AND/OR chained conditions). */
export function checkRuleViolation(rule: AlertRule, stats: LevelStats): boolean {
  if (!rule.isActive || rule.conditions.length === 0) return false;

  const evalCond = (cond: AlertCondition) => {
    const val = getMetricValue(stats, cond.metric);
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
}

export function getViolatedRules(alertRules: AlertRule[], stats: LevelStats | undefined): AlertRule[] {
  if (!stats) return [];
  return alertRules.filter((rule) => checkRuleViolation(rule, stats));
}

/** Finds the active alert threshold (if any) configured for a given metric. */
export function getActiveThreshold(alertRules: AlertRule[], metric: 'dropOff' | 'likeRatio'): number | undefined {
  const activeRule = alertRules.find((r) =>
    r.isActive && r.conditions.some((c) => c.metric === metric)
  );
  return activeRule?.conditions.find((c) => c.metric === metric)?.value;
}
