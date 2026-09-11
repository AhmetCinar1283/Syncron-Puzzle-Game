'use client';

import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdminGuard } from '@/components/common/AdminGuard';
import { useAdminUsersDirectory } from '../hooks/useAdminUsersDirectory';
import { UserDirectoryCard } from './UserDirectoryCard';

export function AdminUsersPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const isTr = lang === 'tr';

  const {
    users,
    loading,
    loadingMore,
    searchQuery,
    setSearchQuery,
    debouncedQuery,
    hasMore,
    fetchMoreUsers,
  } = useAdminUsersDirectory();

  return (
    <AdminGuard>
      <div
        style={{
          minHeight: '100dvh',
          background: '#030712',
          color: '#e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Top Header Navigation */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 24px',
            background: 'rgba(3, 7, 18, 0.97)',
            borderBottom: '1px solid rgba(147, 51, 234, 0.15)',
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
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: '0.06em',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#9333ea')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#475569')}
          >
            {isTr ? '◄ ADMİN PANELİ' : '◄ ADMIN PANEL'}
          </button>

          <h1
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 800,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#9333ea',
              textShadow: '0 0 12px rgba(147, 51, 234, 0.4)',
            }}
          >
            {isTr ? 'KULLANICI YÖNETİMİ' : 'USER MANAGEMENT'}
          </h1>

          <span style={{ fontSize: '11px', color: '#475569' }}>
            {isTr ? `${users.length} Kayıt Listeleniyor` : `${users.length} Records Loaded`}
          </span>
        </div>

        {/* Content Box */}
        <main
          style={{
            flex: 1,
            maxWidth: '1200px',
            width: '100%',
            margin: '0 auto',
            padding: '32px 24px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
          }}
        >
          {/* Toolbar */}
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.01)',
              border: '1px solid rgba(147, 51, 234, 0.1)',
              borderRadius: '12px',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {/* Purple Search Magnifier unicode */}
              <span style={{ fontSize: '18px', color: '#9333ea', textShadow: '0 0 8px rgba(147, 51, 234, 0.5)' }}>⚲</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isTr
                    ? 'İsim, email, #tag veya UID aratın... (Prefix debounced)'
                    : 'Search name, email, #tag, or UID... (Prefix debounced)'
                }
                style={{
                  flex: 1,
                  background: '#060d1a',
                  border: '1px solid rgba(147, 51, 234, 0.25)',
                  color: '#e2e8f0',
                  borderRadius: '8px',
                  padding: '10px 16px',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border 0.2s',
                }}
                onFocus={(e) => (e.currentTarget.style.border = '1px solid #9333ea')}
                onBlur={(e) => (e.currentTarget.style.border = '1px solid rgba(147, 51, 234, 0.25)')}
              />
            </div>
            <div style={{ fontSize: '10px', color: '#475569', letterSpacing: '0.04em' }}>
              💡{' '}
              {isTr
                ? 'İpuçları: Tam email adresi, GamerTag (# ile) veya tam UID yazarak anında nokta atışı yapabilirsiniz.'
                : 'Tips: Type exact email, GamerTag (with # prefix), or full UID to perform a high-performance direct match.'}
            </div>
          </div>

          {/* Results Board Grid */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 800,
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: '#9333ea',
                textShadow: '0 0 10px rgba(147, 51, 234, 0.4)',
              }}
            >
              {isTr ? 'KULLANICI BAZI' : 'USERS DIRECTORY'}
            </span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(147, 51, 234, 0.12)' }} />
          </div>

          {/* Users Table / Directory */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
              <span
                style={{
                  color: '#9333ea',
                  fontSize: '12px',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  textShadow: '0 0 10px rgba(147, 51, 234, 0.3)',
                }}
              >
                {isTr ? 'Veri Tabanından Çekiliyor...' : 'LOADING DIRECTORY...'}
              </span>
            </div>
          ) : users.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 0', border: '1px dashed rgba(147, 51, 234, 0.15)', borderRadius: '12px' }}>
              <p style={{ color: '#64748b', fontSize: '14px', margin: 0 }}>
                {isTr ? 'Eşleşen herhangi bir kullanıcı bulunamadı.' : 'No users found matching the query.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Responsive Layout Grid instead of basic table */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                  gap: '16px',
                }}
              >
                <AnimatePresence>
                  {users.map((u, idx) => (
                    <UserDirectoryCard
                      key={u.uid}
                      u={u}
                      idx={idx}
                      isTr={isTr}
                      onClick={() => router.push(`/admin/users/detail/?uid=${u.uid}`)}
                    />
                  ))}
                </AnimatePresence>
              </div>

              {/* Pagination controls for default list */}
              {debouncedQuery === '' && hasMore && (
                <button
                  onClick={fetchMoreUsers}
                  disabled={loadingMore}
                  style={{
                    alignSelf: 'center',
                    background: 'transparent',
                    border: '1px solid rgba(147, 51, 234, 0.4)',
                    color: '#9333ea',
                    borderRadius: '8px',
                    padding: '10px 24px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    letterSpacing: '0.1em',
                    boxShadow: '0 0 12px rgba(147, 51, 234, 0.1)',
                    marginTop: '12px',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(147, 51, 234, 0.1)';
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(147, 51, 234, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.boxShadow = '0 0 12px rgba(147, 51, 234, 0.1)';
                  }}
                >
                  {loadingMore
                    ? isTr
                      ? 'YÜKLENİYOR...'
                      : 'FETCHING SECTORS...'
                    : isTr
                    ? 'DAHA FAZLA GÖSTER'
                    : 'LOAD MORE DIRECTORIES'}
                </button>
              )}
            </div>
          )}
        </main>
      </div>
    </AdminGuard>
  );
}
