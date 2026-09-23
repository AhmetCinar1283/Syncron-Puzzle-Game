'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  subscribeToAllTickets,
  type SupportTicket,
  type TicketStatus,
  type TicketCategory,
} from '@/services/firebase';

export function useSupportListPage() {
  const router = useRouter();
  const { role, loading } = useAuth();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  // "Yükleniyor" ayrı bir state değil, TÜREV: hangi abonelik anahtarı için veri
  // geldiğini tutuyoruz; henüz gelmediyse yükleniyoruz. Böylece efektin gövdesinde
  // senkron `setDataLoading(true)` gerekmiyor (fazladan render turu ve yarış yok);
  // filtre değişince gösterge yine anında "yükleniyor"a döner.
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  // Filters state
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Secure access control
  useEffect(() => {
    if (!loading && role !== 'admin' && role !== 'moderator') {
      router.replace('/');
    }
  }, [role, loading, router]);

  // Subscribe to all support tickets
  // In order to perform category filtering client-side as designed, we retrieve
  // tickets with status filtering if enabled, then filter categories locally in the callback/render.
  const subscriptionKey = `${role ?? ''}|${statusFilter}`;
  const dataLoading = loadedKey !== subscriptionKey;

  useEffect(() => {
    if (loading || (role !== 'admin' && role !== 'moderator')) return;

    // We pass statusFilter to subscribeToAllTickets if it's not 'all' to leverage Firestore status indexes.
    const activeStatus = statusFilter === 'all' ? undefined : { status: statusFilter, category: 'all' as any };

    const unsubscribe = subscribeToAllTickets(
      (fetchedTickets) => {
        setTickets(fetchedTickets);
        setLoadedKey(`${role ?? ''}|${statusFilter}`);
      },
      activeStatus
    );

    return () => unsubscribe();
  }, [role, loading, statusFilter]);

  // Perform remaining client-side filtering (category filter & search query)
  const filteredTickets = tickets.filter((ticket) => {
    // 1. Category Filter (performed client-side)
    if (categoryFilter !== 'all' && ticket.category !== categoryFilter) {
      return false;
    }

    // 2. Search Query (matches user display name, tag, subject, or email)
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      const matchName = ticket.displayName.toLowerCase().includes(query);
      const matchTag = ticket.tag ? ticket.tag.toLowerCase().includes(query) : false;
      const matchEmail = ticket.email.toLowerCase().includes(query);
      const matchSubject = ticket.subject.toLowerCase().includes(query);
      const matchId = ticket.id.toLowerCase().includes(query);

      return matchName || matchTag || matchEmail || matchSubject || matchId;
    }

    return true;
  });

  return {
    router,
    role,
    loading,
    tickets,
    dataLoading,
    statusFilter,
    setStatusFilter,
    categoryFilter,
    setCategoryFilter,
    searchQuery,
    setSearchQuery,
    filteredTickets,
  };
}
