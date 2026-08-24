import {
  BoardCoordinate,
  CLASSIC_SNAKES_LAYOUT,
  CLASSIC_SNAKES_TELEPORTS,
  DEFAULT_SNAKES_RULES,
  resolveSnakesRules,
  SNAKES_BOARD_SIZE,
  SNAKES_FINISH_SQUARE,
  SnakesBoardLayout,
  SnakesRules,
  teleportsFromLayout,
} from '@ludo-game/shared-types';

export const SNAKES_TELEPORTS = CLASSIC_SNAKES_TELEPORTS;
export const SNAKES_LADDERS = CLASSIC_SNAKES_LAYOUT.ladders;
export const SNAKES_SNAKES = CLASSIC_SNAKES_LAYOUT.snakes;

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

export function layoutForRules(rules?: Partial<SnakesRules> | null): SnakesBoardLayout {
  return resolveSnakesRules(rules).layout;
}

export function teleportFrom(
  square: number,
  layout: SnakesBoardLayout = DEFAULT_SNAKES_RULES.layout
): number | undefined {
  return teleportsFromLayout(layout)[square];
}

export function isLadder(from: number, to: number): boolean {
  return to > from;
}
