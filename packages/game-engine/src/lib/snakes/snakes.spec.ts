import { GameEventType, PlayerColor, SNAKES_FINISH_SQUARE, SnakesGameState, TurnPhase } from '@ludo-game/shared-types';
import { applySnakesDiceRoll } from './apply-dice-roll';
import { applySnakesMove } from './apply-move';
import { createSnakesMatchState } from './create-match';
import { createDiceSequence } from '../rng';

function makeSnakesMatch(now = '2026-01-01T00:00:00.000Z'): SnakesGameState {
  return createSnakesMatchState({
    matchId: 'snakes-test',
    now,
    players: [
      { id: 'red', userId: 'u-red', name: 'Red', color: PlayerColor.RED },
      { id: 'green', userId: 'u-green', name: 'Green', color: PlayerColor.GREEN },
    ],
  });
}

function place(state: SnakesGameState, playerId: string, position: number): SnakesGameState {
  return {
    ...state,
    players: state.players.map((player) =>
      player.id === playerId ? { ...player, position } : player
    ),
  };
}

function rollAndMove(
  state: SnakesGameState,
  playerId: string,
  face: number
): ReturnType<typeof applySnakesMove> {
  const afterRoll = applySnakesDiceRoll(state, playerId, createDiceSequence([face])).state;
  const tokenId = afterRoll.players.find((player) => player.id === playerId)?.tokenId;
  if (!tokenId) {
    throw new Error('Missing token');
  }
  return applySnakesMove(afterRoll, { playerId, pieceId: tokenId });
}

describe('snakes and ladders', () => {
  it('moves a token forward by the dice value', () => {
    const result = rollAndMove(makeSnakesMatch(), 'red', 3);
    const red = result.state.players.find((player) => player.id === 'red');
    expect(red?.position).toBe(3);
    expect(result.state.currentPlayerId).toBe('green');
    expect(result.state.turnPhase).toBe(TurnPhase.WAITING_FOR_ROLL);
  });

  it('climbs a ladder after landing on its foot', () => {
    const result = rollAndMove(place(makeSnakesMatch(), 'red', 4), 'red', 4);
    const red = result.state.players.find((player) => player.id === 'red');
    expect(red?.position).toBe(30);
    expect(result.events.some((event) => event.type === GameEventType.LANDED_ON_LADDER)).toBe(true);
  });

  it('slides down a snake after landing on its head', () => {
    const result = rollAndMove(place(makeSnakesMatch(), 'red', 25), 'red', 1);
    const red = result.state.players.find((player) => player.id === 'red');
    expect(red?.position).toBe(10);
    expect(result.events.some((event) => event.type === GameEventType.LANDED_ON_SNAKE)).toBe(true);
  });

  it('stays put when an exact finish is required and the roll overshoots', () => {
    const afterRoll = applySnakesDiceRoll(
      place(makeSnakesMatch(), 'red', 98),
      'red',
      createDiceSequence([5])
    );
    const red = afterRoll.state.players.find((player) => player.id === 'red');
    expect(red?.position).toBe(98);
    expect(afterRoll.validPieceIds).toEqual([]);
    expect(afterRoll.state.currentPlayerId).toBe('green');
    expect(afterRoll.events.some((event) => event.type === GameEventType.NO_VALID_MOVES)).toBe(true);
  });

  it('wins on an exact roll to 100', () => {
    const result = rollAndMove(place(makeSnakesMatch(), 'red', 97), 'red', 3);
    const red = result.state.players.find((player) => player.id === 'red');
    expect(red?.position).toBe(SNAKES_FINISH_SQUARE);
    expect(result.state.rankings[0]).toBe('red');
    expect(result.state.status).toBe('COMPLETED');
    expect(result.events.some((event) => event.type === GameEventType.MATCH_FINISHED)).toBe(true);
  });

  it('gives an extra turn after rolling six when the rule is on', () => {
    const result = rollAndMove(makeSnakesMatch(), 'red', 6);
    expect(result.state.currentPlayerId).toBe('red');
    expect(result.events.some((event) => event.type === GameEventType.EXTRA_TURN)).toBe(true);
  });

  it('does not grant an extra turn after a winning six', () => {
    const result = rollAndMove(place(makeSnakesMatch(), 'red', 94), 'red', 6);
    expect(result.state.rankings[0]).toBe('red');
    expect(result.state.currentPlayerId).toBe('red');
    expect(result.state.turnPhase).toBe(TurnPhase.MATCH_OVER);
    expect(result.events.some((event) => event.type === GameEventType.EXTRA_TURN)).toBe(false);
  });
});
