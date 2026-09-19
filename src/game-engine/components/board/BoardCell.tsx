/**
 * DOSYA AMACI: Tek bir ızgara hücresi — memoize edilmiş.
 *
 * NEDEN: Bir turun tipik karesinde 100 hücreden yalnızca 1-3 tanesi değişir
 * (oyuncunun ayrıldığı ve vardığı hücre). Eski kodda her kare TÜM hücre
 * render'ları yeniden çalışıyor, React tüm alt ağacı karşılaştırıyordu.
 *
 * Faz 2 sayesinde ızgara değişmediğinde `cell` nesneleri tick'ler arası
 * REFERANS OLARAK aynı kalıyor; bu da burada referans kıyasını mümkün kılıyor.
 * Varlık nesneleri ise her tick klonlandığı için onları `id` üzerinden
 * karşılaştırıyoruz (hücre render'ları zaten yalnızca `id`'yi ve null olup
 * olmadığını kullanıyor).
 */

'use client';

import { memo } from 'react';
import { Cell } from '../../logic/cellTypes';
import { Entity } from '../../logic/entityTypes';
import { CELL_RENDERERS } from '../cells/CELL_RENDERERS';

export interface BoardCellProps {
    cell: Cell;
    size: number;
    entityOnCell: Entity | null;
    prevEntityOnCell: Entity | null;
    isCurrentlyVisible: boolean;
    isExplored: boolean;
}

function BoardCellImpl({ cell, size, entityOnCell, prevEntityOnCell, isCurrentlyVisible, isExplored }: BoardCellProps) {
    if (!isExplored) {
        return (
            <div style={{ width: size, height: size, backgroundColor: '#020617', border: '1px solid rgba(30, 58, 138, 0.05)', boxSizing: 'border-box' }} />
        );
    }

    // Sis altındaki hücrede yalnızca oyuncu görünür kalır.
    const visibleEntity = isCurrentlyVisible ? entityOnCell : (entityOnCell?.type === 'player' ? entityOnCell : null);
    const visiblePrevEntity = isCurrentlyVisible ? prevEntityOnCell : (prevEntityOnCell?.type === 'player' ? prevEntityOnCell : null);

    const ActiveRenderer = CELL_RENDERERS[cell.type] || CELL_RENDERERS['normal'];

    return (
        <div style={{ position: 'relative', width: size, height: size, backgroundColor: '#020617' }}>
            <div style={{ width: '100%', height: '100%', filter: isCurrentlyVisible ? 'none' : 'brightness(0.3) contrast(0.8)', transition: 'filter 0.3s ease' }}>
                <ActiveRenderer
                    cell={cell}
                    entityOnCell={visibleEntity}
                    prevEntityOnCell={visiblePrevEntity}
                />
            </div>
        </div>
    );
}

function sameCellProps(a: BoardCellProps, b: BoardCellProps): boolean {
    return (
        a.cell === b.cell &&
        a.size === b.size &&
        a.isCurrentlyVisible === b.isCurrentlyVisible &&
        a.isExplored === b.isExplored &&
        (a.entityOnCell?.id ?? null) === (b.entityOnCell?.id ?? null) &&
        (a.prevEntityOnCell?.id ?? null) === (b.prevEntityOnCell?.id ?? null)
    );
}

export const BoardCell = memo(BoardCellImpl, sameCellProps);
