import {
  EngineResult,
  GameEngineError,
  GameEvent,
  GameEventType,
  GameState,
  LudoPiece,
  LudoPlayer,
  MatchStatus,
  PieceMoveAnimation,
  PieceState,
  TurnPhase,
  ValidMove,
} from '@ludo-game/shared-types';
import {
  getPieceCoordinate,
  relativeToGlobal,
} from './board/coordinates';
import {
  checkMatchFinished,
  findPiece,
  getNextPlayer,
  isPlayerFinished,
  requireCurrentPlayer,
  withUpdatedTimestamp,
} from './queries';
import { getValidMoves } from './valid-moves';

export function applyMove(
  state: GameState,
  input: { playerId: string; pieceId: string },
  now?: string
): EngineResult {
  const player = requireCurrentPlayer(state, input.playerId);

  if (state.turnPhase !== TurnPhase.WAITING_FOR_MOVE || !state.dice.rolled) {
    throw new GameEngineError('DICE_NOT_ROLLED', 'Roll the dice before moving a piece');
  }

  const piece = findPiece(player, input.pieceId);
  const move = getValidMoves(state, input.playerId).find(
    (candidate) => candidate.pieceId === input.pieceId
  );

  if (!move) {
    throw new GameEngineError(
      'ILLEGAL_MOVE',
      `Piece ${input.pieceId} cannot move with dice ${state.dice.value ?? 'unknown'}`
    );
  }

  const events: GameEvent[] = [];
  const animation = buildAnimation(player, piece, move);
  let next = applyPieceRelocation(state, player.id, move, events);

  if (move.reachesHome) {
    const movedPlayer = next.players.find((entry) => entry.id === player.id);
    if (movedPlayer && isPlayerFinished(movedPlayer) && movedPlayer.finishedPosition === undefined) {
      const place = next.rankings.length + 1;
      next = {
        ...next,
        rankings: [...next.rankings, player.id],
        players: next.players.map((entry) =>
          entry.id === player.id ? { ...entry, finishedPosition: place } : entry
        ),
      };
      events.push({
        type: GameEventType.PLAYER_FINISHED,
        playerId: player.id,
        payload: { place },
      });
    }
  }

  if (checkMatchFinished(next)) {
    next = completeMatch(next, events);
  } else {
    const extraTurn = shouldGrantExtraTurn(state, move);
    const stillPlaying = next.players.find((entry) => entry.id === player.id);
    const playerDone = stillPlaying ? isPlayerFinished(stillPlaying) : true;

    next = extraTurn && !playerDone
      ? grantExtraTurn(next, player.id, events)
      : passTurn(next, player.id, events);
  }

  next = withUpdatedTimestamp(next, now);
  return {
    state: next,
    events,
    validPieceIds: [],
    animation,
  };
}

export function movePiece(
  state: GameState,
  input: { playerId: string; pieceId: string },
  now?: string
): EngineResult {
  return applyMove(state, input, now);
}

function applyPieceRelocation(
  state: GameState,
  playerId: string,
  move: ValidMove,
  events: GameEvent[]
): GameState {
  const players = state.players.map((player) => {
    if (player.id === playerId) {
      return {
        ...player,
        pieces: player.pieces.map((piece) =>
          piece.id === move.pieceId
            ? { ...piece, state: move.toState, position: move.toPosition }
            : piece
        ),
      };
    }

    if (move.captures.some((capture) => capture.playerId === player.id)) {
      return {
        ...player,
        pieces: player.pieces.map((piece) => {
          const captured = move.captures.find((entry) => entry.pieceId === piece.id);
          if (!captured) {
            return piece;
          }
          const slot = yardSlotFromPieceId(piece.id);
          events.push({
            type: GameEventType.PIECE_CAPTURED,
            playerId,
            pieceId: move.pieceId,
            payload: {
              capturedPieceId: piece.id,
              capturedPlayerId: player.id,
            },
          });
          return { ...piece, state: PieceState.YARD, position: slot };
        }),
      };
    }

    return player;
  });

  events.push({
    type: GameEventType.PIECE_MOVED,
    playerId,
    pieceId: move.pieceId,
    payload: {
      from: move.fromPosition,
      to: move.toPosition,
      fromState: move.fromState,
      toState: move.toState,
    },
  });

  if (move.entersBoard) {
    events.push({
      type: GameEventType.PIECE_ENTERED_BOARD,
      playerId,
      pieceId: move.pieceId,
    });
  }
  if (move.entersHomePath) {
    events.push({
      type: GameEventType.PIECE_ENTERED_HOME_PATH,
      playerId,
      pieceId: move.pieceId,
    });
  }
  if (move.reachesHome) {
    events.push({
      type: GameEventType.PIECE_REACHED_HOME,
      playerId,
      pieceId: move.pieceId,
    });
  }

  return { ...state, players };
}

function yardSlotFromPieceId(pieceId: string): number {
  const suffix = pieceId.split('-').at(-1);
  const slot = Number(suffix);
  return Number.isInteger(slot) ? slot : 0;
}

function shouldGrantExtraTurn(state: GameState, move: ValidMove): boolean {
  const rolledSix = state.dice.value === 6 && state.rules.extraTurnOnSix;
  const captured = move.captures.length > 0 && state.rules.extraTurnOnCapture;
  return rolledSix || captured;
}

function passTurn(state: GameState, fromPlayerId: string, events: GameEvent[]): GameState {
  if (state.status === MatchStatus.COMPLETED) {
    return state;
  }
  const nextPlayer = getNextPlayer(state, fromPlayerId);
  events.push({
    type: GameEventType.TURN_CHANGED,
    playerId: nextPlayer.id,
    payload: { fromPlayerId, toPlayerId: nextPlayer.id },
  });
  return {
    ...state,
    currentPlayerId: nextPlayer.id,
    turnPhase: TurnPhase.WAITING_FOR_ROLL,
    dice: { value: state.dice.value, rolled: false },
    consecutiveSixes: 0,
    validPieceIds: [],
    turnNumber: state.turnNumber + 1,
  };
}

function grantExtraTurn(state: GameState, playerId: string, events: GameEvent[]): GameState {
  events.push({ type: GameEventType.EXTRA_TURN, playerId });
  return {
    ...state,
    currentPlayerId: playerId,
    turnPhase: TurnPhase.WAITING_FOR_ROLL,
    dice: { value: state.dice.value, rolled: false },
    validPieceIds: [],
  };
}

function completeMatch(state: GameState, events: GameEvent[]): GameState {
  const remaining = state.players.filter((player) => player.finishedPosition === undefined);
  let rankings = [...state.rankings];
  let players = state.players;

  remaining.forEach((player, index) => {
    const place = rankings.length + 1 + index;
    rankings = [...rankings, player.id];
    players = players.map((entry) =>
      entry.id === player.id ? { ...entry, finishedPosition: place } : entry
    );
  });

  events.push({
    type: GameEventType.MATCH_FINISHED,
    payload: { winnerId: rankings[0] ?? '' },
  });

  return {
    ...state,
    players,
    rankings,
    status: MatchStatus.COMPLETED,
    turnPhase: TurnPhase.MATCH_OVER,
    validPieceIds: [],
    dice: { value: state.dice.value, rolled: false },
  };
}

function buildAnimation(
  player: LudoPlayer,
  piece: LudoPiece,
  move: ValidMove
): PieceMoveAnimation {
  const from = getPieceCoordinate(player.color, piece.state, piece.position);
  const steps = [];

  if (move.entersBoard) {
    steps.push(getPieceCoordinate(player.color, PieceState.BOARD, 0));
  } else {
    for (let position = piece.position + 1; position <= move.toPosition; position += 1) {
      steps.push(getPieceCoordinate(player.color, pieceStateFromRelative(position), position));
    }
  }

  return { pieceId: piece.id, from, steps };
}

function pieceStateFromRelative(position: number): PieceState {
  if (position <= 50) {
    return PieceState.BOARD;
  }
  if (position < 56) {
    return PieceState.HOME_PATH;
  }
  return PieceState.HOME;
}

export function getAnimationGlobalIndex(
  color: LudoPlayer['color'],
  relative: number
): number | null {
  if (relative < 0 || relative > 50) {
    return null;
  }
  return relativeToGlobal(color, relative);
}
