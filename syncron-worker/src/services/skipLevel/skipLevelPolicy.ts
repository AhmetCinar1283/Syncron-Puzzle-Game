/**
 * DOSYA AMACI: Level atlama kuralları — yapılandırma ve saf karar fonksiyonu.
 * Yan etkisizdir, birim testlidir. İstemcideki eşdeğer ayar yalnızca UI içindir
 * (src/features/play/lib/skipLevelConfig.ts); bağlayıcı olan buradaki kuraldır.
 */

export interface SkipLevelPolicy {
  /**
   * Aynı anda en fazla kaç level "atlanmış ama çözülmemiş" olabilir. Sınıra ulaşan
   * oyuncu, yeni bir level atlamak için önce atladıklarından birini çözmelidir.
   */
  maxOpenSkips: number;
  /** Bölümün (part) son level'ı atlanabilir mi. */
  allowChapterEnd: boolean;
}

export const SKIP_LEVEL_POLICY: SkipLevelPolicy = {
  maxOpenSkips: 3,
  allowChapterEnd: false,
};

export interface SkipContext {
  /** Level bölümün sıralamasında son sırada mı. */
  isChapterEnd: boolean;
  /** Oyuncu bu level'ı zaten gerçekten çözmüş mü (played_levels). */
  alreadyCompleted: boolean;
  /** Bu level daha önce atlanmış mı (tekrar istek → idempotent, sınıra sayılmaz). */
  alreadySkipped: boolean;
  /** Oyuncunun şu anki açık (çözülmemiş) atlama sayısı. */
  openSkips: number;
}

export type SkipDecision =
  | { ok: true }
  | { ok: false; status: 403 | 409; reason: 'chapter-end' | 'already-completed' | 'skip-limit' };

export function evaluateSkip(ctx: SkipContext, policy: SkipLevelPolicy = SKIP_LEVEL_POLICY): SkipDecision {
  if (ctx.alreadyCompleted) return { ok: false, status: 409, reason: 'already-completed' };
  if (ctx.isChapterEnd && !policy.allowChapterEnd) return { ok: false, status: 403, reason: 'chapter-end' };
  if (!ctx.alreadySkipped && ctx.openSkips >= policy.maxOpenSkips) {
    return { ok: false, status: 409, reason: 'skip-limit' };
  }
  return { ok: true };
}

/**
 * Bölüm sıralamasındaki son level'ın id'si. İstemcideki sıralamayla aynı kural:
 * `position` artan (yoksa 0), eşitlikte kayıt sırası korunur. Eski biçimde girdi
 * düz string olabilir.
 */
export function lastLevelIdInOrder(order: Record<string, unknown>): string | null {
  const entries = Object.entries(order).map(([key, value], index) => {
    if (typeof value === 'string') return { id: value, position: 0, index };
    const obj = (value ?? {}) as { id?: unknown; position?: unknown };
    return {
      id: typeof obj.id === 'string' ? obj.id : key,
      position: typeof obj.position === 'number' ? obj.position : 0,
      index,
    };
  });
  if (entries.length === 0) return null;
  entries.sort((a, b) => a.position - b.position || a.index - b.index);
  return entries[entries.length - 1].id;
}

/** Level bu bölüm sıralamasında var mı. */
export function orderContainsLevel(order: Record<string, unknown>, levelId: string): boolean {
  return Object.entries(order).some(([key, value]) => {
    if (typeof value === 'string') return value === levelId;
    const id = (value as { id?: unknown } | null)?.id;
    return (typeof id === 'string' ? id : key) === levelId;
  });
}
