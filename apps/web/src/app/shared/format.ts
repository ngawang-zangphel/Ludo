import { MatchSummaryDto } from '@ludo-game/shared-types';

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) {
    return '—';
  }
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

export function playerNames(match: MatchSummaryDto): string {
  if (!match.players.length) {
    return 'Unassigned';
  }
  return match.players.map((player) => player.name).join(' · ');
}

export function allPlayersReady(match: MatchSummaryDto): boolean {
  return match.players.length >= 2 && match.players.every((player) => player.ready);
}

export function readyCountLabel(match: MatchSummaryDto): string {
  const ready = match.players.filter((player) => player.ready).length;
  return `${ready}/${match.players.length} ready`;
}

export function gameTypeLabel(type: MatchSummaryDto['gameType']): string {
  if (type === 'SNAKES') {
    return 'Snakes & Ladders';
  }
  if (type === 'MARRIAGE') {
    return 'Marriage';
  }
  return 'Ludo';
}

export function httpErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error && 'error' in error) {
    const body = (error as { error?: { message?: string | string[] } }).error;
    if (typeof body?.message === 'string') {
      return body.message;
    }
    if (Array.isArray(body?.message)) {
      return body.message.join(', ');
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Request failed';
}

export function formatGameEvents(types: string[]): string {
  if (types.includes('LANDED_ON_SNAKE')) {
    return 'Slid down a snake';
  }
  if (types.includes('LANDED_ON_LADDER')) {
    return 'Climbed a ladder';
  }
  if (types.includes('PLAYER_FINISHED') || types.includes('MATCH_FINISHED')) {
    return 'Reached 100';
  }
  if (types.includes('PIECE_CAPTURED')) {
    return 'Sent a token back to GO';
  }
  if (types.includes('NO_VALID_MOVES')) {
    return 'Need a 6 to leave GO';
  }
  if (types.includes('EXTRA_TURN')) {
    return 'Six — roll again';
  }
  if (types.includes('PIECE_ENTERED_BOARD')) {
    return 'Entered the board';
  }
  if (types.includes('CONSECUTIVE_SIXES_FORFEIT')) {
    return 'Three sixes — turn skipped';
  }
  if (types.includes('PIECE_MOVED')) {
    return 'On the move';
  }
  if (types.includes('TURN_CHANGED')) {
    return 'Next player';
  }
  if (types.includes('DICE_ROLLED')) {
    return 'Dice rolled';
  }
  return types.join(' · ');
}

export function placeLabel(place: number): string {
  if (place === 1) return '1st';
  if (place === 2) return '2nd';
  if (place === 3) return '3rd';
  return `${place}th`;
}
