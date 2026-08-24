import { BoardCoordinate, SNAKES_BOARD_SIZE, SNAKES_FINISH_SQUARE } from '@ludo-game/shared-types';

/**
 * Cartoon-board teleports. Key is the landing square; value is the destination.
 * Ladders go up (to > from). Snakes go down (to < from).
 */
export const SNAKES_TELEPORTS: Readonly<Record<number, number>> = {
  8: 30,
  15: 44,
  21: 50,
  26: 10,
  36: 62,
  46: 18,
  49: 72,
  55: 2,
  60: 23,
  65: 47,
  66: 93,
  77: 96,
  82: 61,
  83: 98,
  88: 67,
  92: 51,
  99: 70,
};

export const SNAKES_LADDERS: ReadonlyArray<{ from: number; to: number }> = Object.entries(
  SNAKES_TELEPORTS
)
  .map(([from, to]) => ({ from: Number(from), to }))
  .filter((item) => item.to > item.from);

export const SNAKES_SNAKES: ReadonlyArray<{ from: number; to: number }> = Object.entries(
  SNAKES_TELEPORTS
)
  .map(([from, to]) => ({ from: Number(from), to }))
  .filter((item) => item.to < item.from);

/**
 * Square 1 is bottom-left. Rows zigzag: even rows from the bottom go left→right.
 */
export function snakesSquareToCell(square: number): BoardCoordinate {
  if (square <= 0) {
    return { row: 9.22, col: 0 };
  }
  const clamped = Math.min(Math.max(square, 1), SNAKES_FINISH_SQUARE);
  const index = clamped - 1;
  const rowFromBottom = Math.floor(index / SNAKES_BOARD_SIZE);
  const row = SNAKES_BOARD_SIZE - 1 - rowFromBottom;
  const colInRow = index % SNAKES_BOARD_SIZE;
  const leftToRight = rowFromBottom % 2 === 0;
  const col = leftToRight ? colInRow : SNAKES_BOARD_SIZE - 1 - colInRow;
  return { row, col };
}

export function getSnakesSquareCoordinate(square: number): BoardCoordinate {
  return snakesSquareToCell(square);
}

export function teleportFrom(square: number): number | undefined {
  return SNAKES_TELEPORTS[square];
}

export function isLadder(from: number, to: number): boolean {
  return to > from;
}
