/**
 * DOSYA AMACI: Bu dosya, liderlik tablosu (leaderboard) verilerini getirmek,
 * önbelleğe (cache) almak ve güncellemeyi kolaylaştırmak amacıyla kullanılan bir React hook'udur.
 */

import { useState, useEffect, useCallback } from 'react';
import { getLeaderboard, LeaderboardResponse } from '@/services/api/leaderboardClient';
import { useAuthContext } from '@/contexts/AuthContext';

// Liderlik tablosu verilerini geçici olarak saklamak için basit bellek içi önbellek
const cache: Record<string, { data: LeaderboardResponse; timestamp: number }> = {};
const CACHE_DURATION = 2 * 60 * 1000; // 2 dakika (milisaniye cinsinden önbellek süresi)

/**
 * useLeaderboard - Liderlik tablosu verilerini çeken, önbellekleyen ve yöneten hook.
 * 
 * @param category Liderlik kategorisi ('stars' | 'levels' | 'records' | 'creators')
 * @param period Zaman dilimi ('daily' | 'weekly' | 'monthly' | 'all_time')
 * @param options Ek filtre seçenekleri (aroundMe: kullanıcının çevresi, friendsOnly: sadece arkadaşlar)
 */
export function useLeaderboard(
  category: 'stars' | 'levels' | 'records' | 'creators',
  period: 'daily' | 'weekly' | 'monthly' | 'all_time',
  options: {
    aroundMe?: boolean;
    friendsOnly?: boolean;
  } = {}
) {
  const { aroundMe = false, friendsOnly = false } = options;
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthContext();

  // Önbellek anahtarını parametrelere göre belirler
  const cacheKey = `${category}:${period}:${aroundMe}:${friendsOnly}:${user?.uid || 'anonymous'}`;

  // Veriyi API'den çeken ana fonksiyon
  const fetchData = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);

    const now = Date.now();
    // Zorlama (force) yoksa ve önbellekte geçerli veri varsa önbellekteki veriyi kullanır
    if (!force && cache[cacheKey] && now - cache[cacheKey].timestamp < CACHE_DURATION) {
      setData(cache[cacheKey].data);
      setLoading(false);
      return;
    }

    try {
      // API istemcisi üzerinden liderlik tablosu isteği gönderilir
      const response = await getLeaderboard(category, period, {
        limit: 50,
        aroundMe,
        friendsOnly,
      });

      if (response.success) {
        // İstek başarılıysa önbelleğe kaydeder ve durumu günceller
        cache[cacheKey] = { data: response, timestamp: now };
        setData(response);
      } else {
        setError('Failed to fetch leaderboard data.');
      }
    } catch (err: any) {
      console.error('[useLeaderboard] Error fetching data:', err);
      setError(err.message || 'An error occurred while fetching leaderboard data.');
    } finally {
      setLoading(false);
    }
  }, [category, period, aroundMe, friendsOnly, cacheKey]);

  // Hook yüklendiğinde veya parametreler değiştiğinde veriyi otomatik çeker
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh: () => fetchData(true), // Verileri yeniden (önbelleği atlayarak) yükleme fonksiyonu
  };
}

export default useLeaderboard;

