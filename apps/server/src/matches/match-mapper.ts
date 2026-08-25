import {
  GameState,
  GameType,
  MatchDetailDto,
  MatchPlayerDto,
  MatchStatus,
  MatchSummaryDto,
} from '@ludo-game/shared-types';
import { MatchDocument, MatchPlayer } from './schemas/match.schema';
import { toObjectIdString } from '../common/types';

export function durationSeconds(startedAt: Date | null, finishedAt: Date | null): number | null {
  if (!startedAt) {
    return null;
  }
  const end = finishedAt ?? new Date();
  return Math.max(0, Math.floor((end.getTime() - startedAt.getTime()) / 1000));
}

export function toSummary(
  match: MatchDocument,
  tournamentName: string,
  gameState?: GameState | null
): MatchSummaryDto {
  const state = gameState ?? match.gameState;
  const currentId = state?.currentPlayerId ?? (match.currentPlayerId ? toObjectIdString(match.currentPlayerId) : null);
  const current = match.players.find((player) => toObjectIdString(player.userId) === currentId);
  const winnerIds = (state?.rankings ?? match.winnerIds.map((id) => toObjectIdString(id)));
  return {
    id: toObjectIdString(match._id),
    tournamentId: toObjectIdString(match.tournamentId),
    tournamentName,
    gameType: match.gameType ?? GameType.LUDO,
    round: match.round,
    roundNumber: match.roundNumber,
    matchNumber: match.matchNumber,
    status: (state?.status as MatchStatus | undefined) ?? match.status,
    players: match.players.map((player) => toPlayerDto(player, state)),
    currentPlayerId: currentId,
    currentPlayerName: current?.name ?? null,
    winnerIds,
    winnerNames: winnerIds
      .map((id) => match.players.find((player) => toObjectIdString(player.userId) === id)?.name)
      .filter((name): name is string => Boolean(name)),
    startedAt: match.startedAt ? match.startedAt.toISOString() : null,
    finishedAt: match.finishedAt ? match.finishedAt.toISOString() : null,
    durationSeconds: durationSeconds(match.startedAt, match.finishedAt),
    turnNumber: state?.turnNumber ?? 0,
    updatedAt: match.updatedAt ? match.updatedAt.toISOString() : new Date().toISOString(),
  };
}

export function toPlayerDto(player: MatchPlayer, gameState?: GameState | null): MatchPlayerDto {
  const userId = toObjectIdString(player.userId);
  const seated = gameState?.players.find((entry) => entry.id === userId);
  return {
    userId,
    name: player.name,
    color: player.color,
    ready: Boolean(player.ready),
    eliminated: seated?.eliminated === true,
  };
}

export function toDetail(
  match: MatchDocument,
  tournamentName: string,
  gameState?: GameState | null
): MatchDetailDto {
  return {
    ...toSummary(match, tournamentName, gameState),
    gameState: gameState ?? match.gameState,
  };
}
