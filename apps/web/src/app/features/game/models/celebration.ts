import { GameEvent, GameEventType, PlayerColor } from '@ludo-game/shared-types';

export interface PlaceCelebration {
  name: string;
  place: number;
  color: PlayerColor;
}

export function celebrationFromEvents(
  events: readonly GameEvent[],
  players: readonly { id: string; name: string; color: string }[]
): PlaceCelebration | null {
  const event = events.find((entry) => entry.type === GameEventType.PLAYER_FINISHED);
  if (!event?.playerId) {
    return null;
  }
  const player = players.find((entry) => entry.id === event.playerId);
  if (!player) {
    return null;
  }
  const place = typeof event.payload?.['place'] === 'number' ? event.payload['place'] : 1;
  const color = (Object.values(PlayerColor) as string[]).includes(player.color)
    ? (player.color as PlayerColor)
    : PlayerColor.RED;
  return { name: player.name, place, color };
}
