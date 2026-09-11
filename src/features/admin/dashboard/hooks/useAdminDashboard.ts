'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { subscribeToAllTickets } from '@/services/firebase/support';
import { generateParticles, type Particle } from '../lib/particles';

export function useAdminDashboard() {
  const router = useRouter();
  const { role, loading } = useAuth();

  const [particles, setParticles] = useState<Particle[]>([]);
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

  useEffect(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setParticles(generateParticles(vw, vh));
  }, []);

  return { router, role, loading, particles, unreadTicketsCount };
}
