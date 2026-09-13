'use client';

import { GameIcon } from '@/components/icons';
import type { IconName } from '@/components/icons/types';
import { CATEGORY_DETAILS, type AuditLogEntry } from '../lib/types';
import { formatLogMetadata } from '../lib/format';

function getActionIcon(action: string): IconName {
  switch (action) {
    case 'account.create': return 'user';
    case 'account.tag_change': return 'tag';
    case 'level.complete': return 'trophy';
    case 'level.start': return 'gamepad';
    case 'ticket.create': return 'mail';
    case 'ticket.reply': return 'chat';
    case 'payment.success': return 'credit-card';
    case 'payment.failed': return 'error';
    case 'admin.ban': return 'ban';
    case 'admin.unban': return 'unlock';
    default: return 'sparkles';
  }
}

export function AuditLogTimeline({
  isTr,
  logs,
  loadingLogs,
  logsHasMore,
  logsLoadingMore,
  fetchMoreLogs,
  activeCategory,
  setActiveCategory,
  actionQuery,
  setActionQuery,
  dateAfter,
  setDateAfter,
  dateBefore,
  setDateBefore,
}: {
  isTr: boolean;
  logs: AuditLogEntry[];
  loadingLogs: boolean;
  logsHasMore: boolean;
  logsLoadingMore: boolean;
  fetchMoreLogs: () => void;
  activeCategory: string;
  setActiveCategory: (c: string) => void;
  actionQuery: string;
  setActionQuery: (v: string) => void;
  dateAfter: string;
  setDateAfter: (v: string) => void;
  dateBefore: string;
  setDateBefore: (v: string) => void;
}) {
  return (
    <section
      style={{
        background: 'rgba(255, 255, 255, 0.01)',
        border: '1px solid rgba(147, 51, 234, 0.12)',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 800, letterSpacing: '0.1em', color: '#9333ea', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}>
          <GameIcon name="clock" size={14} color="#9333ea" />
          <span>{isTr ? 'İŞLEMSEL DENETİM GÜNLÜĞÜ (TIMELINE)' : 'FILTERABLE AUDIT LOG TIMELINE'}</span>
        </h3>
      </div>

      {/* Interactive Toolbars */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.01)',
          border: '1px solid rgba(147, 51, 234, 0.08)',
          borderRadius: '10px',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {/* Category clickable pill selectors */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '10px', fontWeight: 800, color: '#475569', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            {isTr ? 'Kategori Filtresi:' : 'Category Filter:'}
          </span>

          {/* All button */}
          <button
            onClick={() => setActiveCategory('all')}
            style={{
              background: activeCategory === 'all' ? 'rgba(147,51,234,0.15)' : 'transparent',
              border: '1px solid ' + (activeCategory === 'all' ? '#9333ea' : 'rgba(255,255,255,0.06)'),
              color: activeCategory === 'all' ? '#9333ea' : '#94a3b8',
              padding: '4px 12px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s',
              textTransform: 'uppercase',
            }}
          >
            {isTr ? 'TÜMÜ' : 'ALL'}
          </button>

          {/* HSL segment colored buttons */}
          {Object.entries(CATEGORY_DETAILS).map(([cat, details]) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                background: activeCategory === cat ? `${details.color}1c` : 'transparent',
                border: '1px solid ' + (activeCategory === cat ? details.color : 'rgba(255,255,255,0.06)'),
                color: activeCategory === cat ? details.color : '#94a3b8',
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s',
                boxShadow: activeCategory === cat ? details.glow + '2a' : 'none',
                textTransform: 'uppercase',
              }}
            >
              {details.label[isTr ? 'tr' : 'en']}
            </button>
          ))}
        </div>

        {/* Actions, After, Before inputs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', alignItems: 'center' }}>
          {/* Action match input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '9px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
              {isTr ? 'Eylem Türü (Action)' : 'Action Match'}
            </label>
            <input
              type="text"
              value={actionQuery}
              onChange={(e) => setActionQuery(e.target.value)}
              placeholder="e.g. level.complete"
              style={{
                background: '#060d1a',
                border: '1px solid rgba(147, 51, 234, 0.15)',
                color: '#e2e8f0',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                outline: 'none',
              }}
            />
          </div>

          {/* Date After Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '9px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
              {isTr ? 'Şu Tarihten Sonra (After)' : 'Logged After'}
            </label>
            <input
              type="date"
              value={dateAfter}
              onChange={(e) => setDateAfter(e.target.value)}
              style={{
                background: '#060d1a',
                border: '1px solid rgba(147, 51, 234, 0.15)',
                color: '#e2e8f0',
                borderRadius: '6px',
                padding: '5px 12px',
                fontSize: '12px',
                outline: 'none',
              }}
            />
          </div>

          {/* Date Before Filter */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '9px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
              {isTr ? 'Şu Tarihten Önce (Before)' : 'Logged Before'}
            </label>
            <input
              type="date"
              value={dateBefore}
              onChange={(e) => setDateBefore(e.target.value)}
              style={{
                background: '#060d1a',
                border: '1px solid rgba(147, 51, 234, 0.15)',
                color: '#e2e8f0',
                borderRadius: '6px',
                padding: '5px 12px',
                fontSize: '12px',
                outline: 'none',
              }}
            />
          </div>
        </div>
      </div>

      {/* Timeline display */}
      {loadingLogs ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <span style={{ color: '#9333ea', fontSize: '12px', letterSpacing: '0.1em' }}>
            {isTr ? 'GÜNLÜKLER OKUNUYOR...' : 'FETCHING AUDIT LOGS...'}
          </span>
        </div>
      ) : logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', border: '1px dashed rgba(255,255,255,0.02)', borderRadius: '12px' }}>
          <p style={{ color: '#475569', fontSize: '13px', margin: 0 }}>
            {isTr ? 'Filtrelere uyan işlem günlüğü kaydı bulunamadı.' : 'No audit logs found matching filters.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0px', position: 'relative', paddingLeft: '24px' }}>
          {/* Vertical line indicator */}
          <div style={{ position: 'absolute', top: 12, bottom: 12, left: 7, width: '1px', background: 'rgba(147, 51, 234, 0.12)' }} />

          {logs.map((log) => {
            const details = CATEGORY_DETAILS[log.category];
            const dotColor = details?.color || '#ffffff';
            const parsedText = formatLogMetadata(log, isTr);
            const timeStr = new Date(log.created_at).toLocaleString(isTr ? 'tr-TR' : 'en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            return (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  position: 'relative',
                  paddingBottom: '20px',
                }}
              >
                {/* Glowing left dot */}
                <div
                  style={{
                    position: 'absolute',
                    left: '-21px',
                    top: '7px',
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    background: dotColor,
                    boxShadow: `0 0 8px ${dotColor}`,
                    border: '1.5px solid #030712',
                  }}
                />

                {/* Content Row */}
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: '240px' }}>
                    {/* Human readable payload text with GameIcon */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <GameIcon name={getActionIcon(log.action)} size={14} color={dotColor} style={{ marginTop: '2px', flexShrink: 0 }} />
                      <span
                        style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: '1.4' }}
                        dangerouslySetInnerHTML={{
                          __html: parsedText
                            .replace(/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}👤🏷️🏆🎮✉️💬💳❌🚫🔓\s]+/u, '')
                            .replace(/\*\*(.*?)\*\*/g, '<b style="color:#ffffff">$1</b>'),
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '10px', color: '#475569', letterSpacing: '0.04em', fontFamily: 'monospace' }}>
                      action: <b>{log.action}</b> | id: <b>{log.id}</b>
                    </span>
                  </div>

                  {/* Timestamp / Category label right-hand alignment */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                    <span
                      style={{
                        fontSize: '9px',
                        fontWeight: 800,
                        color: dotColor,
                        background: dotColor + '08',
                        border: `1px solid ${dotColor}25`,
                        borderRadius: '4px',
                        padding: '1px 5px',
                        textTransform: 'uppercase',
                      }}
                    >
                      {details?.label[isTr ? 'tr' : 'en']}
                    </span>
                    <span style={{ color: '#475569', whiteSpace: 'nowrap' }}>{timeStr}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Timeline Paginate button */}
          {logsHasMore && (
            <button
              onClick={fetchMoreLogs}
              disabled={logsLoadingMore}
              style={{
                alignSelf: 'flex-start',
                background: 'transparent',
                border: '1px solid rgba(147, 51, 234, 0.3)',
                color: '#9333ea',
                borderRadius: '6px',
                padding: '6px 16px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: '0.05em',
                boxShadow: '0 0 10px rgba(147, 51, 234, 0.05)',
                marginTop: '8px',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(147, 51, 234, 0.06)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {logsLoadingMore ? (isTr ? 'GÜNLÜKLER ÇEKİLİYOR...' : 'LOADING SECTORS...') : isTr ? 'DAHA FAZLA GÜNLÜK YÜKLE' : 'LOAD OLDER ENTRIES'}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
