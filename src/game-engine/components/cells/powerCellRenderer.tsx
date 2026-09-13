import { Cell } from '../../logic/cellTypes';
import { Entity } from '../../logic/entityTypes';
import { useGameTheme } from '../../contexts/GameThemeContext';
import { GameIcon } from '@/components/icons';

interface PowerCellRendererProps {
    cell: Cell;
    entityOnCell: Entity | null;
    prevEntityOnCell: Entity | null;
}

export const PowerCellRenderer = ({ cell, entityOnCell, prevEntityOnCell }: PowerCellRendererProps) => {
    const { theme } = useGameTheme();
    const isOccupied = entityOnCell !== null || prevEntityOnCell !== null;

    if (theme === 'legacy') {
        return (
            <div style={{
                width: 64,
                height: 64,
                background: 'rgba(251, 191, 36, 0.12)',
                border: '1px solid rgba(251, 191, 36, 0.5)',
                boxShadow: 'inset 0 0 12px rgba(251, 191, 36, 0.25)',
                boxSizing: 'border-box',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <GameIcon name="lightning" size={20} color="#fbbf24" style={{ filter: 'drop-shadow(0 0 8px rgba(251,191,36,0.9))' }} />
            </div>
        );
    }

    let powerColor = '#fbbf24';
    let powerActiveColor = '#fef08a';
    let powerIcon = '⚡';
    let borderRadius = '8px';

    if (theme === 'cosmic') {
        powerColor = '#a78bfa';
        powerActiveColor = '#ede9fe';
    } else if (theme === 'blueprint') {
        powerColor = '#38bdf8';
        powerActiveColor = '#bae6fd';
        borderRadius = '2px';
    } else if (theme === 'arcade') {
        powerColor = '#facc15';
        powerActiveColor = '#ffffff';
        borderRadius = '0px';
    }

    return (
        <div 
            id={`cell-${cell.id}`}
            style={{
                width: 64,
                height: 64,
                background: isOccupied ? 'rgba(15, 23, 42, 0.9)' : 'rgba(15, 23, 42, 0.75)',
                border: isOccupied ? `2px solid ${powerActiveColor}` : `2px solid ${powerColor}`,
                borderRadius,
                boxShadow: isOccupied
                    ? `inset 0 0 24px ${powerColor}80, 0 0 16px ${powerColor}60`
                    : `inset 0 0 16px ${powerColor}40, 0 0 10px ${powerColor}30`,
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                transition: 'background-color 200ms ease, border-color 200ms ease, box-shadow 200ms ease',
            }}
        >
            <div 
                style={{
                    position: 'absolute',
                    width: 44,
                    height: 44,
                    borderRadius: theme === 'arcade' ? 0 : '50%',
                    border: `1.5px solid ${isOccupied ? `${powerColor}dd` : `${powerColor}55`}`,
                    pointerEvents: 'none',
                }}
            />
            <span 
                style={{
                    color: isOccupied ? powerActiveColor : powerColor,
                    filter: `drop-shadow(0 0 8px ${powerColor})`,
                    userSelect: 'none',
                    zIndex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <GameIcon name="lightning" size={24} color={isOccupied ? powerActiveColor : powerColor} />
            </span>
        </div>
    );
};
