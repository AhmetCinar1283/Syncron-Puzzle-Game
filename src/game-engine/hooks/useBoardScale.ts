'use client';

import { useEffect, useRef, useState } from 'react';
import type { RoomState } from '../logic/types';
import { calculateRoomLayoutOffsets } from '../logic/engine/rooms';
import { NATIVE_CELL_SIZE, ROOM_LAYOUT_GAP } from '../components/play-screen/constants';

/**
 * Responsive board ölçeği: board alanına (ResizeObserver) sığacak şekilde
 * native piksel boyutunu küçültür, asla 1.0'ın üstüne büyütmez.
 * Board boyutu 0 ise (oda yok) ölçek güncellenmez.
 */
export function useBoardScale(rooms: Record<string, RoomState>) {
    // Grid boyutlarını normalleştirilmiş odalardan hesaplıyoruz
    const { totalWidth: boardPixelW, totalHeight: boardPixelH } = calculateRoomLayoutOffsets(rooms, NATIVE_CELL_SIZE, ROOM_LAYOUT_GAP);

    const boardAreaRef = useRef<HTMLDivElement>(null);
    const [boardScale, setBoardScale] = useState(1);

    useEffect(() => {
        function recalc() {
            if (!boardAreaRef.current) return;
            const areaW = boardAreaRef.current.clientWidth;
            const areaH = boardAreaRef.current.clientHeight;
            if (boardPixelW === 0 || boardPixelH === 0) return;
            const scaleW = areaW / boardPixelW;
            const scaleH = areaH / boardPixelH;
            const scale = Math.min(scaleW, scaleH, 1.0);
            setBoardScale(scale);
        }
        recalc();
        const ro = new ResizeObserver(recalc);
        if (boardAreaRef.current) ro.observe(boardAreaRef.current);
        return () => ro.disconnect();
    }, [boardPixelW, boardPixelH]);

    return { boardAreaRef, boardPixelW, boardPixelH, boardScale };
}
