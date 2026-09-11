'use client';

import { useT, useLanguage } from '@/contexts/LanguageContext';
import { useSupportListPage } from './hooks/useSupportListPage';
import { SupportFilterBar } from './components/SupportFilterBar';
import { TicketListItem } from './components/TicketListItem';

export default function SupportListPage() {
  const t = useT();
  const { lang } = useLanguage();
  const {
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
  } = useSupportListPage();

  const isTr = lang === 'tr';

  if (loading || (role !== 'admin' && role !== 'moderator')) {
    return (
      <main style={{ minHeight: '100dvh', background: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#fbbf24', fontSize: 12, letterSpacing: '0.1em' }}>LOADING PANEL...</span>
      </main>
    );
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        background: '#030712',
        color: '#e2e8f0',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Bar */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          background: 'rgba(3, 7, 18, 0.97)',
          borderBottom: '1px solid rgba(251, 191, 36, 0.15)',
          zIndex: 10,
        }}
      >
        <button
          onClick={() => router.push('/admin')}
          style={{
            background: 'none',
            border: 'none',
            color: '#475569',
            fontSize: '12px',
            cursor: 'pointer',
            letterSpacing: '0.06em',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#fbbf24')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
        >
          {t('common.back_menu')}
        </button>

        <h1
          style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: 800,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#fbbf24',
            textShadow: '0 0 12px rgba(251, 191, 36, 0.4)',
          }}
        >
          {isTr ? 'DESTEK TALEPLERİ' : 'SUPPORT TICKETS'}
        </h1>

        <span style={{ fontSize: '11px', color: '#475569' }}>
          {filteredTickets.length} / {tickets.length}
        </span>
      </div>

      {/* Main Panel Content Workspace */}
      <div
        style={{
          flex: 1,
          maxWidth: '1000px',
          width: '100%',
          margin: '0 auto',
          padding: '24px 16px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        <SupportFilterBar
          isTr={isTr}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
        />

        {/* Results Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#fbbf24', textShadow: '0 0 10px rgba(251,191,36,0.5)' }}>
            {isTr ? 'TÜM DESTEK TALEPLERİ' : 'ALL SUPPORT TICKETS'}
          </span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(251, 191, 36, 0.15)' }} />
        </div>

        {/* Ticket List Grid */}
        {dataLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#fbbf24', fontSize: '12px', letterSpacing: '0.1em' }}>
            LOADING...
          </div>
        ) : filteredTickets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ color: '#475569', fontSize: '13px', letterSpacing: '0.06em' }}>
              {tickets.length === 0
                ? (isTr ? 'Sistemde henüz destek talebi bulunmamaktadır.' : 'No support tickets found in the system.')
                : (isTr ? 'Filtrelere uygun destek talebi bulunamadı.' : 'No support tickets matching current filters.')
              }
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {filteredTickets.map((ticket, idx) => (
              <TicketListItem
                key={ticket.id}
                ticket={ticket}
                idx={idx}
                isTr={isTr}
                onClick={() => router.push(`/admin/support/detail/?id=${ticket.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
