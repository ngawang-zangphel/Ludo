import {
  CapturedPieceRef,
  LudoGameState,
  HOME_POSITION,
  LudoPiece,
  LudoPlayer,
  PieceState,
  TRACK_MAX_RELATIVE,
  ValidMove,
} from '@ludo-game/shared-types';
import { isSafeSquare, pieceStateForRelative, relativeToGlobal } from './board/coordinates';
import { findPlayer } from './queries';

export function getCapturedPieces(
  state: LudoGameState,
  actingPlayerId: string,
  globalIndex: number
): CapturedPieceRef[] {
  if (isSafeSquare(globalIndex)) {
    return [];
  }

  const captured: CapturedPieceRef[] = [];
  for (const player of state.players) {
    if (player.id === actingPlayerId) {
      continue;
    }
    for (const piece of player.pieces) {
      if (piece.state !== PieceState.BOARD) {
        continue;
      }
      if (relativeToGlobal(player.color, piece.position) === globalIndex) {
        captured.push({ playerId: player.id, pieceId: piece.id });
      }
    }
  }
  return captured;
}

export function checkCapture(
  state: LudoGameState,
  actingPlayerId: string,
  globalIndex: number
): boolean {
  return getCapturedPieces(state, actingPlayerId, globalIndex).length > 0;
}

export function destinationFor(piece: LudoPiece, dice: number, exactHome: boolean): number | null {
  if (piece.state === PieceState.YARD) {
    return dice === 6 ? 0 : null;
  }

  if (piece.state === PieceState.HOME) {
    return null;
  }

  const next = piece.position + dice;
  if (next > HOME_POSITION) {
    return exactHome ? null : HOME_POSITION;
  }
  return next;
}

export function buildMove(
  state: LudoGameState,
  player: LudoPlayer,
  piece: LudoPiece,
  dice: number
): ValidMove | null {
  const toPosition = destinationFor(piece, dice, playerFinishedExact(state));
  if (toPosition === null) {
    return null;
  }

  const toState = pieceStateForRelative(toPosition);
  const entersBoard = piece.state === PieceState.YARD && toState === PieceState.BOARD;
  const captures =
    toState === PieceState.BOARD
      ? getCapturedPieces(state, player.id, relativeToGlobal(player.color, toPosition))
      : [];

  return {
    pieceId: piece.id,
    fromState: piece.state,
    fromPosition: piece.position,
    toState,
    toPosition,
    captures,
    entersBoard,
    entersHomePath: piece.position <= TRACK_MAX_RELATIVE && toPosition >= 51,
    reachesHome: toState === PieceState.HOME && piece.state !== PieceState.HOME,
  };
}

function playerFinishedExact(state: LudoGameState): boolean {
  return state.rules.exactRollRequiredForHome;
}

export function getValidMoves(state: LudoGameState, playerId: string): ValidMove[] {
  const player = findPlayer(state, playerId);
  const dice = state.dice.value;
  if (!state.dice.rolled || dice === null) {
    return [];
  }

  return player.pieces
    .map((piece) => buildMove(state, player, piece, dice))
    .filter((move): move is ValidMove => move !== null);
}

export function canMovePiece(state: LudoGameState, playerId: string, pieceId: string): boolean {
  return getValidMoves(state, playerId).some((move) => move.pieceId === pieceId);
}
