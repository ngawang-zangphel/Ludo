export const ADMIN_ROOM = 'admin';
export const BROADCAST_ROOM = 'broadcast';

export function matchRoom(matchId: string): string {
  return `match:${matchId}`;
}
