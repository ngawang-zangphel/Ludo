import { PieceState, TurnPhase } from '@ludo-game/shared-types';
import { applyDiceRoll } from '../apply-dice-roll';
import { applyMove } from '../apply-move';
import { checkHomeEntry } from '../board/coordinates';
import { getValidMoves } from '../valid-moves';
import { createDiceSequence } from '../rng';
import { createMatchState } from '../create-match';
import { makeMatch, putOnBoard } from '../testing/harness';
import { PlayerColor } from '@ludo-game/shared-types';

describe('home path', () => {
  it('enters the home path after 51 track squares', () => {
    let state = putOnBoard(makeMatch(), 'red', 'red-0', 50);
    state = applyDiceRoll(state, 'red', createDiceSequence([1])).state;
    const move = getValidMoves(state, 'red')[0];
    expect(move?.toPosition).toBe(51);
    expect(move?.toState).toBe(PieceState.HOME_PATH);
    expect(move?.entersHomePath).toBe(true);
    expect(checkHomeEntry(50, 51)).toBe(true);
  });

  it('requires an exact roll to reach home', () => {
    let state = putOnBoard(makeMatch(), 'red', 'red-0', 54);
    state = applyDiceRoll(state, 'red', createDiceSequence([4])).state;
    expect(getValidMoves(state, 'red')).toHaveLength(0);
    expect(state.currentPlayerId).toBe('green');
  });

  it('reaches home with an exact roll', () => {
    let state = putOnBoard(makeMatch(), 'red', 'red-0', 54);
    state = applyDiceRoll(state, 'red', createDiceSequence([2])).state;
    const result = applyMove(state, { playerId: 'red', pieceId: 'red-0' });
    const piece = result.state.players[0]?.pieces.find((entry) => entry.id === 'red-0');
    expect(piece?.state).toBe(PieceState.HOME);
    expect(piece?.position).toBe(56);
    expect(result.events.some((event) => event.type === 'PIECE_REACHED_HOME')).toBe(true);
  });

  it('can land on intermediate home-path squares without an exact home roll', () => {
    let state = putOnBoard(makeMatch(), 'red', 'red-0', 51);
    state = applyDiceRoll(state, 'red', createDiceSequence([3])).state;
    const move = getValidMoves(state, 'red')[0];
    expect(move?.toPosition).toBe(54);
    expect(move?.toState).toBe(PieceState.HOME_PATH);
  });

  it('allows overshooting home when exactRollRequiredForHome is false', () => {
    let state = createMatchState({
      matchId: 'flex-home',
      players: [
        { id: 'red', userId: 'u-red', name: 'Red', color: PlayerColor.RED },
        { id: 'green', userId: 'u-green', name: 'Green', color: PlayerColor.GREEN },
      ],
      rules: { exactRollRequiredForHome: false },
    });
    state = putOnBoard(state, 'red', 'red-0', 54);
    state = applyDiceRoll(state, 'red', createDiceSequence([5])).state;
    expect(state.turnPhase).toBe(TurnPhase.WAITING_FOR_MOVE);
    const result = applyMove(state, { playerId: 'red', pieceId: 'red-0' });
    const piece = result.state.players[0]?.pieces.find((entry) => entry.id === 'red-0');
    expect(piece?.state).toBe(PieceState.HOME);
  });
});
