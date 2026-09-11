import { Cell } from '../../logic/cellTypes';
import { useGameTheme } from '../../contexts/GameThemeContext';

export const ForbiddenCellRenderer = ({ cell }: { cell: Cell }) => {
    const { theme } = useGameTheme();

    if (theme === 'legacy') {
        return (
            <div style={{
                width: 64,
                height: 64,
                background: 'rgba(220, 20, 50, 0.18)',
                border: '1px solid rgba(255, 30, 60, 0.5)',
                boxShadow: 'inset 0 0 14px rgba(255, 0, 50, 0.25)',
                boxSizing: 'border-box',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
            }}>
                <div style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0.25,
                    backgroundImage: 'repeating-linear-gradient(45deg, #ff1744 0, #ff1744 1.5px, transparent 0, transparent 50%)',
                    backgroundSize: '8px 8px',
                }} />
                <span style={{
                    fontSize: 20,
                    lineHeight: 1,
                    color: 'rgba(255, 60, 80, 0.7)',
                    userSelect: 'none',
                    position: 'relative',
                    zIndex: 1,
                }}>
                    ✕
                </span>
            </div>
        );
    }

    return (
        <div style={{
            width: 64,
            height: 64,
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1.5px solid #ef4444',
            borderRadius: '6px',
            boxShadow: 'inset 0 0 16px rgba(239,68,68,0.35), 0 0 10px rgba(239,68,68,0.25)',
            boxSizing: 'border-box',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
        }}>
            <div style={{
                position: 'absolute',
                inset: 0,
                opacity: 0.18,
                backgroundImage: `linear-gradient(
                    135deg,
                    #ef4444 25%,
                    transparent 25%,
                    transparent 50%,
                    #ef4444 50%,
                    #ef4444 75%,
                    transparent 75%,
                    transparent
                )`,
                backgroundSize: '20px 20px',
            }} />
            
            <span style={{ 
                fontSize: 24, 
                color: '#f87171', 
                textShadow: '0 0 10px rgba(239,68,68,0.9), 0 0 20px rgba(239,68,68,0.4)', 
                userSelect: 'none', 
                position: 'relative', 
                zIndex: 1,
                fontWeight: 'bold'
            }}>
                ✕
            </span>
        </div>
    );
};
