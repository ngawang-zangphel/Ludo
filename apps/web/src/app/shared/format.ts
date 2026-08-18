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
