import { Cell } from '../../logic/cellTypes';
import { Entity } from '../../logic/entityTypes';
import { useGameTheme } from '../../contexts/GameThemeContext';
import { GameIcon } from '@/components/icons';

interface IceCellRendererProps {
    cell: Cell;
    entityOnCell: Entity | null;
    prevEntityOnCell: Entity | null;
}

export const IceCellRenderer = ({ cell, entityOnCell, prevEntityOnCell }: IceCellRendererProps) => {
    const { theme } = useGameTheme();
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
                <GameIcon name="ice" size={20} color="#a5f3fc" style={{ filter: 'drop-shadow(0 0 8px rgba(165,243,252,0.8))' }} />
            </div>
        );
    }

    // Theme specific color schemes for Ice/Slide
    let iceBg = isOccupied
        ? 'linear-gradient(135deg, rgba(165,243,252,0.45) 0%, rgba(147,210,255,0.25) 100%)'
        : 'linear-gradient(135deg, rgba(165,243,252,0.18) 0%, rgba(147,210,255,0.08) 100%)';
    let iceBorder = isOccupied ? '1.5px solid rgba(165,243,252,0.95)' : '1.5px solid rgba(165,243,252,0.5)';
    let iceColor = '#cffafe';
    let iceIcon = '❄';
    let borderRadius = '6px';

    if (theme === 'arcade') {
        iceBg = isOccupied ? '#1e293b' : '#0f172a';
        iceBorder = isOccupied ? '2px solid #38bdf8' : '2px solid #0284c7';
        iceColor = '#38bdf8';
        borderRadius = '0px';
    } else if (theme === 'cosmic') {
        iceBg = isOccupied ? 'rgba(167,139,250,0.3)' : 'rgba(100,70,160,0.12)';
        iceBorder = isOccupied ? '1.5px solid #ddd6fe' : '1.5px solid rgba(167,139,250,0.45)';
        iceColor = '#ede9fe';
    } else if (theme === 'blueprint') {
        iceBg = isOccupied ? 'rgba(56,189,248,0.3)' : 'rgba(56,189,248,0.1)';
        iceBorder = isOccupied ? '1.5px solid #bae6fd' : '1.5px dashed rgba(56,189,248,0.5)';
        borderRadius = '2px';
    }

    return (
        <div 
            id={`cell-${cell.id}`}
            style={{
                width: 64,
                height: 64,
                background: iceBg,
                border: iceBorder,
                borderRadius,
                boxShadow: isOccupied
                    ? 'inset 0 0 22px rgba(255,255,255,0.25), 0 0 12px rgba(0,0,0,0.4)'
                    : 'inset 0 0 12px rgba(0,0,0,0.3)',
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
                    color: iceColor, 
                    filter: `drop-shadow(0 0 8px ${iceColor})`, 
                    userSelect: 'none',
                    zIndex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <GameIcon name="ice" size={20} color={iceColor} />
            </span>
        </div>
    );
};
