import { PieceState, PlayerColor } from '@ludo-game/shared-types';
import { applyDiceRoll } from '../apply-dice-roll';
import { applyMove } from '../apply-move';
import { checkCapture, getCapturedPieces, getValidMoves } from '../valid-moves';
import { relativeToGlobal } from '../board/coordinates';
import { createDiceSequence } from '../rng';
import { makeMatch, putOnBoard } from '../testing/harness';

describe('capture', () => {
  it('captures an opponent on a non-safe square', () => {
    let state = putOnBoard(makeMatch(), 'red', 'red-0', 4);
    const greenRelative = (4 - 13 + 52) % 52;
    state = putOnBoard(state, 'green', 'green-0', greenRelative);

    expect(relativeToGlobal(PlayerColor.RED, 4)).toBe(relativeToGlobal(PlayerColor.GREEN, greenRelative));
    expect(checkCapture(state, 'red', relativeToGlobal(PlayerColor.RED, 4))).toBe(true);

    state = putOnBoard(state, 'red', 'red-0', 1);
    state = applyDiceRoll(state, 'red', createDiceSequence([3])).state;
    const move = getValidMoves(state, 'red').find((entry) => entry.pieceId === 'red-0');
    expect(move?.captures).toEqual([{ playerId: 'green', pieceId: 'green-0' }]);

    const result = applyMove(state, { playerId: 'red', pieceId: 'red-0' });
    const greenPiece = result.state.players
      .find((player) => player.id === 'green')
      ?.pieces.find((piece) => piece.id === 'green-0');
    expect(greenPiece?.state).toBe(PieceState.YARD);
    expect(greenPiece?.position).toBe(0);
    expect(result.events.some((event) => event.type === 'PIECE_CAPTURED')).toBe(true);
    expect(result.state.currentPlayerId).toBe('red');
  });

  it('cannot capture on a safe square', () => {
    let state = putOnBoard(makeMatch(), 'green', 'green-0', 0);
    const redRelativeOntoGreenStart = (13 - 0 + 52) % 52;
    state = putOnBoard(state, 'red', 'red-0', redRelativeOntoGreenStart - 1);

    state = applyDiceRoll(state, 'red', createDiceSequence([1])).state;
    const move = getValidMoves(state, 'red').find((entry) => entry.pieceId === 'red-0');
    expect(move?.toPosition).toBe(redRelativeOntoGreenStart);
    expect(move?.captures).toEqual([]);
    expect(
      getCapturedPieces(state, 'red', relativeToGlobal(PlayerColor.RED, redRelativeOntoGreenStart))
    ).toEqual([]);
  });

  it('does not capture a piece of the same color', () => {
    let state = putOnBoard(makeMatch(), 'red', 'red-0', 4);
    state = putOnBoard(state, 'red', 'red-1', 1);
    state = applyDiceRoll(state, 'red', createDiceSequence([3])).state;
    const move = getValidMoves(state, 'red').find((entry) => entry.pieceId === 'red-1');
    expect(move?.captures).toEqual([]);
  });
});
