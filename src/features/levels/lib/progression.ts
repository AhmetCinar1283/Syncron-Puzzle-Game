/**
 * DOSYA AMACI: Kampanya ilerleme kuralları (saf, testli): hangi bölüm kilitli, hangi
 * bölüm "ilerletilmiş" sayılır. Bir bölüm gerçekten çözüldüğünde (`played`) ya da
 * ödüllü reklamla atlandığında (`skipped`, 05) sonraki bölümün kilidi açılır.
 * Atlama skor/yıldız vermez; "tamamlandı" sayacı yalnızca `played`'i sayar.
 */
import type { LevelPart } from '@/services/firebase/adminTypes';
import { entryId } from '@/services/firebase/adminTypes';

export type LevelProgressState = 'completed' | 'skipped' | 'none';

export interface ProgressSets {
  played: ReadonlySet<string> | ReadonlyMap<string, unknown>;
  skipped: ReadonlySet<string> | ReadonlyMap<string, unknown>;
}

/** Çözülmüş bölüm "atlandı" olarak gösterilmez; çözüm önceliklidir. */
export function progressState(levelId: string, sets: ProgressSets): LevelProgressState {
  if (sets.played.has(levelId)) return 'completed';
  if (sets.skipped.has(levelId)) return 'skipped';
  return 'none';
}

/** Sonraki bölümün kilidini açar mı (çözüldü veya atlandı). */
export function isProgressed(levelId: string, sets: ProgressSets): boolean {
  return progressState(levelId, sets) !== 'none';
}

/** Bölüm sıralamasındaki level id'leri (`position` artan). */
export function orderedLevelIds(part: Pick<LevelPart, 'order'>): string[] {
  return Object.values(part.order)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((entry) => entryId(entry));
}

/**
 * Kilitli bölüm id'leri: ilk bölüm toplam skor şartına, diğerleri bir öncekinin
 * ilerletilmiş olmasına bağlıdır.
 */
export function computeLockedSet(
  part: Pick<LevelPart, 'order' | 'unlockRequirement'>,
  sets: ProgressSets,
  totalScore: number,
): Set<string> {
  const locked = new Set<string>();
  const ids = orderedLevelIds(part);
  ids.forEach((id, i) => {
    if (i === 0) {
      if (totalScore < (part.unlockRequirement ?? 0)) locked.add(id);
    } else if (!isProgressed(ids[i - 1], sets)) {
      locked.add(id);
    }
  });
  return locked;
}

/**
 * Bölüm paketinin (chapter) kilidinin açık olup olmadığını kontrol eder.
 */
export function isChapterUnlocked(
  part: Pick<LevelPart, 'unlockRequirement'> | undefined,
  totalStarsOrScore: number,
): boolean {
  if (!part) return true;
  return totalStarsOrScore >= (part.unlockRequirement ?? 0);
}
