/**
 * DOSYA AMACI: `LevelCreatorLookup` sözleşmesinin Firestore uyarlaması.
 * `recomputeCreatorScores` bu dosyayı bilmez; kompozisyon kökü (route) enjekte eder.
 */

import { fsGet, fromDoc } from '../firestore';
import type { LevelCreatorLookup } from './recomputeCreatorScores';

/** Aynı anda açık Firestore okuması. Worker alt istek limitine pay bırakır. */
const CONCURRENCY = 8;

/**
 * Bölüm kimliklerini `levels/{id}.createdBy` alanına eşler.
 *
 * Alternatifi neydi ve neden reddettim? `createdBy`'ı D1'e denormalize edip
 *   oradan okumak. Reddedildi: bu, bu görevin kapsamına girmeyen bir şema +
 *   geri doldurma işi olurdu ve yanlış giderse yapımcı skorlarını sessizce
 *   bozardı. Yeniden hesaplama seyrek ve elle tetiklenen bir iştir; yavaş
 *   olması kabul edilebilir, yanlış olması değildir.
 * Yeni bir bölüm kaynağı eklenirse ne olur? Yalnızca bu dosyanın bir kardeşi
 *   yazılır; `recomputeCreatorScores` değişmez (arayüze bağlı).
 * Değer eksik/null gelirse? Doküman yoksa ya da `createdBy` alanı yoksa değer
 *   `null` olur → o bölüm hiçbir yapımcıya SAYILMAZ ve çağıran taraf bunu
 *   `unresolvedLevels` olarak raporlar. Sessiz sıfırlama olmaz.
 */
export function createFirestoreLevelCreatorLookup(
  projectId: string,
  adminToken: string,
): LevelCreatorLookup {
  return async (levelIds: string[]): Promise<Record<string, string | null>> => {
    const out: Record<string, string | null> = {};
    for (let i = 0; i < levelIds.length; i += CONCURRENCY) {
      const slice = levelIds.slice(i, i + CONCURRENCY);
      const docs = await Promise.all(
        slice.map(async (levelId) => {
          try {
            const doc = await fsGet(projectId, `levels/${levelId}`, adminToken);
            if (!doc) return [levelId, null] as const;
            const data = fromDoc(doc);
            return [levelId, typeof data.createdBy === 'string' ? data.createdBy : null] as const;
          } catch {
            // Okuma hatası "sahibi yok" demek DEĞİLDİR; null dönerek bölümü
            // saymamak, yanlış sahibe puan yazmaktan güvenlidir.
            return [levelId, null] as const;
          }
        }),
      );
      for (const [levelId, creator] of docs) out[levelId] = creator;
    }
    return out;
  };
}
