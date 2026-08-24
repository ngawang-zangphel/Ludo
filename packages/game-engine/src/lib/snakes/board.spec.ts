import { snakesSquareToCell } from './board';

describe('snakes board coordinates', () => {
  it('places square 1 at the bottom-left', () => {
    expect(snakesSquareToCell(1)).toEqual({ row: 9, col: 0 });
  });

  it('places square 10 at the bottom-right', () => {
    expect(snakesSquareToCell(10)).toEqual({ row: 9, col: 9 });
  });

  it('places square 11 at the right of the second row', () => {
    expect(snakesSquareToCell(11)).toEqual({ row: 8, col: 9 });
  });

  it('places square 20 at the left of the second row', () => {
    expect(snakesSquareToCell(20)).toEqual({ row: 8, col: 0 });
  });

  it('places square 100 at the top-left', () => {
    expect(snakesSquareToCell(100)).toEqual({ row: 0, col: 0 });
  });
});
