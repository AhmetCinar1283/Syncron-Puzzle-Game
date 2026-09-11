import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchAdminApi, getUserBans, issueUserBan, liftUserBan, BanRecord, ActiveBan } from '@/services/api/adminClient';
import { useAuth } from '@/hooks/useAuth';
import type { AuditLogEntry, AuditLogStat, PlayedLevelEntry, PlayedLevelSort, UserProfileData } from '../lib/types';

export function useAdminUserProfile(isTr: boolean) {
  // Resolve uid dynamic query parameter from searchParams at runtime
  const searchParams = useSearchParams();
  const uid = searchParams.get('uid') || '';

  const { user, loading: authLoading } = useAuth();

  // Core profile data states
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [stats, setStats] = useState<AuditLogStat[]>([]);
  const [lastActivity, setLastActivity] = useState<string | null>(null);
  const [playedLevels, setPlayedLevels] = useState<PlayedLevelEntry[]>([]);
  const [playedSort, setPlayedSort] = useState<PlayedLevelSort>('date');

  // Logs states
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [logsOffset, setLogsOffset] = useState(0);
  const [logsHasMore, setLogsHasMore] = useState(true);
  const [logsLoadingMore, setLogsLoadingMore] = useState(false);

  // Logs filters
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [actionQuery, setActionQuery] = useState('');
  const [debouncedActionQuery, setDebouncedActionQuery] = useState('');
  const [dateAfter, setDateAfter] = useState('');
  const [dateBefore, setDateBefore] = useState('');

  // Skeletons and Loadings
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // Ban states
  const [bans, setBans] = useState<BanRecord[]>([]);
  const [activeBans, setActiveBans] = useState<ActiveBan[]>([]);
  const [loadingBans, setLoadingBans] = useState(true);

  // Modal and Ban action states
  const [showBanModal, setShowBanModal] = useState(false);
  const [banType, setBanType] = useState<'platform' | 'tag' | 'social' | 'coop'>('platform');
  const [durationOption, setDurationOption] = useState<'permanent' | 'temporary'>('permanent');
  const [expiresAt, setExpiresAt] = useState('');
  const [banReason, setBanReason] = useState('');
  const [submittingBan, setSubmittingBan] = useState(false);
  const [banError, setBanError] = useState<string | null>(null);

  async function reloadBans() {
    setLoadingBans(true);
    try {
      const res = await getUserBans(uid);
      if (res.success) {
        setBans(res.bans || []);
        setActiveBans(res.activeBans || []);
      }
    } catch (err) {
      console.error('[AdminWorkspace] Error reloading bans:', err);
    } finally {
      setLoadingBans(false);
    }
  }

  const handleIssueBan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!banReason.trim()) {
      setBanError(isTr ? 'Lütfen bir gerekçe girin.' : 'Please enter a reason.');
      return;
    }
    if (banReason.length > 500) {
      setBanError(isTr ? 'Gerekçe en fazla 500 karakter olabilir.' : 'Reason must be at most 500 characters.');
      return;
    }

    const confirmMsg = isTr
      ? 'Bu işlem geri alınabilir. Devam etmek istiyor musunuz?'
      : 'This action can be reverted. Do you want to proceed?';
    if (!window.confirm(confirmMsg)) return;

    setSubmittingBan(true);
    setBanError(null);

    try {
      const expiresAtParam =
        durationOption === 'temporary' && expiresAt ? new Date(expiresAt).toISOString() : undefined;

      const res = await issueUserBan(uid, {
        banType,
        reason: banReason.trim(),
        expiresAt: expiresAtParam,
      });

      if (res.success) {
        setShowBanModal(false);
        setBanReason('');
        setExpiresAt('');
        setDurationOption('permanent');
        setBanType('platform');
        await reloadBans();
        // Also reload profile in case tag/role got affected
        const profileRes = await fetchAdminApi(`/admin/users/${uid}`);
        if (profileRes.success) {
          setProfile(profileRes.user);
        }
      }
    } catch (err: any) {
      setBanError(err.message || (isTr ? 'Ban işlemi başarısız oldu.' : 'Failed to issue ban.'));
    } finally {
      setSubmittingBan(false);
    }
  };

  const handleLiftBan = async (banId: string) => {
    const confirmMsg = isTr
      ? 'Bu ban kaydını kaldırmak istediğinizden emin misiniz?'
      : 'Are you sure you want to lift this ban?';
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await liftUserBan(uid, banId);
      if (res.success) {
        await reloadBans();
        // Also reload profile
        const profileRes = await fetchAdminApi(`/admin/users/${uid}`);
        if (profileRes.success) {
          setProfile(profileRes.user);
        }
      }
    } catch (err: any) {
      alert(err.message || (isTr ? 'Ban kaldırma işlemi başarısız oldu.' : 'Failed to lift ban.'));
    }
  };

  // Debouncing Action search filter
  useEffect(() => {
    const t = setTimeout(() => setDebouncedActionQuery(actionQuery.trim()), 400);
    return () => clearTimeout(t);
  }, [actionQuery]);

  // Load profile & statistics
  useEffect(() => {
    async function loadWorkspaceData() {
      setLoadingProfile(true);
      setLoadingBans(true);
      try {
        const [profileRes, statsRes, levelsRes, bansRes] = await Promise.all([
          fetchAdminApi(`/admin/users/${uid}`),
          fetchAdminApi(`/admin/users/${uid}/stats`),
          fetchAdminApi(`/admin/users/${uid}/played-levels?limit=100`),
          getUserBans(uid),
        ]);

        if (profileRes.success) {
          setProfile(profileRes.user);
        }
        if (statsRes.success) {
          const s = statsRes.stats || { totalCount: 0, levelsCompleted: 0, ticketsCreated: 0 };
          const gameCount = s.levelsCompleted || 0;
          const supportCount = s.ticketsCreated || 0;
          const accountCount = Math.max(0, (s.totalCount || 0) - gameCount - supportCount);

          const mappedStats: AuditLogStat[] = [
            { category: 'game' as const, count: gameCount },
            { category: 'support' as const, count: supportCount },
            { category: 'account' as const, count: accountCount },
          ].filter((item) => item.count > 0);

          setStats(mappedStats);
          setLastActivity(statsRes.lastActivity || null);
        }
        if (levelsRes.success) {
          setPlayedLevels(levelsRes.playedLevels || []);
        }
        if (bansRes.success) {
          setBans(bansRes.bans || []);
          setActiveBans(bansRes.activeBans || []);
        }
      } catch (err) {
        console.error('[AdminWorkspace] Error loading workspace data:', err);
      } finally {
        setLoadingProfile(false);
        setLoadingBans(false);
      }
    }

    if (uid && !authLoading && user) {
      loadWorkspaceData();
    }
  }, [uid, authLoading, user]);

  // Load audit logs with dynamic filters
  useEffect(() => {
    let active = true;

    async function loadLogs() {
      setLoadingLogs(true);
      try {
        // Construct query parameters
        const params = new URLSearchParams();
        params.append('limit', '15');
        params.append('offset', '0'); // Reset offset on filter change

        if (activeCategory !== 'all') {
          params.append('category', activeCategory);
        }
        if (debouncedActionQuery !== '') {
          params.append('action', debouncedActionQuery);
        }
        if (dateAfter !== '') {
          params.append('after', new Date(dateAfter).toISOString());
        }
        if (dateBefore !== '') {
          params.append('before', new Date(dateBefore).toISOString());
        }

        const res = await fetchAdminApi(`/admin/users/${uid}/logs?${params.toString()}`);
        if (res.success && active) {
          setLogs(res.logs || []);
          setLogsOffset(0);
          setLogsHasMore((res.logs || []).length === 15);
        }
      } catch (err) {
        console.error('[AdminWorkspace] Error querying logs:', err);
      } finally {
        if (active) setLoadingLogs(false);
      }
    }

    if (uid && !authLoading && user) {
      loadLogs();
    }

    return () => {
      active = false;
    };
  }, [uid, activeCategory, debouncedActionQuery, dateAfter, dateBefore, authLoading, user]);

  // Fetch more logs (Pagination)
  const fetchMoreLogs = async () => {
    if (logsLoadingMore || !logsHasMore || !uid) return;

    setLogsLoadingMore(true);
    try {
      const nextOffset = logsOffset + 15;
      const params = new URLSearchParams();
      params.append('limit', '15');
      params.append('offset', String(nextOffset));

      if (activeCategory !== 'all') {
        params.append('category', activeCategory);
      }
      if (debouncedActionQuery !== '') {
        params.append('action', debouncedActionQuery);
      }
      if (dateAfter !== '') {
        params.append('after', new Date(dateAfter).toISOString());
      }
      if (dateBefore !== '') {
        params.append('before', new Date(dateBefore).toISOString());
      }

      const res = await fetchAdminApi(`/admin/users/${uid}/logs?${params.toString()}`);
      if (res.success) {
        const nextLogs = res.logs || [];
        setLogs((prev) => [...prev, ...nextLogs]);
        setLogsOffset(nextOffset);
        setLogsHasMore(nextLogs.length === 15);
      }
    } catch (err) {
      console.error('[AdminWorkspace] Error paginating logs:', err);
    } finally {
      setLogsLoadingMore(false);
    }
  };

  // Played Levels Sorting logic
  const getSortedLevels = () => {
    const list = [...playedLevels];
    if (playedSort === 'stars') {
      return list.sort((a, b) => b.stars - a.stars);
    }
    if (playedSort === 'time') {
      return list.sort((a, b) => (a.timeSpent ?? 9999) - (b.timeSpent ?? 9999));
    }
    // date (default)
    return list.sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime());
  };

  return {
    uid,
    profile,
    stats,
    lastActivity,
    playedLevels,
    playedSort,
    setPlayedSort,
    getSortedLevels,

    logs,
    logsHasMore,
    logsLoadingMore,
    fetchMoreLogs,

    activeCategory,
    setActiveCategory,
    actionQuery,
    setActionQuery,
    dateAfter,
    setDateAfter,
    dateBefore,
    setDateBefore,

    loadingProfile,
    loadingLogs,

    bans,
    activeBans,
    loadingBans,
    handleLiftBan,

    showBanModal,
    setShowBanModal,
    banType,
    setBanType,
    durationOption,
    setDurationOption,
    expiresAt,
    setExpiresAt,
    banReason,
    setBanReason,
    submittingBan,
    banError,
    setBanError,
    handleIssueBan,
  };
}
