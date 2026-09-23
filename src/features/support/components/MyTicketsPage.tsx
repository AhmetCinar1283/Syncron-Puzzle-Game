'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useT, useLanguage } from '@/contexts/LanguageContext';
import { GameIcon } from '@/components/icons';
import {
  subscribeToUserTickets,
  type SupportTicket,
  CATEGORY_LABELS,
  STATUS_LABELS,
  STATUS_COLORS
} from '@/services/firebase';

export function MyTicketsPage() {
  const t = useT();
  const { lang } = useLanguage();
  const router = useRouter();
  const { user, isAnonymous, loading } = useAuth();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  // "Yükleniyor" ayrı bir state değil, TÜREV: hangi kullanıcı için veri geldiğini
  // tutuyoruz; henüz gelmediyse yükleniyoruz. Böylece efektin gövdesinde senkron
  // `setDataLoading(true)` gerekmiyor. Görünen davranış aynı.
  const [loadedUid, setLoadedUid] = useState<string | null>(null);
  const dataLoading = !user || loadedUid !== user.uid;

  const isTr = lang === 'tr';

  // Redirect if unauthorized
  useEffect(() => {
    if (!loading && (!user || isAnonymous)) {
      router.replace('/support');
    }
  }, [user, isAnonymous, loading, router]);

  // Subscribe to user tickets
  useEffect(() => {
    if (loading || !user || isAnonymous) return;

    const uid = user.uid;
    const unsubscribe = subscribeToUserTickets(uid, (fetchedTickets) => {
      setTickets(fetchedTickets);
      setLoadedUid(uid);
    });

    return () => unsubscribe();
  }, [user, isAnonymous, loading]);

  if (loading || (!user || isAnonymous)) {
    return (
      <main style={{ position: 'relative', zIndex: 1, minHeight: '100dvh', background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#00c4ff', fontSize: 12, letterSpacing: '0.1em' }}>{t('common.loading')}</span>
      </main>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        zIndex: 1,
        minHeight: '100dvh',
        background: 'transparent',
        color: '#f3f4f6',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '40px 20px',
        overflowX: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Background Glow */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(0, 196, 255, 0.05) 0%, transparent 70%)',
          zIndex: 0,
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          width: '100%',
          maxWidth: '800px',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        {/* Navigation & Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => router.push('/support')}
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#9ca3af',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#00c4ff';
              e.currentTarget.style.border = '1px solid rgba(0, 196, 255, 0.4)';
              e.currentTarget.style.background = 'rgba(0, 196, 255, 0.03)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#9ca3af';
              e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
            }}
          >
            <GameIcon name="arrow-left" size={12} />
            <span>{t('support.create_ticket')}</span>
          </button>
        </div>

        <div>
          <h1
            style={{
              fontSize: '32px',
              fontWeight: 900,
              color: '#00c4ff',
              margin: '0 0 8px 0',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              textShadow: '0 0 24px rgba(0, 196, 255, 0.3)',
            }}
          >
            {t('support.my_tickets')}
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af', lineHeight: 1.6 }}>
            {isTr ? 'Görüntülemek ve yanıtlamak için bir destek talebi seçin.' : 'Select a support ticket to view and reply.'}
          </p>
        </div>

        {/* Real-time Ticket Listing */}
        {dataLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#00c4ff', fontSize: 13, letterSpacing: '0.08em' }}>
            {t('common.loading')}
          </div>
        ) : tickets.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'rgba(10, 15, 26, 0.65)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(0, 196, 255, 0.12)',
              borderRadius: '16px',
              padding: '48px',
              textAlign: 'center',
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <GameIcon name="mail" size={36} color="#9ca3af" style={{ opacity: 0.6 }} />
            </div>
            <p style={{ marginTop: '16px', fontSize: '14px', color: '#9ca3af', fontWeight: 500 }}>
              {t('support.no_tickets')}
            </p>
            <button
              onClick={() => router.push('/support')}
              style={{
                marginTop: '16px',
                background: 'rgba(0, 196, 255, 0.08)',
                border: '1px solid rgba(0, 196, 255, 0.5)',
                color: '#00c4ff',
                padding: '10px 24px',
                fontSize: '13px',
                fontWeight: 700,
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 196, 255, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0, 196, 255, 0.08)';
              }}
            >
              + {t('support.create_ticket')}
            </button>
          </motion.div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {tickets.map((ticket, index) => {
              const dateStr = new Date(ticket.updatedAt).toLocaleString(isTr ? 'tr-TR' : 'en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });

              return (
                <motion.div
                  key={ticket.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => router.push(`/support/my-tickets/detail/?id=${ticket.id}`)}
                  style={{
                    background: 'rgba(10, 15, 26, 0.65)',
                    backdropFilter: 'blur(12px)',
                    border: ticket.hasUnreadUser
                      ? '1px solid rgba(0, 255, 136, 0.4)'
                      : '1px solid rgba(0, 196, 255, 0.15)',
                    borderRadius: '12px',
                    padding: '20px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    position: 'relative',
                    transition: 'all 0.2s ease-in-out',
                    boxShadow: ticket.hasUnreadUser
                      ? '0 0 15px rgba(0, 255, 136, 0.05)'
                      : 'none',
                  }}
                  onMouseEnter={(e) => {
                    const el = e.currentTarget;
                    el.style.border = ticket.hasUnreadUser
                      ? '1px solid rgba(0, 255, 136, 0.8)'
                      : '1px solid rgba(0, 196, 255, 0.4)';
                    el.style.boxShadow = ticket.hasUnreadUser
                      ? '0 0 20px rgba(0, 255, 136, 0.15), 0 4px 20px rgba(0,0,0,0.4)'
                      : '0 0 20px rgba(0, 196, 255, 0.1), 0 4px 20px rgba(0,0,0,0.4)';
                    el.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget;
                    el.style.border = ticket.hasUnreadUser
                      ? '1px solid rgba(0, 255, 136, 0.4)'
                      : '1px solid rgba(0, 196, 255, 0.15)';
                    el.style.boxShadow = ticket.hasUnreadUser
                      ? '0 0 15px rgba(0, 255, 136, 0.05)'
                      : 'none';
                    el.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Subject line and category */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {ticket.hasUnreadUser && (
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            background: '#00ff88',
                            borderRadius: '50%',
                            display: 'inline-block',
                            boxShadow: '0 0 8px #00ff88, 0 0 16px #00ff88',
                            flexShrink: 0
                          }}
                        />
                      )}
                      <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f3f4f6', margin: 0, lineHeight: 1.4 }}>
                        {ticket.subject}
                      </h3>
                    </div>
                    <span style={{ fontSize: '11px', color: '#4b5563', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                      #{ticket.id.slice(0, 6)}
                    </span>
                  </div>

                  {/* Metadata labels row */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                    {/* Category */}
                    <span style={{ fontSize: '11px', color: '#94a3b8', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', padding: '3px 8px' }}>
                      {CATEGORY_LABELS[ticket.category][isTr ? 'tr' : 'en']}
                    </span>

                    {/* Status badge */}
                    <span
                      style={{
                        fontSize: '11px',
                        color: STATUS_COLORS[ticket.status],
                        background: `${STATUS_COLORS[ticket.status]}0d`,
                        border: `1px solid ${STATUS_COLORS[ticket.status]}35`,
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em'
                      }}
                    >
                      {STATUS_LABELS[ticket.status][isTr ? 'tr' : 'en']}
                    </span>

                    {/* Timestamp */}
                    <span style={{ fontSize: '11px', color: '#4b5563', marginLeft: 'auto' }}>
                      {dateStr}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
