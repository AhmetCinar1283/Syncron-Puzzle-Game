/**
 * DOSYA AMACI: `user_period_scores` tablosunu kaynağından (played_levels +
 * audit_logs) yeniden kuran idempotent onarım fonksiyonu.
 * bkz. .plans/yayin-hazirlik/02-veri-dayanikliligi.md §3.2
 */

import { periodKeysFor, periodStartOf, isPeriodCovered, type PeriodType } from './lib/periods';

export interface PeriodScore {
  periodType: PeriodType;
  periodId: string;
  starsGained: number;
  levelsDone: number;
}

export interface PeriodScoreChange extends PeriodScore {
  /** Mevcut satır (yoksa null) — raporlamak ve dry-run göstermek için. */
  from: { starsGained: number; levelsDone: number } | null;
}

export interface RecomputeUserScoresResult {
  uid: string;
  dryRun: boolean;
  /** audit_logs'un GLOBAL en eski kaydı; periyodik kanıt ufkunun başladığı an. */
  coverageStart: string | null;
  /** Yazılan/yazılacak satırlar (yalnızca gerçekten değişenler). */
  changes: PeriodScoreChange[];
  /** Kanıt penceresinin dışında kaldığı için DOKUNULMAYAN periyotlar. */
  untouched: Array<{ periodType: string; periodId: string; reason: 'out-of-coverage' | 'unparsable' }>;
  affectedRows: number;
}

interface AuditCompletionRow {
  created_at: string;
  score_delta: number | null;
  is_first: number | null;
}

/**
 * `user_period_scores` satırlarını kaynaktan yeniden kurar.
 *
 * ── Hangi periyot hangi kaynaktan? ──────────────────────────────────────────
 * `all_time`  → `played_levels` (TAM ve KESİN).
 *   `upsertPeriodScores` her tamamlamada `max(0, yeniYıldız - eskiYıldız)`
 *   ekler; toplamı, satırın son yıldızıdır. Yani SUM(stars) birebir doğrudur.
 *   `levels_done` ise ilk tamamlamada +1 olur → COUNT(*) birebir doğrudur.
 * `daily/weekly/monthly` → `audit_logs` ('level.complete').
 *   Yıldız yükseltmesinin HANGİ GÜN olduğu yalnızca burada yazar; played_levels
 *   sadece son durumu tutar.
 *
 * ── Kanıt penceresi (bu fonksiyonun en önemli kuralı) ───────────────────────
 * Audit log'lar 90 günde bir arşivlenip D1'den silinir (logRetention.ts).
 * Kanıtı olmayan eski bir periyodu "yeniden hesaplarsak" sonuç SIFIR çıkar ve
 * onarım aracı veri İMHA ARACINA dönüşür. Bu yüzden:
 *   yalnızca başlangıcı `MIN(audit_logs.created_at)` anından SONRA olan
 *   periyotlara yazılır; daha eskiler `untouched` olarak raporlanır.
 *
 * ── Silinmiş bölümler ───────────────────────────────────────────────────────
 * Audit kaydı silinen (soft-deleted) bir bölüme aitse sayılmaz: silme anında
 * liderlik sayaçları zaten geri alınmıştır (routes/playedLevels.ts). Kanıt
 * olarak audit satırı değil, CANLI played_levels satırının varlığı esas alınır.
 *
 * Alternatifi neydi ve neden reddettim? Tüm periyotları played_levels'ın
 *   `completed_at` alanından türetmek. Reddedildi: yıldız yükseltmeleri ilk
 *   tamamlama gününe yazılır; geçmiş haftalık liderlik sıralaması sessizce
 *   değişir ve rozet dağıtımı geriye dönük bozulur.
 * Yeni bir periyot türü eklenirse bu dosya değişir mi? Hayır — periyot listesi
 *   `lib/periods.ts` üzerinden gelir, buradaki mantık tür-agnostiktir.
 * Değer eksik/null gelirse? `scoreDelta`/`isFirst` alanı olmayan (eski sürüm)
 *   audit satırı 0 kabul edilir; satır atlanmaz, yalnızca katkısı olmaz.
 *   Hiç audit yoksa `coverageStart` null olur ve SADECE `all_time` onarılır.
 */
export async function recomputeUserScores(
  db: D1Database,
  uid: string,
  options: { dryRun?: boolean } = {},
): Promise<RecomputeUserScoresResult> {
  const dryRun = options.dryRun !== false; // varsayılan: kuru çalışma

  const [allTimeRow, coverageRow, auditRows, currentRows] = await Promise.all([
    db
      .prepare(
        `SELECT COALESCE(SUM(stars), 0) AS stars, COUNT(*) AS levels
         FROM played_levels WHERE uid = ?1 AND deleted_at IS NULL`,
      )
      .bind(uid)
      .first<{ stars: number; levels: number }>(),
    // KAPSAM ANCHOR'I GLOBALDİR, kullanıcıya özel değildir: audit_logs'un en eski
    // kaydı, arşivleme (logRetention) sonrası elimizde kalan kanıt ufkudur.
    // Kullanıcının kendi ilk kaydını kullanmak yanlış olurdu: o kaydın ait olduğu
    // periyot (ör. haftanın ortasında başlayan bir hafta) hiçbir zaman "kapsanmış"
    // sayılmaz ve o periyot asla onarılamazdı.
    db
      .prepare(`SELECT MIN(created_at) AS oldest FROM audit_logs`)
      .first<{ oldest: string | null }>(),
    db
      .prepare(
        `SELECT a.created_at AS created_at,
                json_extract(a.metadata, '$.scoreDelta') AS score_delta,
                json_extract(a.metadata, '$.isFirst')    AS is_first
         FROM audit_logs AS a
         WHERE a.uid = ?1 AND a.action = 'level.complete'
           AND EXISTS (
             SELECT 1 FROM played_levels AS p
             WHERE p.uid = a.uid
               AND p.level_id = json_extract(a.metadata, '$.levelId')
               AND p.deleted_at IS NULL
           )
         ORDER BY a.created_at ASC`,
      )
      .bind(uid)
      .all<AuditCompletionRow>(),
    db
      .prepare(
        `SELECT period_type, period_id, stars_gained, levels_done
         FROM user_period_scores WHERE uid = ?1`,
      )
      .bind(uid)
      .all<{ period_type: string; period_id: string; stars_gained: number; levels_done: number }>(),
  ]);

  const coverageStart = coverageRow?.oldest ?? null;

  // ── Hedef durum ────────────────────────────────────────────────────────────
  const target = new Map<string, PeriodScore>();
  const keyOf = (t: string, id: string) => `${t}\u0000${id}`;

  target.set(keyOf('all_time', 'all_time'), {
    periodType: 'all_time',
    periodId: 'all_time',
    starsGained: allTimeRow?.stars ?? 0,
    levelsDone: allTimeRow?.levels ?? 0,
  });

  const untouched: RecomputeUserScoresResult['untouched'] = [];

  for (const row of auditRows.results ?? []) {
    const at = new Date(row.created_at);
    if (Number.isNaN(at.getTime())) continue;
    const stars = Number(row.score_delta ?? 0) || 0;
    const levels = Number(row.is_first ?? 0) ? 1 : 0;

    for (const key of periodKeysFor(at)) {
      if (key.periodType === 'all_time') continue; // kaynağı played_levels
      if (!isPeriodCovered(key.startIso, coverageStart)) continue;
      const k = keyOf(key.periodType, key.periodId);
      const existing = target.get(k);
      if (existing) {
        existing.starsGained += stars;
        existing.levelsDone += levels;
      } else {
        target.set(k, {
          periodType: key.periodType,
          periodId: key.periodId,
          starsGained: stars,
          levelsDone: levels,
        });
      }
    }
  }

  // Kanıt penceresi içinde olup hedefte HİÇ görünmeyen mevcut satırlar → 0'lanır
  // (hayalet/şişmiş satır). Pencere dışındakilere dokunulmaz.
  const current = new Map<string, { starsGained: number; levelsDone: number }>();
  for (const row of currentRows.results ?? []) {
    const k = keyOf(row.period_type, row.period_id);
    current.set(k, { starsGained: row.stars_gained, levelsDone: row.levels_done });
    if (target.has(k)) continue;
    const startIso = periodStartOf(row.period_type, row.period_id);
    if (startIso === null) {
      untouched.push({ periodType: row.period_type, periodId: row.period_id, reason: 'unparsable' });
      continue;
    }
    if (!isPeriodCovered(startIso, coverageStart)) {
      untouched.push({ periodType: row.period_type, periodId: row.period_id, reason: 'out-of-coverage' });
      continue;
    }
    target.set(k, {
      periodType: row.period_type as PeriodType,
      periodId: row.period_id,
      starsGained: 0,
      levelsDone: 0,
    });
  }

  // ── Fark ───────────────────────────────────────────────────────────────────
  const changes: PeriodScoreChange[] = [];
  for (const [k, want] of target) {
    const have = current.get(k) ?? null;
    if (have && have.starsGained === want.starsGained && have.levelsDone === want.levelsDone) continue;
    changes.push({ ...want, from: have });
  }

  if (!dryRun && changes.length > 0) {
    // Mutlak değer yazılır (delta değil) → aynı çağrı iki kez çalışsa da sonuç aynıdır.
    const query = `
      INSERT INTO user_period_scores (uid, period_type, period_id, stars_gained, levels_done, updated_at)
      VALUES (?1, ?2, ?3, ?4, ?5, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      ON CONFLICT (uid, period_type, period_id) DO UPDATE SET
        stars_gained = excluded.stars_gained,
        levels_done  = excluded.levels_done,
        updated_at   = excluded.updated_at
    `;
    await db.batch(
      changes.map((ch) =>
        db.prepare(query).bind(uid, ch.periodType, ch.periodId, ch.starsGained, ch.levelsDone),
      ),
    );
  }

  return { uid, dryRun, coverageStart, changes, untouched, affectedRows: changes.length };
}
