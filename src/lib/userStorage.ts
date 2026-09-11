/**
 * DOSYA AMACI: Bu dosya, kullanıcı bazlı (user-scoped) localStorage yardımcı araçlarını barındırır.
 *
 * Anahtarlar (keys), mevcut kullanıcının UID'si ile ön eklenir (localStorage'daki `activeUserId` değerinden okunur),
 * böylece aynı cihazda farklı hesapların verileri birbiriyle çakışmaz.
 *
 * - Düz fonksiyonlar (`userStorageGet` / `userStorageSet` / `userStorageRemove`):
 *   React dışı veya kütüphane kodlarından kullanmak için.
 * - `useUserStorage()` hook'u: React bileşenleri ve hook'larından kullanmak için.
 */

// Aktif kullanıcının UID'sinin saklandığı anahtar
const USER_ID_KEY = 'activeUserId';

/**
 * Anahtarı aktif kullanıcının UID'si ile ön ekleyen yardımcı fonksiyon.
 */
function prefix(key: string): string {
  try {
    const uid = localStorage.getItem(USER_ID_KEY) ?? 'anon';
    return `${uid}:${key}`;
  } catch {
    return `anon:${key}`;
  }
}

/**
 * Kullanıcıya özel anahtarın değerini localStorage'dan getirir.
 */
export function userStorageGet(key: string): string | null {
  try { return localStorage.getItem(prefix(key)); } catch { return null; }
}

/**
 * Kullanıcıya özel anahtarın değerini localStorage'a yazar.
 */
export function userStorageSet(key: string, value: string): void {
  try { localStorage.setItem(prefix(key), value); } catch { /* kota aşımı durumunda hata yoksayılır */ }
}

/**
 * Kullanıcıya özel anahtarı ve değerini localStorage'dan siler.
 */
export function userStorageRemove(key: string): void {
  try { localStorage.removeItem(prefix(key)); } catch { /* hata yoksayılır */ }
}

// ─── React hook ───────────────────────────────────────────────────────────────

import { useCallback } from 'react';

/**
 * React bileşenlerinde kullanıcı bazlı localStorage erişimini sarmalayan hook.
 */
export function useUserStorage() {
  const getItem    = useCallback((key: string) => userStorageGet(key), []);
  const setItem    = useCallback((key: string, value: string) => userStorageSet(key, value), []);
  const removeItem = useCallback((key: string) => userStorageRemove(key), []);
  return { getItem, setItem, removeItem };
}

