import {
  EngineResult,
  GameEngineError,
  GameEvent,
  GameEventType,
  MatchStatus,
  SNAKES_FINISH_SQUARE,
  SnakesGameState,
  TurnPhase,
} from '@ludo-game/shared-types';
import { DiceRng, rollDice } from '../rng';
import { clearRollWindow, openRollWindow, withUpdatedTimestamp } from '../queries';
import { getNextSnakesPlayer, requireSnakesCurrentPlayer } from './queries';

export function applySnakesDiceRoll(
  state: SnakesGameState,
  playerId: string,
  rng: DiceRng = Math.random,
  now?: string
): EngineResult<SnakesGameState> {
  const player = requireSnakesCurrentPlayer(state, playerId);

  if (state.turnPhase !== TurnPhase.WAITING_FOR_ROLL || state.dice.rolled) {
    throw new GameEngineError('DICE_ALREADY_ROLLED', 'Dice has already been rolled this turn');
  }

  const value = rollDice(rng);
  const events: GameEvent[] = [
    {
      type: GameEventType.DICE_ROLLED,
      playerId,
      payload: { value },
    },
  ];

  const landing = player.position + value;
  const overshoot = landing > SNAKES_FINISH_SQUARE && state.rules.exactRollRequiredForFinish;
  const needsSixToEnter = player.position <= 0 && value !== 6;

  let next: SnakesGameState = {
    ...state,
    dice: { value, rolled: true },
  };

  if (overshoot || needsSixToEnter) {
    events.push({
      type: GameEventType.NO_VALID_MOVES,
      playerId,
      payload: { landing, needsSix: needsSixToEnter },
    });
    next = openRollWindow(extraOrPass(next, playerId, value, events), now);
    next = withUpdatedTimestamp(next, now);
    return { state: next, events, validPieceIds: [] };
  }

  next = withUpdatedTimestamp(
    clearRollWindow({
      ...next,
      turnPhase: TurnPhase.WAITING_FOR_MOVE,
      validPieceIds: [player.tokenId],
    }),
    now
  );

  return { state: next, events, validPieceIds: [player.tokenId] };
}

export function extraOrPass(
  state: SnakesGameState,
  playerId: string,
  diceValue: number,
  events: GameEvent[]
): SnakesGameState {
  if (diceValue === 6 && state.rules.extraTurnOnSix) {
    events.push({ type: GameEventType.EXTRA_TURN, playerId });
    return {
      ...state,
      currentPlayerId: playerId,
      turnPhase: TurnPhase.WAITING_FOR_ROLL,
      dice: { value: state.dice.value, rolled: false },
      validPieceIds: [],
    };
  }
  return passSnakesTurn(state, playerId, events);
}

export function passSnakesTurn(
  state: SnakesGameState,
  fromPlayerId: string,
  events: GameEvent[]
): SnakesGameState {
  if (state.status === MatchStatus.COMPLETED) {
    return state;
  }
  const nextPlayer = getNextSnakesPlayer(state, fromPlayerId);
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
    validPieceIds: [],
    turnNumber: state.turnNumber + 1,
  };
}
