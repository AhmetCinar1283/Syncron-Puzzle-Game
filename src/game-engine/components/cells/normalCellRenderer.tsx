import { Cell } from '../../logic/cellTypes';
import { useGameTheme } from '../../contexts/GameThemeContext';

export const NormalCellRenderer = ({ cell: _cell }: { cell: Cell }) => {
    const { themeConfig } = useGameTheme();
    const { normalCell } = themeConfig;

    return (
        <div style={{
            width: 64,
            height: 64,
            background: normalCell.background,
            border: normalCell.border,
            boxShadow: normalCell.boxShadow,
            boxSizing: 'border-box',
            position: 'relative',
            borderRadius: normalCell.borderRadius ?? '0px',
        }} />
    );
};
