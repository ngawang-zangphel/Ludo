import {
  EngineResult,
  GameEngineError,
  GameEvent,
  GameEventType,
  LudoGameState,
  TurnPhase,
} from '@ludo-game/shared-types';
import { getValidMoves } from './valid-moves';
import {
  clearRollWindow,
  getNextPlayer,
  openRollWindow,
  requireCurrentPlayer,
  withUpdatedTimestamp,
} from './queries';
import { DiceRng, rollDice } from './rng';

export function applyDiceRoll(
  state: LudoGameState,
  playerId: string,
  rng: DiceRng = Math.random,
  now?: string
): EngineResult {
  requireCurrentPlayer(state, playerId);

  if (state.turnPhase !== TurnPhase.WAITING_FOR_ROLL) {
    throw new GameEngineError('DICE_ALREADY_ROLLED', 'Dice has already been rolled this turn');
  }

  if (state.dice.rolled) {
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

  const consecutiveSixes = value === 6 ? state.consecutiveSixes + 1 : 0;
  const forfeited =
    value === 6 && consecutiveSixes >= state.rules.maxConsecutiveSixes;

  let next: LudoGameState = {
    ...state,
    dice: { value, rolled: true },
    consecutiveSixes,
  };

  if (forfeited) {
    events.push({
      type: GameEventType.CONSECUTIVE_SIXES_FORFEIT,
      playerId,
      payload: { consecutiveSixes },
    });
    next = openRollWindow(passTurn(next, playerId, events), now);
    next = withUpdatedTimestamp(next, now);
    return { state: next, events, validPieceIds: [] };
  }

  const validMoves = getValidMoves(next, playerId);
  const validPieceIds = validMoves.map((move) => move.pieceId);

  if (validPieceIds.length === 0) {
    events.push({ type: GameEventType.NO_VALID_MOVES, playerId });
    const extraTurn = value === 6 && state.rules.extraTurnOnSix;
    next = extraTurn
      ? openRollWindow(grantExtraTurn(next, playerId, events), now)
      : openRollWindow(passTurn(next, playerId, events), now);
    next = withUpdatedTimestamp(next, now);
    return { state: next, events, validPieceIds: [] };
  }

  next = withUpdatedTimestamp(
    clearRollWindow({
      ...next,
      turnPhase: TurnPhase.WAITING_FOR_MOVE,
      validPieceIds,
    }),
    now
  );

  return { state: next, events, validPieceIds };
}

function passTurn(state: LudoGameState, fromPlayerId: string, events: GameEvent[]): LudoGameState {
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

function grantExtraTurn(state: LudoGameState, playerId: string, events: GameEvent[]): LudoGameState {
  events.push({ type: GameEventType.EXTRA_TURN, playerId });
  return {
    ...state,
    currentPlayerId: playerId,
    turnPhase: TurnPhase.WAITING_FOR_ROLL,
    dice: { value: state.dice.value, rolled: false },
    validPieceIds: [],
  };
}
