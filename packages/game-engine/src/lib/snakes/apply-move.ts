import {
  EngineResult,
  GameEngineError,
  GameEvent,
  GameEventType,
  MatchStatus,
  PieceMoveAnimation,
  SNAKES_FINISH_SQUARE,
  SnakesGameState,
  TurnPhase,
} from '@ludo-game/shared-types';
import { withUpdatedTimestamp } from '../queries';
import { getSnakesSquareCoordinate, isLadder, layoutForRules, teleportFrom } from './board';
import { extraOrPass, passSnakesTurn } from './apply-dice-roll';
import {
  checkSnakesMatchFinished,
  findSnakesPlayer,
  isSnakesPlayerFinished,
  requireSnakesCurrentPlayer,
} from './queries';

export function applySnakesMove(
  state: SnakesGameState,
  input: { playerId: string; pieceId: string },
  now?: string
): EngineResult<SnakesGameState> {
  const player = requireSnakesCurrentPlayer(state, input.playerId);

  if (state.turnPhase !== TurnPhase.WAITING_FOR_MOVE || !state.dice.rolled || state.dice.value === null) {
    throw new GameEngineError('DICE_NOT_ROLLED', 'Roll the dice before moving');
  }

  if (input.pieceId !== player.tokenId) {
    throw new GameEngineError('INVALID_PIECE', `Piece ${input.pieceId} cannot move`);
  }

  const dice = state.dice.value;
  const from = player.position;
  const landing = from + dice;

  if (landing > SNAKES_FINISH_SQUARE && state.rules.exactRollRequiredForFinish) {
    throw new GameEngineError('ILLEGAL_MOVE', 'Need an exact roll to finish');
  }

  const events: GameEvent[] = [];
  const layout = layoutForRules(state.rules);
  const teleportedTo = teleportFrom(landing, layout);
  const destination = teleportedTo ?? landing;
  const animation = buildSnakesAnimation(player.tokenId, from, landing, destination);

  events.push({
    type: GameEventType.PIECE_MOVED,
    playerId: player.id,
    pieceId: player.tokenId,
    payload: { from, to: landing },
  });

  if (teleportedTo !== undefined) {
    const ladder = isLadder(landing, teleportedTo);
    events.push({
      type: ladder ? GameEventType.LANDED_ON_LADDER : GameEventType.LANDED_ON_SNAKE,
      playerId: player.id,
      pieceId: player.tokenId,
      payload: { from: landing, to: teleportedTo },
    });
  }

  let next: SnakesGameState = {
    ...state,
    players: state.players.map((entry) =>
      entry.id === player.id ? { ...entry, position: destination } : entry
    ),
  };

  if (destination > 1 && destination < SNAKES_FINISH_SQUARE) {
    const bumped = next.players.filter(
      (entry) =>
        entry.id !== player.id &&
        entry.position === destination &&
        !isSnakesPlayerFinished(entry)
    );
    if (bumped.length > 0) {
      next = {
        ...next,
        players: next.players.map((entry) =>
          bumped.some((victim) => victim.id === entry.id) ? { ...entry, position: 1 } : entry
        ),
      };
      for (const victim of bumped) {
        events.push({
          type: GameEventType.PIECE_CAPTURED,
          playerId: player.id,
          pieceId: player.tokenId,
          payload: {
            capturedPlayerId: victim.id,
            from: destination,
            to: 1,
          },
        });
      }
    }
  }

  const moved = next.players.find((entry) => entry.id === player.id);
  if (moved && moved.position >= SNAKES_FINISH_SQUARE && moved.finishedPosition === undefined) {
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

  const stillPlaying = next.players.find((entry) => entry.id === player.id);
  const playerDone = stillPlaying ? isSnakesPlayerFinished(stillPlaying) : true;

  if (playerDone) {
    next = completeSnakesMatch(next, events);
  } else {
    next = extraOrPass(next, player.id, dice, events);
  }

  next = withUpdatedTimestamp(next, now);
  return {
    state: next,
    events,
    validPieceIds: [],
    animation,
  };
}

export function removeSnakesPlayer(
  state: SnakesGameState,
  playerId: string,
  now?: string
): EngineResult<SnakesGameState> {
  const player = findSnakesPlayer(state, playerId);
  if (player.eliminated === true || player.finishedPosition !== undefined) {
    throw new GameEngineError('PLAYER_NOT_ACTIVE', `${player.name} is already out of this match`);
  }
  if (state.status !== MatchStatus.LIVE && state.status !== MatchStatus.PAUSED) {
    throw new GameEngineError(
      'MATCH_NOT_LIVE',
      `Match ${state.matchId} is ${state.status}, expected LIVE or PAUSED`
    );
  }

  const events: GameEvent[] = [];
  const wasPaused = state.status === MatchStatus.PAUSED;
  let next: SnakesGameState = {
    ...state,
    players: state.players.map((entry) =>
      entry.id === playerId ? { ...entry, eliminated: true, connected: false } : entry
    ),
  };
  events.push({ type: GameEventType.PLAYER_REMOVED, playerId });

  if (checkSnakesMatchFinished(next)) {
    next = completeSnakesMatch(next, events);
  } else if (next.currentPlayerId === playerId) {
    next = passSnakesTurn(next, playerId, events);
  }

  if (wasPaused && next.status !== MatchStatus.COMPLETED) {
    next = { ...next, status: MatchStatus.PAUSED };
  }

  next = withUpdatedTimestamp(next, now);
  return { state: next, events, validPieceIds: [] };
}

function completeSnakesMatch(state: SnakesGameState, events: GameEvent[]): SnakesGameState {
  const remaining = [...state.players]
    .filter((player) => player.finishedPosition === undefined && !player.eliminated)
    .sort((left, right) => right.position - left.position);
  const removed = state.players.filter(
    (player) => player.eliminated === true && player.finishedPosition === undefined
  );

  let rankings = [...state.rankings];
  let players = state.players;

  remaining.forEach((player) => {
    const place = rankings.length + 1;
    rankings = [...rankings, player.id];
    players = players.map((entry) =>
      entry.id === player.id ? { ...entry, finishedPosition: place } : entry
    );
  });
  removed.forEach((player) => {
    const place = rankings.length + 1;
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

function buildSnakesAnimation(
  pieceId: string,
  from: number,
  landing: number,
  destination: number
): PieceMoveAnimation {
  const steps = [];
  for (let square = from + 1; square <= landing; square += 1) {
    steps.push(getSnakesSquareCoordinate(square));
  }
  if (destination !== landing) {
    steps.push(getSnakesSquareCoordinate(destination));
  }
  return {
    pieceId,
    from: getSnakesSquareCoordinate(from),
    steps,
  };
}
