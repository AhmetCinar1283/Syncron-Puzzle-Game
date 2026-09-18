/**
 * DOSYA AMACI: `services/recovery` modülünün tek public API'si.
 * Dışarıdan yalnızca buradan import edilir (iç dosya yolu kullanılmaz).
 */

export { evaluateDestructiveGate } from './confirmDestructive';
export type {
  DestructiveGateInput,
  DestructiveGateResult,
  DestructiveGateAllowed,
  DestructiveGateBlocked,
} from './confirmDestructive';

export { recomputeUserScores } from './recomputeUserScores';
export type { RecomputeUserScoresResult, PeriodScore, PeriodScoreChange } from './recomputeUserScores';

export { recomputeCreatorScores } from './recomputeCreatorScores';
export type {
  RecomputeCreatorScoresResult,
  CreatorScoreChange,
  LevelCreatorLookup,
} from './recomputeCreatorScores';

export { recomputeBadges } from './recomputeBadges';
export type { RecomputeBadgesInput, RecomputeBadgesResult } from './recomputeBadges';

export { createFirestoreLevelCreatorLookup } from './levelCreatorLookup';

export {
  EXPORT_TABLES,
  isExportTable,
  exportObjectKey,
  exportRunPrefix,
  exportPrefixDate,
  isPrunablePrefix,
  exportPruneCutoff,
  toNdjson,
  EXPORT_RETENTION_WEEKS,
} from './exportTables';
export type { ExportTable } from './exportTables';

export { periodKeysFor, periodStartOf, isPeriodCovered } from './lib/periods';
export type { PeriodKey, PeriodType } from './lib/periods';
