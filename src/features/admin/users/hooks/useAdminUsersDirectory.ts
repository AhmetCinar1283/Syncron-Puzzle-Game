import { useEffect, useState } from 'react';
import {
  searchAdminUsers,
  getAdminUsersPage,
  type AdminUserProfile as UserProfile,
} from '@/services/firebase/adminUsers';
import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';

export function useAdminUsersDirectory() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Debouncing Search Input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 400); // 400ms debouncing as requested

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Initial Fetch & Search Query Change
  useEffect(() => {
    let active = true;

    async function fetchUsers() {
      setLoading(true);
      try {
        if (debouncedQuery !== '') {
          // Reset pagination
          setLastDoc(null);
          setHasMore(false);

          const fetched = await searchAdminUsers(debouncedQuery);
          if (active) {
            setUsers(fetched);
          }
        } else {
          // Fetch Default List (paginated, sorted by createdAt desc)
          const { users: list, lastDoc: newLastDoc, hasMore: more } = await getAdminUsersPage();
          if (active) {
            setUsers(list);
            setLastDoc(newLastDoc);
            setHasMore(more);
          }
        }
      } catch (err) {
        console.error('[AdminUsers] Error querying users:', err);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchUsers();

    return () => {
      active = false;
    };
  }, [debouncedQuery]);

  // Paginated Fetch More (only applicable for default list)
  const fetchMoreUsers = async () => {
    if (loadingMore || !lastDoc || !hasMore || debouncedQuery !== '') return;

    setLoadingMore(true);
    try {
      const { users: list, lastDoc: newLastDoc, hasMore: more } = await getAdminUsersPage(lastDoc);

      setUsers((prev) => [...prev, ...list]);
      setLastDoc(newLastDoc);
      setHasMore(more);
    } catch (err) {
      console.error('[AdminUsers] Error fetching more users:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  return {
    users,
    loading,
    loadingMore,
    searchQuery,
    setSearchQuery,
    debouncedQuery,
    hasMore,
    fetchMoreUsers,
  };
}
