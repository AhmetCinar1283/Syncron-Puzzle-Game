/**
 * DOSYA AMACI: İstek parmak izinin saf hesabı — istemci IP'sinin başlıklardan
 * okunması, tuzlanmış karmaya çevrilmesi ve User-Agent'ın kısaltılması.
 * D1, Hono ve olay katalogunu bilmez.
 * bkz. .plans/yayin-hazirlik/05-loglama-ve-adli-iz.md §3.1
 */

/** UA kısaltma sınırı (§3.1). Teşhis için fazlasıyla yeter, depolamayı sınırlar. */
export const USER_AGENT_MAX_LENGTH = 256;

/** Karma çıktısının hex uzunluğu: 32 karakter = 128 bit. Çakışma pratikte imkânsız. */
export const IP_HASH_HEX_LENGTH = 32;

export interface RequestFingerprint {
  /** Tuzlanmış SHA-256 karması (hex, 32 karakter) veya toplanamadıysa `null`. */
  ip: string | null;
  /** Kısaltılmış User-Agent veya yoksa `null`. */
  userAgent: string | null;
}

/**
 * Cloudflare'in istemci IP başlığı. `X-Forwarded-For` GÜVENİLMEZ: istemci onu
 * serbestçe uydurabilir ve adli izi zehirleyebilir (§3.1 — açık yasak).
 */
const CLIENT_IP_HEADER = 'CF-Connecting-IP';

/** Başlıklardan ham istemci IP'sini okur. Bu değer HİÇBİR ZAMAN saklanmaz. */
export function readClientIp(headers: { get(name: string): string | null }): string | null {
  const value = headers.get(CLIENT_IP_HEADER);
  return value && value.trim() !== '' ? value.trim() : null;
}

/** Başlıklardan User-Agent'ı okur ve kısaltır. */
export function readUserAgent(headers: { get(name: string): string | null }): string | null {
  const value = headers.get('User-Agent');
  if (!value || value.trim() === '') return null;
  return value.slice(0, USER_AGENT_MAX_LENGTH);
}

/**
 * Ham IP'yi tuzlanmış SHA-256 karmasına çevirir.
 *
 * Alternatifi neydi ve neden reddettim?
 *   (a) HAM IP saklamak — soruşturmada marjinal fayda (abuse@ ihbarı doğrudan
 *       yapılabilir), buna karşılık doğrudan tanımlayıcı bir kişisel verinin
 *       30 gün boyunca veritabanında durması. Reddedildi: bu izin ihtiyacı
 *       "aynı kaynak mı?" sorusudur, "hangi abone?" değil; karma bu soruyu
 *       tam olarak cevaplar (00-ilkeler.md §2.4 veri minimizasyonu).
 *   (b) TUZSUZ karma — reddedildi: IPv4 uzayı 2^32'dir, tuzsuz bir karma
 *       birkaç dakikada kaba kuvvetle geri çevrilir; yani ham IP saklamakla
 *       aynı şeydir, üstelik "karma tutuyoruz" diye yanlış güven verir.
 *   (c) IP'yi /24'e kısaltmak — reddedildi: mobil operatör NAT'ında aynı /24
 *       binlerce meşru oyuncuyu kapsar; hem ilişkilendirme değeri düşer hem de
 *       yine kaba bir konum verisi kalır.
 * Yeni bir olay tipi eklenince bu dosya değişmek zorunda mı? HAYIR — burada
 *   hiçbir olay adı geçmez.
 * Değer eksik/null gelirse? IP yoksa veya TUZ yoksa `null` döner ve olay yine
 *   yazılır. Tuz yokken ham IP'ye DÜŞÜLMEZ — sessizce kişisel veri saklamak,
 *   iz tutmamaktan daha kötüdür.
 */
export async function hashIp(rawIp: string | null, salt: string | undefined | null): Promise<string | null> {
  if (!rawIp) return null;
  if (!salt || salt.trim() === '') return null;

  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${rawIp}`));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, IP_HASH_HEX_LENGTH);
}

/** Başlıklardan tam parmak izini üretir (karma IP + kısaltılmış UA). */
export async function buildFingerprint(
  headers: { get(name: string): string | null },
  salt: string | undefined | null,
): Promise<RequestFingerprint> {
  return {
    ip: await hashIp(readClientIp(headers), salt),
    userAgent: readUserAgent(headers),
  };
}
