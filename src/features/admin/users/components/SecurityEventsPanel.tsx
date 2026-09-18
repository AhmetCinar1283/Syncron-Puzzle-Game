'use client';

/**
 * DOSYA AMACI: Bir kullanıcının son güvenlik olaylarını gösteren admin paneli.
 * Sunum katmanı; veri `useSecurityEvents` hook'undan gelir.
 * bkz. .plans/yayin-hazirlik/05-loglama-ve-adli-iz.md §3.4
 */

import { GameIcon } from '@/components/icons';
import type { SecurityEventRecord } from '@/services/api/adminClient';

const ACCENT = '#f97316';

export function SecurityEventsPanel({
  events,
  loading,
  forbidden,
  isTr,
}: {
  events: SecurityEventRecord[];
  loading: boolean;
  forbidden: boolean;
  isTr: boolean;
}) {
  // Moderatöre panel HİÇ gösterilmez: kişisel veriye erişimi iş gereği değildir.
  if (forbidden) return null;

  return (
    <section
      style={{
        background: 'rgba(255, 255, 255, 0.01)',
        border: `1px solid ${ACCENT}1f`,
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <h3
          style={{
            margin: 0,
            fontSize: '13px',
            fontWeight: 800,
            letterSpacing: '0.1em',
            color: ACCENT,
            textTransform: 'uppercase',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <GameIcon name="shield" size={14} color={ACCENT} />
          <span>{isTr ? 'GÜVENLİK OLAYLARI' : 'SECURITY EVENTS'}</span>
        </h3>
        <p style={{ margin: 0, fontSize: '11px', color: '#64748b', lineHeight: 1.6 }}>
          {isTr
            ? 'Yalnızca güvenlik olaylarında kaydedilir. IP karmalanmış (ham IP saklanmaz) ve kayıtlar 30 gün sonra otomatik silinir.'
            : 'Recorded only on security events. The IP is hashed (raw IP is never stored) and records are auto-deleted after 30 days.'}
        </p>
      </div>

      {loading ? (
        <div style={{ padding: '24px 0', textAlign: 'center', color: '#475569', fontSize: '12px' }}>
          {isTr ? 'Yükleniyor…' : 'Loading…'}
        </div>
      ) : events.length === 0 ? (
        <div style={{ padding: '24px 0', textAlign: 'center', color: '#475569', fontSize: '12px' }}>
          {isTr ? 'Bu kullanıcı için güvenlik olayı yok.' : 'No security events for this user.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {events.map((event) => (
            <SecurityEventRow key={event.id} event={event} isTr={isTr} />
          ))}
        </div>
      )}
    </section>
  );
}

function SecurityEventRow({ event, isTr }: { event: SecurityEventRecord; isTr: boolean }) {
  return (
    <div
      style={{
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '10px',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        background: 'rgba(0,0,0,0.2)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <span style={{ color: ACCENT, fontSize: '12px', fontWeight: 700 }}>{event.eventType}</span>
        <span style={{ color: '#64748b', fontSize: '11px' }}>{formatDate(event.createdAt, isTr)}</span>
      </div>

      <div style={{ color: '#94a3b8', fontSize: '11px', wordBreak: 'break-all' }}>{event.endpoint}</div>

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '11px', color: '#64748b' }}>
        <span>
          {isTr ? 'IP özeti: ' : 'IP digest: '}
          <code style={{ color: '#94a3b8' }}>
            {/* Tuz sırrı eksikse bu alan boş gelir — operatöre sessizce boş göstermek yerine söylenir. */}
            {event.ipHash ?? (isTr ? 'yok (tuz sırrı tanımsız)' : 'none (salt secret unset)')}
          </code>
        </span>
        {event.userAgent && (
          <span style={{ maxWidth: '100%', wordBreak: 'break-all' }}>UA: {event.userAgent}</span>
        )}
      </div>

      {Object.keys(event.metadata ?? {}).length > 0 && (
        <pre
          style={{
            margin: 0,
            fontSize: '10px',
            color: '#475569',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {JSON.stringify(event.metadata)}
        </pre>
      )}
    </div>
  );
}

function formatDate(iso: string, isTr: boolean): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(isTr ? 'tr-TR' : 'en-GB');
}
