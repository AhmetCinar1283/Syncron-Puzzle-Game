/**
 * DOSYA AMACI: Soğuk dışa aktarımın (Katman D) tablo kaydı ve saf yardımcıları:
 * hangi tablolar kopyalanır, R2 anahtarı nasıl kurulur, bir anahtar ne zaman
 * saklama penceresinin dışına düşer.
 * bkz. .plans/yayin-hazirlik/02-veri-dayanikliligi.md §3.3
 */

/**
 * Dışa aktarılan tablolar — YALNIZCA kaynak (source of truth) tablolar.
 *
 * Türetilmiş tablolar (`user_period_scores`, `creator_scores`,
 * `user_world_records`, `badges`, `level_telemetry`, `level_feedback`)
 * BİLİNÇLİ OLARAK dışarıdadır: onların onarımı kopya değil, yeniden
 * hesaplamadır (`recomputeUserScores` / `recomputeCreatorScores`).
 *
 * Alternatifi neydi ve neden reddettim? `sqlite_master`'dan tüm tabloları
 *   otomatik listelemek. Reddedildi: yeni bir analitik tablo eklendiği anda
 *   dışa aktarım sessizce şişer, maliyet artar ve kişisel veri kapsamı
 *   kimse fark etmeden genişler (00-ilkeler §2.4). Kapsam AÇIK olmalıdır.
 * Yeni bir kaynak tablo eklenince bu dosya değişmek zorunda mı? EVET — ve bu
 *   bilinçli bir maliyettir: "bu tablonun kaybı telafi edilemez mi?" sorusunun
 *   bir insan tarafından cevaplanmasını zorunlu kılar.
 * Değer eksik gelirse? Tablo D1'de yoksa (migration uygulanmamış) o tablo
 *   atlanır ve hata raporlanır; diğer tabloların dışa aktarımı durmaz.
 */
export const EXPORT_TABLES = [
  'played_levels',
  'skipped_levels',
  'deleted_levels',
  'donor_profiles',
  'store_events',
  'reward_grants',
  'daily_results',
  'daily_streaks',
  'daily_puzzles',
  'daily_schedule',
  'daily_settings',
  'user_bans',
  'user_profiles',
  'friendships',
  'audit_logs',
] as const;

export type ExportTable = (typeof EXPORT_TABLES)[number];

/** Tablo adı allowlist'te mi? SQL'e tablo adı BAĞLANAMADIĞI için tek savunma budur. */
export function isExportTable(name: string): name is ExportTable {
  return (EXPORT_TABLES as readonly string[]).includes(name);
}

/** 'exports/YYYY-MM-DD/' — tek bir çalıştırmanın kök öneki. */
export function exportRunPrefix(date: Date): string {
  return `exports/${date.toISOString().slice(0, 10)}/`;
}

/**
 * Bir tablonun R2 anahtarı.
 * Tek parçalık dışa aktarımda görev dosyasındaki düzen birebir korunur
 * (`exports/YYYY-MM-DD/<tablo>.ndjson`); büyük tablolar parçalanır.
 */
export function exportObjectKey(date: Date, table: string, part: number, isOnlyPart: boolean): string {
  const prefix = exportRunPrefix(date);
  if (isOnlyPart) return `${prefix}${table}.ndjson`;
  return `${prefix}${table}.part-${String(part).padStart(4, '0')}.ndjson`;
}

/** NDJSON: satır başına bir JSON nesnesi. */
export function toNdjson(rows: Array<Record<string, unknown>>): string {
  return rows.map((row) => JSON.stringify(row)).join('\n');
}

/**
 * `exports/YYYY-MM-DD/` önekinden tarihi çözer. Tanınmayan önek için `null`
 * döner — ve tanınmayan önek ASLA silinmez (bilinmeyen veriyi silmemek esastır).
 */
export function exportPrefixDate(prefix: string): string | null {
  const m = /^exports\/(\d{4}-\d{2}-\d{2})\/$/.exec(prefix);
  return m ? m[1] : null;
}

/**
 * Bu önek saklama penceresinin dışında mı?
 * `null` tarih → false (sil deme). Sınırdakiler korunur (kesin eskiyse siler).
 */
export function isPrunablePrefix(prefix: string, cutoffIsoDate: string): boolean {
  const date = exportPrefixDate(prefix);
  if (date === null) return false;
  return date < cutoffIsoDate;
}

/** Saklama penceresi: en az 8 hafta isteniyor; 12 hafta tutulur (pay bırakılır). */
export const EXPORT_RETENTION_WEEKS = 12;

/** Verilen andan `EXPORT_RETENTION_WEEKS` kadar geriye giden 'YYYY-MM-DD' eşiği. */
export function exportPruneCutoff(now: Date): string {
  const cutoff = new Date(now.getTime() - EXPORT_RETENTION_WEEKS * 7 * 24 * 60 * 60 * 1000);
  return cutoff.toISOString().slice(0, 10);
}
