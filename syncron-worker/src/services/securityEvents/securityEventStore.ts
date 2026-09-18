/**
 * DOSYA AMACI: `security_events` tablosunun tek D1 erişim katmanı — yazma,
 * kullanıcı bazlı okuma ve saklama süresi dolmuş satırların silinmesi.
 * Bu dosyada hiçbir olay adı ve hiçbir politika kararı geçmez.
 *
 * `services/auditLog.ts` ile aynı disiplin: TÜM sorgular `.bind()` ile
 * parametrelidir; SQL içine string interpolasyonu KESİNLİKLE yasaktır.
 * bkz. .plans/yayin-hazirlik/05-loglama-ve-adli-iz.md §3.2
 */

import type { SecurityEventType } from './lib/eventCatalog';

export interface SecurityEventRow {
  id: string;
  uid: string | null;
  event_type: string;
  endpoint: string;
  ip: string | null;
  user_agent: string | null;
  metadata: string;
  created_at: string;
}

export interface SecurityEventEntry {
  id: string;
  uid: string | null;
  eventType: string;
  endpoint: string;
  /** Tuzlanmış karma (hex) veya `null` — HAM IP DEĞİL. */
  ipHash: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface SecurityEventInsert {
  uid: string | null;
  eventType: SecurityEventType;
  endpoint: string;
  ip: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
}

/** Tek satır ekler. Çağıran, kişisel veri politikasını ZATEN uygulamış olmalıdır. */
export async function insertSecurityEvent(db: D1Database, event: SecurityEventInsert): Promise<void> {
  await db
    .prepare(
      `INSERT INTO security_events (uid, event_type, endpoint, ip, user_agent, metadata)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
    )
    .bind(
      event.uid,
      event.eventType,
      event.endpoint,
      event.ip,
      event.userAgent,
      JSON.stringify(event.metadata),
    )
    .run();
}

/** Bir kullanıcının en yeni güvenlik olayları (admin okuma yolu). */
export async function querySecurityEventsByUid(
  db: D1Database,
  uid: string,
  limit = 50,
  offset = 0,
): Promise<SecurityEventEntry[]> {
  const result = await db
    .prepare(
      `SELECT id, uid, event_type, endpoint, ip, user_agent, metadata, created_at
       FROM security_events
       WHERE uid = ?1
       ORDER BY created_at DESC
       LIMIT ?2 OFFSET ?3`,
    )
    .bind(uid, limit, offset)
    .all<SecurityEventRow>();

  return (result.results ?? []).map(toEntry);
}

/**
 * Saklama süresi dolmuş satırları siler. ARŞİVLEMEZ — `security_events`
 * R2'ye asla gitmez (§3.1; kişisel veriyi soğuk depoya taşımamak esastır).
 * Tek çalıştırmada silinen satır sayısını döner.
 */
export async function deleteSecurityEventsOlderThan(
  db: D1Database,
  cutoffIso: string,
  batchSize: number,
): Promise<number> {
  const result = await db
    .prepare(
      `DELETE FROM security_events
       WHERE id IN (
         SELECT id FROM security_events WHERE created_at < ?1 ORDER BY created_at ASC LIMIT ?2
       )`,
    )
    .bind(cutoffIso, batchSize)
    .run();

  // D1 sürücüleri arasında alan adı değişebildiği için iki isim de okunur.
  const meta = result.meta as { changes?: number; rows_written?: number } | undefined;
  return meta?.changes ?? meta?.rows_written ?? 0;
}

function toEntry(row: SecurityEventRow): SecurityEventEntry {
  return {
    id: row.id,
    uid: row.uid,
    eventType: row.event_type,
    endpoint: row.endpoint,
    ipHash: row.ip,
    userAgent: row.user_agent,
    metadata: safeParseJson(row.metadata),
    createdAt: row.created_at,
  };
}

function safeParseJson(str: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(str);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}
