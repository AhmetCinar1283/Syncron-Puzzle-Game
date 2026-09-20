'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { subscribeToAllTickets } from '@/services/firebase/support';

export function useAdminDashboard() {
  const router = useRouter();
  const { role, loading } = useAuth();

  const [unreadTicketsCount, setUnreadTicketsCount] = useState(0);

  // Authentication security check
  useEffect(() => {
    if (!loading && role !== 'admin') {
      router.replace('/');
    }
  }, [role, loading, router]);

  // Subscribe to support tickets for dynamic unread counter bubble
  useEffect(() => {
    if (loading || role !== 'admin') return;

    try {
      const unsubscribe = subscribeToAllTickets((tickets) => {
        const unread = tickets.filter((t) => t.hasUnreadAdmin === true).length;
        setUnreadTicketsCount(unread);
      });
      return () => unsubscribe();
    } catch (err) {
      console.warn('[AdminDashboard] Failed to subscribe to support tickets count:', err);
    }
  }, [role, loading]);

  return { router, role, loading, unreadTicketsCount };
}
