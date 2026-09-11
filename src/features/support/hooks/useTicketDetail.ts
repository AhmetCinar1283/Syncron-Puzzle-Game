'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useT, useLanguage } from '@/contexts/LanguageContext';
import {
  subscribeToTicket,
  subscribeToMessages,
  sendTicketMessage,
  markTicketAsRead,
  type SupportTicket,
  type TicketMessage,
  TICKET_REPLY_MIN,
  TICKET_REPLY_MAX
} from '@/services/firebase';

export function useTicketDetail() {
  const t = useT();
  const { lang } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const ticketId = searchParams.get('id') || '';
  const { user, isAnonymous, loading } = useAuth();

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [ticketLoading, setTicketLoading] = useState(true);
  const [replyBody, setReplyBody] = useState('');
  const [sending, setSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isTr = lang === 'tr';

  // Redirect if unauthorized
  useEffect(() => {
    if (!loading && (!user || isAnonymous)) {
      router.replace('/support');
    }
  }, [user, isAnonymous, loading, router]);

  // Subscribe to ticket details
  useEffect(() => {
    if (loading || !user || isAnonymous || !ticketId) return;

    setTicketLoading(true);

    const unsubscribe = subscribeToTicket(
      ticketId,
      (mappedTicket) => {
        if (!mappedTicket) {
          router.replace('/support/my-tickets');
          return;
        }
        // Securely check if the user owns this ticket
        if (mappedTicket.uid !== user.uid) {
          router.replace('/support/my-tickets');
          return;
        }
        setTicket({ ...mappedTicket, adminNote: null }); // users never see admin internal notes
        setTicketLoading(false);
      },
      () => {
        router.replace('/support/my-tickets');
      },
    );

    return () => unsubscribe();
  }, [ticketId, user, isAnonymous, loading, router]);

  // Subscribe to ticket messages and mark as read
  useEffect(() => {
    if (loading || !user || isAnonymous || !ticketId) return;

    // Subscribing to live message updates
    const unsubscribe = subscribeToMessages(ticketId, (fetchedMessages) => {
      setMessages(fetchedMessages);
    });

    // Mark ticket as read by the user
    markTicketAsRead(ticketId).catch((err) => {
      console.warn('[TicketDetail] Failed to mark ticket as read:', err);
    });

    return () => unsubscribe();
  }, [ticketId, user, isAnonymous, loading]);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketId || !user) return;
    if (ticket?.status === 'resolved' || ticket?.status === 'closed') return;

    if (replyBody.trim().length < TICKET_REPLY_MIN || replyBody.trim().length > TICKET_REPLY_MAX) {
      setErrorMsg(isTr
        ? `Cevabınız en az ${TICKET_REPLY_MIN} ve en fazla ${TICKET_REPLY_MAX} karakter olmalıdır.`
        : `Your reply must be between ${TICKET_REPLY_MIN} and ${TICKET_REPLY_MAX} characters.`);
      return;
    }

    setSending(true);
    setErrorMsg('');

    try {
      await sendTicketMessage(
        ticketId,
        user.uid,
        user.displayName || user.email?.split('@')[0] || 'User',
        replyBody.trim()
      );
      setReplyBody('');
    } catch (err) {
      console.error('[SendReply] Error sending message:', err);
      setErrorMsg(t('support.err_generic'));
    } finally {
      setSending(false);
    }
  };

  return {
    t,
    isTr,
    router,
    ticket,
    messages,
    loading,
    ticketLoading,
    replyBody,
    setReplyBody,
    sending,
    errorMsg,
    messagesEndRef,
    handleSendReply,
  };
}
