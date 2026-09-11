/**
 * DOSYA AMACI: Bu dosya, arkadaşlık ilişkileri, arkadaş arama, arkadaşlık istekleri
 * ve engelleme işlemlerini yöneten API istemci fonksiyonlarını barındırır.
 */

import { workerFetch } from './workerClient';

export interface Friend {
  uid: string;
  displayName: string;
  tag: string | null;
  showcaseBadges?: any[];
  friendsSince?: string;
}

export interface FriendRequest {
  uid: string;
  displayName: string;
  tag: string | null;
  showcaseBadges?: any[];
  requestedAt?: string;
}

export interface UserSearchResult {
  uid: string;
  displayName: string;
  tag: string | null;
  showcaseBadges?: any[];
  friendshipStatus: 'none' | 'pending' | 'accepted';
  friendshipRequestedBy: string | null;
}

/**
 * Giriş yapmış kullanıcının kabul edilmiş arkadaş listesini getirir.
 */
export async function getFriends(): Promise<{ success: boolean; friends: Friend[] }> {
  return workerFetch<{ success: boolean; friends: Friend[] }>('/friends', {
    method: 'GET',
    requireAuth: true,
  });
}

/**
 * Kullanıcıya gelen bekleyen arkadaşlık isteklerini getirir.
 */
export async function getFriendRequests(): Promise<{ success: boolean; requests: FriendRequest[] }> {
  return workerFetch<{ success: boolean; requests: FriendRequest[] }>('/friends/requests', {
    method: 'GET',
    requireAuth: true,
  });
}

/**
 * Benzersiz etikete (tag) göre kullanıcı profillerini arar.
 */
export async function searchUserByTag(tag: string): Promise<{ success: boolean; users: UserSearchResult[] }> {
  return workerFetch<{ success: boolean; users: UserSearchResult[] }>(
    `/users/search?tag=${encodeURIComponent(tag)}`,
    {
      method: 'GET',
      requireAuth: true,
    }
  );
}

/**
 * Hedef UID veya etiket (tag) kullanarak arkadaşlık isteği gönderir.
 */
export async function sendFriendRequest(params: {
  targetUid?: string;
  targetTag?: string;
}): Promise<{ success: boolean }> {
  return workerFetch<{ success: boolean }>('/friends/request', {
    method: 'POST',
    body: params,
    requireAuth: true,
  });
}

/**
 * Gelen arkadaşlık isteğini kabul eder.
 */
export async function acceptFriendRequest(uid: string): Promise<{ success: boolean }> {
  return workerFetch<{ success: boolean }>('/friends/accept', {
    method: 'POST',
    body: { uid },
    requireAuth: true,
  });
}

/**
 * Gelen arkadaşlık isteğini reddeder veya iptal eder.
 */
export async function rejectFriendRequest(uid: string): Promise<{ success: boolean }> {
  return workerFetch<{ success: boolean }>('/friends/reject', {
    method: 'POST',
    body: { uid },
    requireAuth: true,
  });
}

/**
 * Mevcut arkadaşlığı siler / arkadaşı listeden çıkarır.
 */
export async function removeFriend(uid: string): Promise<{ success: boolean }> {
  return workerFetch<{ success: boolean }>(`/friends/${uid}`, {
    method: 'DELETE',
    requireAuth: true,
  });
}

/**
 * Başka bir kullanıcıyı engeller.
 */
export async function blockUser(uid: string): Promise<{ success: boolean }> {
  return workerFetch<{ success: boolean }>(`/friends/block/${uid}`, {
    method: 'POST',
    requireAuth: true,
  });
}

/**
 * Engellenmiş bir kullanıcının engelini kaldırır.
 */
export async function unblockUser(uid: string): Promise<{ success: boolean }> {
  return workerFetch<{ success: boolean }>(`/friends/block/${uid}`, {
    method: 'DELETE',
    requireAuth: true,
  });
}

/**
 * Engellenmiş kullanıcıların listesini getirir.
 */
export async function getBlockedUsers(): Promise<{ success: boolean; blocked: Friend[] }> {
  return workerFetch<{ success: boolean; blocked: Friend[] }>('/friends/blocked', {
    method: 'GET',
    requireAuth: true,
  });
}


