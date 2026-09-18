/**
 * DOSYA AMACI: Bu dosya, `level_telemetry` yazımından dönen D1 hatasını
 * sınıflandıran saf fonksiyonu içerir (şema eksik mi, tekrar mı, bilinmeyen mi).
 */

/**
 * Telemetri yazımının başarısızlık türü.
 *
 * - `schema_missing`: tablo/kolon yok. Üretimi sessizce boş bırakan sınıf BUDUR
 *   (migration uygulanmamış). Mutlaka görünür bir olay üretir.
 * - `duplicate`: aynı oturum kimliği ikinci kez gönderildi. Veri kaybı DEĞİLDİR
 *   (satır zaten yazılı); istemcinin yeniden denemesi idempotenttir, alarm üretmez.
 * - `unknown`: sınıflandırılamayan her şey. Alarm üretir.
 */
export type TelemetryWriteFailure = 'schema_missing' | 'duplicate' | 'unknown';

/** D1 hata metinleri: "D1_ERROR: no such table: level_telemetry: SQLITE_ERROR" gibi. */
const SCHEMA_PATTERNS = [/no such table/i, /no such column/i, /has no column named/i];
const DUPLICATE_PATTERNS = [/unique constraint/i, /constraint failed: level_telemetry\.id/i];

/** Hata nesnesinden güvenle okunabilir bir metin çıkarır (hata `Error` olmayabilir). */
export function errorText(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

/**
 * Yazma hatasını türüne ayırır. Yalnızca hata METNİNE bakar — D1 tipli hata
 * kodu vermediği için tek güvenilir sinyal budur.
 */
export function classifyTelemetryWriteError(err: unknown): TelemetryWriteFailure {
  const text = errorText(err);
  if (DUPLICATE_PATTERNS.some((p) => p.test(text))) return 'duplicate';
  if (SCHEMA_PATTERNS.some((p) => p.test(text))) return 'schema_missing';
  return 'unknown';
}

/**
 * Başarısızlık görünür bir olay (audit_logs) üretmeli mi?
 * `duplicate` üretmez: veri zaten yazılıdır, gürültü olur.
 */
export function shouldRaiseAlarm(failure: TelemetryWriteFailure): boolean {
  return failure !== 'duplicate';
}
