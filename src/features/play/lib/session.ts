import type { StoredLevel } from '@/services/db';
import type { Direction } from '@/game-engine/logic/types';
import type { LevelSession } from './types';

/**
 * localStorage anahtarı — `src/hooks/useFirestoreSync.ts` de aynı anahtarı okuyup
 * yarım kalan oturumları telemetriye gönderir. Değeri DEĞİŞTİRME (persist format).
 */
export const ACTIVE_SESSION_KEY = 'active_level_session';

/** Worker'a gönderilen hamle kodları ('s' = oda değiştirme). */
export const DIRECTION_TO_MOVE: Record<Direction, string> = { up: 'u', down: 'd', left: 'l', right: 'r' };
export const SWITCH_ROOM_MOVE = 's';

export function generateUUID(): string {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
        return window.crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Oturumu localStorage'a yazar; alan sırası ve `lastActiveTime: Date.now()`
 * önceki inline kopyalarla birebir aynı (3 ayrı yerde tekrarlanıyordu).
 */
export function persistActiveSession(session: LevelSession): void {
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify({
        id: session.id,
        levelId: session.levelId,
        version: session.version,
        startTime: session.startTime,
        restarts: session.restarts,
        deaths: session.deaths,
        lastActiveTime: Date.now(),
    }));
}

export function clearActiveSession(): void {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
}

/** StoredLevel → LevelData yardımcısı: string grid'i parse eder. */
export function storedToLevelData(stored: StoredLevel & { id: number }) {
    return {
        ...stored,
        grid: typeof stored.grid === 'string' ? JSON.parse(stored.grid) : stored.grid,
    } as StoredLevel & { id: number };
}
