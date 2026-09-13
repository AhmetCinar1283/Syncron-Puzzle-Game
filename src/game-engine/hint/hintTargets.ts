/**
 * DOSYA AMACI: Bir ipucu hamlesinde hangi oyuncuların hangi yöne gideceğini
 * hesaplar (işaretleyicinin çizeceği varlıklar ve oklar). Girdi eşlemesi
 * `usePlayScreenActions.triggerMove` ile aynıdır: kilitli oyuncu hareket etmez,
 * seçili oda modunda yalnızca kontrol edilen odalar, `reversed` mod ve
 * `controlMapping` yönü değiştirir.
 */
import type { Entity } from '../logic/entityTypes';
import type { Direction, Position } from '../logic/types';

const OPPOSITE: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' };

export interface HintTarget {
  entityId: number;
  position: Position;
  /** Oyuncunun fiilen gideceği yön (girdi yönünden farklı olabilir). */
  direction: Direction;
}

export function getHintTargets(
  entities: Entity[],
  controlMode: 'all_rooms' | 'selected_room',
  controlledRoomIds: string[],
  inputDirection: Direction,
): HintTarget[] {
  return entities
    .filter((ent) => ent.type === 'player' && !ent.customData.isLocked && !ent.customData._destroyed)
    .filter((ent) => controlMode !== 'selected_room' || controlledRoomIds.includes(ent.position.roomId ?? 'main'))
    .map((ent) => {
      const mode = (ent.customData.mode as string) ?? 'normal';
      let direction = mode === 'reversed' ? OPPOSITE[inputDirection] : inputDirection;
      if (ent.customData.controlMapping) {
        const mapping = ent.customData.controlMapping as Record<Direction, Direction>;
        direction = mapping[direction] ?? direction;
      }
      return { entityId: ent.id, position: ent.position, direction };
    });
}
