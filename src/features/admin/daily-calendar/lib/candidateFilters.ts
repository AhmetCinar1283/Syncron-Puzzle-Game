/**
 * DOSYA AMACI: Takvimdeki "aday üret" formunun sade alanlarını prosedürel üreticinin
 * tam filtre nesnesine çevirir (saf). Ayrıntılı ayar gereken adaylar editörün kendi
 * üreticisiyle hazırlanıp oradan günlük bulmaca olarak kaydedilebilir.
 */
import type { GeneratorFilters } from '@/game-engine/solver/generator';

export interface CandidateForm {
  difficulty: 1 | 2 | 3 | 4;
  size: number;
  playerCount: 1 | 2 | 3;
  /** Tek seferde üretilecek aday sayısı. */
  count: number;
}

export const DEFAULT_CANDIDATE_FORM: CandidateForm = { difficulty: 2, size: 6, playerCount: 2, count: 4 };

export const CANDIDATE_LIMITS = { minSize: 4, maxSize: 10, maxCount: 8 } as const;

export function toGeneratorFilters(form: CandidateForm): GeneratorFilters {
  const size = Math.min(CANDIDATE_LIMITS.maxSize, Math.max(CANDIDATE_LIMITS.minSize, Math.round(form.size)));
  return {
    width: size,
    height: size,
    difficulty: form.difficulty,
    playerCount: form.playerCount,
    edgeTopAllowed: ['wall'],
    edgeBottomAllowed: ['wall'],
    edgeLeftAllowed: ['wall'],
    edgeRightAllowed: ['wall'],
    conveyorSteps: [1],
    trampolineSteps: [3],
    playerMode: 'normal',
    playerLock: 'lock',
    trailCollision: 'no',
    obstacleDensity: 0.15,
    iceDensity: 0.15,
    conveyorDensity: 0,
    trampolineDensity: 0,
    forbiddenDensity: 0,
    toggleDensity: 0,
    teleporterCount: 0,
    numRooms: 1,
    mutationRate: 1,
  };
}

/** Takvimde varsayılan gösterim: bugünden 3 gün önce başlayan 4 hafta. */
export const CALENDAR_DAYS = 28;

/** Tarih (UTC, 'YYYY-MM-DD') + gün. */
export function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  return new Date(d.getTime() + days * 86_400_000).toISOString().slice(0, 10);
}

/** Sunucu hata kodu → i18n anahtarı (bilinmeyen → genel hata). */
export function serverErrorKey(err: unknown): string {
  const code = err instanceof Error ? err.message : '';
  return /^[a-z-]+$/.test(code) ? `daily_admin.server_${code.replace(/-/g, '_')}` : 'daily_admin.error_generic';
}
