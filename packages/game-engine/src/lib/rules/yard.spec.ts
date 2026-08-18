import { PieceState, TurnPhase } from '@ludo-game/shared-types';
import { applyDiceRoll } from '../apply-dice-roll';
import { applyMove } from '../apply-move';
import { getValidMoves, canMovePiece } from '../valid-moves';
import { createDiceSequence } from '../rng';
import { makeMatch, roll } from '../testing/harness';

describe('yard entry', () => {
  it('cannot leave the yard without a six', () => {
    const state = roll(makeMatch(), 'red', 5);
    expect(state.currentPlayerId).toBe('green');
    expect(state.turnPhase).toBe(TurnPhase.WAITING_FOR_ROLL);
    expect(state.players[0]?.pieces.every((piece) => piece.state === PieceState.YARD)).toBe(true);
  });

  it('can leave the yard with a six', () => {
    const afterRoll = applyDiceRoll(makeMatch(), 'red', createDiceSequence([6])).state;
    expect(afterRoll.validPieceIds).toEqual(['red-0', 'red-1', 'red-2', 'red-3']);
    expect(canMovePiece(afterRoll, 'red', 'red-0')).toBe(true);

    const afterMove = applyMove(afterRoll, { playerId: 'red', pieceId: 'red-0' }).state;
    const piece = afterMove.players[0]?.pieces.find((entry) => entry.id === 'red-0');
    expect(piece?.state).toBe(PieceState.BOARD);
    expect(piece?.position).toBe(0);
  });

  it('uses the six only to enter; the piece lands on start, not start+6', () => {
    const afterRoll = applyDiceRoll(makeMatch(), 'red', createDiceSequence([6])).state;
    const move = getValidMoves(afterRoll, 'red')[0];
    expect(move?.toPosition).toBe(0);
    expect(move?.entersBoard).toBe(true);
  });
});
