/**
 * DOSYA AMACI: Günlük bulmaca sonucunun spoiler vermeyen, Wordle tarzı paylaşım
 * metnini üretir (ör. "Syncron #142 ⭐⭐⭐ 14 hamle 🔥5"). Saf fonksiyon: çeviri
 * ve link çağırandan gelir; çözüm/hamle dizisi asla metne girmez.
 */

export interface ShareResultInput {
  number: number;
  stars: number;
  moveCount: number;
  /** Seri; 0 veya altıysa gösterilmez. */
  streak: number;
  hinted: boolean;
  /** Dış link açılamayan platformlarda (portal) verilmez. */
  url?: string;
}

export interface ShareLabels {
  /** "{n} hamle" gibi — `{n}` yer tutucusu içerir. */
  moves: string;
  /** İpucu kullanıldı işareti (ör. "💡 ipucu"). */
  hinted: string;
}

export function buildShareText(input: ShareResultInput, labels: ShareLabels): string {
  const stars = '⭐'.repeat(Math.max(0, Math.min(3, input.stars)));
  const parts = [`Syncron #${input.number}`, stars, labels.moves.replace('{n}', String(input.moveCount))];
  if (input.hinted) parts.push(labels.hinted);
  if (input.streak > 0) parts.push(`🔥${input.streak}`);
  const line = parts.filter(Boolean).join(' ');
  return input.url ? `${line}\n${input.url}` : line;
}
