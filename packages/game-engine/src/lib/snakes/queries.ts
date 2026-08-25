import {
  GameEngineError,
  MatchStatus,
  SnakesGameState,
  SnakesPlayer,
} from '@ludo-game/shared-types';
import { SNAKES_FINISH_SQUARE } from '@ludo-game/shared-types';

export function findSnakesPlayer(state: SnakesGameState, playerId: string): SnakesPlayer {
  const player = state.players.find((entry) => entry.id === playerId);
  if (!player) {
    throw new GameEngineError('UNKNOWN_PLAYER', `Player ${playerId} is not in this match`);
  }
  return player;
}

export function requireSnakesCurrentPlayer(state: SnakesGameState, playerId: string): SnakesPlayer {
  if (state.status !== MatchStatus.LIVE) {
    throw new GameEngineError(
      'MATCH_NOT_LIVE',
      `Match ${state.matchId} is ${state.status}, expected LIVE`
    );
  }
  const player = findSnakesPlayer(state, playerId);
  if (state.currentPlayerId !== playerId) {
    throw new GameEngineError('NOT_PLAYER_TURN', `It is not ${player.name}'s turn`);
  }
  return player;
}

export function isSnakesPlayerFinished(player: SnakesPlayer): boolean {
  return (
    player.eliminated === true ||
    player.finishedPosition !== undefined ||
    player.position >= SNAKES_FINISH_SQUARE
  );
}

export function checkSnakesMatchFinished(state: SnakesGameState): boolean {
  return state.players.filter((player) => !isSnakesPlayerFinished(player)).length <= 1;
}

export function getNextSnakesPlayer(
  state: SnakesGameState,
  fromPlayerId = state.currentPlayerId
): SnakesPlayer {
  const currentIndex = state.players.findIndex((player) => player.id === fromPlayerId);
  if (currentIndex < 0) {
    throw new GameEngineError('UNKNOWN_PLAYER', `Player ${fromPlayerId} is not in this match`);
  }

  for (let offset = 1; offset <= state.players.length; offset += 1) {
    const player = state.players[(currentIndex + offset) % state.players.length];
    if (player && !isSnakesPlayerFinished(player)) {
      return player;
    }
  }

  return findSnakesPlayer(state, fromPlayerId);
}
