/**
 * DOSYA AMACI: Ödüllü aksiyon altyapısının aksiyondan bağımsız sözleşmesi. Yeni
 * bir ödüllü aksiyon (ör. 05 level atlama) bir `RewardActionHandler` yazar ve
 * `actions.ts`'e ekler; hazırlama/teslim/iptal, kota, tavan ve log ortaktır.
 */

import type { Env } from '../../types';

export interface RewardActionRule {
  /**
   * `false` → aksiyon kapalı: prepare/claim hiçbir iş yapmadan reddedilir (istek
   * loglanır). Kod yerinde kalır, açmak için yalnızca bu bayrak değişir.
   */
  enabled: boolean;
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
  /** 403/409: aksiyonun kuralı bu level/kullanıcı için izin vermiyor (ör. atlama sınırı). */
  | { ok: false; status: 403 | 404 | 409 | 500; reason: string };

/** Teslim edilen kaydın, teslim kancasının ihtiyaç duyduğu alanları. */
export interface DeliveredGrant {
  id: string;
  uid: string;
  levelId: string | null;
  levelVersion: number | null;
  result: unknown;
}

export interface RewardActionHandler<TInput = unknown> {
  rule: RewardActionRule;
  /** Ham girdiyi doğrular; geçersizse `null`. */
  parseInput(raw: unknown): TInput | null;
  /** Aynı girdiyi tanıyan kısa anahtar (yeniden kullanım + kanıt). */
  inputKey(input: TInput): string;
  /** Gerekli kaynağı (ör. level) yükler ve hesaplamayı hazırlar. */
  resolve(
    env: Env,
    params: { uid: string; levelId: string | null; input: TInput },
  ): Promise<RewardResolveResult>;
  /**
   * Ödül teslim edildiğinde sunucuda kalıcı yan etki (ör. level atlama kaydı).
   * İDEMPOTENT olmalıdır: yeniden teslimde ve teslim edilmiş kaydın yeniden
   * kullanımında da çağrılır — ilk çağrı başarısız olduysa böylece onarılır.
   * Hata fırlatırsa istek 500 döner ve istemci claim'i tekrar dener.
   */
  onDelivered?(env: Env, grant: DeliveredGrant): Promise<void>;
}
