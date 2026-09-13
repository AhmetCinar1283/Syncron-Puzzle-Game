import { useEditorContext } from '../../EditorContext';
import { GameIcon } from '@/components/icons';

/** "ROOMS:" tab strip — switch/rename/delete rooms and "+ Add Room". */
export default function RoomTabs() {
  const { rooms, activeRoomId, switchActiveRoom, addRoom, deleteRoom, updateRoomName } = useEditorContext();

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.05em', marginRight: 4 }}>ROOMS:</span>
      {rooms.map((r) => {
        const isActive = r.id === activeRoomId;
        return (
          <div
            key={r.id}
            onClick={() => isActive ? null : switchActiveRoom(r.id)}
            style={{
              padding: '6px 12px',
              borderRadius: 6,
              background: isActive ? 'rgba(0, 196, 255, 0.15)' : 'rgba(30, 41, 59, 0.6)',
              border: `1px solid ${isActive ? '#00c4ff' : 'rgba(148, 163, 184, 0.2)'}`,
              color: isActive ? '#00c4ff' : '#94a3b8',
              fontSize: 12,
              fontWeight: 600,
              cursor: isActive ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: isActive ? '0 0 10px rgba(0, 196, 255, 0.2)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            {isActive ? (
              <input
                value={r.name}
                onChange={(e) => updateRoomName(r.id, e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#00c4ff',
                  fontWeight: 600,
                  outline: 'none',
                  width: 80,
                  fontSize: 12,
                  padding: 0,
                }}
              />
            ) : (
              <span>{r.name}</span>
            )}
            {rooms.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteRoom(r.id);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: isActive ? '#ef4444' : '#475569',
                  cursor: 'pointer',
                  fontSize: 10,
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="Delete room"
              >
                <GameIcon name="close" size={10} />
              </button>
            )}
          </div>
        );
      })}
      <button
        onClick={addRoom}
        style={{
          padding: '6px 12px',
          borderRadius: 6,
          background: 'rgba(0, 255, 136, 0.05)',
          border: '1px dashed rgba(0, 255, 136, 0.4)',
          color: '#00ff88',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <GameIcon name="plus" size={11} /> Add Room
      </button>
    </div>
  );
}
