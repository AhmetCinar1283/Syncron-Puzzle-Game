/**
 * DOSYA AMACI: Bir tick sırasında oda ızgarasının (grid) gerçekten değişip
 * değişmediğini izleyen sayaç.
 *
 * NEDEN: `useGameEngine.executeTurn` her tick için tüm odaları derin kopyalıyordu
 * (hücre başına 3 nesne). Oysa tipik bir turda ızgara HİÇ değişmez — yalnızca
 * varlıklar (entity) hareket eder. Değişmediğini bilirsek, o tick'in snapshot'ı
 * bir önceki tick'in `rooms` nesnesini referansla paylaşabilir ve kopyalama
 * tamamen atlanır.
 *
 * Kullanım (tek iş parçacıklı, senkron tick döngüsü için tasarlandı):
 *
 *     const mark = beginGridTracking();
 *     processSingleTick(...);
 *     const rooms = isGridDirty(mark) ? cloneRooms(live) : previousSnapshotRooms;
 *
 * Motor tarafında ızgarayı değiştiren her yer `markGridDirty()` çağırır.
 */

let revision = 0;

/** Bir tick'in başında çağrılır; o andaki revizyonu döndürür. */
export function beginGridTracking(): number {
    return revision;
}

/** Izgarada kalıcı bir değişiklik yapıldığını bildirir. */
export function markGridDirty(): void {
    revision++;
}

/** `beginGridTracking()` çağrısından bu yana ızgara değişti mi? */
export function isGridDirty(mark: number): boolean {
    return revision !== mark;
}
