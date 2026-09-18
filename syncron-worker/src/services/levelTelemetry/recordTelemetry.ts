/**
 * DOSYA AMACI: Bu dosya, bir oyun oturumu telemetrisini D1'e yazan ve yazım
 * başarısız olursa bunu GÖRÜNÜR bir denetim kaydına (audit_logs) dönüştüren
 * servis fonksiyonunu içerir.
 */

import { insertTelemetry, type LevelTelemetryParams } from '../telemetry';
import { writeAuditLog } from '../auditLog';
import {
  classifyTelemetryWriteError,
  errorText,
  shouldRaiseAlarm,
  type TelemetryWriteFailure,
} from './lib/writeOutcome';

/**
 * Yazma sonucu.
 * - `written`: satır gerçekten eklendi (D1 `changes === 1` ile doğrulandı).
 * - `duplicate`: aynı oturum kimliği tekrar gönderildi; satır zaten var.
 * - `failed`: yazılamadı ve görünür bir olay üretildi.
 */
export type TelemetryRecordResult =
  | { status: 'written' }
  | { status: 'duplicate' }
  | { status: 'failed'; failure: Exclude<TelemetryWriteFailure, 'duplicate'>; message: string };

/** Denetim kaydı eylemi — bu satırı sorgulamak "telemetri yolu kopuk mu?" sorusunu cevaplar. */
export const TELEMETRY_WRITE_FAILED_ACTION = 'telemetry.write_failed';

/**
 * Telemetriyi yazar. Sessiz başarısızlık burada biter:
 *
 * 1. Yazma bir satır değiştirmediyse (`changes !== 1`) bu da başarısızlıktır —
 *    "hata fırlatmadı" yeterli kabul edilmez.
 * 2. `duplicate` dışındaki her başarısızlık `audit_logs`'a yazılır. Bu tablo
 *    telemetri tablosundan bağımsızdır; asıl senaryoda (telemetri tablosu/kolonu
 *    yok) hâlâ yazılabilir durumdadır.
 * 3. Denetim kaydı da yazılamazsa en azından `console.error` kalır — ama artık
 *    hiçbir yol "hiçbir iz bırakmadan" kaybolmaz.
 */
export async function recordLevelTelemetry(
  db: D1Database,
  params: LevelTelemetryParams,
): Promise<TelemetryRecordResult> {
  try {
    const { changes } = await insertTelemetry(db, params);
    if (changes === 1) return { status: 'written' };

    const message = `insert reported changes=${changes}`;
    await raiseAlarm(db, params, 'unknown', message);
    return { status: 'failed', failure: 'unknown', message };
  } catch (err) {
    const failure = classifyTelemetryWriteError(err);
    const message = errorText(err);

    if (!shouldRaiseAlarm(failure)) return { status: 'duplicate' };

    await raiseAlarm(db, params, failure === 'duplicate' ? 'unknown' : failure, message);
    return { status: 'failed', failure: failure === 'duplicate' ? 'unknown' : failure, message };
  }
}

/** Başarısızlığı kalıcı ve sorgulanabilir bir denetim kaydına çevirir. */
async function raiseAlarm(
  db: D1Database,
  params: LevelTelemetryParams,
  failure: Exclude<TelemetryWriteFailure, 'duplicate'>,
  message: string,
): Promise<void> {
  console.error(`[Telemetry] write failed (${failure}):`, message);
  try {
    await writeAuditLog(db, params.uid, TELEMETRY_WRITE_FAILED_ACTION, 'game', {
      failure,
      // Metin kırpılır: denetim kaydı bir hata ayıklama ipucudur, log dökümü değil.
      message: message.slice(0, 200),
      levelId: params.levelId,
      version: params.version,
      outcome: params.outcome,
    });
  } catch (auditErr) {
    console.error('[Telemetry] audit trail for the failed write ALSO failed:', errorText(auditErr));
  }
}
