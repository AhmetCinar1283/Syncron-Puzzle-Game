/**
 * DOSYA AMACI: Bu dosya, destek biletleri (support tickets) oluşturmak için
 * Cloudflare Worker API'sine istek gönderen istemci fonksiyonlarını barındırır.
 */

import { getWorkerIdToken } from './workerClient';
import type { TicketCategory } from '@/services/firebase/supportTypes';

export interface CreateTicketResult {
  success: boolean;
  ticketId?: string;
  /** HTTP durum kodu (başarısız istekler için, örn. 429 rate limit). */
  errorStatus?: number;
  /** Sunucudan gelen ham veya ayrıştırılmış hata mesajı. */
  errorMessage?: string;
}

/**
 * Yeni bir destek bileti oluşturur (`POST /create-ticket`).
 * Kimlik doğrulama zorunludur.
 */
export async function createTicket(
  category: TicketCategory,
  subject: string,
  body: string,
): Promise<CreateTicketResult> {
  const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL;
  if (!WORKER_URL) {
    throw new Error('Worker URL is not configured.');
  }

  const token = await getWorkerIdToken();
  if (!token) {
    throw new Error('Failed to retrieve authentication token.');
  }

  const response = await fetch(`${WORKER_URL}/create-ticket`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ category, subject, body }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = errorText;
    try {
      const errObj = JSON.parse(errorText);
      errorMessage = errObj.error || errorText;
    } catch {
      // ham metin kullanılır
    }
    return { success: false, errorStatus: response.status, errorMessage };
  }

  const data = await response.json();
  if (data.success && data.ticketId) {
    return { success: true, ticketId: data.ticketId };
  }
  throw new Error('Response did not contain a ticketId.');
}
