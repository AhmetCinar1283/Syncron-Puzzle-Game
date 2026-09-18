/**
 * DOSYA AMACI: `creator_scores` tablosunu kaynağından (played_levels + bölüm
 * sahipliği) yeniden kuran idempotent onarım fonksiyonu.
 * bkz. .plans/yayin-hazirlik/02-veri-dayanikliligi.md §3.2
 */

import { periodKeysFor } from './lib/periods';

/**
 * Bölüm → yapımcı eşlemesini çözen arayüz.
 *
 * Bu servis Firestore'u, servis hesabını ya da HTTP'yi BİLMEZ; yalnızca bu
 * sözleşmeyi bilir. Test, eşlemeyi düz bir nesneyle verir; route katmanı ise
 * Firestore okumasını enjekte eder. (Bağımlılık yalnızca aşağı akar.)
 */
export interface LevelCreatorLookup {
  (levelIds: string[]): Promise<Record<string, string | null>>;
}

export interface CreatorScoreChange {
  uid: string;
  periodType: 'monthly' | 'all_time';
  periodId: string;
  playsGained: number;
  starsGained: number;
  from: { playsGained: number; starsGained: number } | null;
}

export interface RecomputeCreatorScoresResult {
  dryRun: boolean;
  /** Yeniden hesaplanan yapımcı sayısı. */
  creators: string[];
  changes: CreatorScoreChange[];
  affectedRows: number;
  /** Sahibi çözülemeyen bölüm kimlikleri (Firestore'da yok / alan eksik). */
  unresolvedLevels: string[];
}

/**
 * `creator_scores` satırlarını yeniden kurar.
 *
 * ── Sayım semantiği (dikkat: canlı sayaçtan farklı olabilir) ────────────────
 * Canlı yol (`upsertCreatorScores`) HER tamamlamada `plays_gained`'i 1 artırır;
 * aynı oyuncu bölümü 5 kez bitirirse sayaç 5 artar. Buna karşılık bölüm silme
 * geri alması (routes/playedLevels.ts) FARKLI oyuncu sayısını düşer. Yani
 * mevcut sayacın anlamı zaten tutarsızdır.
 * Bu fonksiyon tek bir anlamı temel alır: **bölümü tamamlayan farklı oyuncu
 * sayısı** (played_levels'ta uid+level_id başına tek satır). Geri alma mantığı
 * da bunu varsaydığı için, yeniden hesaplama sonrası sistem KENDİ İÇİNDE
 * tutarlı hâle gelir.
 * Sonuç: yeniden hesaplama bazı yapımcıların `plays_gained` değerini
 * DÜŞÜREBİLİR. Bu yüzden uç nokta varsayılan olarak kuru çalışır (`dryRun`).
 *
 * Alternatifi neydi ve neden reddettim? Tekrarlı oynayışları da saymak için
 *   audit_logs'u kaynak almak. Reddedildi: audit'in 90 günlük penceresi
 *   `all_time` sütununu yeniden kuramaz; sonuç eski yapımcıları sıfırlardı.
 * Yeni bir periyot/ürün eklenince bu dosya değişir mi? Hayır — periyot
 *   kimlikleri `lib/periods.ts`'ten, sahiplik ise enjekte edilen arayüzden gelir.
 * Değer eksik/null gelirse? Sahibi çözülemeyen bölüm hiç sayılmaz ve
 *   `unresolvedLevels` içinde raporlanır; yapımcı skoru sessizce sıfırlanmaz.
 *   Kendi bölümünü oynayan yapımcı (self-play) canlı yoldaki gibi hariç tutulur.
 */
export async function recomputeCreatorScores(
  db: D1Database,
  lookup: LevelCreatorLookup,
  options: { levelId?: string | null; dryRun?: boolean } = {},
): Promise<RecomputeCreatorScoresResult> {
  const dryRun = options.dryRun !== false;

  const completions = await db
    .prepare(
      `SELECT uid, level_id, stars, completed_at
       FROM played_levels WHERE deleted_at IS NULL`,
    )
    .all<{ uid: string; level_id: string; stars: number; completed_at: string }>();
  const rows = completions.results ?? [];

  const levelIds = [...new Set(rows.map((r) => r.level_id))];
  const owners = levelIds.length > 0 ? await lookup(levelIds) : {};
  const unresolvedLevels = levelIds.filter((id) => !owners[id]);

  // Kapsam: tek bölüm verildiyse yalnızca O BÖLÜMÜN sahibi onarılır — ama o
  // sahibin TÜM bölümleri üzerinden, çünkü satırlara mutlak değer yazılır.
  const scopedCreator = options.levelId ? owners[options.levelId] ?? null : null;
  if (options.levelId && scopedCreator === null) {
    return { dryRun, creators: [], changes: [], affectedRows: 0, unresolvedLevels };
  }

  const target = new Map<string, CreatorScoreChange>();
  const keyOf = (uid: string, t: string, id: string) => `${uid}\u0000${t}\u0000${id}`;
  const creators = new Set<string>();

  for (const row of rows) {
    const creator = owners[row.level_id] ?? null;
    if (!creator) continue;
    if (creator === row.uid) continue; // self-play hariç (canlı yolla aynı kural)
    if (scopedCreator !== null && creator !== scopedCreator) continue;

    creators.add(creator);
    const at = new Date(row.completed_at);
    const keys = periodKeysFor(Number.isNaN(at.getTime()) ? new Date(0) : at)
      .filter((k) => k.periodType === 'monthly' || k.periodType === 'all_time');

    for (const key of keys) {
      const k = keyOf(creator, key.periodType, key.periodId);
      const existing = target.get(k);
      if (existing) {
        existing.playsGained += 1;
        existing.starsGained += row.stars;
      } else {
        target.set(k, {
          uid: creator,
          periodType: key.periodType as 'monthly' | 'all_time',
          periodId: key.periodId,
          playsGained: 1,
          starsGained: row.stars,
          from: null,
        });
      }
    }
  }

  // Mevcut satırlar: hedefte olmayanlar 0'lanır (yalnızca kapsamdaki yapımcılar).
  const currentRows = await db
    .prepare(`SELECT uid, period_type, period_id, plays_gained, stars_gained FROM creator_scores`)
    .all<{ uid: string; period_type: string; period_id: string; plays_gained: number; stars_gained: number }>();

  const current = new Map<string, { playsGained: number; starsGained: number }>();
  for (const row of currentRows.results ?? []) {
    const inScope = scopedCreator !== null ? row.uid === scopedCreator : creators.has(row.uid);
    const k = keyOf(row.uid, row.period_type, row.period_id);
    current.set(k, { playsGained: row.plays_gained, starsGained: row.stars_gained });
    if (!inScope || target.has(k)) continue;
    target.set(k, {
      uid: row.uid,
      periodType: row.period_type as 'monthly' | 'all_time',
      periodId: row.period_id,
      playsGained: 0,
      starsGained: 0,
      from: null,
    });
  }

  const changes: CreatorScoreChange[] = [];
  for (const [k, want] of target) {
    const have = current.get(k) ?? null;
    if (have && have.playsGained === want.playsGained && have.starsGained === want.starsGained) continue;
    changes.push({ ...want, from: have });
  }

  if (!dryRun && changes.length > 0) {
    const query = `
      INSERT INTO creator_scores (uid, period_type, period_id, plays_gained, stars_gained, updated_at)
      VALUES (?1, ?2, ?3, ?4, ?5, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      ON CONFLICT (uid, period_type, period_id) DO UPDATE SET
        plays_gained = excluded.plays_gained,
        stars_gained = excluded.stars_gained,
        updated_at   = excluded.updated_at
    `;
    await db.batch(
      changes.map((ch) =>
        db.prepare(query).bind(ch.uid, ch.periodType, ch.periodId, ch.playsGained, ch.starsGained),
      ),
    );
  }

  return {
    dryRun,
    creators: [...creators],
    changes,
    affectedRows: changes.length,
    unresolvedLevels,
  };
}
