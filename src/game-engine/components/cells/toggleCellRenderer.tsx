import { Cell } from '../../logic/cellTypes';
import { Entity } from '../../logic/entityTypes';
import { useGameTheme } from '../../contexts/GameThemeContext';

interface ToggleCellRendererProps {
    cell: Cell;
    entityOnCell: Entity | null;
    prevEntityOnCell: Entity | null;
}

export const ToggleCellRenderer = ({ cell, entityOnCell, prevEntityOnCell }: ToggleCellRendererProps) => {
    const { theme } = useGameTheme();
    // Aktif çalışma modu: hücre üzerinde bir nesne varken VEYA yeni ayrılmışken!
    const isOccupied = entityOnCell !== null || prevEntityOnCell !== null;

    if (theme === 'legacy') {
        return (
            <div style={{
                width: 64,
                height: 64,
                background: 'rgba(255, 215, 0, 0.07)',
                border: '1px solid rgba(255, 215, 0, 0.45)',
                boxShadow: 'inset 0 0 14px rgba(255, 215, 0, 0.18)',
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
                        color: '#ffd700',
                        textShadow: '0 0 8px rgba(255,215,0,0.7)',
                        userSelect: 'none',
                        fontWeight: 'bold',
                    }}
                >
                    ⇄
                </span>
            </div>
        );
    }

    const borderRadius = theme === 'arcade' ? 0 : theme === 'blueprint' ? 2 : 8;

    return (
        <div 
            id={`cell-${cell.id}`}
            style={{
                width: 64,
                height: 64,
                background: isOccupied ? 'rgba(15, 23, 42, 0.9)' : 'rgba(15, 23, 42, 0.7)',
                border: isOccupied ? '2px solid #fef08a' : '2px solid #fbbf24',
                borderRadius,
                boxShadow: isOccupied
                    ? 'inset 0 0 24px rgba(251,191,36,0.75), 0 0 16px rgba(251,191,36,0.5)'
                    : 'inset 0 0 16px rgba(251,191,36,0.25), 0 0 10px rgba(251,191,36,0.2)',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                transition: 'background-color 200ms ease, border-color 200ms ease, box-shadow 200ms ease',
            }}
        >
            <span 
                style={{ 
                fontSize: 22, 
                color: isOccupied ? '#fef08a' : '#fbbf24', 
                textShadow: '0 0 12px rgba(251,191,36,0.9), 0 0 24px rgba(251,191,36,0.5)', 
                userSelect: 'none', 
                fontWeight: 'bold',
                zIndex: 1
            }}>
                ⇄
            </span>
        </div>
    );
};
