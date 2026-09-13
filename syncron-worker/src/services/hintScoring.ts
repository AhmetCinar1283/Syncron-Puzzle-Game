/**
 * DOSYA AMACI: İpucu kullanılan çözümlerin skor kuralı (04 KARAR (a)):
 * yıldız en fazla 2, global en iyi çözüm listesine/rozetlerine ve kişisel en iyi
 * hamle sayısına sayılmaz. "İpucu kullanıldı mı" kararı sunucu kayıtlarından
 * (reward_grants) verilir; istemci beyanı yalnızca skoru DÜŞÜREBİLİR.
 */
import type { StarCount } from '../types';
import { consumeGrants, listOpenGrantIds } from './rewards/rewardGrants';

export const HINTED_MAX_STARS: StarCount = 2;

export interface HintUsage {
  hinted: boolean;
  /** Bu tamamlamaya uygulanacak açık grant'ler (başarılı kayıttan sonra kapatılır). */
  grantIds: string[];
}

export async function resolveHintUsage(
  db: D1Database,
  uid: string,
  levelId: string,
  clientHintsUsed: number,
): Promise<HintUsage> {
  let grantIds: string[] = [];
  try {
    grantIds = await listOpenGrantIds(db, uid, 'hint', levelId);
  } catch (e) {
    // Okuma başarısızsa (ör. 0011 migration henüz uygulanmadı) tamamlama kırılmamalı.
    // Tablo okunamıyorsa claim de yazamaz → sunucu grant'i olmadan ipucu gösterilmemiştir.
    console.error('[HintScoring] reward_grants read failed:', e);
  }
  return { hinted: grantIds.length > 0 || clientHintsUsed > 0, grantIds };
}

export function capStarsForHint(stars: StarCount, hinted: boolean): StarCount {
  return hinted ? (Math.min(stars, HINTED_MAX_STARS) as StarCount) : stars;
}

/**
 * Kişisel en iyi hamle sayısı: ipuçlu çözüm mevcut rekoru iyileştiremez. İlk
 * tamamlamada bir değer gerektiği için hamle sayısı yazılır; sonraki ipuçsuz
 * çözümler bunu normal şekilde iyileştirir.
 */
export function personalBestMoveCount(
  moves: number,
  existingMoveCount: number | null | undefined,
  hinted: boolean,
): number {
  if (existingMoveCount === null || existingMoveCount === undefined) return moves;
  return hinted ? existingMoveCount : Math.min(moves, existingMoveCount);
}

export async function finalizeHintUsage(db: D1Database, uid: string, usage: HintUsage): Promise<void> {
  await consumeGrants(db, uid, usage.grantIds);
}
