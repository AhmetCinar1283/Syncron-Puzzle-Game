'use client';

import AuthModal from '@/components/common/AuthModal';
import { useSupportPage } from '../hooks/useSupportPage';
import { AuthRequiredPanel } from './AuthRequiredPanel';
import { TicketForm } from './TicketForm';

export function SupportPage() {
  const {
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
  } = useSupportPage();

  const isTrCategory = lang === 'tr';

  if (loading) {
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
      {/* Background Glows */}
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
          maxWidth: '600px',
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        {/* Navigation & Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => router.push('/')}
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
            {t('common.back_menu')}
          </button>

          {!isAnonymous && user && (
            <button
              onClick={() => router.push('/support/my-tickets')}
              style={{
                background: 'rgba(0, 196, 255, 0.07)',
                border: '1px solid rgba(0, 196, 255, 0.35)',
                color: '#00c4ff',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 196, 255, 0.15)';
                e.currentTarget.style.boxShadow = '0 0 12px rgba(0, 196, 255, 0.25)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0, 196, 255, 0.07)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {t('support.my_tickets')}
            </button>
          )}
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
            {t('support.title')}
          </h1>
          <p style={{ margin: 0, fontSize: '13px', color: '#9ca3af', lineHeight: 1.6 }}>
            {t('support.subtitle')}
          </p>
        </div>

        {/* Dynamic Authentication Protection */}
        {(!user || isAnonymous) ? (
          <AuthRequiredPanel
            isTr={isTr}
            errAnonText={t('support.err_anon')}
            signInLabel={t('auth.sign_in')}
            onSignIn={() => setShowAuthModal(true)}
          />
        ) : (
          <TicketForm
            t={t}
            isTrCategory={isTrCategory}
            category={category}
            setCategory={setCategory}
            subject={subject}
            setSubject={setSubject}
            body={body}
            setBody={setBody}
            submitting={submitting}
            errorMsg={errorMsg}
            onSubmit={handleCreateTicket}
          />
        )}
      </div>

      {/* Global Auth Modal portal */}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}
    </div>
  );
}
