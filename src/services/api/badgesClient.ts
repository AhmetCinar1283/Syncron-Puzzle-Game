/**
 * DOSYA AMACI: Bu dosya, kullanıcının kazandığı rozetleri getiren ve vitrin rozetlerini
 * güncelleyen API istemci fonksiyonlarını barındırır.
 */

import { workerFetch } from './workerClient';

export interface Badge {
  id: string;
  uid: string;
  badgeType: string;
  periodId: string;
  rank: number;
  awardedAt: string;
}

export interface BadgesResponse {
  success: boolean;
  badges: Badge[];
}

/**
 * Belirli bir kullanıcının kazandığı tüm rozetleri getirir.
 * Herkese açık (kimlik doğrulaması gerektirmeyen) uç noktadır.
 */
export async function getUserBadges(uid: string): Promise<BadgesResponse> {
  return workerFetch<BadgesResponse>(`/badges/${uid}`, {
    method: 'GET',
    requireAuth: false,
  });
}

/**
 * Kullanıcının profilinde sergilemek istediği vitrin rozetlerini günceller (en fazla 5 adet).
 * Kimlik doğrulaması gerektiren uç noktadır.
 */
export async function updateShowcase(badgeIds: string[]): Promise<{ success: boolean }> {
  return workerFetch<{ success: boolean }>('/badges/showcase', {
    method: 'POST',
    body: { badgeIds },
    requireAuth: true,
  });
}

