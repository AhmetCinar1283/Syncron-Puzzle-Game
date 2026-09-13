import { Cell } from '../../logic/cellTypes';
import { Entity } from '../../logic/entityTypes';
import { useGameTheme } from '../../contexts/GameThemeContext';
import { GameIcon } from '@/components/icons';

interface ControlSwitchCellRendererProps {
    cell: Cell;
    entityOnCell: Entity | null;
    prevEntityOnCell: Entity | null;
}

export const ControlSwitchCellRenderer = ({ cell, entityOnCell, prevEntityOnCell }: ControlSwitchCellRendererProps) => {
    const { theme } = useGameTheme();
    const isOccupied = entityOnCell !== null || prevEntityOnCell !== null;

    if (theme === 'legacy') {
        return (
            <div style={{
                width: 64,
                height: 64,
                background: 'rgba(192, 132, 252, 0.12)',
                border: '1px solid rgba(192, 132, 252, 0.5)',
                boxShadow: 'inset 0 0 12px rgba(168, 85, 247, 0.3)',
                boxSizing: 'border-box',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <GameIcon name="switch" size={20} color="#c084fc" style={{ filter: 'drop-shadow(0 0 8px rgba(168,85,247,0.7))' }} />
            </div>
        );
    }

    const borderRadius = theme === 'arcade' ? '0px' : theme === 'blueprint' ? '2px' : '10px';

    return (
        <div 
            id={`cell-${cell.id}`}
            style={{
                width: 64,
                height: 64,
                background: isOccupied ? 'rgba(15, 23, 42, 0.9)' : 'rgba(15, 23, 42, 0.7)',
                border: isOccupied ? '2px solid #e9d5ff' : '2px solid #a855f7',
                borderRadius,
                boxShadow: isOccupied
                    ? 'inset 0 0 24px rgba(168,85,247,0.75), 0 0 16px rgba(168,85,247,0.5)'
                    : 'inset 0 0 16px rgba(168,85,247,0.25), 0 0 10px rgba(168,85,247,0.2)',
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
                    color: isOccupied ? '#e9d5ff' : '#c084fc', 
                    filter: 'drop-shadow(0 0 8px rgba(168,85,247,0.7))', 
                    userSelect: 'none', 
                    zIndex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <GameIcon name="switch" size={20} color={isOccupied ? '#e9d5ff' : '#c084fc'} />
            </span>
            
            {/* Alt tarafta aksiyonun ismini gösteren minik gösterge */}
            <div style={{
                position: 'absolute',
                bottom: 2,
                fontSize: 6,
                fontWeight: 700,
                color: isOccupied ? '#e9d5ff' : '#a855f7',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                opacity: 0.6
            }}>
                {(cell.customData.action as string) ?? 'cycle'}
            </div>
        </div>
    );
};
