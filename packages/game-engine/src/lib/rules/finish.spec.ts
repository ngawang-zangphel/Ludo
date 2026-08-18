import { GameEventType, MatchStatus, PieceState, TurnPhase } from '@ludo-game/shared-types';
import { applyDiceRoll } from '../apply-dice-roll';
import { applyMove } from '../apply-move';
import { checkMatchFinished, checkPlayerFinished } from '../queries';
import { createDiceSequence } from '../rng';
import { makeMatch, putOnBoard } from '../testing/harness';

function homeAllButOne(state: ReturnType<typeof makeMatch>, playerId: string, color: string) {
  let next = state;
  for (let index = 1; index <= 3; index += 1) {
    next = putOnBoard(next, playerId, `${color}-${index}`, 56);
  }
  next = putOnBoard(next, playerId, `${color}-0`, 55);
  return next;
}

describe('finish and ranking', () => {
  it('marks a player finished when all four pieces are home', () => {
    let state = homeAllButOne(makeMatch(), 'red', 'red');
    const before = state.players.find((player) => player.id === 'red');
    if (!before) {
      throw new Error('expected red player');
    }
    expect(checkPlayerFinished(before)).toBe(false);

    state = applyDiceRoll(state, 'red', createDiceSequence([1])).state;
    const result = applyMove(state, { playerId: 'red', pieceId: 'red-0' });
    const red = result.state.players.find((player) => player.id === 'red');
    expect(red?.pieces.every((piece) => piece.state === PieceState.HOME)).toBe(true);
    expect(red?.finishedPosition).toBe(1);
    expect(result.state.rankings).toEqual(['red']);
    expect(result.events.some((event) => event.type === GameEventType.PLAYER_FINISHED)).toBe(true);
    expect(result.state.currentPlayerId).toBe('green');
  });

  it('records multiple finishers in ranking order', () => {
    let state = homeAllButOne(makeMatch(), 'red', 'red');
    state = applyDiceRoll(state, 'red', createDiceSequence([1])).state;
    state = applyMove(state, { playerId: 'red', pieceId: 'red-0' }).state;

    state = {
      ...state,
      currentPlayerId: 'green',
      turnPhase: TurnPhase.WAITING_FOR_ROLL,
      dice: { value: null, rolled: false },
    };
    state = homeAllButOne(state, 'green', 'green');
    state = applyDiceRoll(state, 'green', createDiceSequence([1])).state;
    state = applyMove(state, { playerId: 'green', pieceId: 'green-0' }).state;

    expect(state.rankings).toEqual(['red', 'green']);
    expect(state.players.find((player) => player.id === 'green')?.finishedPosition).toBe(2);
    expect(state.status).toBe(MatchStatus.LIVE);
  });

  it('completes the match when only one player remains unfinished', () => {
    let state = makeMatch();
    state = {
      ...state,
      rankings: ['red', 'green'],
      players: state.players.map((player) => {
        if (player.id === 'red') {
          return {
            ...player,
            finishedPosition: 1,
            pieces: player.pieces.map((piece) => ({ ...piece, state: PieceState.HOME, position: 56 })),
          };
        }
        if (player.id === 'green') {
          return {
            ...player,
            finishedPosition: 2,
            pieces: player.pieces.map((piece) => ({ ...piece, state: PieceState.HOME, position: 56 })),
          };
        }
        if (player.id === 'yellow') {
          return {
            ...player,
            pieces: player.pieces.map((piece, index) =>
              index === 0
                ? { ...piece, state: PieceState.HOME_PATH, position: 55 }
                : { ...piece, state: PieceState.HOME, position: 56 }
            ),
          };
        }
        return player;
      }),
      currentPlayerId: 'yellow',
      turnPhase: TurnPhase.WAITING_FOR_ROLL,
    };

    expect(checkMatchFinished(state)).toBe(false);
    state = applyDiceRoll(state, 'yellow', createDiceSequence([1])).state;
    const result = applyMove(state, { playerId: 'yellow', pieceId: 'yellow-0' });
    expect(result.state.status).toBe(MatchStatus.COMPLETED);
    expect(result.state.turnPhase).toBe(TurnPhase.MATCH_OVER);
    expect(result.state.rankings).toEqual(['red', 'green', 'yellow', 'blue']);
    expect(result.events.some((event) => event.type === GameEventType.MATCH_FINISHED)).toBe(true);
  });
});
