import { GameEventType, TurnPhase } from '@ludo-game/shared-types';
import { applyDiceRoll } from '../apply-dice-roll';
import { applyMove } from '../apply-move';
import { getNextPlayer } from '../queries';
import { createDiceSequence } from '../rng';
import { makeMatch, putOnBoard } from '../testing/harness';

describe('turns', () => {
  it('switches to the next clockwise player after a normal move', () => {
    let state = putOnBoard(makeMatch(), 'red', 'red-0', 2);
    state = applyDiceRoll(state, 'red', createDiceSequence([2])).state;
    state = applyMove(state, { playerId: 'red', pieceId: 'red-0' }).state;
    expect(state.currentPlayerId).toBe('green');
    expect(state.turnPhase).toBe(TurnPhase.WAITING_FOR_ROLL);
    expect(state.dice.rolled).toBe(false);
  });

  it('gives an extra turn after rolling six', () => {
    const afterRoll = applyDiceRoll(makeMatch(), 'red', createDiceSequence([6])).state;
    const result = applyMove(afterRoll, { playerId: 'red', pieceId: 'red-0' });
    expect(result.state.currentPlayerId).toBe('red');
    expect(result.events.some((event) => event.type === GameEventType.EXTRA_TURN)).toBe(true);
  });

  it('gives an extra turn after a capture', () => {
    let state = putOnBoard(makeMatch(), 'red', 'red-0', 1);
    const greenRelative = (4 - 13 + 52) % 52;
    state = putOnBoard(state, 'green', 'green-0', greenRelative);
    state = applyDiceRoll(state, 'red', createDiceSequence([3])).state;
    const result = applyMove(state, { playerId: 'red', pieceId: 'red-0' });
    expect(result.state.currentPlayerId).toBe('red');
    expect(result.events.some((event) => event.type === GameEventType.EXTRA_TURN)).toBe(true);
  });

  it('forfeits the third consecutive six and passes the turn', () => {
    let state = applyDiceRoll(makeMatch(), 'red', createDiceSequence([6])).state;
    state = applyMove(state, { playerId: 'red', pieceId: 'red-0' }).state;
    expect(state.consecutiveSixes).toBe(1);

    state = applyDiceRoll(state, 'red', createDiceSequence([6])).state;
    state = applyMove(state, { playerId: 'red', pieceId: 'red-1' }).state;
    expect(state.consecutiveSixes).toBe(2);
    expect(state.currentPlayerId).toBe('red');

    const result = applyDiceRoll(state, 'red', createDiceSequence([6]));
    expect(result.events.some((event) => event.type === GameEventType.CONSECUTIVE_SIXES_FORFEIT)).toBe(
      true
    );
    expect(result.state.currentPlayerId).toBe('green');
    expect(result.state.consecutiveSixes).toBe(0);
    expect(result.state.turnPhase).toBe(TurnPhase.WAITING_FOR_ROLL);
  });

  it('skips a finished player when choosing the next turn', () => {
    let state = makeMatch();
    state = {
      ...state,
      players: state.players.map((player) =>
        player.id === 'green' ? { ...player, finishedPosition: 1 } : player
      ),
      rankings: ['green'],
    };
    const next = getNextPlayer(state, 'red');
    expect(next.id).toBe('yellow');
  });
});
