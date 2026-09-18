/**
 * DOSYA AMACI: Bir periyodun rozetlerini, dönemsel skorlar düzeltildikten sonra
 * yeniden dağıtan onarım fonksiyonu. Dağıtım mantığı KOPYALANMAZ; mevcut
 * `scheduled/badgeDistribution.ts` yeniden kullanılır.
 * bkz. .plans/yayin-hazirlik/02-veri-dayanikliligi.md §3.2
 */

import { runBadgeDistribution } from '../../scheduled/badgeDistribution';
import { periodStartOf } from './lib/periods';
import type { Env } from '../../types';

export interface RecomputeBadgesInput {
  type: 'weekly' | 'monthly';
  /** 'YYYY-Www' (haftalık) veya 'YYYY-MM' (aylık). */
  periodId: string;
}

export interface RecomputeBadgesResult {
  type: 'weekly' | 'monthly';
  periodId: string;
  dryRun: boolean;
  /** Dağıtımın hesaplandığı referans an (periyodun ilk anı). */
  periodStart: string;
  /** Dağıtım öncesi/sonrası bu periyotta var olan rozet sayısı. */
  badgesBefore: number;
  badgesAfter: number;
}

/**
 * Bir periyodun rozetlerini yeniden dağıtır.
 *
 * `runBadgeDistribution` verilen tarihten 24 saat geri gidip periyodu bulur;
 * bu yüzden periyodun İLK ANI verildiğinde tam olarak o periyot hesaplanır.
 * Ekleme `INSERT OR IGNORE` olduğu için tekrar çalıştırmak zararsızdır
 * (idempotent) ve VAR OLAN hiçbir rozeti silmez.
 *
 * Alternatifi neydi ve neden reddettim? Periyodun rozetlerini önce silip
 *   yeniden yazmak ("temiz dağıtım"). Reddedildi: bir oyuncunun kazanılmış
 *   rozetini silmek geri alınamaz ve oyuncunun gördüğü profil değişir; 00-ilkeler
 *   §5 bunu tek başına bir karar olmaktan çıkarır. Eksik rozeti EKLEMEK
 *   güvenlidir, fazla rozeti silmek değildir.
 *   Sonuç: skorlar düşecek şekilde düzeltildiyse fazla verilmiş rozet yerinde
 *   kalır ve raporda elle karar için görünür (docs/release/veri-kurtarma.md).
 * Yeni bir rozet türü eklenince bu dosya değişir mi? Hayır — türleri
 *   `badgeDistribution.ts` bilir, burası yalnızca periyodu seçer.
 * Değer eksik/bozuk gelirse? Ayrıştırılamayan `periodId` için hata fırlatılır;
 *   yanlış bir periyoda rozet dağıtmaktansa hiç dağıtmamak doğrudur.
 */
export async function recomputeBadges(
  env: Env,
  input: RecomputeBadgesInput,
  options: { dryRun?: boolean } = {},
): Promise<RecomputeBadgesResult> {
  const dryRun = options.dryRun !== false;
  const periodType = input.type === 'weekly' ? 'weekly' : 'monthly';
  const periodStart = periodStartOf(periodType, input.periodId);
  if (periodStart === null) {
    throw new Error(`recomputeBadges: gecersiz periodId '${input.periodId}' (type=${input.type})`);
  }

  const countBadges = async (): Promise<number> => {
    const row = await env.AUDIT_DB
      .prepare(`SELECT COUNT(*) AS n FROM badges WHERE period_id = ?1`)
      .bind(input.periodId)
      .first<{ n: number }>();
    return row?.n ?? 0;
  };

  const badgesBefore = await countBadges();
  if (!dryRun) {
    // `runBadgeDistribution` verilen tarihten 24 saat GERİ gidip periyodu bulur.
    // Bu yüzden periyodun ilk anı değil, ilk anından 24 saat SONRASI verilir;
    // o zaman geri adım tam olarak periyodun ilk anına düşer.
    const anchor = new Date(new Date(periodStart).getTime() + 24 * 60 * 60 * 1000);
    await runBadgeDistribution(env, input.type, anchor);
  }
  const badgesAfter = dryRun ? badgesBefore : await countBadges();

  return { type: input.type, periodId: input.periodId, dryRun, periodStart, badgesBefore, badgesAfter };
}
