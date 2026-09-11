import { Cell } from '../../logic/cellTypes';
import { Entity } from '../../logic/entityTypes';
import { useGameTheme } from '../../contexts/GameThemeContext';

interface IceCellRendererProps {
    cell: Cell;
    entityOnCell: Entity | null;
    prevEntityOnCell: Entity | null;
}

export const IceCellRenderer = ({ cell, entityOnCell, prevEntityOnCell }: IceCellRendererProps) => {
    const { theme } = useGameTheme();
    // Aktif çalışma modu: hücre üzerinde bir nesne varken VEYA yeni ayrılmışken!
    const isOccupied = entityOnCell !== null || prevEntityOnCell !== null;

    if (theme === 'legacy') {
        return (
            <div style={{
                width: 64,
                height: 64,
                background: 'rgba(147, 210, 255, 0.12)',
                border: '1px solid rgba(165, 243, 252, 0.45)',
                boxShadow: 'inset 0 0 10px rgba(165, 243, 252, 0.25)',
                boxSizing: 'border-box',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <span
                    style={{
                        fontSize: 19,
                        lineHeight: 1,
                        color: '#a5f3fc',
                        textShadow: '0 0 8px rgba(165,243,252,0.8)',
                        userSelect: 'none',
                    }}
                >
                    ❄
                </span>
            </div>
        );
    }

    return (
        <div 
            id={`cell-${cell.id}`}
            style={{
                width: 64,
                height: 64,
                background: isOccupied
                    ? 'linear-gradient(135deg, rgba(165,243,252,0.45) 0%, rgba(147,210,255,0.25) 100%)'
                    : 'linear-gradient(135deg, rgba(165,243,252,0.18) 0%, rgba(147,210,255,0.08) 100%)',
                border: isOccupied ? '1.5px solid rgba(165,243,252,0.95)' : '1.5px solid rgba(165,243,252,0.5)',
                borderRadius: '6px',
                boxShadow: isOccupied
                    ? 'inset 0 0 22px rgba(165,243,252,0.85), 0 0 12px rgba(165,243,252,0.55)'
                    : 'inset 0 0 12px rgba(165,243,252,0.4), 0 4px 6px rgba(0,0,0,0.15)',
                boxSizing: 'border-box',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                backdropFilter: 'blur(4px)',
                transition: 'background 200ms ease, border-color 200ms ease, box-shadow 200ms ease',
            }}
        >
            <span 
                className={isOccupied ? 'ice-icon-animated' : undefined}
                style={{ 
                    fontSize: 22, 
                    color: '#cffafe', 
                    textShadow: '0 0 10px rgba(165,243,252,0.9), 0 0 20px rgba(147,210,255,0.4)', 
                    userSelect: 'none',
                    zIndex: 1,
                    display: 'inline-block',
                }}
            >
                ❄
            </span>
        </div>
    );
};
