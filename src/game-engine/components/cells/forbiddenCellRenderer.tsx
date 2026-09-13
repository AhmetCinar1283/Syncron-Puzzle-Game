import { Cell } from '../../logic/cellTypes';
import { useGameTheme } from '../../contexts/GameThemeContext';
import { GameIcon } from '@/components/icons';

export const ForbiddenCellRenderer = ({ cell: _cell }: { cell: Cell }) => {
    const { themeConfig } = useGameTheme();
    const { forbiddenCell } = themeConfig;
    const isSkull = forbiddenCell.hazardType === 'skull' || forbiddenCell.hazardType === 'pixel_skull';

    return (
        <div style={{
            width: 64,
            height: 64,
            background: forbiddenCell.background,
            border: forbiddenCell.border,
            borderRadius: forbiddenCell.hazardType === 'pixel_skull' ? '0px' : '4px',
            boxShadow: forbiddenCell.boxShadow ?? 'inset 0 0 14px rgba(239,68,68,0.3)',
            boxSizing: 'border-box',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
        }}>
            {/* Clear hazard symbol */}
            <span style={{ 
                color: forbiddenCell.symbolColor, 
                filter: `drop-shadow(0 0 8px ${forbiddenCell.symbolColor})`, 
                userSelect: 'none', 
                position: 'relative', 
                zIndex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                {isSkull ? (
                    <GameIcon name="skull" size={22} color={forbiddenCell.symbolColor} />
                ) : (
                    <GameIcon name="close" size={22} color={forbiddenCell.symbolColor} />
                )}
            </span>
        </div>
    );
};
