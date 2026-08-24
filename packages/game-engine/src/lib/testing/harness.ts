import {
  LudoGameState,
  LudoPiece,
  PieceState,
  PlayerColor,
  TurnPhase,
} from '@ludo-game/shared-types';
import { createMatchState } from '../create-match';
import { applyDiceRoll } from '../apply-dice-roll';
import { applyMove } from '../apply-move';
import { createDiceSequence } from '../rng';

export function makeMatch(now = '2026-01-01T00:00:00.000Z'): LudoGameState {
  return createMatchState({
    matchId: 'test-match',
    now,
    players: [
      { id: 'red', userId: 'u-red', name: 'Red', color: PlayerColor.RED },
      { id: 'green', userId: 'u-green', name: 'Green', color: PlayerColor.GREEN },
      { id: 'yellow', userId: 'u-yellow', name: 'Yellow', color: PlayerColor.YELLOW },
      { id: 'blue', userId: 'u-blue', name: 'Blue', color: PlayerColor.BLUE },
    ],
  });
}

export function placePiece(
  state: LudoGameState,
  playerId: string,
  pieceId: string,
  patch: Partial<LudoPiece>
): LudoGameState {
  return {
    ...state,
    players: state.players.map((player) =>
      player.id === playerId
        ? {
            ...player,
            pieces: player.pieces.map((piece) =>
              piece.id === pieceId ? { ...piece, ...patch } : piece
            ),
          }
        : player
    ),
  };
}

export function putOnBoard(
  state: LudoGameState,
  playerId: string,
  pieceId: string,
  relative: number
): LudoGameState {
  const nextState =
    relative >= 51 && relative < 56
      ? PieceState.HOME_PATH
      : relative >= 56
        ? PieceState.HOME
        : PieceState.BOARD;
  return placePiece(state, playerId, pieceId, { state: nextState, position: relative });
}

export function roll(state: LudoGameState, playerId: string, face: number): LudoGameState {
  return applyDiceRoll(state, playerId, createDiceSequence([face])).state;
}

export function rollAndMove(
  state: LudoGameState,
  playerId: string,
  face: number,
  pieceId: string
): LudoGameState {
  const afterRoll = applyDiceRoll(state, playerId, createDiceSequence([face])).state;
  return applyMove(afterRoll, { playerId, pieceId }).state;
}

export function waitingForMove(state: LudoGameState, playerId: string, face: number): LudoGameState {
  const next = roll(state, playerId, face);
  if (next.turnPhase !== TurnPhase.WAITING_FOR_MOVE) {
    throw new Error(`Expected WAITING_FOR_MOVE, got ${next.turnPhase} after rolling ${face}`);
  }
  return next;
}
