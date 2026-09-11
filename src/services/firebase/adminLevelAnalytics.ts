import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './config';

export interface AlertCondition {
  metric: 'dropOff' | 'avgDeaths' | 'avgRestarts' | 'avgTime' | 'likeRatio';
  operator: '>' | '<' | '>=' | '<=' | '==';
  value: number;
  connector?: 'AND' | 'OR';
}

export interface AlertRule {
  id: string;
  name: string;
  conditions: AlertCondition[];
  isActive: boolean;
}

const ALERT_RULES_DOC = () => doc(db, 'settings', 'levelAnalyticsAlerts');

/** Kayıtlı seviye analizi uyarı kurallarını getirir (yoksa `null`). */
export async function getLevelAnalyticsAlertRules(): Promise<AlertRule[] | null> {
  const snap = await getDoc(ALERT_RULES_DOC());
  if (!snap.exists()) return null;
  return snap.data().rules ?? [];
}

/** Seviye analizi uyarı kurallarını kaydeder (tam liste ile üzerine yazar). */
export async function saveLevelAnalyticsAlertRules(rules: AlertRule[]): Promise<void> {
  await setDoc(ALERT_RULES_DOC(), { rules });
}
