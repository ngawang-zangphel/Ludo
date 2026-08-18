import {
  GameEngineError,
  GameState,
  LudoPiece,
  LudoPlayer,
  MatchStatus,
  PieceState,
  TurnPhase,
} from '@ludo-game/shared-types';

export function requireLiveMatch(state: GameState): void {
  if (state.status !== MatchStatus.LIVE) {
    throw new GameEngineError(
      'MATCH_NOT_LIVE',
      `Match ${state.matchId} is ${state.status}, expected LIVE`
    );
  }
}

export function findPlayer(state: GameState, playerId: string): LudoPlayer {
  const player = state.players.find((entry) => entry.id === playerId);
  if (!player) {
    throw new GameEngineError('UNKNOWN_PLAYER', `Player ${playerId} is not in this match`);
  }
  return player;
}

export function requireCurrentPlayer(state: GameState, playerId: string): LudoPlayer {
  requireLiveMatch(state);
  const player = findPlayer(state, playerId);
  if (state.currentPlayerId !== playerId) {
    throw new GameEngineError('NOT_PLAYER_TURN', `It is not ${player.name}'s turn`);
  }
  return player;
}

export function findPiece(player: LudoPlayer, pieceId: string): LudoPiece {
  const piece = player.pieces.find((entry) => entry.id === pieceId);
  if (!piece) {
    throw new GameEngineError('INVALID_PIECE', `Piece ${pieceId} does not belong to ${player.name}`);
  }
  return piece;
}

export function isPlayerFinished(player: LudoPlayer): boolean {
  return (
    player.finishedPosition !== undefined ||
    player.pieces.every((piece) => piece.state === PieceState.HOME)
  );
}

export function checkPlayerFinished(player: LudoPlayer): boolean {
  return isPlayerFinished(player);
}

export function checkMatchFinished(state: GameState): boolean {
  const unfinished = state.players.filter((player) => !isPlayerFinished(player));
  return unfinished.length <= 1 || state.rankings.length >= state.players.length - 1;
}

export function getActivePlayers(state: GameState): LudoPlayer[] {
  return state.players.filter((player) => !isPlayerFinished(player));
}

export function getNextPlayer(state: GameState, fromPlayerId = state.currentPlayerId): LudoPlayer {
  const currentIndex = state.players.findIndex((player) => player.id === fromPlayerId);
  if (currentIndex < 0) {
    throw new GameEngineError('UNKNOWN_PLAYER', `Player ${fromPlayerId} is not in this match`);
  }

  for (let offset = 1; offset <= state.players.length; offset += 1) {
    const player = state.players[(currentIndex + offset) % state.players.length];
    if (player && !isPlayerFinished(player)) {
      return player;
    }
  }

  return findPlayer(state, fromPlayerId);
}

export function isoNow(now?: string): string {
  return now ?? new Date().toISOString();
}

export function withUpdatedTimestamp(state: GameState, now?: string): GameState {
  return {
    ...state,
    version: state.version + 1,
    updatedAt: isoNow(now),
  };
}

export function isActionablePhase(phase: TurnPhase): boolean {
  return phase === TurnPhase.WAITING_FOR_ROLL || phase === TurnPhase.WAITING_FOR_MOVE;
}
