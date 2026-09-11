/**
 * DOSYA AMACI: Bu dosya, yönetici (admin) işlemlerini gerçekleştirmek üzere Cloudflare Worker
 * üzerindeki korumalı API uç noktalarına yetkilendirilmiş istekler gönderen fonksiyonları barındırır.
 */

import { auth } from '@/services/firebase';

/**
 * Giriş yapmış olan yöneticinin Firebase Kimlik Belirtecini (ID Token) getirir.
 * Eğer belirtecin süresinin dolmasına 5 dakikadan az kaldıysa otomatik yeniler.
 */
export async function getAdminIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const tokenResult = await user.getIdTokenResult();
    const expirationTime = new Date(tokenResult.expirationTime).getTime();
    const now = Date.now();

    // Belirtecin süresi 5 dakikadan az sürede dolacaksa yenilemeye zorla (force refresh)
    const forceRefresh = expirationTime - now < 5 * 60 * 1000;
    return await user.getIdToken(forceRefresh);
  } catch (err) {
    console.error('[adminClient] Error resolving Firebase ID Token:', err);
    // Hata durumunda alternatif olarak yenilemeye zorlayarak tekrar dener
    return await user.getIdToken(true);
  }
}

/**
 * Güvenli yönetici API uç noktalarına HTTP istekleri atmayı sağlayan yardımcı fonksiyon.
 * İstek başlıklarına (headers) otomatik olarak Bearer token ekler.
 */
export async function fetchAdminApi<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAdminIdToken();
  if (!token) {
    throw new Error('Unauthorized: No active admin/moderator session.');
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_WORKER_URL ||
    process.env.NEXT_PUBLIC_WORKER_API_URL ||
    '';

  // Yolun '/' ile başladığından emin olunur
  const sanitizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${baseUrl}${sanitizedPath}`;

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    try {
      const errorJson = await response.json();
      if (errorJson && errorJson.error) {
        errorMessage = errorJson.error;
      }
    } catch {
      // JSON ayrıştırma hatası yoksayılır, varsayılan mesaj kalır
    }
    throw new Error(errorMessage);
  }

  return (await response.json()) as T;
}

export interface BanRecord {
  id: string;
  uid: string;
  ban_type: 'platform' | 'tag' | 'social' | 'coop';
  reason: string;
  issued_by: string;
  issued_at: string;
  expires_at: string | null;
  lifted_at: string | null;
  lifted_by: string | null;
}

export interface ActiveBan {
  id: string;
  uid: string;
  ban_type: 'platform' | 'tag' | 'social' | 'coop';
  reason: string;
  issued_by: string;
  issued_at: string;
  expires_at: string | null;
}

export interface UserBansResponse {
  success: boolean;
  bans: BanRecord[];
  activeBans: ActiveBan[];
}

export interface IssueBanParams {
  banType: 'platform' | 'tag' | 'social' | 'coop';
  reason: string;
  expiresAt?: string;
}

/**
 * Belirli bir kullanıcının yasaklama (ban) geçmişini getirir.
 */
export async function getUserBans(uid: string): Promise<UserBansResponse> {
  return fetchAdminApi<UserBansResponse>(`/admin/users/${uid}/bans`, {
    method: 'GET',
  });
}

/**
 * Belirli bir kullanıcıya yeni bir yasaklama uygular.
 */
export async function issueUserBan(uid: string, params: IssueBanParams): Promise<{ success: boolean }> {
  return fetchAdminApi<{ success: boolean }>(`/admin/users/${uid}/bans`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

/**
 * Belirli bir kullanıcının yasaklamasını kaldırır.
 */
export async function liftUserBan(uid: string, banId: string): Promise<{ success: boolean }> {
  return fetchAdminApi<{ success: boolean }>(`/admin/users/${uid}/bans/${banId}/lift`, {
    method: 'POST',
  });
}


