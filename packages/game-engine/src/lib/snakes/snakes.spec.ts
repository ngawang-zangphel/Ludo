import { applySnakesBoardClick, emptySnakesLayout, GameEventType, PlayerColor, SNAKES_FINISH_SQUARE, SnakesGameState, SnakesLevelId, TurnPhase } from '@ludo-game/shared-types';
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
  it('stays off the board until a six is rolled', () => {
    const afterRoll = applySnakesDiceRoll(makeSnakesMatch(), 'red', createDiceSequence([3]));
    const red = afterRoll.state.players.find((player) => player.id === 'red');
    expect(red?.position).toBe(0);
    expect(afterRoll.validPieceIds).toEqual([]);
    expect(afterRoll.state.currentPlayerId).toBe('green');
    expect(afterRoll.events.some((event) => event.type === GameEventType.NO_VALID_MOVES)).toBe(true);
  });

  it('enters the board on a six and keeps the turn', () => {
    const result = rollAndMove(makeSnakesMatch(), 'red', 6);
    const red = result.state.players.find((player) => player.id === 'red');
    expect(red?.position).toBe(6);
    expect(result.state.currentPlayerId).toBe('red');
    expect(result.events.some((event) => event.type === GameEventType.EXTRA_TURN)).toBe(true);
  });

  it('moves a token forward by the dice value', () => {
    const result = rollAndMove(place(makeSnakesMatch(), 'red', 4), 'red', 3);
    const red = result.state.players.find((player) => player.id === 'red');
    expect(red?.position).toBe(7);
    expect(result.state.currentPlayerId).toBe('green');
    expect(result.state.turnPhase).toBe(TurnPhase.WAITING_FOR_ROLL);
  });

  it('sends a player already on that square back to 1', () => {
    let state = place(makeSnakesMatch(), 'green', 7);
    state = place(state, 'red', 5);
    const result = rollAndMove(state, 'red', 2);
    expect(result.state.players.find((player) => player.id === 'red')?.position).toBe(7);
    expect(result.state.players.find((player) => player.id === 'green')?.position).toBe(1);
    expect(result.events.some((event) => event.type === GameEventType.PIECE_CAPTURED)).toBe(true);
  });

  it('sends an occupant back to 1 after a snake or ladder teleport', () => {
    let state = place(makeSnakesMatch(), 'green', 30);
    state = place(state, 'red', 4);
    const result = rollAndMove(state, 'red', 4);
    expect(result.state.players.find((player) => player.id === 'red')?.position).toBe(30);
    expect(result.state.players.find((player) => player.id === 'green')?.position).toBe(1);
    expect(result.events.some((event) => event.type === GameEventType.LANDED_ON_LADDER)).toBe(true);
    expect(result.events.some((event) => event.type === GameEventType.PIECE_CAPTURED)).toBe(true);
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

  it('uses a custom snake layout instead of the classic board', () => {
    const match = createSnakesMatchState({
      matchId: 'custom-board',
      now: '2026-01-01T00:00:00.000Z',
      rules: {
        levelId: SnakesLevelId.CUSTOM,
        layout: { snakes: [{ from: 10, to: 3 }], ladders: [{ from: 4, to: 18 }] },
      },
      players: [
        { id: 'red', userId: 'u-red', name: 'Red', color: PlayerColor.RED },
        { id: 'green', userId: 'u-green', name: 'Green', color: PlayerColor.GREEN },
      ],
    });
    const snake = rollAndMove(place(match, 'red', 9), 'red', 1);
    expect(snake.state.players.find((player) => player.id === 'red')?.position).toBe(3);
    const ladder = rollAndMove(place(match, 'red', 3), 'red', 1);
    expect(ladder.state.players.find((player) => player.id === 'red')?.position).toBe(18);
  });

  it('skips the long classic snake on the easy board', () => {
    const match = createSnakesMatchState({
      matchId: 'easy-board',
      now: '2026-01-01T00:00:00.000Z',
      rules: { levelId: SnakesLevelId.EASY },
      players: [
        { id: 'red', userId: 'u-red', name: 'Red', color: PlayerColor.RED },
        { id: 'green', userId: 'u-green', name: 'Green', color: PlayerColor.GREEN },
      ],
    });
    const result = rollAndMove(place(match, 'red', 54), 'red', 1);
    expect(result.state.players.find((player) => player.id === 'red')?.position).toBe(55);
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

  it('records first place without ending a two-player match', () => {
    const result = rollAndMove(place(makeSnakesMatch(), 'red', 97), 'red', 3);
    const red = result.state.players.find((player) => player.id === 'red');
    expect(red?.position).toBe(SNAKES_FINISH_SQUARE);
    expect(red?.finishedPosition).toBe(1);
    expect(result.state.rankings[0]).toBe('red');
    expect(result.state.status).toBe('LIVE');
    expect(result.state.currentPlayerId).toBe('green');
    expect(result.state.turnPhase).toBe(TurnPhase.WAITING_FOR_ROLL);
    expect(result.events.some((event) => event.type === GameEventType.PLAYER_FINISHED)).toBe(true);
    expect(result.events.some((event) => event.type === GameEventType.MATCH_FINISHED)).toBe(false);
  });

  it('gives an extra turn after rolling six when the rule is on', () => {
    const result = rollAndMove(place(makeSnakesMatch(), 'red', 2), 'red', 6);
    expect(result.state.currentPlayerId).toBe('red');
    expect(result.events.some((event) => event.type === GameEventType.EXTRA_TURN)).toBe(true);
  });

  it('does not grant an extra turn after a winning six', () => {
    const result = rollAndMove(place(makeSnakesMatch(), 'red', 94), 'red', 6);
    expect(result.state.rankings[0]).toBe('red');
    expect(result.state.currentPlayerId).toBe('green');
    expect(result.state.turnPhase).toBe(TurnPhase.WAITING_FOR_ROLL);
    expect(result.events.some((event) => event.type === GameEventType.EXTRA_TURN)).toBe(false);
  });

  it('ends the match once four players have finished', () => {
    const match = createSnakesMatchState({
      matchId: 'snakes-five',
      now: '2026-01-01T00:00:00.000Z',
      players: [
        { id: 'red', userId: 'u-red', name: 'Red', color: PlayerColor.RED },
        { id: 'green', userId: 'u-green', name: 'Green', color: PlayerColor.GREEN },
        { id: 'yellow', userId: 'u-yellow', name: 'Yellow', color: PlayerColor.YELLOW },
        { id: 'blue', userId: 'u-blue', name: 'Blue', color: PlayerColor.BLUE },
        { id: 'purple', userId: 'u-purple', name: 'Purple', color: PlayerColor.PURPLE },
      ],
    });
    let state = place(match, 'green', 100);
    state = {
      ...state,
      rankings: ['green', 'yellow', 'blue'],
      players: state.players.map((player) => {
        if (player.id === 'green') return { ...player, finishedPosition: 1 };
        if (player.id === 'yellow') return { ...player, finishedPosition: 2, position: 100 };
        if (player.id === 'blue') return { ...player, finishedPosition: 3, position: 100 };
        return player;
      }),
    };
    const result = rollAndMove(place(state, 'red', 97), 'red', 3);
    expect(result.state.rankings).toEqual(['green', 'yellow', 'blue', 'red', 'purple']);
    expect(result.state.status).toBe('COMPLETED');
    expect(result.events.some((event) => event.type === GameEventType.MATCH_FINISHED)).toBe(true);
  });
});

describe('snakes board editor clicks', () => {
  it('places a snake from head to tail', () => {
    const first = applySnakesBoardClick(emptySnakesLayout(), 26, 'snake', null);
    const second = applySnakesBoardClick(first.layout, 10, 'snake', first.pendingFrom);
    expect(second.layout.snakes).toEqual([{ from: 26, to: 10 }]);
    expect(second.error).toBeNull();
  });

  it('rejects a snake that would go up', () => {
    const first = applySnakesBoardClick(emptySnakesLayout(), 10, 'snake', null);
    const second = applySnakesBoardClick(first.layout, 26, 'snake', first.pendingFrom);
    expect(second.layout.snakes).toEqual([]);
    expect(second.error).toMatch(/lower number/i);
  });
});
