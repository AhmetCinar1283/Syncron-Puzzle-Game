import { Cell } from '../../logic/cellTypes';
import { getPlayerColor } from '../playerColors';
import { useGameTheme } from '../../contexts/GameThemeContext';

export const TargetCellRenderer = ({ cell }: { cell: Cell }) => {
    const { theme } = useGameTheme();
    const playerIndex = (cell.customData.playerIndex as number) ?? 0;
    const { hex, rgb } = getPlayerColor(playerIndex);
    const cellSize = 64;

    if (theme === 'legacy') {
        return (
            <div style={{
                width: cellSize,
                height: cellSize,
                background: `rgba(${rgb}, 0.07)`,
                border: `2px solid rgba(${rgb}, 0.55)`,
                boxShadow: `inset 0 0 16px rgba(${rgb}, 0.2)`,
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
            }}>
                <span
                    className="target-pulse-blue"
                    style={{
                        fontSize: cellSize * 0.38,
                        lineHeight: 1,
                        color: hex,
                        userSelect: 'none',
                        display: 'inline-block',
                    }}
                >
                    ◎
                </span>
            </div>
        );
    }

    const borderRadius = theme === 'arcade' ? '0px' : theme === 'blueprint' ? '2px' : '10px';

    return (
        <div style={{
            width: cellSize,
            height: cellSize,
            background: 'rgba(15, 23, 42, 0.65)',
            border: `2px solid rgba(${rgb}, 0.65)`,
            borderRadius,
            boxShadow: `inset 0 0 16px rgba(${rgb}, 0.25), 0 0 10px rgba(${rgb}, 0.2)`,
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Rotating or pulsing decorative ring */}
            <div 
                className="target-rotate-anim" 
                style={{
                    borderRadius: theme === 'arcade' ? 0 : '50%',
                    border: `1.5px dashed rgba(${rgb}, 0.45)`,
                }}
            />

            <span
                className="target-pulse-anim"
                style={{
                    fontSize: cellSize * 0.42,
                    lineHeight: 1,
                    color: hex,
                    textShadow: `0 0 10px rgba(${rgb}, 0.8)`,
                    userSelect: 'none',
                    display: 'inline-block',
                    zIndex: 1,
                }}
            >
                ◎
            </span>
        </div>
    );
};