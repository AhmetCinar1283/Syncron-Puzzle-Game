/**
 * DOSYA AMACI: Ödüllü aksiyon altyapısının aksiyondan bağımsız sözleşmesi. Yeni
 * bir ödüllü aksiyon (ör. 05 level atlama) bir `RewardActionHandler` yazar ve
 * `actions.ts`'e ekler; hazırlama/teslim/iptal, kota, tavan ve log ortaktır.
 */

import type { Env } from '../../types';

export interface RewardActionRule {
  /** Aksiyon bir level'a bağlı mı (`levelId` zorunlu). */
  requiresLevel: boolean;
  /** Level başına ücretsiz hak (reklamı olmayan platformlar). 0 = ücretsiz yol yok. */
  freePerLevel: number;
  /** Kullanıcı başına 24 saatte en fazla yeni kayıt (hesaplama bütçesi / kötüye kullanım). */
  maxPerUidPerDay: number;
  /** Kullanıcı başına 1 dakikada en fazla yeni kayıt (ani yük). */
  maxPerUidPerMinute: number;
}

export type RewardComputeResult =
  | { ok: true; result: unknown }
  /** Ödül bu girdi için üretilemedi (ör. çözücü bütçesi yetmedi) — loglanır, reklam gösterilmez. */
  | { ok: false; kind: 'unavailable'; reason: string }
  /** Girdi geçersiz (ör. oynatılamayan hamle dizisi) — istemci hatası. */
  | { ok: false; kind: 'invalid'; reason: string };

export type RewardResolveResult =
  | {
      ok: true;
      levelVersion: number | null;
      /** Ağır hesaplama; yalnızca yeniden kullanılabilir kayıt yoksa ve tavan aşılmadıysa çağrılır. */
      compute: () => RewardComputeResult;
    }
  | { ok: false; status: 404 | 500; reason: string };

export interface RewardActionHandler<TInput = unknown> {
  rule: RewardActionRule;
  /** Ham girdiyi doğrular; geçersizse `null`. */
  parseInput(raw: unknown): TInput | null;
  /** Aynı girdiyi tanıyan kısa anahtar (yeniden kullanım + kanıt). */
  inputKey(input: TInput): string;
  /** Gerekli kaynağı (ör. level) yükler ve hesaplamayı hazırlar. */
  resolve(env: Env, params: { levelId: string | null; input: TInput }): Promise<RewardResolveResult>;
}
