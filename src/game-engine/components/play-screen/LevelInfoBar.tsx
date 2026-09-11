'use client';

interface LevelInfoBarProps {
    controlMode: 'all_rooms' | 'selected_room';
    trailCollision?: boolean;
}

/** HUD altındaki seviye özellikleri şeridi (kontrol modu + iz çarpışması). */
export function LevelInfoBar({ controlMode, trailCollision }: LevelInfoBarProps) {
    return (
        <div
            style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 16,
                padding: '6px 16px',
                background: 'rgba(3, 7, 18, 0.6)',
                borderBottom: '1px solid rgba(0, 255, 136, 0.08)',
                backdropFilter: 'blur(10px)',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Control Mode:</span>
                <span style={{
                    fontSize: 9,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontWeight: 700,
                    backgroundColor: controlMode === 'all_rooms' ? 'rgba(0, 255, 136, 0.1)' : 'rgba(168, 85, 247, 0.1)',
                    color: controlMode === 'all_rooms' ? '#00ff88' : '#c084fc',
                    border: `1px solid ${controlMode === 'all_rooms' ? 'rgba(0, 255, 136, 0.2)' : 'rgba(168, 85, 247, 0.2)'}`,
                }}>
                    {controlMode === 'all_rooms' ? 'ALL ROOMS' : 'SELECTED ROOM'}
                </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trail Collision:</span>
                <span style={{
                    fontSize: 9,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    backgroundColor: trailCollision ? 'rgba(0, 255, 136, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: trailCollision ? '#00ff88' : '#ef4444',
                    border: `1px solid ${trailCollision ? 'rgba(0, 255, 136, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                }}>
                    {trailCollision ? 'ON' : 'OFF'}
                </span>
            </div>
        </div>
    );
}
