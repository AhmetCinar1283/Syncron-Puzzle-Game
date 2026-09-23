/**
 * DOSYA AMACI: Saniye cinsinden verilen süreyi 'dakika:saniye' (m:ss) formatında
 * okunabilir metne dönüştüren saf yardımcı fonksiyon.
 */

export function formatDuration(seconds = 0): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safeSeconds / 60);
  const rem = safeSeconds % 60;
  return `${m}:${rem.toString().padStart(2, '0')}`;
}
