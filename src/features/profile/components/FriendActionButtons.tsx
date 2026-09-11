'use client';

interface Props {
  t: (key: string) => string;
  friendshipState: string;
  viewUid: string;
  actionBusy: Record<string, boolean>;
  removeFriend: (uid: string) => void;
  acceptRequest: (uid: string) => void;
  rejectRequest: (uid: string) => void;
  sendRequest: (uid: string) => void;
}

export default function FriendActionButtons({
  t,
  friendshipState,
  viewUid,
  actionBusy,
  removeFriend,
  acceptRequest,
  rejectRequest,
  sendRequest,
}: Props) {
  return (
    <div style={{ marginTop: '16px' }}>
      {friendshipState === 'accepted' && (
        <button
          onClick={() => {
            if (window.confirm(t('levels.delete_title') === 'Emin misiniz?' ? 'Bu arkadaşı silmek istediğinize emin misiniz?' : 'Are you sure you want to remove this friend?')) {
              removeFriend(viewUid);
            }
          }}
          disabled={actionBusy[viewUid]}
          style={{
            padding: '8px 16px',
            fontSize: '12px',
            fontWeight: 700,
            borderRadius: '8px',
            border: '1px solid #ff2d55',
            background: 'rgba(255, 45, 85, 0.08)',
            color: '#ff2d55',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#ff2d55';
            e.currentTarget.style.color = '#030712';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 45, 85, 0.08)';
            e.currentTarget.style.color = '#ff2d55';
          }}
        >
          {actionBusy[viewUid] ? '...' : t('friends.remove_friend')}
        </button>
      )}

      {friendshipState === 'pending_outgoing' && (
        <button
          disabled
          style={{
            padding: '8px 16px',
            fontSize: '12px',
            fontWeight: 700,
            borderRadius: '8px',
            border: '1px solid #4b5563',
            background: '#1f293750',
            color: '#9ca3af',
            cursor: 'not-allowed',
          }}
        >
          {t('friends.pending_outgoing')}
        </button>
      )}

      {friendshipState === 'pending_incoming' && (
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => acceptRequest(viewUid)}
            disabled={actionBusy[viewUid]}
            style={{
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: 700,
              borderRadius: '8px',
              border: '1px solid #00ff88',
              background: 'rgba(0, 255, 136, 0.08)',
              color: '#00ff88',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#00ff88';
              e.currentTarget.style.color = '#030712';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0, 255, 136, 0.08)';
              e.currentTarget.style.color = '#00ff88';
            }}
          >
            {actionBusy[viewUid] ? '...' : t('friends.accept')}
          </button>
          <button
            onClick={() => rejectRequest(viewUid)}
            disabled={actionBusy[viewUid]}
            style={{
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: 700,
              borderRadius: '8px',
              border: '1px solid #ff2d55',
              background: 'rgba(255, 45, 85, 0.08)',
              color: '#ff2d55',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ff2d55';
              e.currentTarget.style.color = '#030712';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 45, 85, 0.08)';
              e.currentTarget.style.color = '#ff2d55';
            }}
          >
            {actionBusy[viewUid] ? '...' : t('friends.reject')}
          </button>
        </div>
      )}

      {friendshipState === 'none' && (
        <button
          onClick={() => sendRequest(viewUid)}
          disabled={actionBusy[viewUid]}
          style={{
            padding: '8px 16px',
            fontSize: '12px',
            fontWeight: 700,
            borderRadius: '8px',
            border: '1px solid #00ff88',
            background: 'rgba(0, 255, 136, 0.08)',
            color: '#00ff88',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#00ff88';
            e.currentTarget.style.color = '#030712';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0, 255, 136, 0.08)';
            e.currentTarget.style.color = '#00ff88';
          }}
        >
          {actionBusy[viewUid] ? '...' : t('friends.add_friend')}
        </button>
      )}
    </div>
  );
}
