'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useT, useLanguage } from '@/contexts/LanguageContext';
import { createTicket } from '@/services/api/supportClient';
import {
  type TicketCategory,
  TICKET_SUBJECT_MIN,
  TICKET_SUBJECT_MAX,
  TICKET_BODY_MIN,
  TICKET_BODY_MAX
} from '@/services/firebase/supportTypes';

export function useSupportPage() {
  const t = useT();
  const { lang } = useLanguage();
  const router = useRouter();
  const { user, isAnonymous, loading } = useAuth();

  // Form states
  const [category, setCategory] = useState<TicketCategory>('general');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Auth modal trigger
  const [showAuthModal, setShowAuthModal] = useState(false);

  const isTr = lang === 'tr';

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isAnonymous) {
      setErrorMsg(t('support.err_anon'));
      return;
    }

    // Client-side validations
    if (subject.length < TICKET_SUBJECT_MIN || subject.length > TICKET_SUBJECT_MAX) {
      setErrorMsg(isTr
        ? `Konu ${TICKET_SUBJECT_MIN}-${TICKET_SUBJECT_MAX} karakter arasında olmalıdır.`
        : `Subject must be between ${TICKET_SUBJECT_MIN} and ${TICKET_SUBJECT_MAX} characters.`);
      return;
    }

    if (body.length < TICKET_BODY_MIN || body.length > TICKET_BODY_MAX) {
      setErrorMsg(isTr
        ? `Mesaj ${TICKET_BODY_MIN}-${TICKET_BODY_MAX} karakter arasında olmalıdır.`
        : `Body must be between ${TICKET_BODY_MIN} and ${TICKET_BODY_MAX} characters.`);
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const result = await createTicket(category, subject, body);

      if (!result.success) {
        if (result.errorStatus === 429) {
          setErrorMsg(isTr
            ? 'Çok fazla destek talebi gönderdiniz. Lütfen daha sonra tekrar deneyin.'
            : 'Too many requests. Please try again later.');
        } else {
          setErrorMsg(result.errorMessage || t('support.err_generic'));
        }
        setSubmitting(false);
        return;
      }

      router.push(`/support/my-tickets/detail/?id=${result.ticketId}`);
    } catch (err) {
      console.error('[CreateTicket] Error submitting support ticket:', err);
      setErrorMsg(t('support.err_generic'));
      setSubmitting(false);
    }
  };

  return {
    t,
    lang,
    isTr,
    router,
    user,
    isAnonymous,
    loading,
    category,
    setCategory,
    subject,
    setSubject,
    body,
    setBody,
    submitting,
    errorMsg,
    showAuthModal,
    setShowAuthModal,
    handleCreateTicket,
  };
}
