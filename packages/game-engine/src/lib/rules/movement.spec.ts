import { GameEngineError, PieceState, TurnPhase } from '@ludo-game/shared-types';
import { applyDiceRoll } from '../apply-dice-roll';
import { applyMove } from '../apply-move';
import { getValidMoves } from '../valid-moves';
import { createDiceSequence } from '../rng';
import { makeMatch, putOnBoard } from '../testing/harness';

describe('movement', () => {
  it('moves a piece forward by the dice value', () => {
    let state = putOnBoard(makeMatch(), 'red', 'red-0', 4);
    state = applyDiceRoll(state, 'red', createDiceSequence([3])).state;
    state = applyMove(state, { playerId: 'red', pieceId: 'red-0' }).state;
    const piece = state.players[0]?.pieces.find((entry) => entry.id === 'red-0');
    expect(piece?.position).toBe(7);
    expect(piece?.state).toBe(PieceState.BOARD);
  });

  it('rejects moving a piece that is not in the valid set', () => {
    let state = putOnBoard(makeMatch(), 'red', 'red-0', 4);
    state = applyDiceRoll(state, 'red', createDiceSequence([3])).state;
    expect(() => applyMove(state, { playerId: 'red', pieceId: 'red-1' })).toThrow(GameEngineError);
  });

  it('rejects moving another player piece', () => {
    let state = putOnBoard(makeMatch(), 'red', 'red-0', 4);
    state = applyDiceRoll(state, 'red', createDiceSequence([3])).state;
    expect(() => applyMove(state, { playerId: 'red', pieceId: 'green-0' })).toThrow(GameEngineError);
  });

  it('rejects a move before the dice is rolled', () => {
    const state = putOnBoard(makeMatch(), 'red', 'red-0', 4);
    expect(() => applyMove(state, { playerId: 'red', pieceId: 'red-0' })).toThrow(GameEngineError);
  });

  it('rejects a second dice roll on the same turn', () => {
    const state = applyDiceRoll(makeMatch(), 'red', createDiceSequence([6])).state;
    expect(state.turnPhase).toBe(TurnPhase.WAITING_FOR_MOVE);
    expect(() => applyDiceRoll(state, 'red', createDiceSequence([2]))).toThrow(GameEngineError);
  });

  it('rejects actions from a player who does not have the turn', () => {
    expect(() => applyDiceRoll(makeMatch(), 'green', createDiceSequence([6]))).toThrow(
      GameEngineError
    );
  });

  it('returns no valid board moves when every piece is in the yard and the roll is not 6', () => {
    const state = applyDiceRoll(makeMatch(), 'red', createDiceSequence([4])).state;
    expect(getValidMoves(state, 'red')).toHaveLength(0);
    expect(state.currentPlayerId).toBe('green');
  });
});
