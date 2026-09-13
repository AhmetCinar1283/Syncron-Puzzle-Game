/**
 * DOSYA AMACI: Bu dosya, oyun oturumu (play) sırasında Cloudflare Worker'a
 * gönderilen telemetri, geri bildirim ve bölüm tamamlama isteklerini yöneten
 * istemci fonksiyonlarını barındırır.
 */

import { workerFetch } from './workerClient';

/** Worker yapılandırılmamışsa (env yok) oyun istekleri tamamen atlanır. */
const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL;

export interface TelemetryPayload {
  id: string;
  levelId: string;
  version: number;
  outcome: 'win' | 'restart' | 'quit';
  timeSpent: number;
  restarts: number;
  deaths: number;
  movesCount: number;
  /** Oturumda kullanılan ipucu sayısı (level zorluk analizi için). */
  hintsUsed: number;
}

/**
 * Oturum telemetrisini worker'a gönderir (`POST /game/telemetry`).
 * Kimlik doğrulama yoksa veya istek başarısız olursa sessizce yutulur (uyarı loglanır).
 */
export async function sendTelemetry(payload: TelemetryPayload): Promise<void> {
  if (!WORKER_URL) return;
  try {
    await workerFetch('/game/telemetry', { method: 'POST', body: payload, requireAuth: true });
  } catch (err) {
    console.warn('[Telemetry] Failed to submit telemetry:', err);
  }
}

export interface FeedbackPayload {
  levelId: string;
  version: number;
  difficulty: 'easy' | 'normal' | 'hard';
  liked: 0 | 1;
}

/**
 * Bölüm geri bildirimini (beğeni + zorluk) worker'a gönderir (`POST /game/feedback`).
 */
export async function sendFeedback(payload: FeedbackPayload): Promise<void> {
  if (!WORKER_URL) return;
  try {
    await workerFetch('/game/feedback', { method: 'POST', body: payload, requireAuth: true });
  } catch (err) {
    console.warn('[Feedback] Failed to submit feedback:', err);
  }
}

export interface CompleteLevelPayload {
  levelId: string;
  moves: string[];
  timeSpent: number;
  /**
   * Bu denemede kullanılan ipucu sayısı. Sunucu kendi grant kayıtlarına bakar;
   * bu değer yalnızca skoru düşürebilir (bkz. docs/scoring.md → Hints).
   */
  hintsUsed: number;
}

export interface CompleteLevelResult<T = any> {
  ok: boolean;
  status?: number;
  data?: T;
  errorText?: string;
}

/**
 * Bölüm tamamlama isteğini worker'a gönderir (`POST /complete-level`) ve
 * hamle geçmişini sunucu tarafında doğrulatır. Çağıran taraf `token`'ı
 * kendi JIT anonim giriş / yenileme mantığıyla sağlar.
 */
export async function completeLevel<T = any>(
  token: string,
  payload: CompleteLevelPayload,
): Promise<CompleteLevelResult<T>> {
  if (!WORKER_URL) return { ok: false, errorText: 'Worker URL not configured' };
  const res = await fetch(`${WORKER_URL}/complete-level`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (res.ok) {
    const data = (await res.json()) as T;
    return { ok: true, status: res.status, data };
  }
  const errorText = await res.text();
  return { ok: false, status: res.status, errorText };
}
