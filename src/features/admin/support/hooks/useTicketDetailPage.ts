'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useT, useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import {
  subscribeToTicket,
  subscribeToMessages,
  sendAdminReply,
  updateTicketStatus,
  updateTicketPriority,
  setAdminNote,
  markTicketAsReadByAdmin,
  type SupportTicket,
  type TicketMessage,
  type TicketStatus,
  type TicketPriority,
  TICKET_REPLY_MIN,
  TICKET_REPLY_MAX,
} from '@/services/firebase';

export function useTicketDetailPage() {
  const t = useT();
  const { lang } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const ticketId = searchParams.get('id') || '';
  const { user: currentUser, role, loading } = useAuth();

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [ticketLoading, setTicketLoading] = useState(true);

  // Action states
  const [replyBody, setReplyBody] = useState('');
  const [replying, setReplying] = useState(false);
  const [internalNoteLocal, setInternalNoteLocal] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteSavedToast, setNoteSavedToast] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isTr = lang === 'tr';

  // Secure access control
  useEffect(() => {
    if (!loading && role !== 'admin' && role !== 'moderator') {
      router.replace('/');
    }
  }, [role, loading, router]);

  // Subscribe to ticket details document
  useEffect(() => {
    if (loading || (role !== 'admin' && role !== 'moderator') || !ticketId) return;

    setTicketLoading(true);

    const unsubscribe = subscribeToTicket(
      ticketId,
      (mappedTicket) => {
        if (mappedTicket) {
          setTicket(mappedTicket);
          setInternalNoteLocal(mappedTicket.adminNote || '');
        } else {
          router.replace('/admin/support');
        }
        setTicketLoading(false);
      },
      () => {
        router.replace('/admin/support');
      },
    );

    return () => unsubscribe();
  }, [ticketId, role, loading, router]);

  // Subscribe to messages list and mark as read by admin
  useEffect(() => {
    if (loading || (role !== 'admin' && role !== 'moderator') || !ticketId) return;

    const unsubscribe = subscribeToMessages(ticketId, (fetchedMessages) => {
      setMessages(fetchedMessages);
    });

    // Mark as read by admin
    markTicketAsReadByAdmin(ticketId).catch((err) => {
      console.warn('[AdminTicketDetail] Failed to mark ticket as read by admin:', err);
    });

    return () => unsubscribe();
  }, [ticketId, role, loading]);

  // Scroll to bottom of conversation feed
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send admin reply
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketId || !currentUser) return;

    if (replyBody.trim().length < TICKET_REPLY_MIN || replyBody.trim().length > TICKET_REPLY_MAX) {
      setErrorMsg(isTr
        ? `Cevabınız en az ${TICKET_REPLY_MIN} ve en fazla ${TICKET_REPLY_MAX} karakter olmalıdır.`
        : `Your reply must be between ${TICKET_REPLY_MIN} and ${TICKET_REPLY_MAX} characters.`);
      return;
    }

    setReplying(true);
    setErrorMsg('');

    try {
      await sendAdminReply(ticketId, currentUser.uid, replyBody.trim());

      // Automatically advance status to in_progress or waiting_user when admin replies
      if (ticket && (ticket.status === 'open' || ticket.status === 'waiting_user')) {
        await updateTicketStatus(ticketId, 'in_progress');
      }

      setReplyBody('');
    } catch (err) {
      console.error('[AdminSendReply] Error sending message:', err);
      setErrorMsg(t('support.err_generic'));
    } finally {
      setReplying(false);
    }
  };

  // Update status dropdown
  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!ticketId) return;
    try {
      await updateTicketStatus(ticketId, newStatus);
    } catch (err) {
      console.error('[AdminUpdateStatus] Error updating status:', err);
    }
  };

  // Update priority dropdown
  const handlePriorityChange = async (newPriority: TicketPriority) => {
    if (!ticketId) return;
    try {
      await updateTicketPriority(ticketId, newPriority);
    } catch (err) {
      console.error('[AdminUpdatePriority] Error updating priority:', err);
    }
  };

  // Save private internal note
  const handleSaveInternalNote = async () => {
    if (!ticketId) return;
    setSavingNote(true);
    try {
      await setAdminNote(ticketId, internalNoteLocal.trim());
      setNoteSavedToast(true);
      setTimeout(() => setNoteSavedToast(false), 2500);
    } catch (err) {
      console.error('[AdminSaveNote] Error saving note:', err);
    } finally {
      setSavingNote(false);
    }
  };

  return {
    t,
    isTr,
    router,
    role,
    loading,
    ticket,
    messages,
    ticketLoading,
    replyBody,
    setReplyBody,
    replying,
    internalNoteLocal,
    setInternalNoteLocal,
    savingNote,
    noteSavedToast,
    errorMsg,
    messagesEndRef,
    handleSendReply,
    handleStatusChange,
    handlePriorityChange,
    handleSaveInternalNote,
  };
}
