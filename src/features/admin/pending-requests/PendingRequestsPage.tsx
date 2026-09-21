'use client';

import { usePendingRequestsPage } from './hooks/usePendingRequestsPage';
import { FilterBar } from './components/FilterBar';
import { RequestRow } from './components/RequestRow';

export default function PendingRequestsPage() {
  const {
    t,
    router,
    role,
    loading,
    requests,
    parts,
    dataLoading,
    toast,
    search,
    setSearch,
    filterDifficulty,
    setFilterDifficulty,
    filterCellTypes,
    clearCellTypes,
    toggleCellType,
    filteredRequests,
    handleApprove,
    handleReject,
  } = usePendingRequestsPage();

  if (loading || role !== 'admin') {
    return (
      <main style={{ position: 'relative', zIndex: 1, minHeight: '100dvh', background: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#1e3a5f', fontSize: 12, letterSpacing: '0.1em' }}>{t('common.loading')}</span>
      </main>
    );
  }

  return (
    <div style={{ position: 'relative', zIndex: 1, minHeight: '100dvh', background: '#030712', color: '#e2e8f0', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', background: 'rgba(3,7,18,0.97)', borderBottom: '1px solid rgba(251,191,36,0.15)' }}>
        <button
          onClick={() => router.push('/')}
          style={{ background: 'none', border: 'none', color: '#334155', fontSize: 12, cursor: 'pointer', letterSpacing: '0.06em' }}
        >
          {t('common.back_menu')}
        </button>
        <h1 style={{ margin: 0, fontSize: 14, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#fbbf24', textShadow: '0 0 12px rgba(251,191,36,0.5)' }}>
          {t('admin.title')}
        </h1>
        <span style={{ fontSize: 11, color: '#334155' }}>
          {dataLoading ? '...' : t('admin.pending_count', { n: requests.length })}
        </span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, maxWidth: 800, width: '100%', margin: '0 auto', padding: '24px 16px' }}>
        {dataLoading ? (
          <div style={{ textAlign: 'center', color: '#1e3a5f', fontSize: 12, letterSpacing: '0.1em', paddingTop: 60 }}>
            {t('common.loading')}
          </div>
        ) : (
          <>
            <FilterBar
              t={t}
              search={search}
              setSearch={setSearch}
              filterDifficulty={filterDifficulty}
              setFilterDifficulty={setFilterDifficulty}
              filterCellTypes={filterCellTypes}
              toggleCellType={toggleCellType}
              clearCellTypes={clearCellTypes}
            />

            {/* Results header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#fbbf24', textShadow: '0 0 10px rgba(251,191,36,0.5)' }}>
                {t('admin.pending_requests')}
              </span>
              <span style={{ fontSize: 10, color: '#334155' }}>
                {filteredRequests.length}/{requests.length}
              </span>
              <div style={{ flex: 1, height: 1, background: 'rgba(251,191,36,0.15)' }} />
            </div>

            {filteredRequests.length === 0 ? (
              <div style={{ textAlign: 'center', paddingTop: 40 }}>
                <p style={{ color: '#1e3a5f', fontSize: 13, letterSpacing: '0.06em' }}>
                  {requests.length === 0 ? t('admin.no_pending') : t('admin.no_match')}
                </p>
              </div>
            ) : (
              filteredRequests.map((req) => (
                <RequestRow
                  key={req.id}
                  req={req}
                  parts={parts}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ))
            )}
          </>
        )}
      </div>

      {/* Toast notification */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'rgba(6,13,26,0.96)', border: '1px solid rgba(251,191,36,0.4)', borderRadius: 10, padding: '10px 20px', fontSize: 13, color: '#fbbf24', zIndex: 100, boxShadow: '0 0 20px rgba(251,191,36,0.2)', pointerEvents: 'none' }}>
          {toast}
        </div>
      )}
    </div>
  );
}
